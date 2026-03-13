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

## 9. Naming conventions

| Category | Convention | Examples |
|----------|-----------|----------|
| Files | kebab-case | `form-viewer-modal.tsx`, `tax-engine.ts` |
| Components | PascalCase | `FormViewerModal`, `AppShell` |
| Functions / variables | camelCase | `fetchFormDocuments`, `parseNum` |
| Types / interfaces | PascalCase | `FormDocuments`, `TaxComputation` |
| Constants | UPPER_SNAKE_CASE | `SUPPORTED_DOCUMENT_TYPES`, `COOKIE_NAME` |

- **Be consistent within a group.** If every form mapper file is named `f<formId>.ts` and every mapper function is `mapToF<FormId>`, new additions must follow the same pattern.
- **Output filenames and asset paths** should follow the same prefix/suffix conventions already established. Check existing entries before adding new ones.

---

## 10. TypeScript & type safety

- **Strict mode is on** (`strict: true` in `tsconfig.json`). Do not weaken it.
- **Avoid `any`** — use `unknown` and narrow with type guards or assertions. If `any` is truly unavoidable (e.g. interacting with an untyped third-party API), add a `// eslint-disable` comment with a justification.
- **Zod as source of truth** — When a Zod schema defines a data shape (e.g. extraction schemas), derive the TypeScript type from it with `z.infer<typeof schema>`. Do not maintain a separate manual type that mirrors the same shape.
- **Manual types for DB / API** — For MongoDB documents and API request/response shapes that are not driven by Zod, define explicit `type` or `interface` declarations in `lib/types/`.
- **Prefer `type` over `interface`** unless you need declaration merging. Keep it consistent within a file.

---

## 11. Error handling

- **Catch variable:** Always name it `err`.

  ```ts
  // Good
  catch (err) { ... }

  // Bad
  catch (e) { ... }
  ```

- **API error shape:** Every API route returns errors as `{ error: string }` with an appropriate HTTP status code. Do not add extra fields unless there is a documented reason.
- **Server-side logging:** Always call `console.error` inside API catch blocks so errors are observable in server logs. Include enough context to identify the failing operation (e.g. the route name or form ID).
- **Client-side feedback:** Use Sonner toasts (`toast.error(...)`) to surface errors to the user. Do not silently swallow fetch failures.
- **Custom error classes:** When a module needs structured error codes (e.g. extraction), extend `Error` with a `code` field. Keep it in the module that owns the concern.

---

## 12. Imports

- **Use `@/` for cross-directory imports.** The path alias `@/*` maps to the project root. Never use deep relative paths like `../../../../components/...`.

  ```ts
  // Good
  import { Button } from "@/components/ui/button";

  // Bad
  import { Button } from "../../../../components/ui/button";
  ```

- **Relative imports** are fine for files in the **same directory** (e.g. `./types`, `./helpers`).
- **React imports** — In custom (non-generated) code, use direct named imports: `import { useState, useCallback } from "react"`. Do not modify shadcn-generated files; they follow their own `import * as React` convention.
- **`import type`** — Use `import type` (or inline `type` in import lists) when importing only types. This keeps runtime bundles clean and makes intent explicit.

---

## 13. Constants & magic values

- **No magic numbers or strings in business logic.** If a literal value appears in more than one place, or carries domain meaning, extract it into a named constant.
- **Co-locate or centralize** — If the constant is used by a single module, define it at the top of that file. If shared across modules, place it in a dedicated constants file (e.g. `lib/constants.ts`).
- **Environment-dependent values** (URLs, feature flags) should come from environment variables, not hardcoded strings.

---

## 14. Pure functions & business logic

- **Calculations must be pure** — No I/O, no mutations of external state, deterministic output for the same input. This makes them trivially testable and safe to compose.
- **Keep in `lib/`** — Business logic (tax computation, form mapping, date math) lives in `lib/`, separate from API routes and UI components.
- **Mappers** receive a typed data object and return a plain key-value record. They must not call the database, read cookies, or perform any side effects.

---

## 15. Data integrity & monetary precision

Tax computations must produce IRS-compatible results. JavaScript's IEEE 754 floating-point arithmetic is inherently imprecise for decimal math (`0.1 + 0.2 !== 0.3`), so we follow strict conventions.

### Rounding

- **Whole dollars only.** All monetary values written to tax forms are whole-dollar amounts (IRS standard). Use `taxRound()` from `lib/form-mappers/types.ts` for every monetary calculation.
- **Threshold:** Fractional part **>= $0.51** rounds up; **< $0.51** rounds down (truncate). This is slightly more conservative than standard IRS rounding (which rounds $0.50 up).
- **Internally:** `taxRound()` converts to integer cents (`Math.round(n * 100)`) before comparing, avoiding floating-point comparison bugs like `1234.51 - 1234 = 0.5099...` in JS.
- **Do not use `Math.round()` directly on dollar amounts.** Always use `taxRound()`.

### Defense-in-depth: three rounding layers

Every dollar value passes through up to three rounding gates so a missed round at one stage is caught at the next:

| Layer | Function | Where | Purpose |
|-------|----------|-------|---------|
| 1 | `parseNum()` | Extraction string → number | Rounds as soon as a raw string becomes a number |
| 2 | `taxRound()` | Tax engine computations | Rounds after bracket math and intermediate calculations |
| 3 | `amt()` | Number → PDF form string | Safety net before writing to the form |

Do not bypass these layers. If you need a raw numeric value for a non-monetary purpose (days, counts, percentages), use `Number()` or `parseInt()` directly — not `parseNum()`.

### What NOT to round

