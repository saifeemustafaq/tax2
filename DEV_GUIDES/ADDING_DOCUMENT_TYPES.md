# Adding a New Document Type

This guide describes how to add a new document type for **upload**, **extract**, and **saving to MongoDB**, using the Passport flow as reference.

---

## Overview

Each document type is wired through:

1. **Extraction** — Zod schema, prompt, and JSON schema for OpenAI
2. **Prompt registry** — Register the type so extract/upload can use it
3. **Stored types** — TypeScript type for the document in the DB
4. **Upload API** — Build the correct `StoredDocument` and insert into MongoDB
5. **UI (optional)** — Add to the upload page if it should be user-selectable

The **extract** API (`/api/documents/extract`) and **OpenAI** layer use the registry only; once the type is registered, they work without further changes. The **upload** API and **MongoDB** storage require explicit handling per type.

---

## Step 1: Create the extraction module

Add a new file under `extraction/prompts/documents/` (for ID-style docs like passport) or `extraction/prompts/forms/` (for forms like W2).

**Reference:** `extraction/prompts/documents/passport.ts`

Define:

- **Zod schema** — All fields the model should extract (use `.optional()` where appropriate).
- **Export type** — `export type MyDocExtraction = z.infer<typeof myDocSchema>`
- **Prompt string** — Instructions for the model (what to extract, date format, empty string for missing fields, etc.).
- **JSON schema** — Object matching the Zod shape for OpenAI’s `json_schema` format (`type`, `properties`, `required`, `additionalProperties: false`).

Example shape (see passport or W2 for full examples):

```ts
// extraction/prompts/documents/my-doc.ts
import { z } from "zod";

export const myDocSchema = z.object({
  field_a: z.string(),
  field_b: z.number().optional(),
});

export type MyDocExtraction = z.infer<typeof myDocSchema>;

export const myDocPrompt = `Extract ... from this document. Return only valid JSON matching the schema.`;

export const myDocJsonSchema = {
  type: "object" as const,
  properties: {
    field_a: { type: "string", description: "..." },
    field_b: { type: "number", description: "..." },
  },
  required: ["field_a"],
  additionalProperties: false,
};
```

---

## Step 2: Register the document type

**File:** `extraction/prompts/index.ts`

1. Import schema, prompt, and jsonSchema from the new module.
2. Export the extraction type: `export type { MyDocExtraction } from "./documents/my-doc";`
3. Add an entry to the `registry` object, e.g. `myDoc: { prompt, schema, jsonSchema }`.
4. Add the id to `SUPPORTED_DOCUMENT_TYPES`, e.g. `["passport", "w2", "myDoc"]`.

After this, `getDocumentPromptConfig("myDoc")` and `isSupportedDocumentType("myDoc")` will include the new type, and the extract API will work for it.

---

## Step 3: Add the stored document type

**File:** `lib/types/document.ts`

1. Import the new extraction type from `@/extraction/prompts`.
2. Define a stored variant:

   ```ts
   export type StoredDocumentMyDoc = {
     _id?: ObjectId;
     userId: ObjectId;
     documentType: "myDoc";
     data: MyDocExtraction;
     originalFilename?: string;
     createdAt: Date;
   };
   ```

3. Add it to the union: `export type StoredDocument = StoredDocumentPassport | StoredDocumentW2 | StoredDocumentMyDoc;`

---

## Step 4: Handle the new type in the upload API

**File:** `app/api/documents/upload/route.ts`

1. Import the new extraction type, e.g. `MyDocExtraction`.
2. Import the new stored type, e.g. `StoredDocumentMyDoc`.
3. After `extractDocument(docType, file, file.name)`, extend the logic that builds `storedDoc`. Currently this is a ternary; add a branch for the new type:

   ```ts
   const storedDoc: StoredDocument =
     docType === "passport"
       ? ({ ... } satisfies StoredDocumentPassport)
       : docType === "w2"
         ? ({ ... } satisfies StoredDocumentW2)
         : ({ ... } satisfies StoredDocumentMyDoc);
   ```

   Use the same shape: `userId`, `documentType: "myDoc"`, `data: extracted as MyDocExtraction`, `originalFilename`, `createdAt`.

Optionally, update the error message that lists supported types (e.g. use `SUPPORTED_DOCUMENT_TYPES.join(", ")`) so new types appear automatically. Same can be done in `app/api/documents/extract/route.ts` and `extraction/openai.ts` where the same message is used.

---

## Step 5: Expose the type in the upload UI (optional)

**File:** `app/(app)/documents/upload/page.tsx`

- `DOCUMENT_TYPES` controls which cards are shown. Add an entry with `id` equal to the new document type id (e.g. `"myDoc"`).
- Only entries whose `id` is in `SUPPORTED_DOCUMENT_TYPES` are actually uploaded (`SUPPORTED_IDS`). So after Step 2, the new id will be accepted and sent as `documentType` to `/api/documents/upload`.

No other UI change is required unless you add type-specific display or actions.

---

## Checklist

| Step | Location | Action |
|------|----------|--------|
| 1 | `extraction/prompts/documents/` or `forms/` | New file: schema, type, prompt, jsonSchema |
| 2 | `extraction/prompts/index.ts` | Import, registry entry, `SUPPORTED_DOCUMENT_TYPES` |
| 3 | `lib/types/document.ts` | `StoredDocumentMyDoc`, add to `StoredDocument` union |
| 4 | `app/api/documents/upload/route.ts` | Import types, branch in `storedDoc` for new type |
| 5 | `app/(app)/documents/upload/page.tsx` | Add to `DOCUMENT_TYPES` if user should select it |

**Reference implementation:** Passport — see `extraction/prompts/documents/passport.ts`, `extraction/prompts/index.ts`, `lib/types/document.ts` (`StoredDocumentPassport`), and `app/api/documents/upload/route.ts` (passport branch).
