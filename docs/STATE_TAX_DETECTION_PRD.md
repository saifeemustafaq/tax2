# State Tax Detection and Dynamic Form System -- PRD

## Problem Statement

The app currently hardcodes California as the only state form. State detection is a single `state === "CA"` check in the eligibility API. When users upload W-2s with income from other states, the app silently ignores them. There is no mapping of which states require income tax filings, what their forms are called, or any infrastructure to scale beyond California.

## Goals

1. Automatically detect which state(s) a user earned income in from their uploaded W-2 `state_local[]` data.
2. Dynamically render the correct state form cards on the Forms page based on detection.
3. Inform users when a detected state has no income tax (no filing action needed).
4. Build a full end-to-end nonresident filing experience for Arizona (Form 140NR).
5. Show "Coming Soon" cards for all other income-tax states so users know support is planned.
6. Architect the system so adding a future state requires only a mapper, tax-engine function, and PDF template -- no structural changes.

## Current Architecture

### Data flow today

```
W-2 upload --> OpenAI extraction --> state_local[{ state, state_wages, state_income_tax }]
                                           |
                      eligibility API (hardcoded CA check: state === "CA")
                                           |
                      FormEligibility { schedule_oi: boolean; ca_540nr: boolean }
                                           |
                      forms/page.tsx static FORMS array (visibleWhen: "ca_540nr")
                                           |
                      registry.ts --> f540nr mapper --> tax-engine --> filled PDF
```

### Key files

| File | Role |
|------|------|
| `extraction/prompts/forms/w2.ts` | W-2 Zod schema; `state_local[]` captures state code, wages, withholding |
| `app/api/forms/eligibility/route.ts` | Returns `FormEligibility` with `ca_540nr` boolean |
| `app/(app)/forms/page.tsx` | Static `FORMS` array; `visibleWhen` gating; card rendering |
| `lib/forms/registry.ts` | `FORM_REGISTRY` array; `fillForm()` pipeline |
| `lib/tax-engine.ts` | `compute1040NRTax()`, `compute540NRTax()`, bracket helpers |
| `lib/form-mappers/f540nr.ts` | CA 540NR field mapper |
| `lib/form-mappers/types.ts` | `FormDocuments` bundle type, `parseNum()` |

### Limitations

- `FormEligibility` is a flat type `{ schedule_oi: boolean; ca_540nr: boolean }` -- adding a new state means adding a new boolean and a new `visibleWhen` key, which does not scale.
- The `FORMS` array in the forms page has CA 540NR hardcoded with `visibleWhen: "ca_540nr"`.
- No configuration exists for which of the 50 states + DC have income tax or what their forms are named.

---

## Target Architecture

```
W-2 upload --> OpenAI extraction --> state_local[{ state, state_wages, state_income_tax }]
                                           |
                      eligibility API (generic state scanner)
                             |                        |
                    STATE_TAX_MAP lookup         schedule_oi (unchanged)
                             |
                    FormEligibility { schedule_oi: boolean; detectedStates: DetectedStateForm[] }
                             |
                    forms/page.tsx
                       |            |                    |
                  Federal cards   State cards           Info note
                  (static)        (dynamic from         (no-tax states)
                                   detectedStates)
                       |
              implemented?
              /          \
           yes            no
        Full card      Coming Soon card
      (view/fill)     (disabled actions)
```

---

## State Income Tax Reference

### States WITH State Income Tax

