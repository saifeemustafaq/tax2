---
name: Implement 540NR Full System
overview: "Build the complete California Form 540NR system to match the feature parity of the existing 1040-NR pipeline: generate PDF field manifest, build a California tax calculation engine, expand the form mapper to fill all relevant fields, add CA eligibility logic, and wire up any remaining UI."
todos:
  - id: field-manifest
    content: Generate 540NR PDF field manifest via npm script and create scripts/add-540nr-field-names.mjs
    status: pending
  - id: ca-tax-engine
    content: Build compute540NRTax() in lib/tax-engine.ts with CA brackets, proration, exemption credits, SDI, and refund/owed logic
    status: pending
  - id: expand-mapper
    content: Rewrite lib/form-mappers/f540nr.ts to fill all 540NR fields (Pages 1-6) using the tax engine output
    status: pending
  - id: eligibility
    content: Add ca_540nr eligibility flag in the eligibility API and gate 540NR visibility in the forms UI
    status: pending
  - id: verify-and-test
    content: Run the field extraction, fill a sample PDF, and verify all fields populate correctly
    status: pending
isProject: false
---

# Implement Full 540NR System (Parity with 1040-NR)

## Current State

The 540NR form already has scaffolding in place:

- Empty PDF at `public/forms/empty/540nr.pdf`
- Registered in `[lib/forms/registry.ts](lib/forms/registry.ts)` (line 43-47)
- Minimal mapper at `[lib/form-mappers/f540nr.ts](lib/form-mappers/f540nr.ts)` -- fills only ~10 fields (name, SSN, address, filing status, federal AGI, CA wages, CA withholding, signature)
- Listed in UI at `[app/(app)/forms/page.tsx](app/(app)`/forms/page.tsx) (line 69-77)

**What is missing** compared to 1040-NR:

1. No PDF field manifest (no `scripts/output/540nr.json`)
2. No California tax calculation engine (no CA brackets, no CA standard deduction, no CA exemption credits, no tax-owed/refund calculation)
3. The mapper only fills 10 of the ~200+ fields; income lines, tax computation, credits, payments, refund/owed sections are all empty
4. No eligibility gating (540NR should only appear if the user has CA income in their W-2)
5. No human-readable field-name script

## System Flow (same as 1040-NR)

```mermaid
flowchart LR
    Upload["Upload W-2, Passport"] --> Extract["OpenAI Extraction"]
    Extract --> MongoDB["Store in MongoDB"]
    MongoDB --> FetchDocs["fetchFormDocuments()"]
    FetchDocs --> TaxEngine["compute540NRTax()"]
    TaxEngine --> Mapper["mapToF540NR()"]
    Mapper --> FillPDF["fillPdfFields()"]
    FillPDF --> Download["Download Filled PDF"]
```



No changes needed to the upload, extraction, or storage layers -- the existing passport and W-2 extractions already capture all data the 540NR needs (including `state_local` entries with CA wages/withholding from W-2 Box 15-17, and `box_14` which may contain CA SDI).

---

## Implementation Plan

### Step 1: Generate the 540NR PDF field manifest

Run the existing script to discover all AcroForm fields:

```bash
npm run pdf-fields-to-json -- --pdf public/forms/empty/540nr.pdf
```

This creates `scripts/output/540nr.json`. Then create `scripts/add-540nr-field-names.mjs` (following the pattern in `[scripts/add-1040nr-field-names.mjs](scripts/add-1040nr-field-names.mjs)`) to annotate each field with a human-readable `fieldName`. This is the foundation for every subsequent step.

### Step 2: Build the California tax engine

Add a `compute540NRTax()` function to `[lib/tax-engine.ts](lib/tax-engine.ts)`. This mirrors `compute1040NRTax()` but for California. Key computations:

- **CA taxable income**: Start with federal AGI, add/subtract CA-specific adjustments (for NRA basic case: CA wages from W-2 `state_local` where `state === "CA"`)
- **CA standard deduction**: California does not allow a standard deduction for nonresidents who are required to file 540NR. For NRAs filing 540NR, the standard deduction is typically $0 (itemized deductions are also prorated). However, if the user qualifies for a deduction we use the 2025 CA standard deduction for Single ($5,540 or current amount).
- **CA tax brackets**: 2025 California marginal rates (1%, 2%, 4%, 6%, 8%, 9.3%, 10.3%, 11.3%, 12.3%) with the correct income thresholds for Single filers
- **CA exemption credit**: ~$144 (single) for 2025
- **Mental Health Services Tax (MHST)**: 1% surcharge on taxable income over $1,000,000
- **CA SDI**: Extract from W-2 `box_14` (often labeled "CASDI" or "CA SDI")
- **Proration ratio**: For nonresidents, CA tax is prorated: `(CA source income / total income)`
- **CA tax owed vs refund**: Compare computed tax against CA state income tax withheld from W-2

New types:

```typescript
export type CA540NRComputation = {
  federalAgi: number;
  caWages: number;
  caAdjustedGrossIncome: number;
  caStandardDeduction: number;
  caTaxableIncome: number;
  caProrationRatio: number;
  caTaxBeforeCredits: number;
  caExemptionCredit: number;
  caNetTax: number;
  caSdi: number;
  caWithheld: number;
  caOverpayment: number;
  caRefund: number;
  caAmountOwed: number;
};
```