- Calendar day counts (`daysInRange`, `daysForYear`) — integers by nature.
- String comparisons in sanitization logic (e.g., `normalizeAmount` in W-2 sanitization).
- Percentages and rates — tax bracket rates like `0.22` stay as-is.

### Idempotency

- `taxRound(taxRound(n)) === taxRound(n)` — applying it multiple times is safe and produces the same result.
- Recomputing a tax return from the same stored data must produce identical output. Do not introduce randomness, timestamps, or non-deterministic ordering into computation paths.

### Raw data preservation

Store extraction results as-is in MongoDB (raw strings from AI extraction). Rounding is applied **when values are consumed** (in mappers and the tax engine), never when stored. This preserves an audit trail of what the extraction actually produced versus what appeared on the final form.

---

## 16. Database conventions

The app uses **MongoDB** via the official Node.js driver (not Mongoose). The data layer lives in `lib/mongodb.ts` and `lib/types/`.

### Connection management

- **Singleton client** — `lib/mongodb.ts` maintains a single `MongoClient` promise cached on `globalThis` to survive Next.js hot reloads in development and reuse connections across serverless invocations.
- **Never create a second client.** Always use `getDb()`, `getUserCollection()`, or `getDocumentsCollection()`.
- **Retry on failure** — If the cached connection promise rejects, the singleton discards it and creates a fresh client on the next call. Do not add manual retry loops around connection logic.

### Schema patterns

- **Embedded documents, not references.** Extraction data (passport, W-2, I-20, etc.) is stored inline in `StoredDocument`, not in separate collections joined by ObjectId. This matches the read pattern: generating a tax form loads all of a user's documents in one query.
- **Discriminated union** — `StoredDocument` in `lib/types/document.ts` is a TypeScript union discriminated by `documentType` (e.g., `"passport"`, `"w2"`, `"i20"`). The `data` field's type narrows based on `documentType`. New document types must be added to this union.
- **Required fields** — Every document has `userId` (ObjectId), `documentType` (string literal), `data` (type-specific), and `createdAt` (Date). Optional: `originalFilename`.

### Indexes

- Define indexes in idempotent `ensure*` functions (e.g., `ensureDocumentsIndexes()`, `ensureUserIndexes()`) that run at startup or first access.
- These functions use a module-level flag to skip redundant `createIndex` calls on subsequent requests.
- **Swallow "already exists"** — Index creation catches `IndexOptionsConflict` and `already exists` errors so the app doesn't crash on redeploys.
- When adding a new query pattern that filters or sorts on a field not yet indexed, add an index in the appropriate `ensure*` function.

### Naming

| Item | Convention | Example |
|------|-----------|---------|
| Database | `"tax"` (hardcoded in `getDb()`) | — |
| Collections | Plural noun, lowercase | `"users"`, `"documents"` |
| Collection helpers | `get<Name>Collection()` returning typed `Collection<T>` | `getUserCollection()` |
| Index helpers | `ensure<Name>Indexes()` | `ensureDocumentsIndexes()` |

### Schema evolution

- MongoDB is schema-less, but **TypeScript types are the schema.** When a field is added or removed, update the corresponding type in `lib/types/` and handle the missing field gracefully in code.
- **Do not delete fields from existing documents retroactively.** Old documents may lack new fields. Code must tolerate this via optional types (`field?: Type`) and sensible defaults.
- For tax-year-specific changes (e.g., new form fields in 2026), add the field as optional and scope the logic to the relevant tax year rather than breaking backward compatibility.

---

## 17. API route conventions

- **Auth:** Every protected route reads the JWT from cookies and calls `verifyToken()`. Return `401` immediately if verification fails.
- **Shape:** Wrap the handler body in `try / catch`. Return `NextResponse.json(...)` with the correct HTTP status.
- **Error response:** Always `{ error: string }`. Match status codes to meaning: `400` bad input, `401` unauthorized, `404` not found, `422` validation failure, `500` unexpected server error.
- **Logging:** `console.error(err)` in every catch block.
- **No business logic in routes** — Routes orchestrate (parse input, call service, return response). Heavy logic belongs in `lib/`.

---

## 18. Exports

- **`export default`** — Only for Next.js pages and layouts (required by the framework).
- **Named exports everywhere else** — Components, hooks, utilities, types, constants. Named exports are easier to search, refactor, and tree-shake.

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
| Follow naming conventions (kebab-case files, PascalCase types) | Invent new naming patterns per file |
| Use `@/` for cross-directory imports | Use deep relative paths (`../../..`) |
| Avoid `any`; use `unknown` + narrowing | Sprinkle `as any` to silence the compiler |
| Extract repeated literals into named constants | Hardcode magic numbers/strings in business logic |
| Keep calculations pure (no I/O, no side effects) | Mix DB calls or fetch into mapper/calc functions |
| Use `taxRound()` for all monetary math; round at every layer | Use `Math.round()` directly or skip rounding on intermediate values |
| Store raw extraction data as-is; round only on consumption | Round values before storing, destroying the audit trail |
| Ensure recomputing a return produces identical output | Introduce non-determinism into computation paths |
| Access MongoDB through `getDb()` / `get*Collection()` helpers | Create a second `MongoClient` or bypass the singleton |
| Add indexes via idempotent `ensure*` functions | Create indexes ad-hoc in route handlers |
| Add new fields as optional; tolerate missing fields in old docs | Make breaking schema changes that crash on existing data |
| Return `{ error: string }` with correct status from APIs | Return inconsistent error shapes or swallow errors |
| Use named exports; `export default` only for pages | Default-export components or utilities |

---

*Keep this guide next to the [Design Guide](./docs/DESIGN_GUIDE.md) when making structure or refactor decisions.*