| State | Nonresident Form |
|-------|-----------------|
| Alabama | Form 40NR |
| Arizona | Form 140NR |
| Arkansas | AR1000NR |
| California | Form 540NR |
| Colorado | DR 0104PN |
| Connecticut | CT-1040NR/PY |
| Delaware | Form 200-02 |
| Georgia | Form 500-NR |
| Hawaii | N-15 |
| Idaho | Form 43 |
| Illinois | IL-1040 + Schedule NR |
| Indiana | IT-40PNR |
| Iowa | IA 126 |
| Kansas | K-40 (NR indicator) |
| Kentucky | Form 740-NP |
| Louisiana | IT-540B |
| Maine | Form 1040ME + Schedule NR |
| Maryland | Form 505 |
| Massachusetts | Form 1-NR/PY |
| Michigan | MI-1040 + Schedule NR |
| Minnesota | M1NR |
| Mississippi | Form 80-205 |
| Missouri | MO-1040 + MO-NRI |
| Montana | Form 2 + Schedule NR |
| Nebraska | Form 1040N + Schedule III |
| New Jersey | NJ-1040NR |
| New Mexico | PIT-1 (same form + allocation) |
| New York | IT-203 |
| North Carolina | D-400 + PN schedule |
| North Dakota | ND-1NR |
| Ohio | IT 1040 + Schedule of Credits |
| Oklahoma | Form 511NR |
| Oregon | OR-40-N / OR-40-P |
| Pennsylvania | PA-40 (same form) |
| Rhode Island | RI-1040NR |
| South Carolina | SC1040 + NR schedule |
| Utah | TC-40 + Schedule TC-40B |
| Vermont | IN-111 + Schedule IN-113 |
| Virginia | Form 763 |
| West Virginia | IT-140NRC |
| Wisconsin | Form 1NPR |
| District of Columbia | D-40B |

### States with NO State Income Tax

| State | Notes |
|-------|-------|
| Alaska | No individual income tax |
| Florida | No individual income tax |
| Nevada | No individual income tax |
| South Dakota | No individual income tax |
| Tennessee | No individual income tax |
| Texas | No individual income tax |
| Washington | No individual income tax (separate capital gains tax may apply) |
| Wyoming | No individual income tax |

### Special Case

| State | Notes |
|-------|-------|
| New Hampshire | No wage income tax. Interest/dividends tax (phasing out). Form DP-10 if applicable. Treated as no-income-tax for our purposes since W-2 wages are not taxed. |

---

## Phased Execution Plan

### Phase 1: State Tax Configuration Map

**Scope:** New file only. No changes to existing code. Zero risk.

**Deliverable:** [`lib/state-tax-config.ts`](../lib/state-tax-config.ts)

**Type definition:**

```typescript
export type StateTaxConfig = {
  code: string;                    // 2-letter state code: "CA", "AZ", "TX"
  name: string;                    // Full name: "California", "Arizona", "Texas"
  hasIncomeTax: boolean;           // false for AK, FL, NV, SD, TN, TX, WA, WY, NH
  nonresidentForm: string | null;  // Display name: "Form 540NR"
  formId: string | null;           // Registry key when implemented: "f540nr", "f140nr"
  emptyFile: string | null;        // PDF filename in public/forms/empty/: "540nr.pdf"
  filledFilename: string | null;   // Suggested download name: "540nr_filled.pdf"
  implemented: boolean;            // true = full fill experience, false = coming soon
};

export const STATE_TAX_MAP: Record<string, StateTaxConfig> = { ... };
```

**Categories in the map:**

| Category | States | `hasIncomeTax` | `implemented` |
|----------|--------|----------------|---------------|
| No income tax | AK, FL, NV, SD, TN, TX, WA, WY, NH | `false` | `false` |
| Implemented (full fill) | CA, AZ | `true` | `true` |
| Coming soon | All remaining 41 states + DC | `true` | `false` |

**Helper functions:**

- `getStateTaxConfig(code: string): StateTaxConfig | undefined` -- case-insensitive lookup
- `isNoIncomeTaxState(code: string): boolean` -- quick predicate
- `getImplementedStates(): StateTaxConfig[]` -- returns states where `implemented === true`

**Acceptance criteria:**

- [ ] All 50 states + DC are present in `STATE_TAX_MAP`
- [ ] Nonresident form names match the reference table above
- [ ] CA entry: `formId: "f540nr"`, `implemented: true`
- [ ] AZ entry: `formId: "f140nr"`, `implemented: true`
- [ ] NH: `hasIncomeTax: false` (wages are not taxed)
- [ ] No existing files are modified

---

