# Tax Filing App — Developer Guide

Baseline rules for structure, reuse, and file size. Follow these unless there's a clear reason to deviate.

---

## 1. Structure & components

- **One component/feature per file** — Each component or feature lives in its own file. No dumping unrelated UI or logic into a single file.
- **Clear ownership** — Every file has a single, nameable responsibility. Ask: "What is this file's job?"
- **Sensible folders** — Group by feature or domain (e.g. `documents/`, `filing/`, `forms/`) rather than only by type (`components/`, `utils/`). Use vertical slices where it makes sense.
- **UI components** — Use **shadcn/ui** as the primary component library. Add components via `npx shadcn@latest add <name>`; customize in `components/ui/`. See [Design Guide](./docs/DESIGN_GUIDE.md) for full UI standards.

---

## 2. DRY (Don't Repeat Yourself)

- **Reuse first** — Before adding new code, check for existing components, hooks, or utilities you can reuse.
- **Shared code** — Extract only when used by **≥ 2 distinct modules**. If used by one module, keep it in that module (same file or same folder).

---

## 3. File size (LOC)

- **Target:** Most source files **≤ 300 lines**.
- **LOC is a signal, not the goal** — Going over 300 is allowed when it **improves cohesion or readability** (e.g. one clear flow in one file).
- **Do not split only to hit 300** if the result is worse: more files to open, duplicated types, circular deps, or pass-through wrappers.
- **Heuristic:** If you need to open **3+ files** to understand one flow, you probably split too much.

---

## 4. When to split a file

Split only when there's a **real boundary**:

- Different responsibilities (e.g. validation vs. persistence vs. API).
- Stable interfaces (e.g. service vs. data layer).
- Reusable component with a clear owner.
- Domain sub-area you can name clearly (e.g. document upload vs. document list).

**Rule:** Every new file created to reduce LOC must answer: **"What is its single responsibility?"**  
No splitting "just because" the file is long.

---

## 5. Helpers & shared code

- **Prefer vertical slices over generic helpers** — Avoid `utils/helpers/common/misc` only to move lines out.
- A helper is valid only if it's either:
  - **Domain-specific** (e.g. tax-year utilities, form validation), or
  - **Truly general** and used by **≥ 2 distinct modules**.
- **Single consumer** → keep it **co-located** (same folder) or in the same file. Don't push it to a global "shared" place.

---

## 6. Co-location

- **Keep related code close** — Types, helpers, and sub-components that belong to one feature live with that feature (same file or same directory).
- **Rule:** Don't move something to a shared location unless it has **multiple real consumers**.

---

## 7. Imports & dependencies

- **Limit import sprawl** — If a file has **> ~15 imports** after a refactor, reconsider the structure.
- **No unnecessary dependency chains** — Splitting should not introduce circular dependencies or deep import chains. If it does, revert or restructure.
- **Rule:** Splitting should not significantly increase how many files you need to import from; the mental model should stay simple.

---

## 8. UI & design conventions

- **Design guide** — Follow [docs/DESIGN_GUIDE.md](./docs/DESIGN_GUIDE.md): minimalist UI, clear hierarchy, restrained color. This is tax software; the interface should feel trustworthy and compliance-oriented.
- **Icons** — Use **React Icons only** (e.g. `react-icons/hi`, `react-icons/fi`). **Do not use emoji** in the UI, copy, or code.
- **Responsive** — Design for the smallest viewport you support first, then enhance for larger screens (e.g. `min-width` / `sm:` breakpoints). Forms and key actions must work on the target devices.

---

## Quick checklist

| Do | Don't |
|----|--------|
| One clear responsibility per file | Split only to hit 300 LOC |
| Reuse components and shared logic | Duplicate code across features |
| Split on clear seams (responsibility, interface, domain) | Create pass-through or re-export-only files |
| Co-locate code used by one module | Extract to "shared" for a single consumer |
| Keep imports and dependency depth under control | Let refactors create 15+ imports or cycles |
| Use shadcn/ui and React Icons; follow Design Guide | Use emoji or ad-hoc UI libraries |
| Keep UI minimal and trustworthy | Add decorative or playful elements |

---

*Keep this guide next to the [Design Guide](./docs/DESIGN_GUIDE.md) when making structure or refactor decisions.*
