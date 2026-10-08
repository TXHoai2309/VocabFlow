#!/usr/bin/env python3
"""Correction overlay integrity and fail-closed boundaries; no fixture writes."""
import copy
import hashlib
import importlib.util
import subprocess
import sys
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

SCRIPT=Path(__file__).with_name('phase-2h2b-qa1-corrections.py')
spec=importlib.util.spec_from_file_location('qa1',SCRIPT)
qa1=importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa1)


class CorrectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.output,cls.report,cls.fingerprint=qa1.build()
        cls.findings=cls.output['finding-dispositions.json']['findings']
        cls.preview=cls.output['corrected-pilot-preview.json']['senseProposals']
        cls.original=qa1.load(qa1.ORIGINAL/'pilot-sense-proposals.json')['senseProposals']
        cls.by_key={s['proposalKey']:s for s in cls.original}

    def test_exact_twenty_two_findings_resolve_and_triage(self):
        self.assertEqual(len(self.findings),len({f['proposalKey'] for f in self.findings}))
        self.assertEqual(len(self.findings),22)
        self.assertEqual(Counter(f['triage'] for f in self.findings),{'REVISE':17,'REVIEW_IDENTITY':4,'KEEP':1})
        for f in self.findings: self.assertIn(f['proposalKey'],self.by_key)
        self.assertEqual(self.output['independent-review-intake.json']['sourceMode'],'PROMPT_SECTION_5_FALLBACK')
        self.assertEqual(self.output['independent-review-intake.json']['reviewFilesLoaded'],[])

    def test_all_seventeen_revisions_have_explicit_coupled_dispositions(self):
        overlays=self.output['content-correction-overlays.json']['overlays']
        self.assertEqual(len(overlays),17)
        for overlay in overlays:
            self.assertTrue(overlay['proposedValues'])
            self.assertEqual(len(overlay['coupledReview']),6)
            self.assertEqual(overlay['ownerDecision'],'UNRESOLVED')
            original=self.by_key[overlay['proposalKey']]
            self.assertEqual(overlay['originalDraftCanonicalHash'],qa1.digest(original))
            for path,value in overlay['originalValues'].items(): self.assertEqual(qa1.get_field(original,path),value)

    def test_identity_four_cases_deferred_no_new_enum_split_or_merge(self):
        identities=self.output['sense-identity-review.json']
        keys=identities['fourMandatoryIdentityKeys']
        self.assertEqual(len(keys),4)
        for f in self.findings:
            if f['proposalKey'] in keys:
                self.assertEqual(f['disposition'],'DEFER_IDENTITY_DECISION')
                self.assertEqual(f['changes'],{})
        self.assertEqual(identities['structureChangesExecuted'],0)
        for p in self.preview: self.assertIn(p['partOfSpeechProposal'],qa1.draft.POS)

    def test_attorney_false_positive_scoped_rationale_original_text_kept(self):
        key='EDITORIAL_2H2B:attorney:lawyer'
        p=next(p for p in self.preview if p['proposalKey']==key)
        self.assertEqual(p['content'],self.by_key[key]['content'])
        audit=next(a for a in self.output['correction-quality-audit.json']['senseAudits'] if a['proposalKey']==key)
        self.assertIn('EXAMPLE_POLARITY_MISMATCH',{f['code'] for f in audit['rawFindings']})
        self.assertNotIn('EXAMPLE_POLARITY_MISMATCH',{f['code'] for f in audit['findings']})
        self.assertEqual(audit['scopedResolutions'][0]['scope'],'EXACT_ORIGINAL_PAIR_ONLY')
        self.assertIn('unclear',audit['scopedResolutions'][0]['rationale'])
        self.assertEqual(audit['status'],'REVIEW')

    def test_no_accidental_sense_creation_deletion_or_group_loss(self):
        self.assertEqual(len(self.preview),155)
        self.assertEqual({p['proposalKey'] for p in self.preview},set(self.by_key))
        self.assertEqual(len({p['proposalKey'] for p in self.preview}),155)
        self.assertEqual(len({p['candidateGroupKey'] for p in self.preview}),100)
        self.assertEqual(sum(n>1 for n in Counter(p['candidateGroupKey'] for p in self.preview).values()),37)

    def test_all_paired_bilingual_content_complete(self):
        for p in self.preview:
            original=self.by_key[p['proposalKey']]
            self.assertEqual(p['candidateGroupKey'],original['candidateGroupKey'])
            self.assertEqual(p['lexemeProposalKey'],original['lexemeProposalKey'])
            for text in qa1.draft.content_fields(p).values(): self.assertTrue(text.strip())
            for e in p['content']['examples']: self.assertNotEqual(e['en'],e['vi'])

    def test_modified_english_examples_reassessed_with_vietnamese(self):
        for f in self.findings:
            if '/content/examples/0/en' in f['changes']:
                self.assertIn('/content/examples/0/vi',f['changes'])
                p=next(p for p in self.preview if p['proposalKey']==f['proposalKey'])
                for path in ['/content/examples/0/en','/content/examples/0/vi']:
                    self.assertEqual(qa1.get_field(p,path),f['changes'][path])
                self.assertIn('re-evaluated',f['translationExampleImpact'])

    def test_original_five_psv_and_all_sixteen_byte_pins_unchanged(self):
        pins=self.output['manifest.json']['inputPins']['originalBytePins']
        self.assertEqual(len(pins),16)
        self.assertEqual(sum('/authored/' in p['path'] for p in pins),5)
        for p in pins: self.assertEqual(qa1.byte_hash(qa1.ROOT/p['path']),p['sha256'])

    def test_original_and_upstream_fingerprints_unchanged(self):
        manifest=qa1.load(qa1.ORIGINAL/'manifest.json')
        self.assertEqual(manifest['fingerprint'],qa1.INPUT_FP)
        artifacts={n:qa1.load(qa1.ORIGINAL/n) for n in manifest['files']}
        self.assertEqual(qa1.digest(artifacts),qa1.INPUT_FP)
        self.assertEqual(manifest['inputPins']['phase2h2aFingerprint'],qa1.draft.PHASE2A)
        self.assertEqual(manifest['inputPins']['phase2h1Fingerprint'],'58928e98845e326f8d9a268aa160c867443e8497436d9c58fa2b9a5647f10a53')

    def test_master_exclusions_legacy_and_classification_not_overwritten(self):
        for p in self.preview:
            original=self.by_key[p['proposalKey']]
            for key in ['existingMasterComparison','sourceEvidenceReferences','classificationProposal']:
                self.assertEqual(p[key],original[key])
            self.assertTrue(all(c['identityClaim']=='NONE' for c in p['existingMasterComparison']))
            self.assertEqual(p['classificationProposal']['status'],'UNRESOLVED')
        water=next(p for p in self.preview if p['proposalKey']=='EDITORIAL_2H2B:water:liquid')
        self.assertEqual(water['correctionAppliedInPreview'],'NO')
        self.assertIn('#11',water['content']['grammarNotesEn'])

    def test_no_automatic_owner_approval_rights_or_canonical_ids(self):
        self.assertFalse(any(qa1.draft.AUTH.values()))
        for p in self.preview:
            self.assertEqual(p['ownerDecision'],p['identityDecision'])
            self.assertEqual(p['ownerDecision'],'UNRESOLVED')
            self.assertEqual(p['canonicalIdsAllocated'],0)
            self.assertFalse(p['publicationEligible'])
            self.assertEqual(p['sourceRights'],'UNKNOWN_REVIEW_REQUIRED')
        for f in self.findings: self.assertEqual(f['ownerDecision'],'UNRESOLVED')

    def test_generated_new_field_hashes_no_fictional_human_or_license(self):
        for p in self.preview:
            for path,text in qa1.draft.content_fields(p).items():
                evidence=p['fieldAuthorship'][path]
                self.assertEqual(evidence['sourceType'],'GENERATED')
                self.assertEqual(evidence['textHash'],hashlib.sha256(text.encode('utf8')).hexdigest())
                for name in ['humanAuthor','humanReviewer','license','reviewDate']: self.assertIsNone(evidence[name])

    def test_about_pos_proposal_keeps_framework_disagreement_open(self):
        p=next(p for p in self.preview if p['proposalKey']=='EDITORIAL_2H2B:about:approximately')
        self.assertEqual(p['partOfSpeechProposal'],'ADVERB')
        self.assertIn('PREPOSITION',p['content']['grammarNotesEn'])
        self.assertIn('POS_FRAMEWORK_DECISION',p['identityBlockers'])
        other=next(p for p in self.preview if p['proposalKey']=='EDITORIAL_2H2B:about:topic')
        self.assertEqual(other['partOfSpeechProposal'],'PREPOSITION')

    def test_identity_or_approval_overlay_paths_rejected(self):
        p=copy.deepcopy(self.original[0])
        for path in ['/ownerDecision','/identityDecision','/canonicalIdsAllocated','/existingMasterComparison','/sourceRights','/candidateGroupKey']:
            with self.assertRaisesRegex(ValueError,'Unauthorized overlay field'): qa1.set_field(p,path,'APPROVED')

    def test_input_drift_fails_closed_without_writes(self):
        with patch.object(qa1,'byte_hash',return_value='tampered'),self.assertRaisesRegex(ValueError,'Original byte drift'):
            qa1.inputs()

    def test_offline_deterministic_replay_no_external_calls_or_writes(self):
        with patch.object(Path,'write_text',side_effect=AssertionError('Write attempted')),patch.object(subprocess,'run',side_effect=AssertionError('External process')):
            result=qa1.run(True)
        self.assertEqual(result['fingerprint'],self.fingerprint)
        self.assertEqual(result['artifactComparison'],'PASS')
        self.assertEqual(result['databaseAccess'],result['databaseWrites'])
        self.assertEqual(result['databaseAccess'],'NONE')

    def test_corrected_fingerprint_covers_all_outputs_not_external_pass(self):
        self.assertEqual(self.fingerprint,qa1.digest({k:v for k,v in self.output.items() if k!='manifest.json'}))
        changed=copy.deepcopy(self.output['corrected-pilot-preview.json'])
        changed['senseProposals'][0]['content']['definitionEn']+=' changed'
        self.assertNotEqual(qa1.digest(changed),self.output['manifest.json']['artifactHashes']['corrected-pilot-preview.json'])
        self.assertEqual(self.output['validation-summary.json']['externalVerification']['status'],'NOT_EXECUTED_BY_GENERATOR')

    def test_scaling_plan_conditional_not_authoring_or_statistical_claim(self):
        plan=self.output['full-corpus-scaling-readiness.json']
        self.assertEqual(plan['readiness'],'CONDITIONAL')
        self.assertFalse(plan['fullCorpusAuthoringStarted'])
        self.assertIn('73/100',plan['pilotBias'])
        self.assertEqual(plan['nextBatch']['proposedGroups'],120)
        self.assertIn('never grants',plan['nextBatch']['sampling'])

    def test_mutation_cli_arguments_rejected(self):
        for flag in ['--apply','--approve','--publish','--allocate-ids']:
            result=subprocess.run([sys.executable,'-B',str(SCRIPT),flag],capture_output=True,text=True)
            self.assertEqual(result.returncode,2)
            self.assertIn('unrecognized arguments',result.stderr)


if __name__=='__main__': unittest.main(verbosity=2)