### Phase 2: Detection Engine + Eligibility API Refactor

**Scope:** Modify the eligibility API to detect all states from W-2s. Replace hardcoded `ca_540nr` boolean with a dynamic `detectedStates` array.

**Depends on:** Phase 1

**Ship together with Phase 3** (the type change breaks the forms page import, so both must land in the same PR).

#### 2a. New types

Replace the current `FormEligibility` in [`app/api/forms/eligibility/route.ts`](../app/api/forms/eligibility/route.ts):

```typescript
// BEFORE
export type FormEligibility = {
  schedule_oi: boolean;
  ca_540nr: boolean;
};

// AFTER
export type DetectedStateForm = {
  stateCode: string;           // "CA", "AZ", "TX"
  stateName: string;           // "California", "Arizona", "Texas"
  hasIncomeTax: boolean;
  nonresidentForm: string | null;
  formId: string | null;       // "f540nr" when implemented, null when not
  emptyFile: string | null;    // "540nr.pdf" when implemented, null when not
  filledFilename: string | null; // "540nr_filled.pdf" when implemented, null when not
  implemented: boolean;
};

export type FormEligibility = {
  schedule_oi: boolean;
  detectedStates: DetectedStateForm[];
};
```

#### 2b. Detection logic

Replace the hardcoded `ca_540nr` check:

1. Iterate all W-2 documents' `state_local` arrays.
2. For each entry where `parseNum(state_wages) > 0`, collect `state.toUpperCase()`.
3. Deduplicate into a `Set<string>` of unique state codes.
4. For each code, look up in `STATE_TAX_MAP` (Phase 1). Unknown codes are silently skipped.
5. Map each match to a `DetectedStateForm` object.
6. Return as the `detectedStates` array.

**Multi-state scenarios handled:**

| Scenario | Result |
|----------|--------|
| Single W-2 with one state row (e.g., CA) | `detectedStates: [CA]` |
| Single W-2 with two state rows (e.g., AZ + CA) | `detectedStates: [AZ, CA]` |
| Two W-2s from different employers in different states | Both states appear |
| W-2 with a no-tax state (e.g., TX) | TX included with `hasIncomeTax: false` |
| W-2 with `state_wages: "0.00"` | State is NOT included (no positive wages) |
| Unknown/malformed state code | Silently omitted |

#### 2c. Unchanged behavior

- `schedule_oi` continues to use `isIndianCitizen(passport)` -- no changes.

**Acceptance criteria:**

- [ ] A W-2 with `state_local: [{ state: "AZ", state_wages: "50000" }]` returns `detectedStates` containing an AZ entry with `implemented: true`
- [ ] A W-2 with `state_local: [{ state: "TX", state_wages: "60000" }]` returns TX with `hasIncomeTax: false`
- [ ] A W-2 with both CA and NY rows returns both states
- [ ] `state_wages: "0.00"` does not trigger detection
- [ ] `schedule_oi` works unchanged
- [ ] `ca_540nr` is fully removed from the type and response

---

### Phase 3: Dynamic Forms Page

**Scope:** Refactor the forms page to render state cards dynamically from `detectedStates`. Remove CA from the static `FORMS` array.

**Depends on:** Phase 2 (ship together as one PR)

#### 3a. Restructure the static forms array

In [`app/(app)/forms/page.tsx`](../app/(app)/forms/page.tsx), keep only federal forms:

```typescript
const FEDERAL_FORMS: FormDef[] = [
  { id: "8843", ... },                                  // always visible
  { id: "1040nr", ... },                                // always visible
  { id: "1040nro", ..., visibleWhen: "schedule_oi" },   // conditional
];
```

Remove the CA 540NR entry -- it now comes from `detectedStates`.

Update `FormDef.visibleWhen` type to `"schedule_oi"` only (or make it optional and remove the generic `keyof FormEligibility` constraint since `detectedStates` is an array, not a boolean).

#### 3b. State form card rendering

Filter `eligibility.detectedStates` to `hasIncomeTax === true` states, then render:

**Implemented state card** (`implemented: true` -- currently CA, AZ):

- Same card structure as federal forms
- Title: nonresident form name (e.g., "Form 140NR")
- Subtitle: "[State] Nonresident Income Tax Return"
- Description: context-appropriate text
- Actions: View, Download Completed, Download Empty -- all functional
- `fillApiId` sourced from `formId` in the `DetectedStateForm`

**Coming Soon card** (`implemented: false`):

- Same card structure but visually distinct
- Title: nonresident form name (e.g., "IT-203")
- Subtitle: "[State] Nonresident Income Tax Return"
- Description: "State income tax return for [State]. Auto-fill support coming soon."
- A "Coming Soon" badge in the card header
- All action buttons disabled
- Slightly reduced visual weight (e.g., muted border or reduced opacity)

**No-income-tax states** (`hasIncomeTax: false`):

- No card rendered.
- Show a subtle info line below the state forms section: "Income detected in [State] -- no state income tax filing required."

#### 3c. Page layout

Split the page into two visual sections:

```
Tax Forms
View, download blank forms, or download completed forms...

--- Federal Forms ---
[8843]  [1040-NR]  [Schedule OI]

--- State Forms ---
[CA 540NR]  [AZ 140NR]  [NY IT-203 -- Coming Soon]

[info] Income detected in Texas -- no state filing required.
```

Grid columns adapt independently per section based on card count.

#### 3d. Empty state

If no states are detected (no W-2s uploaded, or W-2s have no `state_local` data), the "State Forms" section heading is hidden entirely.

**Acceptance criteria:**

- [ ] Federal forms render unchanged (8843, 1040-NR, Schedule OI when eligible)
- [ ] CA 540NR card appears dynamically when CA income is detected (same end-user behavior, now from `detectedStates`)
- [ ] A "Coming Soon" card appears for any income-tax state without `implemented: true`
- [ ] No card appears for no-income-tax states; instead an info note is shown
- [ ] View / Download Completed / Download Empty work on implemented state cards
- [ ] All three actions are disabled on Coming Soon cards
- [ ] When no states are detected, the State Forms section is hidden
- [ ] Grid layout adapts to card count per section

---

### Phase 4: Arizona Form 140NR -- End-to-End

**Scope:** Full nonresident filing experience for Arizona. All new code; no modifications to existing form logic.

**Depends on:** Phases 1-3 (detection and card rendering already show the AZ card, but actions fail until this phase lands)

**Note:** Phase 4 can be worked on in parallel with Phases 2+3 since it is additive code. However, the AZ card will only become fully functional once all phases are complete.

#### 4a. PDF template

- Obtain the official Arizona Form 140NR fillable PDF for tax year 2025.
- Place at `public/forms/empty/az140nr.pdf`.
- Run `npm run pdf-fields-to-json -- --pdf public/forms/empty/az140nr.pdf` to dump field names.
- Save output to `scripts/output/az140nr-fields.json` for mapper development reference.
- Optionally write `scripts/add-140nr-field-names.mjs` for human-readable field labels (same pattern as existing `add-1040nr-field-names.mjs`).

#### 4b. Tax engine

Add to [`lib/tax-engine.ts`](../lib/tax-engine.ts):

**Arizona 2025 tax rules for nonresident single filers:**

| Parameter | Value |
|-----------|-------|
| Tax rate | Flat 2.5% (Arizona moved to flat tax in 2023) |
| Standard deduction (single, 2025) | $14,600 |
| Personal exemption | $0 (eliminated) |
| Surcharges | None |
| Proration | AZ source income / total federal income (same pattern as CA) |

**New type:**

```typescript
export type AZ140NRComputation = {
  federalAgi: number;
  azWages: number;
  azAdjustedGrossIncome: number;
  azStandardDeduction: number;
  azTaxableIncome: number;
  azProrationRatio: number;
  azTaxBeforeCredits: number;
  azNetTax: number;
  azWithheld: number;
  azOverpayment: number;
  azRefund: number;
  azAmountOwed: number;
};
```

