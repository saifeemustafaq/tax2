# OpenAI document extraction

**Summary for IT / Security:** This app uses **OpenAI’s API** (Responses API and Files API) for document extraction. PDF and image uploads are sent to OpenAI to return structured JSON (e.g. passport or W2 fields). The API key is stored in `.env` and used only in server-side code.

---

## What we use it for

- **Document extraction:** Upload a PDF or image (passport, W2) and receive structured JSON with extracted fields.
- **Flow:** User uploads a file on the documents page; the front end can call `POST /api/documents/extract` with the file and document type. The API route uploads the file to OpenAI (Files API), calls the Responses API with a document-specific prompt and structured-output schema, then returns the validated JSON.

---

## Technical implementation

| Item | Detail |
|------|--------|
| **Provider** | OpenAI |
| **APIs** | [Files API](https://platform.openai.com/docs/api-reference/files) (upload), [Responses API](https://platform.openai.com/docs/api-reference/responses) (extraction with vision + structured output) |
| **Model** | Configurable via `OPENAI_EXTRACTION_MODEL` (default: `gpt-4o-mini`) |
| **Auth** | API key in env as `OPENAI_API_KEY` (not in source control) |
| **Where it runs** | Server-side only: API route `app/api/documents/extract/route.ts` and extraction module `extraction/openai.ts` |

---

## Configuration

- **`OPENAI_API_KEY`** (required for extraction): Set in `.env` in the project root. Used only by the extraction module and the extract API route.
- **`OPENAI_EXTRACTION_MODEL`** (optional): Model used for extraction (default: `gpt-4o-mini`). Must support vision and structured output (e.g. `gpt-4o`, `gpt-4o-mini`).

---

## Security / ops notes

- **Server-side only:** The OpenAI key is never sent to the browser. All extraction runs in Next.js API routes and the `extraction/` module.
- **Key storage:** `OPENAI_API_KEY` lives in `.env`; `.env` is in `.gitignore`.
- **Auth:** The extract endpoint requires a valid session (same cookie/JWT pattern as other protected routes). Unauthenticated requests receive 401.
- **File limits:** The extract API accepts a single file per request, max 20 MB, and allows only PDF and image MIME types.

---

One-line summary for tickets:  
*“We use OpenAI’s Files and Responses APIs (key in `.env`) from server-side code to extract structured JSON from uploaded passport and W2 documents.”*
