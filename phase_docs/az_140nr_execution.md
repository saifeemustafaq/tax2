# AZ Form 140NR -- Phase-by-Phase Execution Checklist

Parent plan: [az_140nr_form_pipeline_6eceef17.plan.md](../az_140nr_form_pipeline_6eceef17.plan.md)

---

## Important: Form Structure Notes

The actual 2024 AZ Form 140NR (from azdor.gov) uses a **two-column layout** for the
income section (Federal column | Arizona column), and its line numbering differs from
some third-party references. Key differences from simplified representations:

- Lines 1-14 on the actual form cover header, filing status, exemptions, and dependents
- Lines 15-22 are the income section with **dual columns** (Federal and Arizona)
- Line 25 = Federal AGI (from federal column)
- Line 26 = Arizona gross income (from Arizona column)
- Line 27 = Arizona income ratio (Line 26 / Line 25, capped at 1.000)
- Lines after 27 cover exemptions, deductions, tax, payments, and refund

The exact field names and line numbers will be discovered in Phase 1 by extracting
AcroForm fields from the actual PDF. All `<field_name>` placeholders in this document
must be replaced with the real field identifiers from Phase 1 output.

---

## Pre-requisites (already done)

- [x] Empty PDF template `az140nr.pdf` added to `public/forms/empty/`
- [x] `STATE_TAX_MAP["AZ"]` configured in `lib/state-tax-config.ts` with `implemented: true`
- [x] Eligibility route (`app/api/forms/eligibility/route.ts`) detects AZ via `state_local`
- [x] Forms page renders an interactive card for AZ Form 140NR
- [x] Debug script `scripts/debug-az140nr-fields.ts` written

---

## Phase 1: Extract and Map PDF Field Names

**Goal:** Discover every AcroForm field name inside `az140nr.pdf` and map each field to its semantic meaning on the form (which line, which box).

### 1.1 Run the debug script

Run from the project root:

```bash
npx tsx scripts/debug-az140nr-fields.ts
```

> If blocked by sandbox, run with `--` or outside the sandbox. The script requires filesystem write access to `scripts/output/`.

**Expected outputs:**

| Output file | Purpose |
|---|---|
| `scripts/output/az140nr-layout.json` | JSON array of every field, sorted by page then top-to-bottom then left-to-right. Each entry has: `name`, `kind`, `page`, `x`, `y`, `yFromTop`, `width`, `height`. |
| `scripts/output/az140nr-debug.pdf` | A copy of the form with every text field filled with its own field name, every checkbox checked, and the first radio option selected. Open this in a PDF viewer to visually confirm which field name maps to which box. |

### 1.2 Analyze the layout

Open `az140nr-debug.pdf` side by side with the blank `az140nr.pdf`. For each field, record the mapping in a comment block that will go at the top of the mapper file. Organize by page section, matching field names to Form 140NR line numbers.

**Reference -- the 140NR semantic structure (actual line numbers TBD from Phase 1):**

The actual AZDOR form uses a two-column layout for income (Federal | Arizona).
The sections below describe the LOGICAL structure. Map each to the actual PDF
field names discovered by the debug script.

| Section | Description |
|---|---|
| Header | Tax year, filing status, name, SSN, address, exemptions, dependents |
| Income (two columns) | Wages, interest, dividends, business, rental, other -- each with a Federal column and an Arizona column |
| Total income | Federal total and Arizona total (separate columns) |
| Federal AGI | Federal adjusted gross income (federal column total) |
| AZ Gross Income | Arizona gross income (Arizona column total) |
| AZ Income Ratio | AZ gross income / Federal AGI (capped at 1.000) |
| Prorated Exemptions | Exemption amount x allocation ratio |
| Standard Deduction | $14,600 for single (full amount, not prorated) |
| AZ Taxable Income | AZ gross income - prorated exemptions - standard deduction |
| Tax | AZ taxable income x 2.5% (flat rate) |
| Credits | Recapture, family credit, nonrefundable credits |
| Payments | AZ withholding from W-2, 1099 withholding, estimated payments |
| Balance | Tax due, overpayment, refund |
| Penalties | Late filing, interest, underpayment penalty |

