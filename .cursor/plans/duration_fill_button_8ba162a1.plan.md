---
name: Duration Fill Button
overview: Add a "Fill" button next to "Save & Continue" on the duration page that generates random US arrival/departure dates for 2023, 2024, and 2025. No backend or mapping changes are needed -- everything is already connected end-to-end.
todos:
  - id: fill-button
    content: Add fillRandom() helper and 'Fill' button to duration page (app/(app)/duration/page.tsx)
    status: pending
isProject: false
---

# Duration Page "Fill" Button

## Current State

- **Duration page** ([app/(app)/duration/page.tsx](app/(app)/duration/page.tsx)) renders 3 cards (2023, 2024, 2025), each with `arrival` and `departure` date inputs, plus a "Save & Continue" button.
- **State shape:** `dates: Record<number, { arrival: string; departure: string }>`.
- **API:** `POST /api/duration` already accepts `{ entries: DurationEntry[] }` and upserts into MongoDB (`documents` collection, `documentType: "duration"`).
- **Form 8843 mapping** ([lib/form-mappers/f8843.ts](lib/form-mappers/f8843.ts)) already reads duration entries and maps them to PDF fields `f1_14`-`f1_17` via `daysForYear()`.
- **1040-NR OI mapping** ([lib/form-mappers/f1040nro.ts](lib/form-mappers/f1040nro.ts)) also uses duration entries for `f1_23`-`f1_25`.

**Conclusion: No backend, database, or form-mapper changes are required.** The entire pipeline (save -> store -> fetch -> map to PDF) is already in place.

## What Needs to Change

Only **one file** needs editing: [app/(app)/duration/page.tsx](app/(app)/duration/page.tsx).

### 1. Add a `fillRandom()` helper function

Generate plausible random dates for each year (2023, 2024, 2025):

- **Arrival:** random date between Jan 1 and Mar 31 of that year
- **Departure:** random date between Nov 1 and Dec 31 of that year

This produces a realistic ~8-11 month US presence window per year.

```typescript
function randomDate(year: number, startMonth: number, endMonth: number): string {
  const month = startMonth + Math.floor(Math.random() * (endMonth - startMonth + 1));
  const maxDay = new Date(year, month, 0).getDate();
  const day = 1 + Math.floor(Math.random() * maxDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fillRandom() {
  const filled: Record<number, { arrival: string; departure: string }> = {};
  for (const year of [2023, 2024, 2025]) {
    filled[year] = {
      arrival: randomDate(year, 1, 3),
      departure: randomDate(year, 11, 12),
    };
  }
  setDates(filled);
}
```

### 2. Add the "Fill" button next to "Save & Continue"

Place a secondary/outline-variant "Fill" button to the left of the existing "Save & Continue" button. The button will call `fillRandom()` which updates state; the user can then review and click "Save & Continue" to persist.

Current button area (around line 145-155):

```
<div className="flex justify-end">
  <Button ... onClick={save}>Save & Continue</Button>
</div>
```

Updated layout:

```
<div className="flex justify-end gap-3">
  <Button variant="outline" size="lg" type="button" onClick={fillRandom}>
    Fill
  </Button>
  <Button size="lg" type="button" onClick={save} disabled={saving || !loaded}>
    {saving ? "Saving..." : "Save & Continue"}
  </Button>
</div>
```

### Verification Checklist

- **Database:** Already configured -- `POST /api/duration` upserts `DurationEntry[]` into `documents` collection.
- **Form 8843:** Already mapped -- `daysForYear(duration, year)` fills `f1_14`-`f1_17`.
- **1040-NR OI:** Already mapped -- `daysForYear(duration, year)` fills `f1_23`-`f1_25`.
- No new dependencies, API routes, or schema changes needed.

