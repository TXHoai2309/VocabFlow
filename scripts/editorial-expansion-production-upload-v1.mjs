import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { v2 as cloudinary } from 'cloudinary';

const OUT = '.vocabflow-local/editorial-refresh-20261101/expansion-4997-production-r0001';
const MANIFEST = `${OUT}/upload-manifest-r0001.json`;
const ROOT = 'vocabflow/owner/production-expansion-4997-20261101-r0001';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = (b, type = 'sha256') => createHash(type).update(b).digest('hex');
const save = (p, value) => { writeFileSync(`${p}.writing`, JSON.stringify(value, null, 2) + '\n'); renameSync(`${p}.writing`, p); };
const safeCode = e => /^[A-Z0-9_:-]{3,100}$/.test(e?.code ?? e?.message ?? '') ? e.code ?? e.message : 'UPLOAD_OR_VERIFICATION_FAILED';

async function main() {
  const args = process.argv.slice(2);
  assert(args.every(x => ['--apply', '--canary'].includes(x)), 'UNKNOWN_ARGUMENT');
  const manifest = read(MANIFEST), manifestSha256 = hash(readFileSync(MANIFEST));
  assert.equal(manifest.counts.items, 4997);
  assert.equal(manifest.assets.length, manifest.counts.uniqueAssets);
  assert.equal(manifest.counts.bindings, 14991);
  assert.equal(hash(readFileSync(manifest.sourceDataset.path)), manifest.sourceDataset.sha256);
  const env = parseEnv(readFileSync('.env', 'utf8'));
  const baseline = read('data/owner-publication/catalog-1547-r0001.json');
  const originalImage = baseline.items[0].content?.media?.image ?? baseline.items[0].media?.image;
  assert(originalImage, 'BASELINE_IMAGE_MISSING');
  assert.equal(new URL(originalImage).pathname.split('/')[1], env.CLOUDINARY_CLOUD_NAME, 'CLOUDINARY_ACCOUNT_MISMATCH');
  cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
  mkdirSync(`${OUT}/upload-records`, { recursive: true });
  const assets = manifest.assets;
  for (const asset of assets) {
    assert.equal(asset.publicId, `${ROOT}/${asset.resourceType === 'image' ? 'images' : 'audio'}/${asset.sha256}`);
    assert.equal(asset.folder, asset.resourceType === 'image' ? 'Vocab/images' : 'Vocab/audio');
  }
  if (!args.includes('--apply')) {
    console.log(JSON.stringify({ status: 'UPLOAD_DRY_RUN', ...manifest.counts, manifestSha256, cloudWrites: 0 }));
    return;
  }
  const usage = await cloudinary.api.usage();
  save(`${OUT}/cloud-usage-before.current.json`, { plan: usage.plan, storage: usage.storage, credits: usage.credits });
  const largest = assets.filter(a => a.resourceType === 'image').sort((a, b) => b.byteLength - a.byteLength)[0];
  const wanted = args.includes('--canary') ? [largest, ...assets.filter(a => a !== largest).slice(0, 11)] : assets;
  const recorded = new Map();
  for (const name of readdirSync(`${OUT}/upload-records`)) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
    const r = read(`${OUT}/upload-records/${name}`);
    assert.equal(r.manifestSha256, manifestSha256, 'UPLOAD_RECORD_MANIFEST_MISMATCH');
    recorded.set(r.sourceSha256, r);
  }
  let next = 0, finished = 0;
  const failures = {};
  const summary = () => ({ status: 'UPLOADING', manifestSha256, selected: wanted.length, finished,
    uploaded: recorded.size, expected: assets.length, failures, oldAssetsDeleted: 0 });
  const timer = setInterval(() => {
    save(`${OUT}/upload-progress.current.json`, summary());
    console.log(JSON.stringify({ phase: 'UPLOAD_PROGRESS', finished, uploaded: recorded.size, failures: Object.keys(failures).length }));
  }, 30000);
  try {
    await Promise.all(Array.from({ length: 12 }, async () => {
      while (next < wanted.length) {
        const asset = wanted[next++];
        try {
          const bytes = readFileSync(asset.repoRelativePath);
          assert.equal(bytes.length, asset.byteLength);
          assert.equal(hash(bytes), asset.sha256, 'SOURCE_MEDIA_CHANGED');
          if (recorded.has(asset.sha256)) {
            assert.equal(recorded.get(asset.sha256).publicId, asset.publicId);
            finished++;
            continue;
          }
          let result;
          for (let attempt = 1; attempt <= 6; attempt++) {
            try {
              result = await cloudinary.uploader.upload(asset.repoRelativePath, {
                resource_type: asset.resourceType, type: 'upload', public_id: asset.publicId,
                asset_folder: asset.folder, overwrite: false, unique_filename: false, use_filename: false,
                tags: ['vocabflow-owner-publication', manifest.expansionId],
                context: { source_sha256: asset.sha256 }, timeout: 120000,
              });
              break;
            } catch (error) {
              if (attempt === 6 || (error?.http_code && ![408, 420, 429, 500, 502, 503, 504].includes(error.http_code))) throw error;
              await new Promise(r => setTimeout(r, Math.min(32000, 1000 * 2 ** (attempt - 1))));
            }
          }
          if (result.existing) result = await cloudinary.api.resource(asset.publicId, { resource_type: asset.resourceType, type: 'upload', context: true });
          assert.equal(result.public_id, asset.publicId);
          assert.equal(result.bytes, asset.byteLength);
          assert.equal(result.etag, hash(bytes, 'md5'), 'CLOUDINARY_ORIGINAL_ETAG_MISMATCH');
          assert.equal(new URL(result.secure_url).hostname, 'res.cloudinary.com');
          const record = { manifestSha256, sourceSha256: asset.sha256, sourceByteLength: asset.byteLength,
            sourcePath: asset.repoRelativePath, publicId: result.public_id, assetId: result.asset_id,
            resourceType: asset.resourceType, folder: asset.folder, version: result.version, format: result.format,
            etag: result.etag, originalUrl: result.secure_url,
            deliveryUrl: asset.resourceType === 'image' ? cloudinary.url(asset.publicId, {
              resource_type: 'image', type: 'upload', secure: true, version: result.version,
              format: result.format, width: 960, crop: 'limit', quality: 'auto', fetch_format: 'auto',
            }) : result.secure_url, uploadBytesAndEtagMatch: true };
          writeFileSync(`${OUT}/upload-records/${asset.sha256}.json`, JSON.stringify(record) + '\n', { flag: 'wx' });
          recorded.set(asset.sha256, record);
        } catch (error) {
          failures[asset.sha256] = { code: safeCode(error), httpCode: error?.http_code ?? null };
        }
        finished++;
      }
    }));
  } finally {
    clearInterval(timer);
  }
  const status = recorded.size === assets.length && !Object.keys(failures).length
    ? 'ALL_ORIGINALS_UPLOADED_BYTES_VERIFIED' : args.includes('--canary') && !Object.keys(failures).length ? 'CANARY_PASS' : 'PARTIAL_WITH_FAILURES';
  save(`${OUT}/upload-progress.current.json`, { ...summary(), status });
  save(`${OUT}/upload-checkpoint.current.json`, { ...summary(), status, assets: Object.fromEntries(recorded) });
  console.log(JSON.stringify({ status, uploaded: recorded.size, expected: assets.length, failures: Object.keys(failures).length }));
  if (Object.keys(failures).length) process.exitCode = 1;
}
main().catch(e => { console.error(JSON.stringify({ status: 'UPLOAD_STOPPED', code: safeCode(e) })); process.exitCode = 1; });