**IMPORTANT:** When analyzing fields in Phase 1, look for pairs of fields on the same
row -- one for the Federal column and one for the Arizona column. The income section
(wages through other income) will likely have two fields per line.

### 1.3 Build the field map comment

Following the pattern in `lib/form-mappers/f540nr.ts`, create a JSDoc comment that documents each PDF field name and its position. Example of the pattern from the CA mapper:

```
 * Page 1 (1xxx): Personal info, filing status, exemptions
 *   1003     First name
 *   1004     Middle initial
 *   1005     Last name
 *   1007     SSN / ITIN (top=108 left=432 w=108)
```

Your equivalent for AZ will look something like:

```
 * Field naming convention: <discovered from PDF, e.g. "140NR_line_1" or "topmostSubform[0].Page1[0].f1_01[0]">
 *
 * Page 1: Header + Income
 *   <field_name>  First name
 *   <field_name>  Last name
 *   <field_name>  SSN
 *   ...
```

### 1.4 Completion criteria

- [ ] `scripts/output/az140nr-layout.json` exists and contains field entries
- [ ] `scripts/output/az140nr-debug.pdf` exists and visually confirms field positions
- [ ] You have a written mapping of every relevant field name to its Form 140NR line number

---

## Phase 2: Add AZ Tax Computation to Tax Engine

**Goal:** Add a pure computation function to `lib/tax-engine.ts` that takes `FormDocuments` and returns all computed AZ 140NR values.

**File to modify:** `lib/tax-engine.ts`

### 2.1 Define the AZ140NRComputation type

Add after the `CA540NRComputation` type (after line ~243). Model it on the CA type but adapted for Arizona's simpler flat-rate system:

```typescript
export type AZ140NRComputation = {
  federalAgi: number;              // from federal 1040-NR
  azWages: number;                 // AZ wages from W-2 state_local (Box 16 where state=AZ)
  azGrossIncome: number;           // total AZ gross income (= azWages for simple W-2 case)
  azAdjustedIncome: number;        // AZ-source adjusted income (= azGrossIncome, no additions/subtractions)
  azAllocationRatio: number;       // AZ gross income / federal AGI (0-1, capped at 1.00)
  azExemptionAmount: number;       // prorated exemption amount (exemptions x ratio)
  azStandardDeduction: number;     // $14,600 for single filer (not prorated)
  azTaxableIncome: number;         // AZ gross income - exemptions - deductions
  azTax: number;                   // azTaxableIncome x 2.5%
  azNetTax: number;                // balance of tax after credits
  azWithheld: number;              // AZ income tax withheld from W-2 (Box 17 where state=AZ)
  azTotalPayments: number;         // total payments (withholding + estimated + extension)
  azTaxDue: number;                // tax due (if payments < tax)
  azOverpayment: number;           // overpayment (if payments > tax)
  azRefund: number;                // refund amount
};
```

### 2.2 Implement computeAZ140NRTax()

Add the function after `compute540NRTax()` (after line ~359). Follow the same pattern:

