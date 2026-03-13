---
name: Fix 540NR Field Mapping
overview: Audit all 540NR PDF AcroForm field positions by creating a debug PDF, then fix the field name map and form mapper to correctly populate SSN, address, DOB, and stop filling unintended fields like "Additional information" and "PBA code".
todos:
  - id: debug-pdf
    content: Create debug script that fills every 540NR field with its own name and saves a debug PDF for visual inspection
    status: pending
  - id: audit-fields
    content: Open debug PDF and document the correct field-number-to-physical-box mapping for all page 1 fields (SSN, address, DOB, etc.)
    status: pending
  - id: fix-field-names
    content: Update add-540nr-field-names.mjs with corrected descriptions and regenerate 540nr.json
    status: pending
  - id: extract-parseAddress
    content: Extract parseAddress from f1040nr.ts into a shared utility so both mappers can reuse it
    status: pending
  - id: fix-mapper
    content: "Fix mapToF540NR: correct field IDs for SSN/address/city/state/zip, add DOB, remove Additional Info and PBA code writes"
    status: pending
  - id: verify
    content: Test the full fill pipeline and visually confirm all fields land in the correct boxes
    status: pending
isProject: false
---

# Fix 540NR Field Mapping

## Problem

The 540NR form field mapping is broken -- values are populating in the wrong physical boxes on the PDF:

- City ("SUNNYVALE") appears in "Additional information"
- State ("CA") appears in "PBA code"
- ZIP ("94086") appears in "Street address"
- SSN is missing entirely
- DOB is not mapped at all

**Root cause**: The human-readable labels in `[scripts/add-540nr-field-names.mjs](scripts/add-540nr-field-names.mjs)` were assigned by assuming numeric order corresponds to visual layout, but the AcroForm fields in the PDF follow a different tab order than the visual top-to-bottom order.

## Plan

### Step 1: Create a field-position debug script

Write a one-shot script (`scripts/debug-540nr-fields.ts`) that fills **every** AcroForm field in `public/forms/empty/540nr.pdf` with its own field name (e.g. field `540NR_form_1013` gets text "1013") and saves the result to `scripts/output/540nr-debug.pdf`. Opening that PDF will reveal the correct mapping from field number to physical box.

This is the critical step -- without it, we're guessing.

### Step 2: Fix the field name map

Based on the debug PDF, update `[scripts/add-540nr-field-names.mjs](scripts/add-540nr-field-names.mjs)` `nameToFieldName` with corrected descriptions. Then re-run it to update `[scripts/output/540nr.json](scripts/output/540nr.json)`.

Key fields to audit and correct:

- `1006` through `1010` (SSN, suffix, spouse fields)
- `1011` through `1020` (address, additional info, PBA code, city/state/zip, foreign address, DOB)
- `1024` (currently labeled DOB -- verify physical position)

### Step 3: Fix the form mapper

Update `[lib/form-mappers/f540nr.ts](lib/form-mappers/f540nr.ts)`:

**Address mapping** -- use the corrected field IDs based on step 2 results:

- Reuse `parseAddress()` from `[lib/form-mappers/f1040nr.ts](lib/form-mappers/f1040nr.ts)` (extract to a shared utility in `types.ts` or a new `address.ts`), which already handles street/apt splitting
- Map to the correct field IDs for street, apt, city, state, ZIP
- Stop writing to the "Additional information" and "PBA code" fields

**SSN** -- fix to use the correct physical field ID (may not be `1006`).

**DOB** -- add mapping from `passport.date_of_birth` (falling back to `i20.student.date_of_birth`). The passport extraction has `date_of_birth: string` already. Map to the correct DOB field once its physical position is confirmed:

```typescript
const dob = passport?.date_of_birth ?? docs.i20?.student?.date_of_birth ?? "";
v["540NR_form_XXXX"] = dob; // correct field ID from step 2
```

**Remove** mappings to fields that shouldn't be filled (Additional information, PBA code).

### Step 4: Update the field comment header

Update the doc comment at the top of `f540nr.ts` that documents the physical field layout to match the corrected mapping.

### Step 5: Re-run and verify

Re-generate the field JSON, then test the full pipeline to confirm values land in the correct boxes.

## Files to modify

- `scripts/debug-540nr-fields.ts` (new -- temporary debug script)
- `[scripts/add-540nr-field-names.mjs](scripts/add-540nr-field-names.mjs)` -- corrected labels
- `[scripts/output/540nr.json](scripts/output/540nr.json)` -- regenerated
- `[lib/form-mappers/f540nr.ts](lib/form-mappers/f540nr.ts)` -- corrected field IDs, add DOB, fix address
- `[lib/form-mappers/f1040nr.ts](lib/form-mappers/f1040nr.ts)` -- extract `parseAddress` to shared location
- `[lib/form-mappers/types.ts](lib/form-mappers/types.ts)` -- (or new file) shared `parseAddress`

