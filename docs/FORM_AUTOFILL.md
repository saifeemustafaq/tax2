# Form Autofill Framework

This document describes how form autofill works and how to add new forms or document types.

## Example: Schedule OI (already in the app)

Schedule OI (Form 1040-NR Other Information) is already supported. To add a form **like** Schedule OI from scratch, follow the steps in "Adding a new form" below. To verify or change Schedule OI specifically:

1. **PDF**: `public/forms/empty/f1040nro.pdf`
2. **Field manifest**: Extract with `npm run pdf-fields-to-json -- --pdf public/forms/empty/f1040nro.pdf` and check `scripts/output/f1040nro.json`. Add human-readable `fieldName`s with `node scripts/add-1040nro-field-names.mjs`. The mapper in `lib/form-mappers/f1040nro.ts` uses prefix `form1040-NR[0].Page1[0]` and must match the manifest keys exactly.
3. **Mapper**: `lib/form-mappers/f1040nro.ts` — `mapToF1040NRO(docs)` fills name, SSN, citizenship, tax residence, Yes/No answers, immigration status from I-20, days present from duration.
4. **Registry**: `lib/forms/registry.ts` — entry `formId: "f1040nro"` with that mapper and PDF path.
5. **UI**: `app/(app)/forms/page.tsx` — FORMS entry with `fillApiId: "f1040nro"`, `visibleWhen: "schedule_oi"` (shown when eligibility says so).

No API route file is needed; `POST /api/forms/f1040nro/fill` is handled by the dynamic route.

## Overview

- **Document bundle**: All fillable forms receive the same `FormDocuments` object (passport, I-20, W-2, duration/travel history, and optionally visa, I-94, EAD). Documents are fetched once per fill request in `lib/form-mappers/fetch-docs.ts`.
- **Form registry**: A single registry in `lib/forms/registry.ts` defines each form: `formId`, `pdfPath`, `filledFilename`, `mapper(docs)`, and optional `requiredDocTypes`. The API uses one dynamic route `POST /api/forms/[formId]/fill` that looks up the form and runs the shared fill pipeline.
- **Fill pipeline**: `fillForm(formId)` in the registry loads the form def, calls `fetchFormDocuments()`, runs the form’s mapper to get AcroForm key-value pairs, loads the PDF, fills fields, and returns the PDF bytes. No per-form API route files are required.

## Adding a new form

1. **Add the PDF**  
   Place the blank fillable PDF in `public/forms/empty/<name>.pdf`.

2. **Export the field manifest (optional but recommended)**  
   Run the PDF field extractor:
   ```bash
   npm run pdf-fields-to-json -- --pdf public/forms/empty/<name>.pdf
   ```
   This writes `scripts/output/<basename>.json`. Optionally add a small script (like `scripts/add-1040nr-field-names.mjs` or `scripts/add-8843-field-names.mjs`) to populate a `fieldName` for each field so the manifest is human-readable.

3. **Implement the mapper**  
   Create `lib/form-mappers/f<id>.ts` (e.g. `f1040nr.ts`, `f8843.ts`) with a function:
   ```ts
   export function mapToF<Id>(docs: FormDocuments): Record<string, unknown>
   ```
   The return value must use the **exact AcroForm full names** as keys (e.g. `topmostSubform[0].Page1[0].f1_14[0]`). Use the exported JSON manifest or a PDF inspector to get the correct names. Use whichever document types are relevant (passport, i20, w2, duration, visa, i94, ead).

4. **Register the form**  
   In `lib/forms/registry.ts`, add an entry to `FORM_REGISTRY`:
   - `formId`: e.g. `"f1040nr"` (must match the segment used in the URL `/api/forms/<formId>/fill`).
   - `pdfPath`: path from project root, e.g. `"public/forms/empty/f1040nr.pdf"`.
   - `filledFilename`: suggested download name, e.g. `"f1040nr_filled.pdf"`.
   - `mapper`: the function from step 3.
   - `requiredDocTypes` (optional): array of document types that are typically needed for this form (e.g. `["passport", "w2"]`). Not enforced yet; can be used later for validation or UI hints.

5. **Expose in the UI**  
   In `app/(app)/forms/page.tsx`, add an entry to the `FORMS` array with `id`, `fillApiId` (same as `formId` in the registry, e.g. `"f1040nr"`), `title`, `subtitle`, `description`, `emptyFile`, `filledFilename`, and optional `visibleWhen` for eligibility-based visibility.

No new API route is needed; the dynamic route handles all registered forms.

## Adding a new document type

1. **Define the extraction type**  
   Add a type (e.g. `VisaExtraction`) in `lib/types/document.ts` or in the extraction layer. If extraction does not exist yet, use a minimal placeholder type in `lib/types/document.ts`.

2. **Define the stored document type**  
   In `lib/types/document.ts`, add `StoredDocument<Name>` with `documentType: "<name>"` and `data: <ExtractionType>`, and add it to the `StoredDocument` union.

3. **Extend the document bundle**  
   In `lib/form-mappers/types.ts`, add the new key to `FormDocuments` (e.g. `visa: VisaExtraction | null`).

4. **Fetch the new document**  
   In `lib/form-mappers/fetch-docs.ts`, query the documents collection for `documentType: "<name>"` and add the result to the returned `docs` object.

5. **Use in mappers**  
   Any form mapper can now read `docs.visa` (or the new key) and map it to PDF fields as needed.

## File reference

| Purpose | Location |
|--------|----------|
| Document bundle type | `lib/form-mappers/types.ts` (`FormDocuments`) |
| Stored document types | `lib/types/document.ts` |
| Fetch documents | `lib/form-mappers/fetch-docs.ts` |
| Form registry and fill pipeline | `lib/forms/registry.ts` |
| Dynamic fill route | `app/api/forms/[formId]/fill/route.ts` |
| Form mappers | `lib/form-mappers/f<id>.ts` |
| Field manifests | `scripts/output/<form>.json` |
| Forms UI config | `app/(app)/forms/page.tsx` (`FORMS` array) |

## Required documents per form (optional)

Each form in the registry can declare `requiredDocTypes?: ("passport" | "i20" | "w2" | "duration" | "visa" | "i94" | "ead")[]`. This is not enforced by the fill pipeline today; it can be used later to:

- Validate that at least one required doc is present before filling.
- Show the user which documents will be used (e.g. “Fill uses: Passport, W-2”).

Implementing that check is a small addition in `fillForm()` in `lib/forms/registry.ts` if desired.