```typescript
// ---------------------------------------------------------------------------
// AZ 140NR computation
// ---------------------------------------------------------------------------

const AZ_TAX_RATE_2024 = 0.025;
const AZ_STANDARD_DEDUCTION_2024_SINGLE = 14600;

export function computeAZ140NRTax(docs: FormDocuments): AZ140NRComputation {
  const { w2All } = docs;

  // Federal AGI from the 1040-NR computation
  const { agi: federalAgi } = compute1040NRTax(docs);

  // AZ wages and withholding -- aggregate AZ entries across ALL W-2s
  let azWagesRaw = 0;
  let azWithheldRaw = 0;
  for (const w of w2All) {
    for (const sl of w.state_local ?? []) {
      if (sl.state.toUpperCase() === "AZ") {
        azWagesRaw    += parseNum(sl.state_wages);
        azWithheldRaw += parseNum(sl.state_income_tax);
      }
    }
  }
  const azWages    = taxRound(azWagesRaw);
  const azWithheld = taxRound(azWithheldRaw);

  // AZ gross income (= AZ wages for simple W-2-only case)
  const azGrossIncome = azWages;

  // AZ adjusted income = AZ-source income only (not federal AGI).
  // For a basic NRA W-2 case with no AZ additions/subtractions,
  // this equals azGrossIncome. The tax is computed on AZ-source
  // income, NOT on total federal income.
  const azAdjustedIncome = azGrossIncome;

  // Allocation ratio: AZ gross income / Federal AGI, capped at 1.00
  const azAllocationRatio =
    federalAgi > 0
      ? Math.min(1.0, azGrossIncome / federalAgi)
      : azGrossIncome > 0 ? 1.0 : 0;

  // Exemption: none for basic single NRA filer (no age 65, blind, dependents)
  const azExemptionAmount = 0;

  // After exemption: Line 23 = Line 13 - Line 22
  const afterExemption = taxRound(Math.max(0, azAdjustedIncome - azExemptionAmount));

  // Standard deduction
  const azStandardDeduction = AZ_STANDARD_DEDUCTION_2024_SINGLE;

  // AZ taxable income: Line 27 = Line 23 - Line 24 - Line 25
  const azTaxableIncome = taxRound(Math.max(0, afterExemption - azStandardDeduction));

  // Tax: flat 2.5%
  const azTax = taxRound(azTaxableIncome * AZ_TAX_RATE_2024);

  // Net tax after credits (none for basic case)
  const azNetTax = azTax;

  // Payments = AZ withholding only
  const azTotalPayments = azWithheld;

  // Balance
  const balance      = azTotalPayments - azNetTax;
  const azTaxDue     = balance < 0 ? taxRound(Math.abs(balance)) : 0;
  const azOverpayment = balance > 0 ? taxRound(balance) : 0;
  const azRefund      = azOverpayment;

  return {
    federalAgi,
    azWages,
    azGrossIncome,
    azAdjustedIncome,
    azAllocationRatio,
    azExemptionAmount,
    azStandardDeduction,
    azTaxableIncome,
    azTax,
    azNetTax,
    azWithheld,
    azTotalPayments,
    azTaxDue,
    azOverpayment,
    azRefund,
  };
}
```

### 2.3 Update the module docstring

Change the top comment of `lib/tax-engine.ts` from:

```typescript
 * Used by f1040nr.ts, f540nr.ts, and any future form mappers.
```

to:

```typescript
 * Used by f1040nr.ts, f540nr.ts, f140nr.ts, and any future form mappers.
```

### 2.4 Completion criteria

- [ ] `AZ140NRComputation` type is exported from `lib/tax-engine.ts`
- [ ] `computeAZ140NRTax()` is exported from `lib/tax-engine.ts`
- [ ] The function aggregates AZ-specific data from `w2All[].state_local` where `state === "AZ"`
- [ ] `azAdjustedIncome` is set to `azGrossIncome` (AZ-source income only), NOT `federalAgi`
- [ ] It uses the flat 2.5% rate (no brackets)
- [ ] It includes allocation ratio, standard deduction ($14,600), and refund/owed logic
- [ ] No lint errors in `lib/tax-engine.ts`

---

## Phase 3: Create the Form Mapper

**Goal:** Create `lib/form-mappers/f140nr.ts` that maps computed tax values and personal info onto the exact AcroForm field names discovered in Phase 1.

**File to create:** `lib/form-mappers/f140nr.ts`

### 3.1 File structure

Follow the exact structure of `lib/form-mappers/f540nr.ts`:

```typescript
import type { FormDocuments } from "./types";
import { amt, parseAddress } from "./types";
import { computeAZ140NRTax } from "@/lib/tax-engine";

/**
 * Maps extracted document data to Arizona Form 140NR AcroForm fields.
 *
 * Field naming: "<naming convention from Phase 1>"
 *
 * Physical field positions verified via scripts/debug-az140nr-fields.ts
 * (coordinate dump in scripts/output/az140nr-layout.json).
 *
 * <Full field map comment from Phase 1.3 goes here>
 */
export function mapToF140NR(docs: FormDocuments): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  const { passport, w2 } = docs;

  const c = computeAZ140NRTax(docs);

  // ... field mappings ...

  return v;
}
```

### 3.2 Field mapping sections

Each section maps computed values and personal data to the PDF field names from Phase 1. You must use the exact field name strings from the `az140nr-layout.json` output.

**Section A: Header / Personal Info**

Data sources:
- `passport?.given_names` -- first name (split on space for first + middle initial)
- `passport?.surname` -- last name
- `docs.ssn` -- SSN / ITIN
- `w2?.employee.address` -- mailing address (use `parseAddress()` helper)
- `w2?.tax_year` -- tax year
- Filing status: "Single" (NRA default)

Pattern from CA mapper (`f540nr.ts` lines 74-116):

```typescript
// Tax year
v["<field_name>"] = w2?.tax_year ?? "2024";

// Name
const givenParts = (passport?.given_names ?? "").split(" ");
v["<first_name_field>"] = givenParts[0] ?? "";
v["<middle_initial_field>"] =
  givenParts.length > 1 ? givenParts[givenParts.length - 1].charAt(0) : "";
v["<last_name_field>"] = passport?.surname ?? "";

// SSN
v["<ssn_field>"] = docs.ssn ?? "";

// Address
const addr = parseAddress(w2?.employee.address);
if (addr.city) {
  v["<street_field>"] = addr.street;
  if (addr.apt) v["<apt_field>"] = addr.apt;
  v["<city_field>"] = addr.city;
  v["<state_field>"] = addr.state;
  v["<zip_field>"] = addr.zip;
}
```

**Section B: Income (Two-Column Section)**

The actual AZ 140NR form has a two-column layout for income lines (Federal | Arizona).
The wages line will likely have TWO separate PDF fields -- one for the Federal column
(total wages from all W-2s) and one for the Arizona column (AZ-only wages).

Phase 1 will reveal whether there are dual fields per row. If so, fill both:

```typescript
// Wages line -- Federal column: total wages from 1040-NR
if (c.federalAgi) v["<wages_federal_field>"] = amt(c.federalAgi);
// Wages line -- Arizona column: AZ-source wages only
if (c.azWages)    v["<wages_arizona_field>"] = amt(c.azWages);

// Total income -- Federal column
if (c.federalAgi)    v["<total_income_federal_field>"] = amt(c.federalAgi);
// Total income -- Arizona column
if (c.azGrossIncome) v["<total_income_arizona_field>"] = amt(c.azGrossIncome);

// Federal AGI field
if (c.federalAgi)    v["<federal_agi_field>"] = amt(c.federalAgi);

// Arizona gross income field
if (c.azGrossIncome) v["<az_gross_income_field>"] = amt(c.azGrossIncome);
```

> NOTE: For a basic NRA W-2 filer, income lines other than wages (interest,
> dividends, business, etc.) will be left blank in both columns.

**Section C: Allocation Ratio**

```typescript
// AZ gross income (numerator)
if (c.azGrossIncome) v["<ratio_numerator_field>"] = amt(c.azGrossIncome);
// Federal AGI (denominator)
if (c.federalAgi)    v["<ratio_denominator_field>"] = amt(c.federalAgi);
// Ratio result (4 decimal places, capped at 1.0000)
v["<ratio_result_field>"] = c.azAllocationRatio.toFixed(4);
```

**Section D: Exemptions**

