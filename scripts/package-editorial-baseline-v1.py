"""Ticket 01 local handoff archive: exact frozen JSON/source bytes plus media.

No extraction, deletion, database, remote access, or provider calls. Verification
reads every archived byte against the frozen hashes, independent of old paths.
"""
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path.cwd().resolve()
CAMPAIGN = "editorial-refresh-20261028"
REVISION = "baseline-v2"
BASELINE_REL = f"vocabflow-dataset/workspaces/{CAMPAIGN}/{REVISION}"
HANDOFF_REL = f".vocabflow-local/{CAMPAIGN}/handoff"


def require(condition, code):
    if not condition:
        raise ValueError(code)


def safe(relative):
    candidate = (ROOT / relative).resolve()
    require(candidate != ROOT and candidate.is_relative_to(ROOT), "PATH_OUTSIDE_WORKSPACE")
    return candidate


def sha(data):
    return hashlib.sha256(data).hexdigest()


def file_sha(file):
    value = hashlib.sha256()
    with file.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def media_name(asset):
    require(re.fullmatch(r"[0-9a-f]{64}", asset["mediaSha256"]), "INVALID_MEDIA_HASH")
    extension = Path(asset["local"]["path"]).suffix.lower()
    require(extension in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3", ".wav", ".ogg", ".m4a"}, "INVALID_MEDIA_EXTENSION")
    folder = "images" if asset["mediaKind"] == "IMAGE" else "audio"
    return f"media-bytes/{folder}/{asset['mediaSha256']}{extension}"


def archive_paths():
    baseline = safe(BASELINE_REL)
    manifest_bytes = (baseline / "baseline-manifest.json").read_bytes()
    digest = sha(manifest_bytes)
    require((baseline / "baseline-manifest.json.sha256").read_text().strip() == digest, "BASELINE_MANIFEST_HASH_MISMATCH")
    handoff = safe(HANDOFF_REL)
    archive = handoff / f"{REVISION}-{digest}.zip"
    return baseline, json.loads(manifest_bytes), digest, archive


def verify_archive(archive, expected_baseline_hash):
    with zipfile.ZipFile(archive, "r") as bundle:
        names = bundle.namelist()
        require(len(names) == len(set(names)), "DUPLICATE_ZIP_ENTRY")
        require(all(not x.startswith(("/", "\\")) and ".." not in Path(x).parts for x in names), "UNSAFE_ZIP_PATH")
        handoff = json.loads(bundle.read("handoff-manifest.json"))
        prefix = handoff["baselinePrefix"]
        manifest_bytes = bundle.read(prefix + "baseline-manifest.json")
        require(sha(manifest_bytes) == expected_baseline_hash, "ARCHIVED_BASELINE_HASH_MISMATCH")
        require(bundle.read(prefix + "baseline-manifest.json.sha256").decode().strip() == expected_baseline_hash, "ARCHIVED_SIDECAR_MISMATCH")
        manifest = json.loads(manifest_bytes)
        assets = json.loads(bundle.read(prefix + "media/media-inventory.assets.json"))["assets"]
        expected = {prefix + p["path"]: (p["byteSha256"], p["byteLength"]) for p in manifest["files"]}
        expected[prefix + "baseline-manifest.json"] = (sha(manifest_bytes), len(manifest_bytes))
        sidecar = bundle.read(prefix + "baseline-manifest.json.sha256")
        expected[prefix + "baseline-manifest.json.sha256"] = (sha(sidecar), len(sidecar))
        for asset in assets:
            expected[media_name(asset)] = (asset["mediaSha256"], asset["expectedByteLength"])
        require(set(names) == set(expected) | {"handoff-manifest.json"}, "MISSING_OR_EXTRA_ZIP_ENTRIES")
        for name, (expected_hash, size) in expected.items():
            value = hashlib.sha256()
            count = 0
            with bundle.open(name) as member:
                for chunk in iter(lambda: member.read(1024 * 1024), b""):
                    value.update(chunk)
                    count += len(chunk)
            require(value.hexdigest() == expected_hash and count == size, "ARCHIVED_BYTES_MISMATCH")
        return {"verifiedEntries": len(names), "verifiedMediaAssets": len(assets), "baselineFiles": len(manifest["files"]) + 2}


def pack():
    baseline, manifest, baseline_hash, archive = archive_paths()
    require(not archive.exists(), "HANDOFF_ARCHIVE_ALREADY_EXISTS")
    archive.parent.mkdir(parents=True, exist_ok=True)
    assets = json.loads((baseline / "media/media-inventory.assets.json").read_bytes())["assets"]
    prefix = f"{REVISION}/"
    temporary = archive.with_suffix(".zip.tmp")
    require(not temporary.exists(), "HANDOFF_TEMPORARY_ARCHIVE_EXISTS")
    with zipfile.ZipFile(temporary, "x", allowZip64=True) as bundle:
        def add(file, name, expected_hash, size, compress):
            value = hashlib.sha256()
            count = 0
            entry = zipfile.ZipInfo(name, (2026, 10, 29, 1, 46, 50))
            entry.compress_type = zipfile.ZIP_DEFLATED if compress else zipfile.ZIP_STORED
            with file.open("rb") as stream, bundle.open(entry, "w", force_zip64=True) as member:
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    value.update(chunk)
                    count += len(chunk)
                    member.write(chunk)
            require(value.hexdigest() == expected_hash and count == size, "SOURCE_CHANGED_DURING_PACK")

        for pin in manifest["files"]:
            file = (baseline / pin["path"]).resolve()
            require(file.is_relative_to(baseline), "BASELINE_MEMBER_OUTSIDE_ROOT")
            add(file, prefix + pin["path"], pin["byteSha256"], pin["byteLength"], True)
        for name in ("baseline-manifest.json", "baseline-manifest.json.sha256"):
            file = baseline / name
            add(file, prefix + name, file_sha(file), file.stat().st_size, True)
        for asset in assets:
            add(safe(asset["local"]["path"]), media_name(asset), asset["mediaSha256"], asset["expectedByteLength"], False)
        handoff = {"artifactType": "PORTABLE_EDITORIAL_BASELINE_HANDOFF", "schemaVersion": 1,
                   "baselineId": REVISION, "baselinePrefix": prefix, "baselineManifestSha256": baseline_hash,
                   "mediaLayout": "media-bytes/{images|audio}/<sha256>.<extension>", "mediaAssetCount": len(assets),
                   "allOperationalSourceBytesIncluded": True, "historicalRawPrimaryEvidenceFullyReplayed": False,
                   "databaseWrites": 0, "contentActivation": False, "offMachineBackupConfigured": False}
        bundle.writestr("handoff-manifest.json", json.dumps(handoff, ensure_ascii=False, indent=2) + "\n", compress_type=zipfile.ZIP_DEFLATED)
    # Both paths resolve inside the explicit handoff directory before moving.
    require(temporary.resolve().parent == archive.parent.resolve() and archive.resolve().parent == archive.parent.resolve(), "HANDOFF_TARGET_CHANGED")
    require(not archive.exists(), "HANDOFF_ARCHIVE_ALREADY_EXISTS")
    temporary.rename(archive)
    verification = verify_archive(archive, baseline_hash)
    receipt = {"artifactType": "VERIFIED_LOCAL_HANDOFF_RECEIPT", "status": "VERIFIED", "campaignId": CAMPAIGN,
               "baselineId": REVISION, "baselineManifestSha256": baseline_hash,
               "archivePath": archive.relative_to(ROOT).as_posix(), "archiveByteSha256": file_sha(archive),
               "archiveByteLength": archive.stat().st_size, **verification,
               "databaseAccess": False, "databaseWrites": 0, "remoteAccess": False}
    with archive.with_suffix(".receipt.json").open("x", encoding="utf-8") as stream:
        json.dump(receipt, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == "__main__":
    try:
        mode = sys.argv[1] if len(sys.argv) > 1 else ""
        if mode == "pack":
            pack()
        elif mode == "verify":
            _, _, expected, archive = archive_paths()
            receipt_file = archive.with_suffix(".receipt.json")
            receipt = json.loads(receipt_file.read_bytes())
            require(file_sha(archive) == receipt["archiveByteSha256"], "ARCHIVE_RECEIPT_SHA256_MISMATCH")
            print(json.dumps({"status": "HANDOFF_VERIFIED", **verify_archive(archive, expected)}))
        else:
            raise ValueError("USAGE: python scripts/package-editorial-baseline-v1.py pack|verify")
    except Exception as error:
        print(json.dumps({"status": "HANDOFF_FAILED", "code": str(error)}), file=sys.stderr)
        sys.exit(1)
