import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, bytes, safe, sha } from './editorial-canary-lib-v1.mjs';

export const PRODUCTION_ROOT = '.vocabflow-local/editorial-refresh-20261028/media-production-r0001';
const json = p => JSON.parse(readFileSync(p, 'utf8'));
export function detectMedia(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { extension: 'png', mimeType: 'image/png', dimensions: { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) } };
  if (buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return { extension: 'jpg', mimeType: 'image/jpeg' };
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') return { extension: 'wav', mimeType: 'audio/wav' };
  if (buffer.toString('ascii', 0, 3) === 'ID3' || (buffer[0] === 255 && (buffer[1] & 224) === 224)) return { extension: 'mp3', mimeType: 'audio/mpeg' };
  if (buffer.toString('ascii', 4, 8) === 'ftyp') return { extension: 'm4a', mimeType: 'audio/mp4' };
  throw new Error('UNSUPPORTED_OR_NOT_MEDIA_BYTES');
}
export function intakeDownload({ jobId, sourcePath, sourcePage, labelObserved, providerEvidence, cleanupDownloadedSource = false }, rootRelative = PRODUCTION_ROOT) {
  const root = safe(process.cwd(), rootRelative), orderPath = safe(root, 'work-orders.json');
  const ordersBytes = readFileSync(orderPath), orders = JSON.parse(ordersBytes), order = orders.jobs.find(j => j.jobId === jobId);
  assert(sha(ordersBytes) === readFileSync(safe(root, 'work-orders.sha256'), 'utf8').trim(), 'WORK_ORDERS_PIN_MISMATCH');
  assert(order?.executionAllowed && order.state !== 'OMITTED', 'JOB_NOT_AUTHORIZED');
  assert(typeof sourcePage === 'string' && sourcePage.startsWith('https://muse.ai/'), 'UNEXPECTED_SOURCE_PROVIDER');
  assert(labelObserved === (order.kind === 'IMAGE' ? order.target.runtimeVocabularyId : order.request.text), 'OBSERVED_LABEL_DOES_NOT_MATCH_TARGET');
  const allowedDownloads = realpathSync('D:/Download'), source = realpathSync(sourcePath), relation = path.relative(allowedDownloads, source);
  assert(relation && !relation.startsWith('..') && !path.isAbsolute(relation) && statSync(source).isFile(), 'SOURCE_OUTSIDE_SESSION_DOWNLOAD_ROOT');
  assert(providerEvidence && existsSync(safe(root, providerEvidence)), 'PROVIDER_EVIDENCE_REQUIRED');
  const data = readFileSync(source), contentHash = sha(data), media = detectMedia(data);
  assert((order.kind === 'IMAGE') === media.mimeType.startsWith('image/'), 'WRONG_MEDIA_KIND');
  const relative = `${order.relativeAttemptRoot}/output.${media.extension}`, output = safe(root, relative), receiptFile = safe(root, `${order.relativeAttemptRoot}/receipt.json`);
  mkdirSync(path.dirname(output), { recursive: true });
  if (existsSync(output)) assert(sha(readFileSync(output)) === contentHash, 'ATTEMPT_OUTPUT_CONFLICT');
  else writeFileSync(output, data, { flag: 'wx' });
  assert(sha(readFileSync(output)) === contentHash && statSync(output).size === data.length, 'COPIED_OUTPUT_MISMATCH');
  const assetRelative = `assets/${order.kind === 'IMAGE' ? 'images' : 'audio'}/${contentHash}.${media.extension}`, asset = safe(root, assetRelative);
  mkdirSync(path.dirname(asset), { recursive: true });
  if (existsSync(asset)) assert(sha(readFileSync(asset)) === contentHash, 'ASSET_HASH_COLLISION'); else copyFileSync(output, asset);
  const receipt = { artifactType: 'PILOT_REAL_MEDIA_RECEIPT', schemaVersion: 1, jobId, kind: order.kind,
    attemptId: order.attemptId, workerId: 'current-coordinator-muse-ui', action: 'GENERATED_AND_UI_DOWNLOADED',
    manifestPin: order.manifestPin, workOrders: { path: `${rootRelative}/work-orders.json`, byteSha256: sha(ordersBytes) },
    target: order.target, draftVariantId: order.draftVariantId, exampleDraftRef: order.exampleDraftRef,
    sourceDraftDependencyHash: order.sourceDraftDependencyHash, providerRequestHash: order.providerRequestHash,
    provider: { service: 'MUSE_LOGGED_IN_UI', sourcePage, reportedConfigEvidence: providerEvidence, evidenceByteSha256: sha(readFileSync(safe(root, providerEvidence))),
      caveat: 'Voice/model claims from Muse response are reported metadata, not independent speaker verification.' },
    requestedText: order.kind === 'IMAGE' ? null : order.request.text, observedLabel: labelObserved,
    exactPromptOrBrief: order.request, sourceDownloadPath: source,
    output: { relativePath: relative, repoRelativePath: `${rootRelative}/${relative}`, sha256: contentHash, byteLength: data.length,
      mimeType: media.mimeType, dimensions: media.dimensions ?? null, durationMs: null, assetRelativePath: assetRelative },
    createdAtUtc: new Date().toISOString(), reviewStatus: 'REVIEW_REQUIRED', runtimeEligible: false,
    rights: { status: 'MUSE_GENERATED_PENDING_APPLICABLE_TERMS_REVIEW', ownerGenerationAuthorization: true, reusedApkgAttestation: false } };
  if (existsSync(receiptFile)) { const previous = json(receiptFile); assert(previous.jobId === jobId && previous.output.sha256 === contentHash, 'RECEIPT_CONFLICT'); }
  else writeFileSync(receiptFile, bytes(receipt), { flag: 'wx' });
  const cleanup = { jobId, sourcePath: source, destinationRelative: `${rootRelative}/${relative}`, byteSha256: contentHash, copiedBytesVerified: true, deletedSource: false };
  if (cleanupDownloadedSource) {
    // User explicitly requested session-download cleanup. Never enumerate/delete unrelated files.
    assert(sha(readFileSync(source)) === contentHash && sha(readFileSync(output)) === contentHash && sha(readFileSync(asset)) === contentHash, 'CLEANUP_HASH_CHANGED');
    assert(path.dirname(realpathSync(source)) === allowedDownloads, 'CLEANUP_REQUIRES_DIRECT_DOWNLOAD_CHILD');
    unlinkSync(source); cleanup.deletedSource = !existsSync(source);
  }
  const record = safe(root, `${order.relativeAttemptRoot}/download-transfer.json`);
  if (!existsSync(record)) writeFileSync(record, bytes(cleanup), { flag: 'wx' });
  return { jobId, kind: order.kind, outputRelativePath: `${rootRelative}/${relative}`, receiptRelativePath: `${rootRelative}/${order.relativeAttemptRoot}/receipt.json`, sha256: contentHash, bytes: data.length, deletedSource: cleanup.deletedSource };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const input = json(safe(process.cwd(), process.argv[2])); const results = input.downloads.map(d => intakeDownload(d, input.rootRelative ?? PRODUCTION_ROOT)); console.log(JSON.stringify({ status: 'INTAKEN_REVIEW_REQUIRED', outputs: results }, null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
