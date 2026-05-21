---
name: Phase 2+3 Execution
overview: Refactor the eligibility API to replace the hardcoded `ca_540nr` boolean with a generic `detectedStates[]` array powered by STATE_TAX_MAP, then update the forms page to render state form cards dynamically -- full cards for implemented states, "Coming Soon" cards for others, and info notes for no-tax states.
todos:
  - id: eligibility-types
    content: Add DetectedStateForm type, update FormEligibility to replace ca_540nr with detectedStates[]
    status: pending
  - id: eligibility-scanner
    content: Replace hardcoded CA check with generic state scanner using STATE_TAX_MAP
    status: pending
  - id: forms-page-type
    content: Update FormDef.visibleWhen to 'schedule_oi' only, remove CA from static FORMS array, rename to FEDERAL_FORMS
    status: pending
  - id: forms-page-state-cards
    content: Add dynamic state form cards section from detectedStates -- implemented cards with full actions, coming soon cards with badge and disabled actions
    status: pending
  - id: forms-page-no-tax-note
    content: Add info note for detected no-income-tax states
    status: pending
  - id: forms-page-layout
    content: Split page into Federal Forms and State Forms sections with independent grids
    status: pending
  - id: update-docs
    content: Update docs/FORM_AUTOFILL.md step 5 to reflect dynamic state form rendering
    status: pending
isProject: false
---

# Phase 2+3: Detection Engine + Dynamic Forms Page

These two phases ship as one atomic change because the `FormEligibility` type is the contract between the API and the frontend.

## Phase 2: Eligibility API Refactor

**File:** `[app/api/forms/eligibility/route.ts](app/api/forms/eligibility/route.ts)`

### 2a. Add `DetectedStateForm` type and update `FormEligibility`

Replace the current type block (lines 10-13):

```typescript
// BEFORE
export type FormEligibility = {
  schedule_oi: boolean;
  ca_540nr: boolean;
};

// AFTER
export type DetectedStateForm = {
  stateCode: string;
  stateName: string;
  hasIncomeTax: boolean;
  nonresidentForm: string | null;
  formId: string | null;
  emptyFile: string | null;
  filledFilename: string | null;
  implemented: boolean;
};

export type FormEligibility = {
  schedule_oi: boolean;
  detectedStates: DetectedStateForm[];
};
```

### 2b. Replace the hardcoded CA check with a generic state scanner

Import `STATE_TAX_MAP` from `@/lib/state-tax-config`. Replace lines 36-43 (the eligibility construction) with:

1. Collect all unique state codes with positive wages across all W-2s:
  - Iterate `w2Docs`, then each `state_local` entry
  - Keep entries where `parseNum(sl.state_wages) > 0`
  - Uppercase and deduplicate into a `Set<string>`
2. Map each code to a `DetectedStateForm` via `STATE_TAX_MAP[code]` (skip unknown codes)
3. Build the response: `{ schedule_oi, detectedStates }`

The `schedule_oi` logic remains unchanged.

---

## Phase 3: Dynamic Forms Page

**File:** `[app/(app)/forms/page.tsx](app/(app)`/forms/page.tsx)

### 3a. Update the `FormDef` type

Change `visibleWhen` from `keyof FormEligibility` to a string literal type since `detectedStates` is no longer a boolean field:

```typescript
type FormDef = {
  id: string;
  fillApiId: string;
  title: string;
  subtitle: string;
  description: string;
  emptyFile: string;
  filledFilename: string;
  visibleWhen?: "schedule_oi";
};
```

### 3b. Remove CA 540NR from the static `FORMS` array

Remove the entry at lines 68-78 (the `540nr` object with `visibleWhen: "ca_540nr"`). Rename `FORMS` to `FEDERAL_FORMS`. Three entries remain: 8843, 1040-NR, Schedule OI.

### 3c. Update `visibleForms` filtering

The `visibleForms` memo currently uses `eligibility[f.visibleWhen]` which relied on boolean fields. With only `schedule_oi` remaining as a boolean, the logic stays the same structurally -- just operates on the renamed `FEDERAL_FORMS` array.

### 3d. Derive state form cards from `detectedStates`

Add a new `useMemo` that computes state cards from `eligibility?.detectedStates`:

- Filter to `hasIncomeTax === true` only (no-tax states get an info note instead)
- For each detected state, construct a card object with:
  - `title`: the `nonresidentForm` value (e.g., "Form 540NR", "Form 140NR", "IT-203")
  - `subtitle`: `"${stateName} Nonresident Income Tax Return"`
  - `description`: context text (for implemented: the state-specific description; for coming soon: "State income tax return for [State]. Auto-fill support coming soon.")
  - `fillApiId`: the `formId` from detected state (null for coming soon)
  - `implemented`: boolean to control card variant

Also derive a list of no-tax state names from `detectedStates` where `hasIncomeTax === false` (for the info note).

### 3e. Split the page layout into two sections

Restructure the JSX to render:

1. **Page header** (unchanged -- "Tax Forms" heading and description)
2. **Federal Forms section** -- heading "Federal Forms", grid of `visibleForms` (current card rendering, unchanged)
3. **State Forms section** (only rendered if `detectedStates` has at least one income-tax state):
  - Heading "State Forms"
  - Grid of state cards:
    - **Implemented cards** (`implemented: true`): identical structure to federal cards with all three actions (View, Download Completed, Download Empty)
    - **Coming Soon cards** (`implemented: false`): same card structure but with a `Badge` showing "Coming Soon" next to the title, all action buttons disabled, and a slightly muted visual treatment
4. **No-tax info note** (only rendered if any no-tax states were detected): a subtle text line like "Income detected in Texas -- no state income tax filing required." using `text-muted-foreground` styling. If multiple no-tax states: "Income detected in Texas and Florida -- no state income tax filing required."

### 3f. Grid column adaptation

Each section computes its own `gridCols` based on its card count (the existing logic, applied per section).

### 3g. FormViewerModal and downloadFilled

The existing `openViewer` and `downloadFilled` callbacks work with any object that has `id`, `fillApiId`, `title`, `subtitle`, `filledFilename`. State cards for implemented states will use these same callbacks. For coming soon cards, the buttons are disabled so no callback fires.

---

## Phase 3 supplementary: Update docs

**File:** `[docs/FORM_AUTOFILL.md](docs/FORM_AUTOFILL.md)`

Update step 5 ("Expose in the UI") to reflect that state forms are now rendered dynamically from `detectedStates` rather than added to a static array. Federal forms still use the static array with `visibleWhen`. Mention that adding a new state form only requires setting `implemented: true` and adding a `formId` in `STATE_TAX_MAP`.

---

## Files changed (summary)

- `app/api/forms/eligibility/route.ts` -- new types, generic state scanner
- `app/(app)/forms/page.tsx` -- remove CA static entry, add dynamic state section, split layout
- `docs/FORM_AUTOFILL.md` -- update step 5 to reflect new state form rendering