The function reuses the existing `parseNum`, `taxRound`, `amt` helpers and the `compute1040NRTax` output for federal AGI.

### Step 3: Expand the 540NR form mapper

Rewrite `[lib/form-mappers/f540nr.ts](lib/form-mappers/f540nr.ts)` to fill all relevant fields using the field manifest from Step 1 and the tax engine from Step 2. The mapper should mirror the thoroughness of `[lib/form-mappers/f1040nr.ts](lib/form-mappers/f1040nr.ts)`. Fields to cover:

**Page 1 (1xxx):** Taxpayer info (already partially done), plus:

- Exemptions (personal exemption count and credit amount -- fields 1030-1053)
- Country if foreign address (field 1016)
- CA residency dates if applicable

**Page 2 (2xxx):** Income

- Federal AGI (2001 -- already done)
- CA wages (2002 -- already done)  
- CA adjustments (2003-2036): subtractions/additions for CA differences from federal
- CA adjusted gross income
- Standard/itemized deduction
- CA taxable income

**Page 3 (3xxx):** Tax computation

- Tax from CA tax table/brackets (3001)
- Exemption credits (3002-3005)
- Net tax after credits
- Proration calculation (CA income / total income ratio)

**Page 4 (4xxx):** Payments

- CA income tax withheld (4003 -- already done)
- CA SDI withheld (4004 or similar, from W-2 Box 14)
- Total payments

**Page 5 (5xxx):** Refund or amount owed

- Overpayment / refund amount
- Amount owed
- Underpayment penalty checkbox

**Page 6 (6xxx):** Signature (already done)

### Step 4: Add eligibility gating for 540NR

Currently, 540NR is always visible. It should only appear when the user has CA state income. Extend the eligibility system:

1. In `[app/api/forms/eligibility/route.ts](app/api/forms/eligibility/route.ts)`, add a `ca_540nr: boolean` field to `FormEligibility` -- true when the user's W-2 contains a `state_local` entry where `state === "CA"` and `state_wages` is non-zero.
2. In `[app/(app)/forms/page.tsx](app/(app)`/forms/page.tsx), add `visibleWhen: "ca_540nr"` to the 540NR entry in the `FORMS` array.

### Step 5: Update registry requiredDocTypes

In `[lib/forms/registry.ts](lib/forms/registry.ts)`, the 540NR entry already has `requiredDocTypes: ["passport", "w2"]`. This is correct -- no changes needed here.

### Step 6: Create the field-names annotation script

Create `scripts/add-540nr-field-names.mjs` following the exact pattern of `[scripts/add-1040nr-field-names.mjs](scripts/add-1040nr-field-names.mjs)`. Map every field in `scripts/output/540nr.json` to a human-readable description based on the official 540NR form layout.

---

## Files Modified


| File                                                                       | Change                                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `[lib/tax-engine.ts](lib/tax-engine.ts)`                                   | Add `CA_BRACKETS_2025_SINGLE`, `compute540NRTax()`, `CA540NRComputation` type |
| `[lib/form-mappers/f540nr.ts](lib/form-mappers/f540nr.ts)`                 | Rewrite mapper to fill all 540NR fields using `compute540NRTax()`             |
| `[app/api/forms/eligibility/route.ts](app/api/forms/eligibility/route.ts)` | Add `ca_540nr` boolean to `FormEligibility`                                   |
| `[app/(app)/forms/page.tsx](app/(app)`/forms/page.tsx)                     | Add `visibleWhen: "ca_540nr"` to 540NR form def                               |


## Files Created


| File                                | Purpose                                   |
| ----------------------------------- | ----------------------------------------- |
| `scripts/output/540nr.json`         | Generated field manifest (via npm script) |
| `scripts/add-540nr-field-names.mjs` | Human-readable field name annotation      |


## Files Unchanged (reused as-is)

- `lib/pdf.ts` -- fill logic
- `lib/forms/registry.ts` -- already registered (only `requiredDocTypes` may be updated)
- `lib/form-mappers/fetch-docs.ts` -- already fetches W-2 `state_local`
- `lib/form-mappers/types.ts` -- `taxRound`, `parseNum`, `amt` reused
- `app/api/forms/[formId]/fill/route.ts` -- dynamic route handles all forms
- `app/api/forms/[formId]/fields/route.ts` -- already has 540NR in `PDF_MAP`
- `public/forms/empty/540nr.pdf` -- existing blank PDF
- `components/form-viewer-modal.tsx` -- placeholder already has 540NR case

## Key Design Decisions

- **Reuse `compute1040NRTax`** for the federal AGI value rather than recalculating federal tax in the CA engine
- **Keep CA tax engine in `lib/tax-engine.ts`** alongside the federal engine to follow the "one responsibility" principle (tax computation) and avoid file sprawl
- **Same rounding rules** (`taxRound`) apply to CA values -- consistent with the three-layer rounding approach
- **Same mapper pattern** (pure function returning `Record<string, unknown>`) so no changes to the fill pipeline
- **No new document types needed** -- all CA data comes from the existing W-2 extraction (`state_local`, `box_14`)
- **No new API routes needed** -- the dynamic `[formId]/fill` route handles everything

