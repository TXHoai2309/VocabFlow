import importlib.util
from pathlib import Path
import unittest

import numpy as np

spec = importlib.util.spec_from_file_location("audio_qa", Path(__file__).with_name("editorial-audio-qa-v1.py"))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


class AudioQaTests(unittest.TestCase):
    def test_no_audio_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "EMPTY_OR_NONFINITE_PCM"):
            qa.pcm_statistics([])

    def test_nan_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "EMPTY_OR_NONFINITE_PCM"):
            qa.pcm_statistics([float("nan")])

    def test_silent_file_is_not_usable_speech(self):
        result = qa.pcm_statistics(np.zeros(16000))
        self.assertEqual(result["durationMs"], 1000)
        self.assertEqual(result["activeFrameFraction"], 0)
        self.assertIn("NO_SIGNAL_ABOVE_MINUS45_DBFS", result["warnings"])

    def test_silence_padding_and_signal_duration(self):
        signal = np.concatenate([np.zeros(3200), np.full(8000, 0.15), np.zeros(4800)])
        result = qa.pcm_statistics(signal)
        self.assertEqual(result["leadingSilenceMs"], 200)
        self.assertEqual(result["trailingSilenceMs"], 300)
        self.assertEqual(result["durationMs"], 1000)
        self.assertEqual(result["activeFrameFraction"], 0.5)

    def test_near_full_scale_warns_without_asserting_source_clipping(self):
        result = qa.pcm_statistics(np.full(16000, 1.05))
        self.assertEqual(result["nearFullScaleFraction"], 1)
        self.assertIn("HIGH_NEAR_FULL_SCALE_SAMPLE_FRACTION_CHECK_DISTORTION", result["warnings"])

    def test_case_and_sentence_punctuation_are_ignored(self):
        self.assertEqual(qa.text_tokens("The dog is small."), qa.text_tokens("THE DOG IS SMALL!"))

    def test_extra_intro_or_repeat_is_not_hidden(self):
        expected = qa.text_tokens("dog")
        for actual in ["Here is dog.", "dog dog", "a dog"]:
            self.assertNotEqual(expected, qa.text_tokens(actual))
            self.assertGreater(qa.normalized_edit_distance(expected, qa.text_tokens(actual)), 0)

    def test_word_substitution_is_not_accepted(self):
        expected, actual = qa.text_tokens("The dog is small."), qa.text_tokens("The duck is small.")
        self.assertEqual(qa.normalized_edit_distance(expected, actual), 0.25)

    def test_receipt_wrong_target_is_rejected_before_asr(self):
        job = {"jobId": "job1", "kind": "WORD_AUDIO", "target": {"runtimeVocabularyId": 30185},
            "draftVariantId": "v1", "exampleDraftRef": None, "manifestPin": {"byteSha256": "manifest"},
            "sourceDraftDependencyHash": "deps", "providerRequestHash": "request", "request": {"text": "dog"}}
        receipt = {key: value for key, value in job.items() if key != "request"}
        receipt.update({"requestedText": "dog", "output": {"sha256": "bytes", "byteLength": 10},
            "workOrders": {"byteSha256": "orders"}, "runtimeEligible": False})
        qa.validate_receipt(receipt, job, "bytes", 10, "orders")
        receipt["target"] = {"runtimeVocabularyId": 123}
        with self.assertRaisesRegex(ValueError, "RECEIPT_BINDING_MISMATCH:target"):
            qa.validate_receipt(receipt, job, "bytes", 10, "orders")

    def test_correct_text_cannot_hide_wrong_file_bytes(self):
        job = {"jobId": "job1", "kind": "WORD_AUDIO", "target": {}, "draftVariantId": "v1", "exampleDraftRef": None,
            "manifestPin": {}, "sourceDraftDependencyHash": "deps", "providerRequestHash": "request", "request": {"text": "dog"}}
        receipt = {key: value for key, value in job.items() if key != "request"}
        receipt.update({"requestedText": "dog", "output": {"sha256": "other-bytes", "byteLength": 10},
            "workOrders": {"byteSha256": "orders"}, "runtimeEligible": False})
        with self.assertRaisesRegex(ValueError, "RECEIPT_OUTPUT_BYTES_MISMATCH"):
            qa.validate_receipt(receipt, job, "actual-bytes", 10, "orders")


if __name__ == "__main__":
    unittest.main()
