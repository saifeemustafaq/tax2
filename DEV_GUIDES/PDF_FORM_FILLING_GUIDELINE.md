# PDF Form Filling — Developer Guideline

This document describes **how PDF form filling is implemented** in this project. It is intended for developers who need to replicate or adapt the same behavior in another project (e.g. user uploads documents → extracted values → fill tax forms → download filled PDFs).

**Scope:** Only the logic that **fills data into PDF forms** and **returns a filled PDF for download**. It does **not** cover document upload or AI extraction (W‑2, passport, etc.).

---

## High-level flow

1. **Data source:** The app has structured form data (e.g. from React Hook Form), often populated from extracted document data.
2. **Mapping:** The UI/form layer builds a **key–value map** where:
   - **Keys** = PDF AcroForm field names (e.g. `topmostSubform[0].Page1[0].f1_4[0]`).
   - **Values** = strings, numbers, or booleans to write into those fields.
3. **Fill API:** The frontend sends `{ values }` to a **fill API** (POST).
4. **Server:** The API loads the blank PDF, runs the shared **fill logic** with that `values` map, and returns the filled PDF bytes.
5. **Download:** The frontend receives the PDF blob and triggers a file download (e.g. via `<a download>`).

---

## Technology

- **Library:** [pdf-lib](https://pdf-lib.js.org/) — used to load PDFs, read/write AcroForm fields, and save.
- **PDF type:** Fillable PDFs with **AcroForm** fields (text, checkboxes, radio groups, dropdowns, option lists). The code does **not** draw on a blank canvas; it fills existing form fields.

---

## Files to use as reference

### 1. Core PDF logic (required)

| File | Purpose |
|------|--------|
| **`lib/pdf.ts`** | Single source of truth for PDF form handling. Load PDF from disk, list form field names/types, fill fields from a key–value map, update appearances, flatten, and return PDF bytes. |

**What to copy/adapt:**  
- `loadPdfFromDisk(relativePathFromRoot)`  
- `listAcroFormFields(pdf)` — to discover PDF field names when building your mapping  
- `fillPdfFields(pdf, values)` — the actual fill logic (text, checkbox, radio, dropdown, option list)  
- Type `PdfFieldDescriptor` if you need typed field metadata  

This file has **no** UI or upload logic; it only deals with PDF documents and key–value filling.

---

### 2. API routes (fill + optional field listing)

These routes use `lib/pdf.ts` and return PDFs or field metadata.

| File | Purpose |
|------|--------|
| **`app/api/forms/f1040nr/fill/route.ts`** | POST: accepts `{ values: Record<string, unknown> }`, loads `forms/f1040nr_2025.pdf`, calls `fillPdfFields`, returns filled PDF with `Content-Disposition: attachment`. |
| **`app/api/forms/f8843/fill/route.ts`** | Same pattern for Form 8843: loads `forms/f8843_2025_new.pdf`, fills, returns PDF. |
| **`app/api/forms/f1040nr/fields/route.ts`** | GET: loads the 1040-NR PDF, calls `listAcroFormFields`, returns `{ fields }` so the client can know exact PDF field names for mapping. |
| **`app/api/forms/f8843/fields/route.ts`** | Same for Form 8843. |

**What to copy/adapt:**  
- The **fill** route pattern: parse `values` from the request body → `loadPdfFromDisk(...)` → `fillPdfFields(pdf, values)` → return `NextResponse` with PDF buffer and attachment headers.  
- The **fields** route (optional): useful when you need to discover or debug PDF field names for a new form.

---

### 3. Form-to-PDF mapping and download (UI)

The **mapping** (app form fields → PDF field names) and **download** (call fill API, then trigger download) live in the form pages.

| File | Purpose |
|------|--------|
| **`app/forms/f1040nr/page.tsx`** | Builds the `values` object from React Hook Form data and calls `/api/forms/f1040nr/fill`. Contains the full mapping from form schema (header, income, dependents, tax, payments, refund, etc.) to PDF AcroForm names (e.g. `topmostSubform[0].Page1[0].f1_4[0]`). **Download Filled PDF** triggers `downloadFilledPdf()` which builds `values`, POSTs to fill, then downloads the blob. |
| **`app/forms/f8843/page.tsx`** | Same idea for Form 8843: builds `values` from form state (explicit mapping for known fields + optional heuristic fallback), POSTs to `/api/forms/f8843/fill`, then downloads the returned PDF. |

**What to copy/adapt:**  
- The **pattern**: a function that (1) reads form values, (2) builds `values: Record<string, unknown>` where keys are **exact PDF field names**, (3) `fetch('/api/forms/.../fill', { method: 'POST', body: JSON.stringify({ values }) })`, (4) create blob → object URL → `<a download>` click.  
- The **mapping** itself is form-specific: you must discover your PDF’s field names (via `listAcroFormFields` or a PDF editor) and map each form field to the correct key. F1040-NR and F8843 show two styles: fully explicit mapping (1040-NR) and explicit + heuristic (8843).

---

### 4. Optional: empty form download

| File | Purpose |
|------|--------|
| **`app/api/forms/f1040nr/download/route.ts`** | GET: serves the **blank** 1040-NR PDF (no filling). |
| **`app/api/forms/f8843/download/route.ts`** | GET: serves the **blank** 8843 PDF. |

These are for “Download Empty Form” only; they do not perform any fill logic.

---

## Summary: minimal set for “fill and download”

For another project, the **minimum** you need for filling and downloading is:

1. **`lib/pdf.ts`** — load PDF, list fields (optional), **fillPdfFields**, save.  
2. **One fill API route** (e.g. `app/api/forms/<formId>/fill/route.ts`) — POST, read `values`, load template PDF, call `fillPdfFields`, return PDF with attachment headers.  
3. **UI:** A function that builds `values` from your data model (mapping your fields to PDF AcroForm names), POSTs to the fill API, then triggers download of the response blob.

The **form → PDF field name mapping** is the only form-specific part; it lives in the page (or a dedicated mapper module) that builds the `values` object. Use `listAcroFormFields` (or the `/fields` API) to get the exact names from your PDF.

---

## Key concepts

- **AcroForm field names** are strings like `topmostSubform[0].Page1[0].f1_4[0]`. They are defined inside the PDF; you must use the exact name. Case-sensitive.  
- **Value types:** Text → string; Checkbox → boolean; Radio/Dropdown/Option list → string (selected option name) or array of strings for multi-select option lists.  
- **After filling:** The code calls `form.updateFieldAppearances(font)` then `form.flatten()` so the filled values are baked into the PDF and the form is no longer editable.  
- **Template PDFs** are stored under `forms/` (e.g. `forms/f1040nr_2025.pdf`). Paths are relative to project root when using `loadPdfFromDisk`.

---

## File list (quick reference)

| Category | Files |
|----------|--------|
| **Core fill logic** | `lib/pdf.ts` |
| **Fill API** | `app/api/forms/f1040nr/fill/route.ts`, `app/api/forms/f8843/fill/route.ts` |
| **List fields API** | `app/api/forms/f1040nr/fields/route.ts`, `app/api/forms/f8843/fields/route.ts` |
| **Form → PDF mapping + download** | `app/forms/f1040nr/page.tsx` (see `downloadFilledPdf` and `values` build), `app/forms/f8843/page.tsx` (see “Download Filled PDF” onClick and `values` build) |
| **Empty PDF download** | `app/api/forms/f1040nr/download/route.ts`, `app/api/forms/f8843/download/route.ts` |

Give your developer **`lib/pdf.ts`**, the **fill** (and optionally **fields**) **route(s)**, and the **form page(s)** that build `values` and trigger download. That is everything needed to replicate PDF form filling and download in another project.