**New function:** `computeAZ140NRTax(docs: FormDocuments): AZ140NRComputation`

Pattern follows `compute540NRTax()`:

1. Get `federalAgi` from `compute1040NRTax(docs)`.
2. Aggregate AZ wages and AZ withholding across all W-2s where `state_local[].state === "AZ"`.
3. AZ adjusted gross income = AZ wages (no state-specific adjustments for basic NRA case).
4. AZ standard deduction = $14,600 for single filers.
5. AZ taxable income = max(0, AZ AGI - standard deduction).
6. Proration ratio = AZ wages / federal AGI (capped at 1.0).
7. AZ tax = AZ taxable income * 0.025 (flat rate).
8. Balance = AZ withheld - AZ net tax.
9. Overpayment/refund if balance > 0; amount owed if balance < 0.

#### 4c. Form mapper

Create [`lib/form-mappers/f140nr.ts`](../lib/form-mappers/f140nr.ts):

```typescript
export function mapToF140NR(docs: FormDocuments): Record<string, unknown>
```

- Maps personal info (name, SSN/ITIN, address) from passport and primary W-2.
- Maps AZ wages, withholding, and computed tax values from `computeAZ140NRTax()`.
- AcroForm field names come from the PDF field dump in step 4a.
- Follows the same conventions as `f540nr.ts`.

#### 4d. Registry entry

Add to [`lib/forms/registry.ts`](../lib/forms/registry.ts):

```typescript
{
  formId: "f140nr",
  pdfPath: "public/forms/empty/az140nr.pdf",
  filledFilename: "az140nr_filled.pdf",
  mapper: mapToF140NR,
  requiredDocTypes: ["passport", "w2"],
}
```

No new API route file is needed -- the existing dynamic route `POST /api/forms/[formId]/fill` handles it automatically.

#### 4e. State config link

The `STATE_TAX_MAP` entry for Arizona (created in Phase 1) already has `formId: "f140nr"` and `implemented: true`. Once the registry entry, mapper, and tax engine land, the dynamic card rendered by Phase 3 becomes fully functional.

**Acceptance criteria:**

- [ ] User uploads a W-2 with AZ state wages
- [ ] Forms page shows "Form 140NR -- Arizona Nonresident Income Tax Return" card with all actions enabled
- [ ] "Download Completed" generates a correctly filled PDF with personal info and tax values
- [ ] Tax computation: flat 2.5% rate, $14,600 standard deduction, proration by AZ/federal AGI ratio
- [ ] "View" opens the filled PDF in the viewer modal
- [ ] "Download Empty" downloads the blank AZ 140NR template
- [ ] AZ card appears alongside CA card if user has income in both states

---

## Execution Dependencies

```
Phase 1 (config map)
    |
    +---> Phase 2 + Phase 3 (eligibility API + forms page -- ship together)
    |
    +---> Phase 4 (Arizona end-to-end -- can develop in parallel, functional after 2+3)
```

| Phase | Risk | Existing code modified | New files |
|-------|------|----------------------|-----------|
| 1 | None | None | `lib/state-tax-config.ts` |
| 2 | Medium | `app/api/forms/eligibility/route.ts` | None |
| 3 | Medium | `app/(app)/forms/page.tsx` | None |
| 4 | Low | `lib/tax-engine.ts` (additive), `lib/forms/registry.ts` (add entry) | `lib/form-mappers/f140nr.ts`, `public/forms/empty/az140nr.pdf` |

Phases 2+3 carry the highest risk because they change the `FormEligibility` type contract between backend and frontend. They must ship as one atomic change.

Phase 4 is entirely additive -- it cannot break existing forms.

---

## Out of Scope (Future Work)

- Auto-fill for any state beyond AZ and CA.
- Multi-state reciprocity agreements or proration conflicts.
- State-specific Box 14 parsing beyond CA SDI.
- User-facing state selection override (manual correction if detection is wrong).
- Local/city income tax forms (e.g., NYC, Ohio municipalities).
- New Hampshire interest/dividends tax (Form DP-10).
