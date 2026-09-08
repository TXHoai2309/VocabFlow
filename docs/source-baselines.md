# VocabFlow Source Baselines

This map prevents an agent from selecting an older document over the current
Family MVP baseline. Canonical working references are the Markdown files.

| Previous source | Canonical Markdown | Status |
|---|---|---|
| `VocabFlow_Family_MVP_Product_Specification_v1.0.docx` | [`docs/product/product-spec.md`](product/product-spec.md) | CURRENT PRODUCT SOURCE OF TRUTH |
| `VocabFlow_Technical_Architecture_v1.0.4.docx` | [`docs/architecture/technical-architecture.md`](architecture/technical-architecture.md) | CURRENT TECHNICAL SOURCE OF TRUTH |
| `VocabFlow_Global_Design_System_WebApp_UI_Rules_v1.0.2.docx` | [`docs/design/design-system.md`](design/design-system.md) | CURRENT GLOBAL UI SOURCE OF TRUTH |
| `VocabFlow_Family_MVP_Feature_UI_Specification_v1.0.1.docx` | [`docs/design/feature-ui-spec.md`](design/feature-ui-spec.md) | CURRENT FEATURE UI SOURCE OF TRUTH |
| `VocabFlow_User_Flow_v1.docx` | [`docs/flow/user-flow.md`](flow/user-flow.md) | CURRENT FLOW BASELINE |
| `VocabFlow_BATCH0_Foundation_Execution_Spec_v1.0.docx` | [`docs/implementation/batch0-foundation-execution-spec.md`](implementation/batch0-foundation-execution-spec.md) | ACCEPTED / FROZEN |
| `BATCH0_FOUNDATION_ACCEPTANCE.md` | [`docs/implementation/BATCH0_FOUNDATION_ACCEPTANCE.md`](implementation/BATCH0_FOUNDATION_ACCEPTANCE.md) | ACCEPTED EVIDENCE |
| `VocabFlow Personal MVP Specification v0.2.1` (referenced historical document; not present in the current tree) | Family MVP Product Specification | ARCHIVED / SUPERSEDED |

## Current source of truth

The Family MVP Product Specification is the product source of truth. The
Technical Architecture, Global Design System, Feature UI Specification and
User Flow define their respective layers. The Personal MVP is historical only;
it must never override Family MVP decisions.

## Conversion policy

All six active canonical DOCX files were converted with paragraph, heading,
table, code-block and hyperlink content preserved. After parity verification,
the DOCX copies are removed from the active docs tree; Git history remains the
recovery source. Acceptance evidence is retained separately.
