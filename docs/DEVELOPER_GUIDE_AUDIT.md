# Developer Guide Adherence Audit

Run date: manual check. Reference: [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md).

---

## 1. Structure & components

| Rule | Status | Notes |
|------|--------|--------|
| One component/feature per file | Pass | Each file has a single focus (app-shell, step-progress-bar, pages, one component per UI file). |
| Clear ownership | Pass | Files are nameable (e.g. app-shell = layout + sidebar nav, step-progress-bar = top progress, documents/upload = upload page). |
| Sensible folders | Pass | Routes grouped by feature (`app/documents/upload`, `app/documents/stored`). `components/ui/` for shared UI; could add feature slices (e.g. `components/documents/`) later if needed. |
| shadcn/ui primary | Pass | UI built from shadcn (Button, Card, Checkbox, Sidebar, Sheet, etc.) in `components/ui/`. |

---

## 2. DRY

| Rule | Status | Notes |
|------|--------|--------|
| Reuse first | Pass | Shared `cn` in `lib/utils.ts`; shadcn components reused across pages. |
| Shared only when ≥2 consumers | Pass | Shared code (utils, hooks, UI) is used in multiple places. No single-consumer code moved to a global shared location. |

---

## 3. File size (LOC)

| Rule | Status | Notes |
|------|--------|--------|
| Most files ≤300 lines | Pass with one exception | All app/ and feature files are under 300 lines. |
| Exception | Flag | `components/ui/sidebar.tsx` is **726 lines**. This is the stock shadcn sidebar (one component system, many sub-components in one file). Guide allows over 300 when it improves cohesion; splitting would mean many small wrapper files. **Verdict:** Acceptable as-is; no change recommended unless we own a fork and refactor. |

Other files: app-shell 125, step-progress-bar 56, upload page 187, stored 32, layout 38, page 44, UI components all under 200 except card 92 and sheet 143.

---

## 4. When to split

| Rule | Status | Notes |
|------|--------|--------|
| Split on real boundaries only | Pass | No unnecessary splits. Document upload logic lives in upload page; progress steps in step-progress-bar. |

---

## 5. Helpers & shared code

| Rule | Status | Notes |
|------|--------|--------|
| Prefer vertical slices; avoid generic misc helpers | Pass | No `utils/helpers/common/misc`. |
| Helpers domain-specific or used by ≥2 modules | Pass | `lib/utils.ts` (`cn`) is general and used by many UI files. |
| Single consumer co-located | Pass | No single-consumer code pushed to a global shared place. |

---

## 6. Co-location

| Rule | Status | Notes |
|------|--------|--------|
| Related code close (same file or directory) | Pass | Document routes under `app/documents/`; UI primitives in `components/ui/`. |

---

## 7. Imports & dependencies

| Rule | Status | Notes |
|------|--------|--------|
| No file with >~15 imports | Pass | Highest import count is in `sidebar.tsx` (shadcn-generated); no app/ or feature file has import sprawl. |
| No circular or deep chains | Pass | No circular dependencies observed; import depth is shallow. |

---

## 8. UI & design conventions

| Rule | Status | Notes |
|------|--------|--------|
| Follow Design Guide | Pass | Minimalist UI, clear hierarchy, restrained color; see [docs/DESIGN_GUIDE.md](DESIGN_GUIDE.md). |
| React Icons only; no emoji | Pass | Codebase uses only `react-icons` (hi, hi2). No emoji in UI, copy, or code. |
| Responsive (mobile-first, breakpoints) | Pass | Layout uses responsive classes (e.g. `sm:`, `md:`, `lg:`) and sidebar is mobile-aware. |

---

## Quick checklist summary

| Do | Status |
|----|--------|
| One clear responsibility per file | Pass |
| Reuse components and shared logic | Pass |
| Split on clear seams only | Pass |
| Co-locate single-consumer code | Pass |
| Imports and dependency depth under control | Pass |
| shadcn/ui and React Icons; follow Design Guide | Pass |
| Minimal, trustworthy UI | Pass |

---

## Optional cleanup

- **Dependency:** `lucide-react` remains in `package.json` but is not imported anywhere (icons were switched to `react-icons`). Safe to remove when convenient: `npm uninstall lucide-react`.

---

**Overall: The project adheres to the Developer Guide.** The only notable point is the large line count in `components/ui/sidebar.tsx`, which is acceptable per the guide’s “cohesion or readability” exception.
