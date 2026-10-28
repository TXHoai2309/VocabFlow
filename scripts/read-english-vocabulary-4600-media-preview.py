"""Read one hash-pinned APKG media member for the loopback review UI."""

import hashlib
import sys
import zipfile
from pathlib import Path


def read_one(apkg_path: str, archive_entry: str, expected_sha256: str) -> bytes:
    path = Path(apkg_path)
    if not path.is_file() or not archive_entry.isdigit() or len(expected_sha256) != 64:
        raise ValueError("PINNED_MEDIA_SOURCE_INVALID")
    with zipfile.ZipFile(path, "r") as archive:
        info = archive.getinfo(archive_entry)
        if info.file_size <= 0 or info.file_size > 40 * 1024 * 1024:
            raise ValueError("PINNED_MEDIA_SIZE_INVALID")
        content = archive.read(archive_entry)
    if hashlib.sha256(content).hexdigest() != expected_sha256:
        raise ValueError("PINNED_MEDIA_HASH_MISMATCH")
    return content


if __name__ == "__main__":
    try:
        sys.stdout.buffer.write(read_one(sys.argv[1], sys.argv[2], sys.argv[3]))
    except (IndexError, OSError, ValueError, zipfile.BadZipFile, KeyError) as error:
        sys.stderr.write(str(error) if str(error).isupper() else "PINNED_MEDIA_READ_FAILED")
        sys.exit(2)
