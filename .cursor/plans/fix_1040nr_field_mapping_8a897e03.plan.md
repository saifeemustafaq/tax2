---
name: Fix 1040NR field mapping
overview: The 1040NR form mapper in `lib/form-mappers/f1040nr.ts` has 7 field-to-PDF mismatches and 1 missing field, causing values to appear in wrong positions on the filled PDF. The root cause is that the mapper used incorrect PDF field IDs for income lines 8-11a and placed Page 2 values (Lines 12, 14, 15) into Page 1 fields.
todos:
  - id: fix-1h
    content: "Fix Line 1h: change f1_49 to f1_50 for dollar amount, add f1_49 type label"
    status: pending
  - id: fix-income-lines
    content: "Fix Lines 8/9/11a: change f1_63->f1_68, f1_64->f1_69, f1_66->f1_71"
    status: pending
  - id: fix-page2-lines
    content: "Fix Lines 12/14/15: move from Page 1 fields (f1_67/f1_70/f1_71) to Page 2 fields (f2_02/f2_06/f2_07)"
    status: pending
  - id: add-11b
    content: "Add missing Line 11b mapping: P2.f2_01 = AGI"
    status: pending
  - id: update-comments
    content: Update the block comment in mapToF1040NR to reflect corrected field assignments
    status: pending
isProject: false
---

# Fix 1040NR Form Field Mapping

## Problem

The mapper in [lib/form-mappers/f1040nr.ts](lib/form-mappers/f1040nr.ts) maps extracted data to **wrong PDF AcroForm field IDs** for most income and deduction lines. Comparing the mapper code against the authoritative field-name reference in [scripts/add-1040nr-field-names.mjs](scripts/add-1040nr-field-names.mjs) reveals 7 incorrect field assignments and 1 missing field.

## Root Cause

The mapper author appears to have counted field IDs (`f1_XX`) sequentially from Line 1z, **skipping over Lines 2-7 fields** (interest, dividends, IRA, pensions, capital gains) but miscounted. Fields for Lines 5b, 5c, 7a, 7b were mistaken for Lines 8, 9, 11, 12. Additionally, Lines 12/14/15 are Page 2 fields (`f2_XX`) but were incorrectly assigned to Page 1 fields (`f1_XX`).

## Detailed Bug List (7 wrong fields + 1 missing)

### Bug 1: Line 1h amount -- `f1_49` should be `f1_50`

- **Current**: `f1_49` = allocatedTips -- but `f1_49` is "Line 1h **type**" (text description field)
- **Fix**: Use `f1_50` for the dollar amount; optionally set `f1_49` = `"Allocated tips"` as the type label

### Bug 2: Line 8 (Other income) -- `f1_63` should be `f1_68`

- **Current**: `f1_63` = nonqual -- but `f1_63` is **Line 5b** (Pensions taxable amount)
- **Fix**: Use `f1_68` which is "Line 8 Other income from Schedule 1"

### Bug 3: Line 9 (Total income) -- `f1_64` should be `f1_69`

- **Current**: `f1_64` = totalIncome -- but `f1_64` is **Line 5c** (Pensions check text)
- **Fix**: Use `f1_69` which is "Line 9 Total effectively connected income"

### Bug 4: Line 11a (AGI) -- `f1_66` should be `f1_71`

- **Current**: `f1_66` = totalIncome (AGI) -- but `f1_66` is **Line 7a** (Capital gain/loss)
- **Fix**: Use `f1_71` which is "Line 11a AGI"

### Bug 5: Line 12 (Standard deduction) -- `f1_67` should be `f2_02` (Page 2)

- **Current**: `f1_67` = standardDeduction -- but `f1_67` is **Line 7b** on Page 1
- **Fix**: Use `${P2}.f2_02[0]` which is "Line 12" on Page 2

### Bug 6: Line 14 (Total deductions) -- `f1_70` should be `f2_06` (Page 2)

- **Current**: `f1_70` = standardDeduction -- but `f1_70` is **Line 10 Adjustments** on Page 1
- **Fix**: Use `${P2}.f2_06[0]` which is "Line 14" on Page 2

### Bug 7: Line 15 (Taxable income) -- `f1_71` should be `f2_07` (Page 2)

- **Current**: `f1_71` = taxableIncome -- but `f1_71` is **Line 11a AGI** on Page 1 (conflicts with Bug 4 fix)
- **Fix**: Use `${P2}.f2_07[0]` which is "Line 15" on Page 2

### Missing: Line 11b (Page 2 repeat of AGI)

- `${P2}.f2_01[0]` ("Line 11b") should be populated with the AGI value (same as Line 11a)
- Currently not mapped at all

## Visual Summary of Corrections

```
Form Line  | What               | WRONG field (current)     | CORRECT field
-----------|--------------------|---------------------------|---------------------------
1h amount  | Allocated tips $   | P1.f1_49 (1h type)        | P1.f1_50 (1h amount)
8          | Other income       | P1.f1_63 (Line 5b)        | P1.f1_68 (Line 8)
9          | Total ECI          | P1.f1_64 (Line 5c)        | P1.f1_69 (Line 9)
11a        | AGI                | P1.f1_66 (Line 7a)        | P1.f1_71 (Line 11a)
11b        | AGI (Page 2)       | (not mapped)              | P2.f2_01 (Line 11b)
12         | Std deduction      | P1.f1_67 (Line 7b)        | P2.f2_02 (Line 12)
14         | Total deductions   | P1.f1_70 (Line 10)        | P2.f2_06 (Line 14)
15         | Taxable income     | P1.f1_71 (Line 11a)       | P2.f2_07 (Line 15)
```

## Implementation

All changes are in **one file**: [lib/form-mappers/f1040nr.ts](lib/form-mappers/f1040nr.ts)

### Changes to make (lines ~107-148):

1. **Line 1h** (line 113): Change `f1_49` to `f1_50`, add `f1_49 = "Allocated tips"` label
2. **Line 8** (line 120): Change `f1_63` to `f1_68`
3. **Line 9** (line 124): Change `f1_64` to `f1_69`
4. **Line 11a** (line 127): Change `f1_66` to `f1_71`
5. **Line 11b** (new, after line 127): Add `${P2}.f2_01[0]` = totalIncome
6. **Line 12** (line 131): Change `${P1}.f1_67` to `${P2}.f2_02`
7. **Line 14** (line 134): Change `${P1}.f1_70` to `${P2}.f2_06`
8. **Line 15** (line 138): Change `${P1}.f1_71` to `${P2}.f2_07`

Also update the block comment at the top of `mapToF1040NR` (lines 35-53) to correct the documented field mapping so it stays accurate.
