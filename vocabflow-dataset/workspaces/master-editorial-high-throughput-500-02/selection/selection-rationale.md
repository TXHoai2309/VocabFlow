# Cohort 500-02 selection rationale

Frozen source: 6143 unique ledger groups; 1520 excluded as authored in CP05; 4623 eligible groups. Seed: PHASE_2H2L_COHORT_500_02_V1.

Proportionate stratified sample over joint (source membership × capped editorial risk score × POS family) cells. Allocate 500 by Hamilton largest remainders; deterministic SHA256 tie breaks and within-cell ordering; seeded SHA256 order the selected groups. No quota hand-entered. CEFR is source evidence only.

Selection composition: {"posFamilies": {"MODIFIER": 114, "NOUN": 295, "OTHER": 9, "VERB": 82}, "riskScoreBands": {"ELEVATED_3_PLUS": 3, "LOW_0": 298, "MODERATE_1_2": 199}, "sourceMembership": {"BOTH": 300, "OXFORD": 116, "VOCAB": 84}}

Remaining-pool composition: {"posConflictGroups": 9, "posFamilies": {"MODIFIER": 1049, "NOUN": 2728, "OTHER": 80, "VERB": 766}, "possiblePolysemyFlagGroups": 1837, "riskScoreBands": {"ELEVATED_3_PLUS": 26, "LOW_0": 2751, "MODERATE_1_2": 1846}, "sourceCefrEvidenceOnly": {"A1": 447, "A2": 577, "B1": 585, "B2": 1146, "C1": 1414, "C2": 501}, "sourceMembership": {"BOTH": 2789, "OXFORD": 1058, "VOCAB": 776}}

Selected-pool source-backed composition: {"posConflictGroups": 0, "posFamilies": {"MODIFIER": 114, "NOUN": 295, "OTHER": 9, "VERB": 82}, "possiblePolysemyFlagGroups": 197, "riskScoreBands": {"ELEVATED_3_PLUS": 3, "LOW_0": 298, "MODERATE_1_2": 199}, "sourceCefrEvidenceOnly": {"A1": 55, "A2": 61, "B1": 60, "B2": 107, "C1": 168, "C2": 56}, "sourceMembership": {"BOTH": 300, "OXFORD": 116, "VOCAB": 84}}

The stratified cells are derived from empirical source membership, priority dimensions and normalized POS candidates in the accepted candidate ledger. Risk is the sum of the four pinned priority dimensions plus a multiple-POS indicator, capped into 0/1/2/3+ sampling bands; raw score is preserved per selected group. POS families are noun, verb, modifier (adjective/adverb), and other. Hamilton allocation follows observed joint cell sizes; no category quota was manually invented. CEFR values are descriptive source evidence and do not grant CEFR classification. Regional variants and source evidence limits stay in each group's linked source records.

The selected 500 are partitioned in deterministic selection order into five checkpoints of 100. Only checkpoint 01 is authorized for authoring in this phase.