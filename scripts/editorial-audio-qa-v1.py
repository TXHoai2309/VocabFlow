"""Offline ticket06 audio QA. Never generates speech or activates runtime content.

Usage: <isolated-python> scripts/editorial-audio-qa-v1.py --inputs input.json
       --output report.json --model <existing-local-faster-whisper-directory>
Input: [{"jobId": "...", "path": "...", "receiptPath": "..." (optional)}].
ASR receives audio only; expected text is never passed as an ASR hint/prompt.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import re
import unicodedata


def sha_file(file: Path) -> str:
    return hashlib.sha256(file.read_bytes()).hexdigest()


def text_tokens(text: str) -> list[str]:
    return re.findall(r"[a-z]+(?:'[a-z]+)?", unicodedata.normalize("NFKC", text).lower())


def normalized_edit_distance(expected: list[str], actual: list[str]) -> float:
    row = list(range(len(actual) + 1))
    for i, left in enumerate(expected, 1):
        nxt = [i]
        for j, right in enumerate(actual, 1):
            nxt.append(min(nxt[-1] + 1, row[j] + 1, row[j - 1] + (left != right)))
        row = nxt
    return row[-1] / max(1, len(expected))


def pcm_statistics(samples, sample_rate: int = 16000) -> dict:
    import numpy as np

    values = np.asarray(samples, dtype=np.float64).flatten()
    if not len(values) or not np.isfinite(values).all():
        raise ValueError("EMPTY_OR_NONFINITE_PCM")
    absolute = np.abs(values)
    peak = float(absolute.max())
    rms = float(np.sqrt(np.mean(values * values)))
    # Decode overshoot is reported as a signal; it is not a proof of source clipping.
    peak_fraction = float(np.mean(absolute >= 0.999))
    frame_size = max(1, round(sample_rate * 0.02))
    frame_rms = [float(np.sqrt(np.mean(values[start:start + frame_size] ** 2)))
                 for start in range(0, len(values), frame_size)]
    active = [index for index, value in enumerate(frame_rms) if value > 10 ** (-45 / 20)]
    warnings = []
    if not active:
        warnings.append("NO_SIGNAL_ABOVE_MINUS45_DBFS")
    if peak_fraction > 0.001:
        warnings.append("HIGH_NEAR_FULL_SCALE_SAMPLE_FRACTION_CHECK_DISTORTION")
    if rms < 10 ** (-35 / 20):
        warnings.append("LOW_AVERAGE_LEVEL_CHECK_AUDIBILITY")
    return {
        "sampleRate": sample_rate,
        "decodedSamples": len(values),
        "durationMs": round(1000 * len(values) / sample_rate),
        "peakAmplitude": peak,
        "rmsAmplitude": rms,
        "rmsDbfs": 20 * math.log10(rms) if rms else None,
        "nearFullScaleFraction": peak_fraction,
        "silenceThresholdDbfs": -45,
        "analysisFrameMs": 20,
        "leadingSilenceMs": active[0] * 20 if active else round(1000 * len(values) / sample_rate),
        "trailingSilenceMs": (len(frame_rms) - 1 - active[-1]) * 20 if active else round(1000 * len(values) / sample_rate),
        "activeFrameFraction": len(active) / len(frame_rms),
        "warnings": warnings,
    }


def decode_pcm(audio_file: Path):
    """Use the installed PyAV API directly; faster-whisper1.2's legacy
    metadata_errors argument is not accepted by PyAV19's av.open()."""
    import av
    import numpy as np

    chunks = []
    resampler = av.AudioResampler(format="fltp", layout="mono", rate=16000)
    with av.open(str(audio_file), mode="r") as container:
        stream = next(stream for stream in container.streams if stream.type == "audio")
        for frame in container.decode(stream):
            frame.pts = None
            for converted in resampler.resample(frame):
                chunks.append(converted.to_ndarray().flatten())
        for converted in resampler.resample(None):
            chunks.append(converted.to_ndarray().flatten())
    if not chunks:
        raise ValueError("EMPTY_DECODED_AUDIO")
    return np.concatenate(chunks).astype(np.float32)


