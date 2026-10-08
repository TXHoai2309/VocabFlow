#!/usr/bin/env python3
"""Session scope, recommendations and existing approval-boundary regressions."""
import copy
import hashlib
import importlib.util
import socket
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('session',Path(__file__).with_name('phase-2h2f-owner-session.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class SessionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.objects,cls.report=m.build();cls.reviews=cls.objects['linguistic-recommendations.json']['records']
        cls.corrections=cls.objects['content-correction-proposals.json']['corrections']
        cls.preview=m.load(m.e.WS/'release-candidate-preview.json');cls.items=m.pack_records(cls.preview)
        cls.records={r['proposalKey']:r['proposedOverlayContent'] for r in cls.items}
    def setUp(self):
        self.record=next(r for r in self.records.values() if r['headword']=='formerly')
        self.row=dict.fromkeys(m.e.COLUMNS,'')|{'proposalKey':self.record['proposalKey'],'contentHash':m.e.revision(self.record),
            'decision':'DEFER','reviewerId':'SYNTHETIC_TEST_ONLY','reviewedAt':'2026-01-01T00:00:00Z','rationale':'Synthetic fixture: defer all outstanding evidence.',
            'contentApproval':'PENDING','lexemeIdentity':'PENDING','senseIdentity':'PENDING','posDecision':'PENDING','cefrDecision':'PENDING'}
        self.trust={'authorizationEvidenceRef':'SYNTHETIC_TEST_ONLY','reviewers':[{'reviewerId':'SYNTHETIC_TEST_ONLY','kind':'HUMAN',
            'roles':['CONTENT_REVIEWER'],'authorizationEvidenceRef':'SYNTHETIC_TEST_ONLY','authorizedFrom':'2020-01-01T00:00:00Z','authorizedThrough':'2030-01-01T00:00:00Z'}],
            'rights':[],'identityEvidence':[],'classificationEvidence':[],'approvalEvidence':[]}
        self.empty={'decisions':[],'events':[]}
    def intake(self,rows=None,ledger=None):return m.e.intake(rows or [self.row],self.records,ledger or self.empty,self.trust,[])
    def test_exact_ten_keys(self):self.assertEqual(len({r['proposalKey'] for r in self.reviews}),10)
    def test_frozen_pack_membership(self):self.assertEqual([r['headword'] for r in self.reviews],m.WORDS)
    def test_exact_frozen_hashes(self):self.assertTrue(all(r['frozenContentHash']==m.e.revision(self.records[r['proposalKey']]) for r in self.reviews))
    def test_input_bytes_pinned(self):self.assertEqual(m.pinned_inputs(),m.load(m.WS/'accepted-input-pins.json'))
    def test_future_additive_session_not_repinned(self):
        with tempfile.TemporaryDirectory(dir=m.ROOT) as td:
            root=Path(td);(root/'review-packs').mkdir();(root/'owner-session-02').mkdir()
            (root/'review-packs/review.md').write_text('accepted',encoding='utf8')
            (root/'owner-session-02/review.md').write_text('future',encoding='utf8')
            with patch.object(m.e,'WS',root):pins=m.pinned_inputs()
            self.assertFalse(any('owner-session-02' in p for p in pins))
            self.assertTrue(any('/review-packs/review.md' in p for p in pins))
    def test_parent_fingerprint_unchanged(self):self.assertEqual(m.load(m.e.WS/'manifest.json')['fingerprint'],m.PIN)
    def test_substantive_each_entry(self):self.assertTrue(all(all(r[k] for k in ['meaningAssessmentVi','exampleAssessmentVi','grammarAssessmentVi','boundaryAssessmentVi']) for r in self.reviews))
    def test_seven_keep_three_revise(self):self.assertEqual(self.objects['validation-summary.json']['counts']['aiRecommendations'],{'KEEP':7,'REVISE':3})
    def test_four_proposed_fields(self):self.assertEqual(len(self.corrections),4)
    def test_exact_before_text(self):self.assertTrue(all(m.e.fields(self.records[c['proposalKey']])[c['field']]==c['before'] for c in self.corrections))
    def test_correction_reference_and_hash(self):
        for c in self.corrections:
            r=next(r for r in self.reviews if r['proposalKey']==c['proposalKey']);self.assertIn(c['correctionRef'],r['correctionRefs'])
            self.assertEqual(c['originalContentHash'],r['frozenContentHash']);self.assertEqual(c['afterSha256'],hashlib.sha256(c['after'].encode()).hexdigest())
    def test_keep_preserves_content_hash(self):self.assertTrue(all(r['proposedContentHash']==r['frozenContentHash'] for r in self.reviews if r['aiRecommendation']=='KEEP'))
    def test_proposals_unapplied(self):self.assertTrue(all(not r['proposedContentIsApplied'] for r in self.reviews))
    def test_decisions_separate_empty(self):self.assertTrue(all(r['actualOwnerDecision'] is None and r['recommendationKind']=='AI_ASSISTED_NOT_HUMAN_DECISION' for r in self.reviews))
    def test_no_human_or_receipt(self):
        status=self.objects['owner-submission-status.json'];self.assertEqual(status['actualSubmissionsReceived'],0);self.assertFalse(status['receiptCreated'])
        self.assertFalse(list(m.WS.glob('*receipt*')))
    def test_classification_separate(self):self.assertTrue(all(not r['cefrEvidenceSufficientForCanonicalClassification'] for r in self.objects['identity-classification-assessment.json']['records']))
    def test_five_cefr_conflicts_retained(self):self.assertEqual(self.objects['validation-summary.json']['counts']['cefrDisagreements'],5)
    def test_no_identity_reuse(self):self.assertTrue(all(not r['masterReuseAuthorized'] and r['lexemeIdentity']=='UNRESOLVED' for r in self.objects['identity-classification-assessment.json']['records']))
    def test_rights_evidence_missing(self):self.assertTrue(all(not r['rightsResolved'] and r['sourceDeckRights']=='UNKNOWN_REVIEW_REQUIRED' and r['missingEvidence'] for r in self.objects['rights-evidence-assessment.json']['records']))
    def test_missing_authorization_rejected(self):
        self.trust['reviewers']=[]
        with self.assertRaises(ValueError):self.intake()
    def test_stale_content_rejected(self):
        self.row['contentHash']='0'*64
        with self.assertRaises(ValueError):self.intake()
    def test_idempotent_existing_intake(self):
        first=self.intake();self.assertEqual(first,self.intake(ledger=first))
    def test_conflicting_import_rejected(self):
        first=self.intake();before=copy.deepcopy(first);self.row['decision']='REJECT'
        with self.assertRaises(ValueError):self.intake(ledger=first)
        self.assertEqual(first,before)
    def test_fabricated_approval_rejected(self):
        self.row.update(decision='KEEP',contentApproval='APPROVED')
        with self.assertRaises(ValueError):self.intake()
    def test_content_only_does_not_approve_other_gates(self):
        self.row.update(decision='KEEP',contentApproval='APPROVED');self.trust['approvalEvidence']=[{'proposalKey':self.row['proposalKey'],
            'contentHash':self.row['contentHash'],'reviewerId':self.row['reviewerId'],'reviewedAt':self.row['reviewedAt'],'humanSubmissionEvidenceRef':'SYNTHETIC_TEST_ONLY'}]
        row=self.intake()['decisions'][0];g=m.e.promotion(self.record,row,self.trust,{'findings':[]},0)['gates']
        self.assertTrue(g['HUMAN_CONTENT_REVIEWED']);self.assertFalse(g['IDENTITY_RESOLVED']);self.assertFalse(g['RIGHTS_RESOLVED']);self.assertFalse(g['POS_ACCEPTED']);self.assertFalse(g['CLASSIFICATION_REVIEWED']);self.assertFalse(g['READY_FOR_CANONICAL_AUTHORING'])
    def test_identity_evidence_separate(self):
        self.row['senseIdentity']='CONFIRMED_NEW'
        with self.assertRaises(ValueError):self.intake()
    def test_rights_evidence_separate(self):
        self.row['rightsDispositionRef']='UNVERIFIED_TEST_ONLY'
        with self.assertRaises(ValueError):self.intake()
    def test_unregistered_correction_rejected(self):
        c=self.corrections[0];self.row.update(proposalKey=c['proposalKey'],contentHash=c['originalContentHash'],decision='REVISE',correctionRef=c['correctionRef'])
        with self.assertRaises(ValueError):self.intake()
    def test_gate_recomputed_existing_function(self):
        for item in self.objects['promotion-gate-results.json']['records']:
            self.assertTrue(all(not item['gates'][g] for g in m.GATES))
            original=m.e.promotion(self.records[item['proposalKey']],None,m.e.trust_bundle(),{'findings':[]},0)
            self.assertEqual(item['gates'],original['gates'])
    def test_owner_table_all_hashes_and_content(self):self.assertTrue(all(r['frozenContentHash'] in self.report and r['frozenContent']['examples'][0]['vi'] in self.report for r in self.reviews))
    def test_no_unsupported_source_claim(self):self.assertTrue(all(not r['fullPageOrLicenseTermsReviewed'] for r in self.objects['independent-reference-evidence.json']['records']))
    def test_pending_real_ledger_unchanged(self):self.assertEqual(m.load(m.e.WS/'owner-decision-ledger.json')['decisions'],[])
    def test_hybrid_and_legacy_pinned(self):
        p=self.objects['validation-summary.json']['protectedState'];self.assertTrue(p['hybridReleaseBase'].endswith('hybrid-100-v2.2.1'))
        self.assertFalse(self.objects['validation-summary.json']['legacyModified'])
    def test_offline_deterministic_no_network(self):
        with patch.object(socket,'socket',side_effect=AssertionError('No network permitted')):
            self.assertEqual(m.build()[0]['manifest.json']['fingerprint'],self.objects['manifest.json']['fingerprint'])
    def test_cli_mutations_rejected(self):
        for arg in ['--apply','--import-decisions','--production']:
            result=subprocess.run([sys.executable,'-B',m.__file__,arg],capture_output=True,text=True)
            self.assertEqual(result.returncode,2)

if __name__=='__main__':unittest.main(verbosity=2)