```typescript
// Single NRA filer: no age 65, blind, or dependent exemptions
// Prorated exemption = 0
v["<prorated_exemption_field>"] = amt(c.azExemptionAmount);
```

**Section E: Deductions and Taxable Income**

```typescript
// After exemptions = AZ adjusted income - prorated exemptions
const afterExemption = Math.max(0, c.azAdjustedIncome - c.azExemptionAmount);
v["<after_exemption_field>"] = amt(afterExemption);

// Standard deduction ($14,600 for single -- full amount, not prorated)
v["<standard_deduction_field>"] = amt(c.azStandardDeduction);

// AZ taxable income = after exemptions - standard deduction
v["<taxable_income_field>"] = amt(c.azTaxableIncome);
```

**Section F: Tax Computation**

```typescript
// Tax = taxable income x 2.5%
if (c.azTax)    v["<tax_field>"] = amt(c.azTax);

// Subtotal tax (= tax + recapture credits, which is 0 for basic case)
if (c.azTax)    v["<subtotal_tax_field>"] = amt(c.azTax);

// Balance of tax after credits (= subtotal for basic case)
if (c.azNetTax) v["<balance_tax_field>"] = amt(c.azNetTax);
```

**Section G: Payments**

```typescript
// AZ withholding from W-2 (Box 17 where state=AZ)
if (c.azWithheld)      v["<w2_withholding_field>"] = amt(c.azWithheld);

// Total withholding (= W-2 withholding for W-2-only case)
if (c.azWithheld)      v["<total_withholding_field>"] = amt(c.azWithheld);

// Total payments
if (c.azTotalPayments) v["<total_payments_field>"]  = amt(c.azTotalPayments);
```

**Section H: Refund / Amount Due**

```typescript
if (c.azTaxDue)      v["<tax_due_field>"] = amt(c.azTaxDue);
if (c.azOverpayment) v["<overpayment_field>"] = amt(c.azOverpayment);
if (c.azRefund)      v["<refund_field>"] = amt(c.azRefund);
```

**Section J: Signature Block**

```typescript
const fullName = [passport?.given_names, passport?.surname]
  .filter(Boolean)
  .join(" ");
if (fullName) v["<taxpayer_name_field>"] = fullName;
v["<date_signed_field>"] = new Date().toISOString().slice(0, 10);
```

### 3.3 Completion criteria

- [ ] `lib/form-mappers/f140nr.ts` exists
- [ ] It exports `mapToF140NR(docs: FormDocuments): Record<string, unknown>`
- [ ] It imports and calls `computeAZ140NRTax()` from `lib/tax-engine`
- [ ] It uses `amt()` and `parseAddress()` helpers from `./types`
- [ ] Every `v["<field_name>"]` uses exact field names from the `az140nr-layout.json`
- [ ] The JSDoc comment at the top documents every field mapping with positions
- [ ] No lint errors

---

## Phase 4: Register the Form in the Registry

**Goal:** Wire `f140nr` into the form registry so the fill API can resolve it.

**File to modify:** `lib/forms/registry.ts`

### 4.1 Add the import

Add after the existing `f540nr` import (line 7):

```typescript
import { mapToF140NR } from "@/lib/form-mappers/f140nr";
```

### 4.2 Add the registry entry

Add a new entry to the `FORM_REGISTRY` array, after the `f540nr` entry (after line 47):

```typescript
  {
    formId: "f140nr",
    pdfPath: "public/forms/empty/az140nr.pdf",
    filledFilename: "az140nr_filled.pdf",
    mapper: mapToF140NR,
    requiredDocTypes: ["passport", "w2"],
  },
```

These values must match what is already configured in `lib/state-tax-config.ts`:
- `formId: "f140nr"` -- matches `STATE_TAX_MAP.AZ.formId`
- `pdfPath: "public/forms/empty/az140nr.pdf"` -- matches `STATE_TAX_MAP.AZ.emptyFile`
- `filledFilename: "az140nr_filled.pdf"` -- matches `STATE_TAX_MAP.AZ.filledFilename`

