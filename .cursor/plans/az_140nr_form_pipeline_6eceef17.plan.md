---
name: AZ 140NR Form Pipeline
overview: "Build the complete Arizona Form 140NR autofill pipeline: extract PDF field names from the blank form, add AZ tax computation to the tax engine, create the field mapper, and register the form -- following the exact same pattern as the existing California 540NR implementation."
todos:
  - id: extract-fields
    content: Run debug-az140nr-fields.ts with full permissions to extract all PDF AcroForm field names and positions
    status: pending
  - id: analyze-fields
    content: Analyze the field layout JSON and debug PDF to map each field to its semantic meaning (name, SSN, income lines, etc.)
    status: pending
  - id: tax-engine
    content: Add AZ140NRComputation type and computeAZ140NRTax() to lib/tax-engine.ts
    status: pending
  - id: mapper
    content: Create lib/form-mappers/f140nr.ts with full field mapping based on extracted PDF fields
    status: pending
  - id: registry
    content: Register f140nr in lib/forms/registry.ts
    status: pending
  - id: verify
    content: Run lints and verify end-to-end wiring
    status: pending
isProject: false
---

# AZ Form 140NR Autofill Pipeline

## Context

The detection and UI layers already work for Arizona (config in [lib/state-tax-config.ts](lib/state-tax-config.ts) has `implemented: true`, eligibility route detects AZ W-2 `state_local` entries, forms page renders interactive card). What is missing is the backend: no mapper, no tax computation, no registry entry. The empty PDF template `az140nr.pdf` has now been added to `public/forms/empty/`.

The implementation follows the exact pattern of the California 540NR pipeline:

- [lib/form-mappers/f540nr.ts](lib/form-mappers/f540nr.ts) -- field mapper
- [lib/tax-engine.ts](lib/tax-engine.ts) -- `compute540NRTax()` function
- [lib/forms/registry.ts](lib/forms/registry.ts) -- registry entry

## Arizona Tax Rules (2024)

- **Flat tax rate**: 2.5% on all taxable income (no progressive brackets)
- **Standard deduction**: $14,600 (single filer)
- **Nonresident allocation ratio**: AZ source income / Federal AGI (capped at 1.00)
- **Key form lines**:
  - Line 1: Federal AGI
  - Line 2a: AZ wages from W-2
  - Line 3: Total AZ gross income
  - Line 16: Allocation ratio (Line 14 / Line 15)
  - Line 24: Standard deduction
  - Line 27: AZ taxable income
  - Line 28: Tax (Line 27 x 2.5%)
  - Line 34a: AZ withholding from W-2
  - Line 39/40/42: Tax due / Overpayment / Refund

## Step 1: Extract PDF Field Names

Create and run [scripts/debug-az140nr-fields.ts](scripts/debug-az140nr-fields.ts) (already created) to dump every AcroForm field name and its physical position from `az140nr.pdf`. This is the critical reverse-engineering step -- we need the exact field identifiers (e.g. `"140NR_form_2a"` or whatever naming convention the PDF uses) to know what keys to set in the mapper.

The script was already written but failed due to sandbox restrictions. It needs to run with full permissions. Outputs:

- `scripts/output/az140nr-layout.json` -- field positions sorted by page
- `scripts/output/az140nr-debug.pdf` -- PDF with field names filled in for visual verification

## Step 2: Add AZ Tax Computation to Tax Engine

Add to [lib/tax-engine.ts](lib/tax-engine.ts):

- `AZ140NRComputation` type (modeled after `CA540NRComputation`)
- `computeAZ140NRTax(docs: FormDocuments)` function

Key computation logic (much simpler than CA due to flat rate):

```typescript
// Aggregate AZ wages and AZ withholding from all W-2 state_local entries
// where state === "AZ"
const azWages = ...;     // sum of state_wages where state=AZ
const azWithheld = ...;  // sum of state_income_tax where state=AZ

// Allocation ratio
const azAllocationRatio = federalAgi > 0
  ? Math.min(1.0, azWages / federalAgi) : (azWages > 0 ? 1.0 : 0);

// Standard deduction (NRA may or may not be eligible -- $14,600 single)
const azStandardDeduction = 14600;

// Taxable income
const azTaxableIncome = Math.max(0, azAdjustedIncome - azStandardDeduction);

// Tax: flat 2.5%
const azTax = taxRound(azTaxableIncome * 0.025);

// Refund or owed
const balance = azWithheld - azTax;
```

## Step 3: Create Form Mapper

Create [lib/form-mappers/f140nr.ts](lib/form-mappers/f140nr.ts) following the pattern of `f540nr.ts`:

- Import `computeAZ140NRTax` from `tax-engine.ts`
- Export `mapToF140NR(docs: FormDocuments): Record<string, unknown>`
- Map personal info (name, SSN, address from passport/W-2)
- Map income lines (federal AGI, AZ wages, allocation ratio)
- Map deductions, tax computation, withholding, refund/owed
- Map signature block

The exact field name mappings depend on the output of Step 1.

## Step 4: Register in Form Registry

Update [lib/forms/registry.ts](lib/forms/registry.ts):

- Add `import { mapToF140NR } from "@/lib/form-mappers/f140nr"`
- Add entry to `FORM_REGISTRY` array:

```typescript
{
  formId: "f140nr",
  pdfPath: "public/forms/empty/az140nr.pdf",
  filledFilename: "az140nr_filled.pdf",
  mapper: mapToF140NR,
  requiredDocTypes: ["passport", "w2"],
}
```

## Step 5: Verify

- Run lint checks on all modified/new files
- Confirm the form fill API route can resolve `f140nr` through the registry
- Confirm "Download Empty" resolves to `az140nr.pdf` (already in public)

## Files Changed


| File                              | Action                                                |
| --------------------------------- | ----------------------------------------------------- |
| `scripts/debug-az140nr-fields.ts` | Already created; run to extract field names           |
| `lib/tax-engine.ts`               | Add `AZ140NRComputation` type + `computeAZ140NRTax()` |
| `lib/form-mappers/f140nr.ts`      | New file -- AZ 140NR field mapper                     |
| `lib/forms/registry.ts`           | Add f140nr entry + import                             |


