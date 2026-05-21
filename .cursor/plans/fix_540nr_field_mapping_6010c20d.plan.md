---
name: Fix 540NR field mapping
overview: The 540NR mapper uses `540NR_form_2001` and `540NR_form_2002` for Federal AGI and CA wages, but these are actually the "Your name" / "Your SSN" page header fields that repeat on every page (2-6). This causes dollar amounts to appear in the name/SSN headers on all pages, and leaves the actual income fields empty.
todos:
  - id: fix-header-fields
    content: Set 540NR_form_2001 to taxpayer name and 540NR_form_2002 to SSN (page headers)
    status: pending
  - id: fix-income-fields
    content: Change Federal AGI from 2001 to 2005 (Line 13) and CA wages from 2002 to 2004 (Line 12)
    status: pending
  - id: verify-debug-pdf
    content: Run debug script and verify all other field IDs against the actual 540NR form lines
    status: pending
  - id: update-docblock
    content: Update the mapper docblock comments to reflect the correct field mapping
    status: pending
isProject: false
---

# Fix 540NR Field Mapping Errors

## Root Cause

Fields `540NR_form_2001` and `540NR_form_2002` are **page header widgets** ("Your name" and "Your SSN or ITIN") that repeat on pages 2 through 6. They are NOT income fields. The layout JSON confirms this:

- `540NR_form_2001` appears 5 times (pages 2, 3, 4, 5, 6) all at the same position: `top=46, x=90, w=131`
- `540NR_form_2002` appears 5 times (pages 2, 3, 4, 5, 6) all at the same position: `top=46, x=306, w=73`

The mapper in [lib/form-mappers/f540nr.ts](lib/form-mappers/f540nr.ts) incorrectly sets:

```
v["540NR_form_2001"] = amt(c.federalAgi);   // shows "$57,117" in every "Your name" box
v["540NR_form_2002"] = amt(c.caWages);       // shows "$27,117" in every "Your SSN" box
```

This also means the actual income fields on page 2 (Federal AGI and CA wages) are never filled at all.

## Correct Field Mapping (from layout JSON)

Based on the physical positions in [scripts/output/540nr-layout.json](scripts/output/540nr-layout.json):

**Page header fields (repeat on pages 2-6):**

- `540NR_form_2001` (top=46, x=90, w=131) -> taxpayer name (e.g. "FIRSTNAME LASTNAME")
- `540NR_form_2002` (top=46, x=306, w=73) -> taxpayer SSN/ITIN

**Page 2 income fields:**

- `540NR_form_2003` (top=70, x=457, w=116) -> Line 11: Exemption amount
- `540NR_form_2004` (top=106, x=277, w=116) -> Line 12: Total CA wages (W-2 Box 16)
- `540NR_form_2005` (top=130, x=435, w=116) -> Line 13: Federal AGI
- `540NR_form_2028` (top=526, x=435, w=116) -> CA adjusted gross income (already correct)
- `540NR_form_2036` (top=706, x=435, w=116) -> CA taxable income (already correct)

## Changes Required

### 1. Fix header fields in [lib/form-mappers/f540nr.ts](lib/form-mappers/f540nr.ts)

Add proper header values for pages 2-6:

```typescript
// Page 2-6 header: name and SSN (repeated on every page)
const headerName = [passport?.given_names, passport?.surname].filter(Boolean).join(" ");
if (headerName) v["540NR_form_2001"] = headerName;
v["540NR_form_2002"] = docs.ssn ?? "";
```

### 2. Fix income field IDs

Change the income field mapping:

- `540NR_form_2001` (Federal AGI) -> `540NR_form_2005` (Line 13)
- `540NR_form_2002` (CA wages) -> `540NR_form_2004` (Line 12)

### 3. Verify remaining page 2 field assignments

Run the debug script (`npx tsx scripts/debug-540nr-fields.ts`) and open the debug PDF to confirm the field-to-line mapping for all currently assigned fields. Compare the visual debug output against the actual 540NR form to catch any other misalignments beyond 2001/2002.

### 4. Update the docblock

Fix the mapper's header comments to reflect the correct field assignments, so future changes don't regress.