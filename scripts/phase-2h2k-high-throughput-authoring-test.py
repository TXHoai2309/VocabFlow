#!/usr/bin/env python3
"""In-memory mutations of authoring inputs; no frozen file writes."""
import copy
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('authoring',Path(__file__).with_name('phase-2h2k-high-throughput-authoring.py'))
V=importlib.util.module_from_spec(spec);spec.loader.exec_module(V)


class AuthoringTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.groups,cls.excluded,cls.old,cls.sources=V.inputs()
        cls.cohort=V.frozen();cls.slice=cls.cohort['groups'][:20]
        cls.manuscript=(V.CP/'authored/micro-01.psv').read_bytes()
        cls.review=(V.CP/'reviews/micro-01.psv').read_bytes()
        cls.rows=V.parse_manuscript(cls.manuscript,cls.slice)

    def test_exact_source_exclusion_and_selected_identity_counts(self):
        keys={g['candidateGroupKey'] for g in self.groups}
        selected={g['candidateGroupKey'] for g in self.cohort['groups']}
        self.assertEqual((len(keys),len(self.excluded),len(keys-self.excluded),len(selected)),(6143,1020,5123,500))
        self.assertFalse(selected&self.excluded)

    def test_selection_is_reproducible_with_exact_order(self):
        self.assertEqual(self.cohort,V.selection_data()['frozen-cohort.json'])
        self.assertEqual([g['authoringOrder'] for g in self.cohort['groups']],list(range(1,501)))

    def test_source_reference_tampering(self):
        group=self.slice[0];ref=copy.deepcopy(group['sourceEvidence'][0]);ref['sourceRecordId']='bad'
        with self.assertRaisesRegex(ValueError,'Source reference'):
            V.validate_source_ref(group,ref,self.sources[ref['corpus']][ref['recordIndex']])

    def test_source_record_body_tampering(self):
        record=copy.deepcopy(self.sources['OXFORD_5000'][0]);record['headwordText']='tampered'
        with self.assertRaisesRegex(ValueError,'record evidence hash'):
            V.validate_source_record(record)

    def test_source_record_hash_tampering(self):
        record=copy.deepcopy(self.sources['OXFORD_5000'][0]);record['recordEvidenceSha256']='0'*64
        with self.assertRaisesRegex(ValueError,'record evidence hash'):
            V.validate_source_record(record)

    def test_unsupported_pos(self):
        with self.assertRaisesRegex(ValueError,'source POS'):
            V.parse_manuscript(self.manuscript.replace(b'doctor|medical-practitioner|NOUN',b'doctor|medical-practitioner|VERB'),self.slice)

    def test_duplicate_proposal_and_example(self):
        with self.assertRaisesRegex(ValueError,'Duplicate proposal/example'):
            V.parse_manuscript(self.manuscript+self.manuscript.splitlines()[0]+b'\n',self.slice)

    def test_missing_group(self):
        with self.assertRaisesRegex(ValueError,'Missing frozen group'):
            V.parse_manuscript(b'\n'.join(self.manuscript.splitlines()[1:])+b'\n',self.slice)

    def test_foreign_or_previously_authored_group(self):
        with self.assertRaisesRegex(ValueError,'Unknown group'):
            V.parse_manuscript(self.manuscript.replace(b'doctor|',b'abandon|',1),self.slice)

    def test_placeholder_and_empty_required_fields(self):
        line=self.manuscript.splitlines()[0].decode();fields=line.split('|')
        for replacement in ['TODO','']:
            altered=list(fields);altered[4]=replacement
            with self.assertRaisesRegex(ValueError,'Empty/placeholder'):
                V.parse_manuscript(('|'.join(altered)+'\n').encode(),self.slice)

    def test_invalid_utf8_and_crlf(self):
        with self.assertRaises(UnicodeDecodeError):V.parse_manuscript(b'\xff',self.slice)
        with self.assertRaisesRegex(ValueError,'UTF-8 LF'):V.parse_manuscript(self.manuscript.replace(b'\n',b'\r\n'),self.slice)

    def test_wrong_field_count_and_identity_injection(self):
        with self.assertRaisesRegex(ValueError,'ten fields'):
            V.parse_manuscript(self.manuscript.splitlines()[0]+b'|masterSenseId=123\n',self.slice)

    def test_review_missing_duplicate_or_human_approved(self):
        variants=[b'\n'.join(self.review.splitlines()[1:]),self.review+self.review.splitlines()[0]+b'\n',self.review.replace(b'|PASS|',b'|HUMAN_APPROVED|',1)]
        for data in variants:
            with self.assertRaises(ValueError):V.validate_reviews(self.rows,data)

    def test_fail_cannot_seal(self):
        with self.assertRaisesRegex(ValueError,'FAIL Sense'):
            V.validate_reviews(self.rows,self.review.replace(b'|PASS|',b'|FAIL|',1))

    def test_all_reviews_bound_to_actual_hash(self):
        reviews=V.validate_reviews(self.rows,self.review)
        bykey={r['proposalKey']:r for r in self.rows}
        for review in reviews:
            self.assertEqual(review['reviewedRecordSha256'],V.digest(bykey[review['proposalKey']]))
            self.assertFalse(review['humanApproval'])

    def test_cross_source_copying_from_unlinked_record(self):
        text=self.rows[0]['content']['definitionEn']
        sources={'OTHER_CORPUS':[{'sourceRecordId':'unlinked','sourceFields':{'Definition':text}}]}
        with self.assertRaisesRegex(ValueError,'Cross-corpus eight-word'):
            V.cross_source_copying(self.rows,sources)

    def test_exact_short_english_example_is_rejected(self):
        row=copy.deepcopy(self.rows[0]);row['content']['examples'][0]['en']='Please close this door.'
        sources={'OTHER_CORPUS':[{'sourceRecordId':'short','sourceFields':{'Example':'Please close this door.'}}]}
        with self.assertRaisesRegex(ValueError,'Cross-corpus eight-word'):
            V.cross_source_copying([row],sources)

    def test_sealed_receipt_drift(self):
        original=V.micro_data
        def changed(number,cohort):
            rows,qa,receipt=original(number,cohort);receipt['manuscriptSha256']='0'*64
            return rows,qa,receipt
        with patch.object(V,'micro_data',side_effect=changed):
            with self.assertRaisesRegex(ValueError,'Sealed manuscript/review drift'):V.build()

    def test_no_canonical_allocation_and_natural_multiple_senses(self):
        self.assertEqual(len(self.rows),21)
        self.assertTrue(all(r['canonicalIdsAllocated']==0 and r['formalApproval'] is False for r in self.rows))

    def test_post_qa_revision_preserves_originals_and_binds_before_after(self):
        qa=V.validate_reviews(self.rows,self.review);before=copy.deepcopy(self.rows)
        revised,reviews,evidence=V.apply_post_qa(self.rows,qa)
        self.assertEqual(self.rows,before)
        self.assertEqual(len(evidence),1)
        key=evidence[0]['proposalKey'];row=next(r for r in revised if r['proposalKey']==key)
        self.assertEqual(row['effectiveContentHash'],evidence[0]['revisedEffectiveContentHash'])
        self.assertEqual(next(r for r in reviews if r['proposalKey']==key)['reviewedRecordSha256'],V.digest(row))

    def test_post_qa_wrong_before_rejected(self):
        original=V.load
        def changed(path):
            d=original(path)
            if path.name=='post-qa-revisions.json':d['records'][0]['before']='incorrect'
            return d
        with patch.object(V,'load',side_effect=changed):
            with self.assertRaisesRegex(ValueError,'BEFORE mismatch'):
                V.apply_post_qa(self.rows,V.validate_reviews(self.rows,self.review))


if __name__=='__main__':unittest.main(verbosity=2)