def validate_receipt(receipt: dict, job: dict, file_sha: str, byte_length: int, orders_sha: str) -> None:
    expected = {"jobId": job["jobId"], "kind": job["kind"], "target": job["target"],
        "draftVariantId": job["draftVariantId"], "exampleDraftRef": job["exampleDraftRef"],
        "manifestPin": job["manifestPin"], "sourceDraftDependencyHash": job["sourceDraftDependencyHash"],
        "providerRequestHash": job["providerRequestHash"], "requestedText": job["request"]["text"]}
    for key, value in expected.items():
        if receipt.get(key) != value:
            raise ValueError("RECEIPT_BINDING_MISMATCH:" + key)
    if receipt.get("output", {}).get("sha256") != file_sha or receipt.get("output", {}).get("byteLength") != byte_length:
        raise ValueError("RECEIPT_OUTPUT_BYTES_MISMATCH")
    if receipt.get("workOrders", {}).get("byteSha256") != orders_sha or receipt.get("runtimeEligible") is not False:
        raise ValueError("RECEIPT_ORDERS_OR_RUNTIME_GATE_MISMATCH")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inputs", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--orders", default=".vocabflow-local/editorial-refresh-20261028/media-production-r0001/work-orders.json")
    args = parser.parse_args()
    inputs_file, orders_file, model_root, output = map(Path, [args.inputs, args.orders, args.model, args.output])
    if output.exists():
        raise ValueError("IMMUTABLE_REPORT_ALREADY_EXISTS")
    orders = json.loads(orders_file.read_text(encoding="utf-8"))
    if sha_file(orders_file) != "d13a6efc767869df1f8d34d8363b87f4bca9da3343bff86a28db9c02f8d46728":
        raise ValueError("WORK_ORDERS_PIN_MISMATCH")
    if not model_root.is_dir() or not (model_root / "model.bin").is_file():
        raise ValueError("PREEXISTING_LOCAL_MODEL_REQUIRED_NO_DOWNLOAD")
    entries = json.loads(inputs_file.read_text(encoding="utf-8"))
    jobs = {item["jobId"]: item for item in orders["jobs"] if item["kind"] in ["WORD_AUDIO", "EXAMPLE_AUDIO"]}
    if len({item["jobId"] for item in entries}) != len(entries):
        raise ValueError("DUPLICATE_INPUT_JOB")
    for entry in entries:
        if entry["jobId"] not in jobs:
            raise ValueError("UNKNOWN_AUDIO_JOB")

    # Force offline HF behavior, and use an explicit existing model path.
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    from faster_whisper import WhisperModel
    import av

    model = WhisperModel(str(model_root), device="cpu", compute_type="int8", local_files_only=True,
                         cpu_threads=min(4, os.cpu_count() or 1))
    results = []
    for entry in entries:
        job = jobs[entry["jobId"]]
        audio_file = Path(entry["path"])
        item = {
            "jobId": entry["jobId"], "kind": job["kind"], "target": job["target"],
            "manifestPin": job["manifestPin"], "providerRequestHash": job["providerRequestHash"],
            "expectedText": job["request"]["text"], "filePath": str(audio_file),
            "fileSha256": sha_file(audio_file), "byteLength": audio_file.stat().st_size,
            "reviewerIdentity": "/root/ticket06_audio_review",
            "humanListeningStatus": "NOT_PERFORMED", "runtimeEligible": False,
            "voiceGenderAndLocaleVerification": "NOT_PROVEN_BY_ASR",
            "rightsReview": "PENDING_ASSET_AND_PROVIDER_EVIDENCE",
        }
        try:
            if entry.get("receiptPath"):
                receipt_file = Path(entry["receiptPath"])
                receipt = json.loads(receipt_file.read_text(encoding="utf-8"))
                item["receiptPin"] = {"path": str(receipt_file), "byteSha256": sha_file(receipt_file)}
                validate_receipt(receipt, job, item["fileSha256"], item["byteLength"], sha_file(orders_file))
                item["receiptBindingStatus"] = "PASS_EXACT_SOURCE_REQUEST_TARGET_BYTES"
            else:
                item["receiptBindingStatus"] = "NOT_PROVIDED_CANDIDATE_ANALYSIS_ONLY"
            with av.open(str(audio_file)) as container:
                stream = next(stream for stream in container.streams if stream.type == "audio")
                item["container"] = {"formatName": container.format.name,
                    "codec": stream.codec_context.name, "channels": stream.codec_context.channels,
                    "sampleRate": stream.codec_context.sample_rate}
            pcm = decode_pcm(audio_file)
            item["signal"] = pcm_statistics(pcm)
            item["technicalStatus"] = "PASS_DECODE" if item["signal"]["durationMs"] >= 100 and item["signal"]["activeFrameFraction"] > 0 else "FAIL_NO_USABLE_SIGNAL"
            segments, info = model.transcribe(pcm, language="en", beam_size=5,
                temperature=0, condition_on_previous_text=False, vad_filter=False,
                initial_prompt=None, prefix=None, word_timestamps=False)
            decoded_segments = list(segments)
            actual = " ".join(segment.text.strip() for segment in decoded_segments).strip()
            item["asrText"] = actual
            item["asrSegments"] = [{"text": segment.text, "start": segment.start,
                "end": segment.end, "avgLogprob": segment.avg_logprob,
                "noSpeechProbability": segment.no_speech_prob} for segment in decoded_segments]
            expected_tokens, actual_tokens = text_tokens(item["expectedText"]), text_tokens(actual)
            item["wordErrorRate"] = normalized_edit_distance(expected_tokens, actual_tokens)
            item["asrTextStatus"] = "EXACT_NORMALIZED_MATCH" if expected_tokens == actual_tokens else "REVIEW_REQUIRED_TEXT_MISMATCH"
            item["asrLanguage"] = info.language
            item["speechSemanticStatus"] = "AUTOMATED_TEXT_MATCH_ONLY" if expected_tokens == actual_tokens else "REVIEW_REQUIRED"
            item["status"] = "PASS_TECHNICAL_AND_ASR_ONLY" if item["technicalStatus"] == "PASS_DECODE" and item["asrTextStatus"] == "EXACT_NORMALIZED_MATCH" else "REVIEW_REQUIRED"
        except Exception as error:
            item["status"] = "ERROR_REVIEW_REQUIRED"
            item["error"] = str(error)
        results.append(item)
        print(json.dumps({"jobId": item["jobId"], "status": item["status"], "asrText": item.get("asrText")}), flush=True)
    report = {
        "artifactType": "PILOT_INDEPENDENT_AUDIO_TECHNICAL_ASR_REVIEW", "schemaVersion": 1,
        "reviewerIdentity": "/root/ticket06_audio_review", "workOrdersPin": {"path": str(orders_file), "sha256": sha_file(orders_file)},
        "inputsPin": {"path": str(inputs_file), "sha256": sha_file(inputs_file)},
        "toolPin": {"path": str(Path(__file__)), "sha256": sha_file(Path(__file__))},
        "model": {"name": "Systran/faster-whisper-base", "path": str(model_root),
            "localModelSha256": sha_file(model_root / "model.bin"), "device": "cpu", "computeType": "int8", "downloaded": False,
            "files": [{"name": file.name, "sha256": sha_file(file), "byteLength": file.stat().st_size} for file in sorted(model_root.iterdir()) if file.is_file()]},
        "runtimeVersions": {name: importlib.metadata.version(name) for name in ["faster-whisper", "ctranslate2", "av", "numpy"]},
        "asrPolicy": "English fixed; no expected-text prompt, prefix or hint; no previous-text conditioning; no VAD/model download.",
        "normalization": "NFKC lowercase English word tokens; case and punctuation ignored only",
        "humanListeningStatus": "NOT_PERFORMED", "runtimeEligible": False,
        "limitations": ["ASR text equality does not prove accent, exact phonemes, naturalness, voice gender or commercial rights.",
            "Low-level/clipping/silence indicators require listening review; MP3 decode overshoot is not proof of source clipping."],
        "total": len(results), "technicalDecodePass": sum(item.get("technicalStatus") == "PASS_DECODE" for item in results),
        "receiptBindingPass": sum(item.get("receiptBindingStatus") == "PASS_EXACT_SOURCE_REQUEST_TARGET_BYTES" for item in results),
        "exactNormalizedTextMatch": sum(item.get("asrTextStatus") == "EXACT_NORMALIZED_MATCH" for item in results),
        "results": results,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2)
        file.write("\n")


if __name__ == "__main__":
    main()
