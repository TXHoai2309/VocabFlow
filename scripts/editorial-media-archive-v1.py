"""Bounded local Muse ZIP intake. No provider, browser, DB or activation access."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import struct
import zipfile

DEFAULT_ROOT = ".vocabflow-local/editorial-refresh-20261028/media-production-r0001"
DOWNLOAD_ROOT = Path("D:/Download")
SOURCE_PAGE = "https://muse.ai/thread/ac1ff166-8ec4-493b-b6dd-01d27a5ce6a0"
MAX_MEMBERS, MAX_TOTAL, MAX_MEMBER = 256, 512 * 1024**2, 128 * 1024**2
KIND_MAP = {"word": "WORD_AUDIO", "example": "EXAMPLE_AUDIO", "image": "IMAGE"}


def require(value, reason):
    if not value:
        raise ValueError(reason)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def read_json(path):
    return json.loads(Path(path).read_bytes())


def checked_name(name):
    require(isinstance(name, str) and name and len(name) <= 240, "INVALID_MEMBER_NAME")
    require(not name.startswith("/") and "\\" not in name and ":" not in name and "\0" not in name, "UNSAFE_MEMBER_PATH")
    parts = name.removesuffix("/").split("/")
    require(all(p and p not in (".", "..") and not p.endswith((".", " ")) for p in parts), "UNSAFE_MEMBER_PATH")
    require(not any(re.fullmatch(r"(?i:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?", p) for p in parts), "WINDOWS_RESERVED_MEMBER")
    return name


def safe(root, relative):
    checked_name(relative)
    root = Path(root).resolve()
    target = root.joinpath(*PurePosixPath(relative).parts)
    require(target.resolve().is_relative_to(root), "OUTPUT_OUTSIDE_ROOT")
    current = target
    while current != root:
        require(not current.is_symlink() and not getattr(current, "is_junction", lambda: False)(), "OUTPUT_LINK_NOT_ALLOWED")
        current = current.parent
    return target


def immutable(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        require(path.read_bytes() == data, "IMMUTABLE_BYTES_CONFLICT")
    else:
        with path.open("xb") as output:
            output.write(data)


def media_type(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        require(len(data) >= 33 and data[12:16] == b"IHDR", "INVALID_PNG_HEADER")
        w, h = struct.unpack(">II", data[16:24])
        require(0 < w <= 16384 and 0 < h <= 16384, "INVALID_IMAGE_DIMENSIONS")
        return {"extension": "png", "mimeType": "image/png", "dimensions": {"width": w, "height": h}}
    if data.startswith(b"ID3") or (len(data) >= 2 and data[0] == 255 and data[1] & 224 == 224):
        return {"extension": "mp3", "mimeType": "audio/mpeg", "dimensions": None}
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return {"extension": "wav", "mimeType": "audio/wav", "dimensions": None}
    if len(data) >= 12 and data[4:8] == b"ftyp":
        return {"extension": "m4a", "mimeType": "audio/mp4", "dimensions": None}
    raise ValueError("UNSUPPORTED_OR_INVALID_MEDIA_BYTES")


def validate_members(archive):
    members = archive.infolist()
    require(0 < len(members) <= MAX_MEMBERS, "ZIP_MEMBER_LIMIT")
    require(sum(i.file_size for i in members) <= MAX_TOTAL, "ZIP_TOTAL_SIZE_LIMIT")
    seen, basenames = set(), set()
    for info in members:
        # ZipInfo normalizes native Windows backslashes; inspect raw/original spelling too.
        checked_name(info.orig_filename)
        checked_name(info.filename)
        require(info.filename.casefold() not in seen, "CASE_OR_PATH_COLLISION")
        seen.add(info.filename.casefold())
        mode = info.external_attr >> 16
        require(not stat.S_ISLNK(mode) and stat.S_IFMT(mode) in (0, stat.S_IFREG, stat.S_IFDIR), "ZIP_SPECIAL_FILE")
        require(not info.flag_bits & 1, "ENCRYPTED_ZIP_NOT_ALLOWED")
        require(info.file_size <= MAX_MEMBER, "ZIP_MEMBER_SIZE_LIMIT")
        require(info.file_size <= max(info.compress_size * 1000, 1024 * 1024), "ZIP_COMPRESSION_RATIO_LIMIT")
        if info.is_dir():
            continue
        name = PurePosixPath(info.filename).name.casefold()
        require(name not in basenames, "DUPLICATE_MEMBER_BASENAME")
        basenames.add(name)
        require(name == "mapping.json" or Path(name).suffix in (".png", ".mp3", ".wav", ".m4a"), "UNEXPECTED_ARCHIVE_FILE")
    require("mapping.json" in basenames, "MAPPING_JSON_REQUIRED")
    return members


def intake(source, root=DEFAULT_ROOT, cleanup=False, download_root=DOWNLOAD_ROOT, orders_relative="work-orders.json", mapping_override=None):
    workspace = Path.cwd().resolve()
    root_arg = Path(root)
    root_path = root_arg.resolve()
    require(root_path.is_relative_to(workspace) and root_path != workspace, "PRODUCTION_ROOT_OUTSIDE_WORKSPACE")
    root_relative = root_path.relative_to(workspace).as_posix()
    require(not root_arg.is_symlink() and not getattr(root_arg, "is_junction", lambda: False)(), "PRODUCTION_ROOT_LINK")
    allowed = Path(download_root).resolve(strict=True)
    raw_source = Path(source)
    require(not raw_source.is_symlink(), "SOURCE_LINK_NOT_ALLOWED")
    source = raw_source.resolve(strict=True)
    require(source.parent == allowed and source.is_file() and source.suffix.lower() == ".zip", "SOURCE_MUST_BE_DIRECT_DOWNLOAD_ZIP")
    require(source.stat().st_size <= MAX_TOTAL, "COMPRESSED_ARCHIVE_SIZE_LIMIT")
    orders_path = safe(root_path, orders_relative)
    orders_bytes = orders_path.read_bytes()
    orders_sha = sha(orders_bytes)
    require(orders_sha == safe(root_path, orders_relative.removesuffix(".json") + ".sha256").read_text().strip(), "WORK_ORDERS_PIN_MISMATCH")
    orders = json.loads(orders_bytes)
    draft_path = safe(workspace, orders["sourceDraft"]["path"])
    draft_bytes = draft_path.read_bytes()
    require(sha(draft_bytes) == orders["sourceDraft"]["byteSha256"], "SOURCE_DRAFT_PIN_MISMATCH")
    draft = json.loads(draft_bytes)
    by_id = {i["runtimeVocabularyId"]: i for i in draft["items"]}
    archive_bytes = source.read_bytes()
    archive_sha = sha(archive_bytes)
    archive_relative = f"provider-bundles/{archive_sha}.zip"
    metadata_relative = f"provider-bundles/{archive_sha}.json"
    plans, member_records = [], []
    with zipfile.ZipFile(source) as archive:
        members = validate_members(archive)
        mapping_info = next(i for i in members if PurePosixPath(i.filename).name.casefold() == "mapping.json")
        mapping_bytes = archive.read(mapping_info)
        mapping = json.loads(mapping_bytes)
        original_mapping_sha = sha(mapping_bytes)
        if mapping_override:
            mapping_bytes = safe(root_path, mapping_override).read_bytes()
            mapping = json.loads(mapping_bytes)
        require(isinstance(mapping, list) and len(mapping) <= 256, "INVALID_MAPPING")
        for row in mapping:
            require(isinstance(row, dict) and row.get("kind") in KIND_MAP and isinstance(row.get("filename"), str), "INVALID_MAPPING_ROW")
            checked_name(row["filename"])
        for info in members:
            if info.is_dir():
                continue
            data = archive.read(info)  # zipfile verifies CRC; bounded sizes were checked first.
            require(len(data) == info.file_size, "ZIP_MEMBER_SIZE_MISMATCH")
            member_records.append({"path": info.filename, "byteSha256": sha(data), "byteLength": len(data)})
            if info == mapping_info:
                continue
            name = PurePosixPath(info.filename).name
            matches = [r for r in mapping if PurePosixPath(r["filename"]).name.casefold() == name.casefold()]
            require(len(matches) == 1, "MAPPING_MEMBER_NOT_UNIQUE")
            row = matches[0]
            matches = [j for j in orders["jobs"] if j["kind"] == KIND_MAP[row["kind"]]
                       and by_id.get(j["target"]["runtimeVocabularyId"], {}).get("headword") == row.get("word")]
            require(len(matches) == 1, "UNKNOWN_OR_AMBIGUOUS_JOB")
            order = matches[0]
            require(order.get("executionAllowed") is True and order["state"] != "OMITTED", "JOB_NOT_AUTHORIZED")
            require(order["kind"] == "IMAGE" or row.get("exactText") == order["request"].get("text"), "INCORRECT_EXACT_TEXT")
            media = media_type(data)
            require((order["kind"] == "IMAGE") == media["mimeType"].startswith("image/"), "WRONG_MEDIA_KIND")
            require(name.lower().endswith("." + media["extension"]), "FILE_EXTENSION_MIME_MISMATCH")
            output_relative = f'{order["relativeAttemptRoot"]}/output.{media["extension"]}'
            receipt_relative = f'{order["relativeAttemptRoot"]}/receipt.json'
            out = safe(root_path, output_relative)
            receipt = safe(root_path, receipt_relative)
            data_sha = sha(data)
            if out.exists():
                require(sha(out.read_bytes()) == data_sha, "ATTEMPT_OUTPUT_CONFLICT_REQUIRES_NEW_ATTEMPT")
            if receipt.exists():
                old = read_json(receipt)
                require(old.get("jobId") == order["jobId"] and old.get("attemptId") == order["attemptId"]
                        and old.get("target") == order["target"] and old.get("output", {}).get("sha256") == data_sha, "RECEIPT_CONFLICT")
            plans.append({"row": row, "order": order, "data": data, "sha": data_sha, "media": media,
                          "member": info.filename, "outputRelative": output_relative, "receiptRelative": receipt_relative})
    require(plans and len({p["order"]["jobId"] for p in plans}) == len(plans), "DUPLICATE_OR_EMPTY_JOBS")
    # No writes occur until the entire archive and all bindings/conflicts pass preflight.
    immutable(safe(root_path, archive_relative), archive_bytes)
    outputs = []
    for p in plans:
        order, media = p["order"], p["media"]
        out = safe(root_path, p["outputRelative"])
        immutable(out, p["data"])
        asset_relative = f'assets/{"images" if order["kind"] == "IMAGE" else "audio"}/{p["sha"]}.{media["extension"]}'
        immutable(safe(root_path, asset_relative), p["data"])
        receipt_path = safe(root_path, p["receiptRelative"])
        if not receipt_path.exists():
            receipt = {"artifactType": "PILOT_REAL_MEDIA_RECEIPT", "schemaVersion": 1, "jobId": order["jobId"], "kind": order["kind"],
                       "attemptId": order["attemptId"], "workerId": "/root/media_archive_intake", "action": "GENERATED_AND_UI_ZIP_DOWNLOADED",
                       "manifestPin": order["manifestPin"], "workOrders": {"path": root_relative + "/" + orders_relative, "byteSha256": orders_sha},
                       "target": order["target"], "draftVariantId": order["draftVariantId"], "exampleDraftRef": order.get("exampleDraftRef"),
                       "sourceDraftDependencyHash": order["sourceDraftDependencyHash"], "providerRequestHash": order["providerRequestHash"],
                       "requestedText": None if order["kind"] == "IMAGE" else order["request"]["text"], "exactPromptOrBrief": order["request"],
                       "provider": {"service": "MUSE_LOGGED_IN_UI", "sourcePage": SOURCE_PAGE, "reportedVoice": p["row"].get("actualVoice"),
                                    "reportedConfigEvidence": metadata_relative, "caveat": "Muse mapping voice claims are reported metadata, not independent speaker verification."},
                       "sourceArchive": {"path": archive_relative, "byteSha256": archive_sha, "memberPath": p["member"], "memberSha256": p["sha"]},
                       "output": {"relativePath": p["outputRelative"], "repoRelativePath": root_relative + "/" + p["outputRelative"],
                                  "sha256": p["sha"], "byteLength": len(p["data"]), "mimeType": media["mimeType"], "dimensions": media["dimensions"],
                                  "durationMs": None, "assetRelativePath": asset_relative},
                       "createdAtUtc": datetime.now(timezone.utc).isoformat(), "reviewStatus": "REVIEW_REQUIRED", "runtimeEligible": False,
                       "rights": {"status": "MUSE_GENERATED_PENDING_APPLICABLE_TERMS_REVIEW", "ownerGenerationAuthorization": True, "reusedApkgAttestation": False}}
            immutable(receipt_path, encode(receipt))
        require(sha(out.read_bytes()) == p["sha"] and sha(safe(root_path, asset_relative).read_bytes()) == p["sha"], "FINAL_MEDIA_REHASH_FAILED")
        outputs.append({"jobId": order["jobId"], "kind": order["kind"], "word": p["row"]["word"], "exactText": p["row"].get("exactText"),
                        "sourceMember": p["member"], "outputRelative": p["outputRelative"], "outputSha256": p["sha"], "byteLength": len(p["data"]),
                        "receiptRelative": p["receiptRelative"], "receiptSha256": sha(receipt_path.read_bytes()), "runtimeEligible": False})
    metadata = {"artifactType": "MUSE_ARCHIVE_INTAKE_EVIDENCE", "schemaVersion": 1, "sourcePage": SOURCE_PAGE,
                "sourceDownloadName": source.name, "sourceArchive": {"relativePath": archive_relative, "byteSha256": archive_sha, "byteLength": len(archive_bytes)},
                "workOrdersSha256": orders_sha, "members": member_records, "providerMapping": mapping,
                "mappingByteSha256": sha(mapping_bytes), "originalMappingByteSha256": original_mapping_sha, "explicitMappingOverride": mapping_override, "outputs": outputs, "status": "INTAKEN_REVIEW_REQUIRED", "runtimeEligible": False}
    metadata_path = safe(root_path, metadata_relative)
    if metadata_path.exists():
        previous = read_json(metadata_path)
        # Browser duplicate-download suffixes do not create a new archive identity.
        metadata["sourceDownloadName"] = previous["sourceDownloadName"]
    immutable(metadata_path, encode(metadata))
    require(sha(safe(root_path, archive_relative).read_bytes()) == archive_sha, "ARCHIVE_COPY_REHASH_FAILED")
    deleted = False
    if cleanup:
        require(source.resolve().parent == allowed and not source.is_symlink(), "CLEANUP_WRONG_ROOT")
        require(sha(source.read_bytes()) == archive_sha, "DOWNLOAD_CHANGED_BEFORE_CLEANUP")
        source.unlink()  # Exactly the verified literal source file, never a recursive or enumerated delete.
        deleted = not source.exists()
    transfer = {"artifactType": "VERIFIED_ARCHIVE_DOWNLOAD_TRANSFER", "sourcePath": str(source), "archiveRelative": archive_relative,
                "archiveSha256": archive_sha, "finalMediaFilesVerified": len(outputs), "deletedSource": deleted}
    transfer_path = safe(root_path, f"provider-bundles/{archive_sha}.transfer.json")
    if not transfer_path.exists():
        immutable(transfer_path, encode(transfer))
    return {"status": "INTAKEN_REVIEW_REQUIRED", "rootRelative": root_relative, "archiveSha256": archive_sha,
            "outputs": len(outputs), "metadataRelative": metadata_relative, "deletedSource": deleted, "runtimeEligible": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source")
    parser.add_argument("--root", default=DEFAULT_ROOT)
    parser.add_argument("--cleanup-download", action="store_true")
    parser.add_argument("--work-orders", default="work-orders.json")
    parser.add_argument("--mapping-override")
    args = parser.parse_args()
    print(json.dumps(intake(args.source, args.root, args.cleanup_download, orders_relative=args.work_orders, mapping_override=args.mapping_override), indent=2))
