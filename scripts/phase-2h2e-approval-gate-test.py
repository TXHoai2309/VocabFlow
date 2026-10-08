#!/usr/bin/env python3
"""Offline approval regressions. Synthetic humans exist only inside test fixtures."""
import copy
import csv
import hashlib
import importlib.util
import io
import json
import os
import socket
import subprocess
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('approval',Path(__file__).with_name('phase-2h2e-approval-gate.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class ApprovalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.objects,cls.exports,cls.report=m.build()
        cls.candidates=cls.objects['release-candidate-preview.json']['records']
        cls.records={r['proposalKey']:r['proposedOverlayContent'] for r in cls.candidates}
        cls.risks=cls.objects['risk-reclassification.json']['records']
        cls.selection=m.load(m.WS/'selected-first-40.json')
        cls.overlays=m.load(m.WS/'content-correction-overlays.json')['corrections']
        cls.qa=m.load(m.WS/'linguistic-qa.json')['reviews']

    def setUp(self):
        self.record=next(iter(self.records.values()))
        self.row=dict.fromkeys(m.COLUMNS,'')|{'proposalKey':self.record['proposalKey'],'contentHash':m.revision(self.record),
            'decision':'DEFER','reviewerId':'SYNTHETIC_TEST_ONLY','reviewedAt':'2026-01-01T00:00:00Z','rationale':'Synthetic fixture: defer pending identity review.',
            'contentApproval':'PENDING','lexemeIdentity':'PENDING','senseIdentity':'PENDING','posDecision':'PENDING','cefrDecision':'PENDING'}
        self.trust={'authorizationEvidenceRef':'SYNTHETIC_TEST_ONLY','reviewers':[{'reviewerId':'SYNTHETIC_TEST_ONLY','kind':'HUMAN',
            'roles':['CONTENT_REVIEWER','IDENTITY_REVIEWER','CLASSIFICATION_REVIEWER','RIGHTS_REVIEWER'],
            'authorizationEvidenceRef':'SYNTHETIC_TEST_ONLY','authorizedFrom':'2020-01-01T00:00:00Z','authorizedThrough':'2030-01-01T00:00:00Z'}],
            'rights':[],'identityEvidence':[],'classificationEvidence':[],'approvalEvidence':[],'evidenceInventory':[]}
        self.ledger={'decisions':[],'events':[]}

    def ingest(self,rows=None,ledger=None):return m.intake(rows if rows is not None else [self.row],self.records,ledger or self.ledger,self.trust,self.overlays)
    def reject(self,field,value):
        self.row[field]=value
        with self.assertRaises(ValueError):self.ingest()
    def rights(self):
        return {'rightsRef':'SYNTHETIC_RIGHTS_ONLY','proposalKey':self.record['proposalKey'],'contentHash':m.revision(self.record),
            'reviewerId':self.row['reviewerId'],'reviewedAt':self.row['reviewedAt'],'decision':'ADEQUATE_FOR_INTENDED_PUBLICATION',
            'scope':'ORIGINAL_EDITORIAL_TEXT_ONLY_NO_MEDIA','sourceMediaExcluded':True,'evidenceRefs':['SYNTHETIC_EVIDENCE_ONLY'],
            'originalityAssessment':'Synthetic assessment, no real clearance.','rationale':'Synthetic test only.','copyingConcerns':'RESOLVED','attribution':'NONE_REQUIRED_TEST_ONLY','uncertainty':'RESOLVED'}
    def approve_fixture(self):
        self.row.update(decision='KEEP',contentApproval='APPROVED',lexemeIdentity='CONFIRMED_NEW',senseIdentity='CONFIRMED_NEW',
                        posDecision='ACCEPTED',cefrDecision='UNCLASSIFIED_REVIEWED',identityEvidenceRef='SYNTHETIC_IDENTITY_ONLY',rightsDispositionRef='SYNTHETIC_RIGHTS_ONLY')
        subject={'proposalKey':self.row['proposalKey'],'contentHash':self.row['contentHash'],'reviewerId':self.row['reviewerId'],
                 'reviewedAt':self.row['reviewedAt'],'humanSubmissionEvidenceRef':'SYNTHETIC_TEST_ONLY'}
        self.trust['approvalEvidence']=[dict(subject,resolvedFindingCodes=[])]
        self.trust['identityEvidence']=[dict(subject,identityEvidenceRef='SYNTHETIC_IDENTITY_ONLY',lexemeIdentity='CONFIRMED_NEW',senseIdentity='CONFIRMED_NEW',protectedConflict=False,protectedReferenceAssessment='NO_CONFLICT_CONFIRMED')]
        self.trust['classificationEvidence']=[dict(subject,decision='UNCLASSIFIED_REVIEWED',evidenceRefs=['SYNTHETIC_TEST_ONLY'])]
        self.trust['rights']=[self.rights()]
        self.trust['evidenceInventory']=[{'evidenceRef':'SYNTHETIC_EVIDENCE_ONLY','sha256':'a'*64,'ownerVerified':True}]

    def test_inventory_813(self):self.assertEqual(len(self.risks),813)
    def test_groups_520(self):self.assertEqual(len({r['candidateLexeme']['key'] for r in self.risks}),520)
    def test_unique_keys(self):self.assertEqual(len({r['proposalKey'] for r in self.risks}),813)
    def test_all_risk_factors(self):self.assertTrue(all(r['reasonForChange'] and r['reviewerStatus'].endswith('HUMAN_PENDING') for r in self.risks))
    def test_low_alias_corrected(self):self.assertTrue(all(r['proposedRiskTier']=='HIGH' for r in self.risks if r['candidateLexeme']['display']=='a, an'))
    def test_abnormal_corrected(self):self.assertTrue(all(r['proposedRiskTier']=='HIGH' for r in self.risks if r['candidateLexeme']['display']=='abnormal'))
    def test_legacy_never_low(self):self.assertFalse(any(r['legacyDependencies'] and r['proposedRiskTier']=='LOW' for r in self.risks))
    def test_master_never_low(self):self.assertFalse(any((r['existingMasterCandidates']['lexemeIdReference'] or r['existingMasterCandidates']['senseIdReferences']) and r['proposedRiskTier']=='LOW' for r in self.risks))
    def test_gloss_18(self):self.assertEqual(len(self.objects['duplicate-gloss-review.json']['records']),18)
    def test_gloss_no_auto_merge(self):self.assertTrue(all(not r['autoMerge'] and r['actualFinding'] for r in self.objects['duplicate-gloss-review.json']['records']))
    def test_frozen_40(self):self.assertEqual(len(self.selection['records']),40)
    def test_pos_balance(self):self.assertEqual(Counter(r['record']['partOfSpeechProposal'] for r in self.selection['records']),dict.fromkeys(['NOUN','VERB','ADJECTIVE','ADVERB'],10))
    def test_source_and_cefr_balance(self):self.assertFalse(self.selection['quotaShortfalls'])
    def test_low_risk_only(self):self.assertEqual(self.selection['reviewOnlyCount'],0)
    def test_selection_fingerprint(self):self.assertEqual(m.digest({'selected-first-40.json':self.selection}),m.load(m.WS/'selection-manifest.json')['fingerprint'])
    def test_non_alphabetical(self):
        names=[r['record']['headword'] for r in self.selection['records']];self.assertNotEqual(names,sorted(names))
    def test_four_packs_exact_keys(self):
        allkeys=[]
        for n in range(1,5):
            rows=list(csv.DictReader(io.StringIO(self.exports[f'review-packs/decisions-{n:02d}.csv'])));self.assertEqual(len(rows),10)
            allkeys.extend(r['proposalKey'] for r in rows)
            self.assertTrue(all(r['proposalKey'] in self.exports[f'review-packs/review-{n:02d}.md'] for r in rows))
        self.assertEqual(set(allkeys),set(self.records))
    def test_14_dimensions_40(self):self.assertTrue(len(self.qa)==40 and all(set(r['dimensionNotes'])==set(m.DIMENSIONS) for r in self.qa))
    def test_no_human_self_review(self):self.assertTrue(all(r['reviewerKind']=='AI_SELF_REVIEW' for r in self.qa))
    def test_7_issues_8_fields(self):self.assertEqual((sum(len(r['findings']) for r in self.qa),len(self.overlays)),(7,8))
    def test_correction_hashes(self):
        for c in self.overlays:self.assertEqual(c['afterSha256'],hashlib.sha256(c['after'].encode()).hexdigest())
    def test_every_preview_field_provenance(self):self.assertTrue(all(m.valid_provenance(r) for r in self.records.values()))
    def test_stale_provenance_blocks(self):
        self.approve_fixture();row=self.ingest()['decisions'][0];bad=copy.deepcopy(self.record);bad['reviewFieldProvenance'][0]['sha256Utf8']='0'*64
        self.assertFalse(m.promotion(bad,row,self.trust,self.qa[0],0)['gates']['READY_FOR_CANONICAL_AUTHORING'])
    def test_corrected_review_revision(self):self.assertTrue(all(c['acceptedContentHash']!=c['reviewContentHash'] for c in self.candidates if any(o['proposalKey']==c['proposalKey'] for o in self.overlays)))
    def test_original_content_preserved(self):
        original={r['proposalKey']:r['record'] for r in self.selection['records']}
        self.assertTrue(all(c['frozenAcceptedContent']==original[c['proposalKey']] for c in self.candidates))
    def test_empty_file_accepted(self):self.assertEqual(self.ingest([]),self.ledger)
    def test_blank_templates_accepted(self):self.assertEqual(self.ingest(list(csv.DictReader(io.StringIO(self.exports['owner-decision-template.csv'])))),self.ledger)
    def test_partial_defer_accepted(self):self.assertEqual(len(self.ingest()['decisions']),1)
    def test_idempotent_intake(self):
        first=self.ingest();self.assertEqual(self.ingest(ledger=first),first)
    def test_identical_incoming_duplicate(self):self.assertEqual(len(self.ingest([self.row,self.row])['events']),1)
    def test_conflicting_incoming(self):
        second=dict(self.row,rationale='Synthetic contradictory rationale.')
        with self.assertRaises(ValueError):self.ingest([self.row,second])
    def test_conflicting_prior_preserved(self):
        first=self.ingest();before=copy.deepcopy(first);self.row['decision']='REJECT'
        with self.assertRaises(ValueError):self.ingest(ledger=first)
        self.assertEqual(first,before)
    def test_unknown_key(self):self.reject('proposalKey','UNKNOWN')
    def test_stale_hash(self):self.reject('contentHash','0'*64)
    def test_invalid_action(self):self.reject('decision','APPROVE_EVERYTHING')
    def test_missing_reviewer(self):self.reject('reviewerId','')
    def test_missing_date(self):self.reject('reviewedAt','')
    def test_future_date(self):self.reject('reviewedAt','2099-01-01T00:00:00Z')
    def test_missing_rationale(self):self.reject('rationale','')
    def test_ai_reviewer_rejected(self):
        self.trust['reviewers'][0]['kind']='AI'
        with self.assertRaises(ValueError):self.ingest()
    def test_empty_registry_rejected(self):
        self.trust['reviewers']=[]
        with self.assertRaises(ValueError):self.ingest()
    def test_fake_approval_rejected(self):self.row['decision']='KEEP';self.reject('contentApproval','APPROVED')
    def test_non_keep_approval_rejected(self):self.reject('contentApproval','APPROVED')
    def test_revise_requires_overlay(self):self.reject('decision','REVISE')
    def test_revise_exact_overlay_valid(self):
        c=self.overlays[0];r=self.records[c['proposalKey']];self.row.update(proposalKey=r['proposalKey'],contentHash=m.revision(r),decision='REVISE',correctionRef=c['correctionRef'])
        self.assertEqual(len(self.ingest()['decisions']),1)
    def test_merge_unresolved_rejected(self):self.reject('decision','MERGE')
    def test_split_unresolved_rejected(self):self.reject('decision','SPLIT')
    def test_arbitrary_master_reuse(self):self.reject('targetMasterSenseId','ARBITRARY_SENSE')
    def test_missing_rights_evidence(self):self.reject('rightsDispositionRef','UNKNOWN_RIGHTS')
    def test_pending_keep_not_approved(self):
        self.row['decision']='KEEP';row=self.ingest()['decisions'][0];g=m.promotion(self.record,row,self.trust,self.qa[0],0)['gates']
        self.assertFalse(g['HUMAN_CONTENT_REVIEWED']);self.assertFalse(g['RIGHTS_RESOLVED']);self.assertFalse(g['READY_FOR_CANONICAL_AUTHORING'])
    def test_rights_unpinned_rejected(self):
        with self.assertRaises(ValueError):m.validate_rights(self.rights(),self.record,self.trust)
    def test_rights_scoped_valid_fixture(self):
        self.approve_fixture();m.validate_rights(self.trust['rights'][0],self.record,self.trust)
    def test_rights_stale_rejected(self):
        self.approve_fixture();self.trust['rights'][0]['contentHash']='0'*64
        with self.assertRaises(ValueError):self.ingest()
    def test_rights_media_rejected(self):
        self.approve_fixture();self.trust['rights'][0]['sourceMediaExcluded']=False
        with self.assertRaises(ValueError):self.ingest()
    def test_unresolved_copying_rejected(self):
        self.approve_fixture();self.trust['rights'][0]['copyingConcerns']='UNRESOLVED'
        with self.assertRaises(ValueError):self.ingest()
    def test_full_evidence_only_offline_readiness(self):
        self.approve_fixture();row=self.ingest()['decisions'][0];g=m.promotion(self.record,row,self.trust,self.qa[0],0)['gates']
        self.assertTrue(g['READY_FOR_CANONICAL_AUTHORING']);self.assertFalse(g['CANONICAL_AUTHORIZED'])
    def test_unresolved_content_finding_blocks(self):
        self.approve_fixture();row=self.ingest()['decisions'][0];g=m.promotion(self.record,row,self.trust,{'findings':[{'code':'UNRESOLVED_TEST_ONLY'}]},1)['gates']
        self.assertFalse(g['READY_FOR_CANONICAL_AUTHORING'])
    def test_wrong_identity_evidence_rejected(self):
        self.approve_fixture();self.trust['identityEvidence'][0]['contentHash']='0'*64
        with self.assertRaises(ValueError):self.ingest()
    def test_protected_conflict_rejected(self):
        self.approve_fixture();self.trust['identityEvidence'][0]['protectedConflict']=True
        with self.assertRaises(ValueError):self.ingest()
    def test_classification_without_evidence(self):
        self.approve_fixture();self.trust['classificationEvidence']=[]
        with self.assertRaises(ValueError):self.ingest()
    def test_atomic_batch_error(self):
        before=copy.deepcopy(self.ledger)
        with self.assertRaises(ValueError):self.ingest([self.row,dict(self.row,proposalKey='UNKNOWN')])
        self.assertEqual(before,self.ledger)
    def test_no_fake_real_ledger(self):self.assertEqual(m.load(m.WS/'owner-decision-ledger.json')['decisions'],[])
    def test_zero_real_readiness(self):self.assertEqual(self.objects['validation-summary.json']['counts']['readyForCanonicalAuthoring'],0)
    def test_no_ids_or_runtime_mapping(self):self.assertTrue(all(c['canonicalId'] is None and c['runtimeMapping'] is None and not c['publicationEligible'] for c in self.candidates))
    def test_accepted_fingerprint(self):self.assertEqual(self.objects['manifest.json']['inputQueueFingerprint'],m.QUEUE_PIN)
    def test_replay_hash(self):self.assertEqual(self.objects['manifest.json'],m.load(m.WS/'manifest.json'))
    def test_mutation_cli_rejected(self):
        for arg in ['--apply','--production','--delete']:
            result=subprocess.run([sys.executable,'-B',str(Path(m.__file__)),arg],capture_output=True,text=True)
            self.assertEqual(result.returncode,2)
    def test_trust_sha_required(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'trust.json';p.write_text(json.dumps(self.trust),encoding='utf8')
            with self.assertRaises(ValueError):m.trust_bundle(p,'0'*64)
            self.assertEqual(m.trust_bundle(p,hashlib.sha256(p.read_bytes()).hexdigest()),self.trust)
    def test_isolated_file_intake_and_rights(self):
        # Exercise actual CSV/receipt writes only in a temporary directory.
        with tempfile.TemporaryDirectory() as td:
            ws=Path(td);path=ws/'partial.csv';path.write_text(m.csv_text(m.COLUMNS,[self.row]),encoding='utf8')
            (ws/'owner-decision-ledger.json').write_text(m.encode(self.ledger),encoding='utf8')
            (ws/'content-correction-overlays.json').write_text(m.encode({'corrections':self.overlays}),encoding='utf8')
            with patch.object(m,'WS',ws),patch.object(m,'run',return_value={}),patch.object(m,'build',return_value=(self.objects,self.exports,self.report)):
                self.assertFalse(m.import_file(path,self.trust)['written'])
                self.assertEqual(m.load(ws/'owner-decision-ledger.json'),self.ledger)
                self.assertTrue(m.import_file(path,self.trust,True)['written'])
                self.assertFalse(m.import_file(path,self.trust,True)['written'])
                self.assertEqual(len(list((ws/'decision-history').glob('*.json'))),1)
                rights=ws/'rights.csv';rights.write_text(self.exports['rights-review-template.csv'],encoding='utf8')
                self.assertEqual(m.validate_rights_file(rights,self.trust)['rightsRecords'],[])
    def test_zero_byte_file_accepted(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td)/'empty.csv';path.write_bytes(b'')
            with patch.object(m,'run',return_value={}),patch.object(m,'build',return_value=(self.objects,self.exports,self.report)):
                self.assertFalse(m.import_file(path,self.trust)['ledgerWouldChange'])
                self.assertEqual(m.validate_rights_file(path,self.trust)['rightsRecords'],[])
    def test_no_database_network_in_build(self):
        with patch.object(socket,'socket',side_effect=AssertionError('Network forbidden')):
            self.assertEqual(m.build()[0]['manifest.json']['fingerprint'],self.objects['manifest.json']['fingerprint'])

if __name__=='__main__':unittest.main(verbosity=2)