### 4.3 Verify the API route resolves

The dynamic fill route at `app/api/forms/[formId]/fill/route.ts` calls `fillForm(formId)` from the registry. After adding the entry:

1. `REGISTRY_MAP.get("f140nr")` will return the new entry
2. `fillForm("f140nr")` will call `fetchFormDocuments()`, then `mapToF140NR(docs)`, then `fillPdfFields(pdf, values)`
3. The response will be the filled PDF as a download

The fill route does NOT need any changes -- it is fully dynamic and picks up new registry entries automatically.

### 4.4 Completion criteria

- [ ] `import { mapToF140NR } from "@/lib/form-mappers/f140nr"` added to `lib/forms/registry.ts`
- [ ] New entry in `FORM_REGISTRY` with `formId: "f140nr"`
- [ ] `pdfPath` points to `public/forms/empty/az140nr.pdf` (file exists)
- [ ] `filledFilename` is `az140nr_filled.pdf`
- [ ] `requiredDocTypes` is `["passport", "w2"]`
- [ ] No lint errors in `lib/forms/registry.ts`

---

## Phase 5: End-to-End Verification

**Goal:** Confirm the entire pipeline works from W-2 upload through PDF download.

### 5.1 Lint check

Run lint on all changed/new files:

```bash
npx next lint
```

No errors should appear in:
- `lib/tax-engine.ts`
- `lib/form-mappers/f140nr.ts`
- `lib/forms/registry.ts`

### 5.2 TypeScript check

```bash
npx tsc --noEmit
```

Verify no type errors in the new code.

### 5.3 Functional verification: "Download Empty"

1. Start the dev server: `npm run dev`
2. Log in and navigate to the Forms page
3. Upload an Arizona W-2 (or use an existing one)
4. Verify the AZ Form 140NR card appears with interactive buttons (not "Coming Soon")
5. Click "Download Empty" -- should download `az140nr.pdf` successfully

### 5.4 Functional verification: "Download Completed"

1. Ensure an AZ W-2 has been uploaded (with `state_local[].state = "AZ"` and `state_wages > 0`)
2. Ensure a passport has been uploaded (for name/SSN/address)
3. Click "Download Completed" on the AZ Form 140NR card
4. Verify the response is a PDF download (not a 404 or 500)
5. Open the downloaded PDF and spot-check:
   - Personal info (name, SSN, address) appears in the correct fields
   - Federal AGI is populated (wages line, federal column)
   - AZ wages appear in the Arizona column and match W-2 state_local value
   - Allocation ratio is reasonable (0.0000-1.0000)
   - Standard deduction shows $14,600
   - AZ taxable income = AZ wages - $14,600 standard deduction (for basic case)
   - Tax = AZ taxable income x 2.5%
   - AZ withholding matches W-2 state_local state_income_tax
   - Tax due or refund is correct (withholding - tax)

### 5.5 Edge cases to verify

| Scenario | Expected behavior |
|---|---|
| No AZ W-2 uploaded | AZ card does not appear on forms page |
| AZ W-2 with `state_wages = "0"` | AZ card does not appear (filtered by eligibility route) |
| Multiple W-2s with AZ entries | Wages and withholding are summed across all W-2s |
| AZ wages = federal AGI | Allocation ratio = 1.0000 |
| No passport uploaded | Name/SSN/address fields left blank; tax computation still works |

### 5.6 Completion criteria

- [ ] No lint or TypeScript errors
- [ ] "Download Empty" returns the blank PDF
- [ ] "Download Completed" returns a filled PDF
- [ ] Key tax lines are correctly computed
- [ ] Personal info fields are correctly populated

---

## Summary: Files Changed

