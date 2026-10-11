"""Owner's focused POS-resolution contracts; no writes or bytecode generation."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("isolated_pos_contract",HERE/"checkpoint-04.py")
C=importlib.util.module_from_spec(spec);spec.loader.exec_module(C)
R=C.R
frozen=C.V.load(C.WS/"selection/frozen-cohort.json")
group=next(g for g in frozen["groups"] if g["cohortOrder"]==368)
evidence=R.source_evidence(group,C.V.inputs()[3])
entry=R.approved_entries(C.CP/"pos-resolution/entries.json")[group["candidateGroupKey"]]
EXISTING_PINS={'checkpoints/checkpoint-04/planning/micro-01-decisions.psv': 'dd42d491778e28b29d106d9e71cfdcf081715761fef438762d3c8d084a88d6a4', 'checkpoints/checkpoint-04/planning/micro-01-ready.json': 'c9a3db167a84d15552e854aae27e4f184cab8dadef4f813e82f8f8f72379bbdf', 'checkpoints/checkpoint-04/planning/micro-01.json': '5aec114c18c9496ca992fc94eb649b385c6072f89cd6694ed9a776606963aeee', 'checkpoints/checkpoint-04/planning/micro-03-decisions.psv': '8fd3cc929a3c91be0c175ac4331c7afde119994c1c6fc0e73d3dafc95f2e2992', 'checkpoints/checkpoint-04/planning/micro-03-ready.json': '4660e1da2efbb3a2e255a8b12aed090a4e6683a465950297fb7279896c3d0723', 'checkpoints/checkpoint-04/planning/micro-03.json': 'afb964814c4c8356c7d09961da9d7e752bd62f38efa329bfed674c2e3dbdbdde', 'checkpoints/checkpoint-04/authored/micro-01.psv': '292a46defa6ad9b8a5b9c8747fb6d5646509e73009bcf0dbe8ed7376799abd0c', 'checkpoints/checkpoint-04/authored/micro-03.psv': 'b919d76bd580890d529372f1050c8ce9e9dc6d2514edea5653cdc9d4145a685f', 'checkpoints/checkpoint-04/self-review/micro-01.psv': 'b1b267da20335f43edc98dbeb1abf78f4c76f65e8b59158d6f500b5c5b8662d0', 'checkpoints/checkpoint-04/self-review/micro-03.psv': 'dfae39f784db44a324eb174af0ef524e783e4474b291142b0445993de9b5fc29'}

class ResolutionContracts(unittest.TestCase):
    def modified(self, field, value):
        g=copy.deepcopy(group);e=copy.deepcopy(evidence);a=copy.deepcopy(entry)
        e[0]["record"][field]=value
        r=e[0]["record"]
        h=R.digest({k:v for k,v in r.items() if k!="recordEvidenceSha256"})
        r["recordEvidenceSha256"]=h;e[0]["reference"]["recordEvidenceSha256"]=h;g["sourceEvidence"][0]["recordEvidenceSha256"]=h
        return g,e,a

    def test_01_verified_whip_source_resolves_verb(self):
        self.assertEqual(R.resolveEffectivePOS(group,evidence,entry),["VERB"])
        self.assertEqual(evidence[0]["record"]["sourceFields"]["Word"],"whip (v)")

    def test_02_missing_raw_evidence_fails(self):
        g,e,a=self.modified("rawHeadword","whip")
        with self.assertRaises(ValueError):R.resolveEffectivePOS(g,e,a)
        with self.assertRaises(ValueError):R.resolveEffectivePOS(group,[],entry)
        with self.assertRaises(ValueError):R.resolveEffectivePOS(group,evidence,None)

    def test_03_ambiguous_source_tag_fails(self):
        g,e,a=self.modified("rawHeadword","whip (v or n)")
        with self.assertRaises(ValueError):R.resolveEffectivePOS(g,e,a)

    def test_04_conflicting_source_tags_fail(self):
        g,e,a=self.modified("sourcePosRaw","noun")
        a["sourceProvenance"]=R.provenance(g,e)
        with self.assertRaisesRegex(ValueError,"Conflicting"):R.resolveEffectivePOS(g,e,a)

    def test_05_wrong_evidence_hash_fails(self):
        e=copy.deepcopy(evidence);e[0]["record"]["sourceFields"]["Meaning"]="changed"
        with self.assertRaisesRegex(ValueError,"hash"):R.resolveEffectivePOS(group,e,entry)

    def test_06_wrong_group_and_scope_fail(self):
        a=copy.deepcopy(entry);a["candidateGroupKey"]="NORMALIZED_HEADWORD:other"
        with self.assertRaisesRegex(ValueError,"scope"):R.resolveEffectivePOS(group,evidence,a)
        a=copy.deepcopy(entry);a["frozenCohortOrder"]=369
        with self.assertRaisesRegex(ValueError,"scope"):R.resolveEffectivePOS(group,evidence,a)

    def test_07_nonempty_original_pos_never_expands(self):
        g=copy.deepcopy(group);g["normalizedPosCandidates"]=["NOUN"]
        self.assertEqual(R.resolveEffectivePOS(g,[],entry),["NOUN"])
        self.assertEqual(g["normalizedPosCandidates"],["NOUN"])

    def test_08_frozen_fingerprint_and_objects_unchanged(self):
        before=C.M.encode(frozen);g_before=C.M.encode(group);e_before=C.M.encode(evidence)
        R.resolveEffectivePOS(group,evidence,entry)
        self.assertEqual(before,C.M.encode(frozen));self.assertEqual(g_before,C.M.encode(group));self.assertEqual(e_before,C.M.encode(evidence))
        self.assertEqual(frozen["fingerprint"],"9710a47fda875f70412c7440b2969c031dc6eb3c076140a42007aed4f83cf59c")
        self.assertEqual(C.V.load(C.WS/"selection/frozen-cohort.json"),frozen)

    def test_09_accepted_parent_replay_unchanged(self):
        groups,parent,_=C.selection()
        self.assertEqual(len(groups),100);self.assertEqual(len(parent["records"]),2547)
        self.assertEqual(C.P.verify()[0]["status"],"PASS")

    def test_10_plan_and_parser_use_same_effective_pos(self):
        old=C._original_plan
        fake={"microBatch":4,"entries":[{"candidateGroupKey":group["candidateGroupKey"],"proposedPOS":[]}],"fingerprint":"old"}
        C._original_plan=lambda number:copy.deepcopy(fake)
        try:plan=C.plan(4)
        finally:C._original_plan=old
        manuscript="whip (v)|strike-with-whip|VERB|Strike with a whip|To strike someone or an animal using a whip.|đánh bằng roi|The guard whipped the prisoner.|Người lính gác đánh tù nhân bằng roi.|Transitive; whip somebody.|whip (v)\n".encode()
        rows=C.parse(manuscript,[group])
        self.assertEqual(plan["entries"][0]["proposedPOS"],[rows[0]["partOfSpeech"]])
        self.assertEqual(rows[0]["sourceEvidence"],group["sourceEvidence"])
        self.assertEqual(C.M.parse,C.parse);self.assertEqual(C.M.plan,C.plan)

    def test_11_pos_outside_effective_list_rejected(self):
        manuscript="whip (v)|invalid-noun|NOUN|Object|An object.|vật|This is a whip.|Đây là roi.|Countable.|whip (v)\n".encode()
        with self.assertRaises(Exception):C.parse(manuscript,[group])

    def test_12_byte_identical_replay(self):
        self.assertEqual(C.M.encode(R.resolveEffectivePOS(group,evidence,entry)),C.M.encode(R.resolveEffectivePOS(group,evidence,entry)))
        self.assertEqual(C.M.encode(C.plan(3)),(C.CP/"planning/micro-03.json").read_bytes())

    def test_13_existing_40_groups_68_senses_preserved(self):
        for name,pin in EXISTING_PINS.items():self.assertEqual(C.M.sha((C.WS/name).read_bytes()),pin,name)
        total=0
        for n in [1,3]:
            rows=C.parse((C.CP/f"authored/micro-{n:02d}.psv").read_bytes(),C.selection()[0][(n-1)*20:n*20]);total+=len(rows)
        self.assertEqual(total,68)

    def test_14_preflight_exact_scope_and_provenance(self):
        audit=C.V.load(C.CP/"pos-resolution/audit.json")
        groups=[g for g in frozen["groups"] if 301<=g["cohortOrder"]<=500]
        self.assertEqual(len(groups),audit["groupsExamined"])
        self.assertEqual([g["cohortOrder"] for g in groups if not g["normalizedPosCandidates"]],[368])
        self.assertEqual(audit["resolutionEntriesPermitted"],1)
        self.assertEqual(audit["groups"][0]["sourceProvenance"],R.provenance(group,evidence))
        for name,pin in audit["sourceInventoryHashes"].items():self.assertEqual(C.M.sha((C.ROOT/"vocabflow-dataset/workspaces/full-source-inventory-dedupe"/name).read_bytes()),pin)

    def test_15_supplementary_other_identity_is_pinned_and_not_merged(self):
        diagnostic=C.V.load(C.CP/"pos-resolution/audit.json")["crossInventoryStemDiagnostic"]
        other=diagnostic["otherRecord"];record=C.V.inputs()[3]["OXFORD_5000"][other["recordIndex"]]
        self.assertEqual(record["recordEvidenceSha256"],other["recordEvidenceSha256"])
        self.assertEqual(R.digest({k:v for k,v in record.items() if k!="recordEvidenceSha256"}),other["recordEvidenceSha256"])
        self.assertEqual(record["sourcePosRaw"],other["sourcePosRaw"])
        self.assertNotEqual(record["normalizedHeadword"],group["normalizedHeadword"])
        self.assertFalse(diagnostic["mergePerformed"])
        self.assertFalse(diagnostic["conflictingPOSFound"])

if __name__=="__main__":unittest.main()