| File | Phase | Action |
|---|---|---|
| `scripts/debug-az140nr-fields.ts` | 1 | Run (already created) |
| `scripts/output/az140nr-layout.json` | 1 | Generated output |
| `scripts/output/az140nr-debug.pdf` | 1 | Generated output |
| `lib/tax-engine.ts` | 2 | Add `AZ140NRComputation` type + `computeAZ140NRTax()` |
| `lib/form-mappers/f140nr.ts` | 3 | New file -- AZ 140NR field mapper |
| `lib/forms/registry.ts` | 4 | Add import + registry entry for `f140nr` |

## Data Flow Diagram

```
W-2 Upload (state_local: [{state: "AZ", state_wages: "X", state_income_tax: "Y"}])
    |
    v
MongoDB (StoredDocumentW2)
    |
    v
GET /api/forms/eligibility
    |-- reads w2.data.state_local
    |-- detects "AZ" with wages > 0
    |-- looks up STATE_TAX_MAP["AZ"] -> { formId: "f140nr", implemented: true }
    |-- returns DetectedStateForm for AZ
    |
    v
Forms Page (renders interactive AZ card with Download buttons)
    |
    v (user clicks "Download Completed")
    |
POST /api/forms/f140nr/fill
    |-- registry.fillForm("f140nr")
    |   |-- fetchFormDocuments() -> { passport, w2, w2All, ssn, ... }
    |   |-- mapToF140NR(docs)
    |   |   |-- computeAZ140NRTax(docs) -> { azWages, azTax, azRefund, ... }
    |   |   |-- maps values to PDF field names
    |   |   |-- returns Record<string, unknown>
    |   |-- loadPdfFromDisk("public/forms/empty/az140nr.pdf")
    |   |-- fillPdfFields(pdf, values) -> Uint8Array
    |
    v
Response: az140nr_filled.pdf (Content-Disposition: attachment)
```

## Arizona Tax Computation Reference (2024, basic NRA W-2 filer)

Actual form line numbers are determined by the PDF in Phase 1.
This table shows the LOGICAL computation, not form line numbers.

```
INPUTS:
  Federal AGI .............. from 1040-NR computation (all W-2s aggregated)
  AZ wages ................. sum of state_wages where state_local.state = "AZ"
  AZ withholding ........... sum of state_income_tax where state_local.state = "AZ"

COMPUTATION:
  AZ gross income .......... = AZ wages (W-2 only, no business/rental/other)
  Allocation ratio ......... = AZ gross income / Federal AGI (capped at 1.0000)
  Prorated exemptions ...... = 0 (single NRA, no age 65/blind/dependents)
  After exemptions ......... = AZ gross income - prorated exemptions
  Standard deduction ....... = $14,600 (single filer, full amount, not prorated)
  AZ taxable income ........ = max(0, after exemptions - standard deduction)
  AZ tax ................... = AZ taxable income x 0.025  (flat 2.5%)
  Balance of tax ........... = AZ tax (no credits for basic case)

BALANCE:
  Total payments ........... = AZ withholding (no estimated/extension payments)
  Tax due .................. = max(0, balance of tax - total payments)
  Overpayment .............. = max(0, total payments - balance of tax)
  Refund ................... = overpayment
```

## Verification Note: Standard Deduction for NRAs

Arizona does not appear to specifically exclude nonresident aliens from the standard
deduction (unlike the federal 1040-NR where most NRAs cannot claim it). The AZ 140NR
form offers the standard deduction to all nonresidents regardless of citizenship status.
Our implementation uses the full $14,600 standard deduction. If during testing this
produces incorrect results, the standard deduction may need to be set to 0 (matching the
CA 540NR approach) or prorated by the allocation ratio.

## Verification Note: Two-Column Income Section

The actual AZDOR Form 140NR has Federal and Arizona columns for income lines.
When filling the PDF in Phase 3, the mapper must fill BOTH columns for the wages
row (Federal column = total wages from all W-2s; Arizona column = AZ-only wages).
Phase 1 will reveal whether the PDF has separate field names per column.
