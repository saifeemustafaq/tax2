# Document extraction

**Summary for IT / Security:** This app uses an **OpenAI-compatible Chat Completions API** for document extraction. PDF and image uploads are converted to images server-side and sent to the model to return structured JSON (e.g. passport or W-2 fields). The API key is stored in `.env` and used only in server-side code. The backend can be direct OpenAI or Intuit's genOS adapter.

---

## What we use it for

- **Document extraction:** Upload a PDF or image (passport, W-2, I-20, travel history) and receive structured JSON with extracted fields.
- **Flow:** User uploads a file; the server converts it to base64 images, calls the Chat Completions API with a document-specific prompt and structured-output schema, then returns validated JSON.

---

## Technical implementation

| Item | Detail |
|------|--------|
| **Provider** | OpenAI (default) or any OpenAI-compatible endpoint (e.g. genOS adapter) |
| **API** | [Chat Completions API](https://platform.openai.com/docs/api-reference/chat) with vision input and `response_format: json_schema` |
| **Model** | Configurable via `OPENAI_EXTRACTION_MODEL` (default: `gpt-4o-mini`) |
| **Auth** | API key in env as `OPENAI_API_KEY` (not in source control) |
| **Where it runs** | Server-side only: `app/api/documents/extract/route.ts` and `extraction/openai.ts` |

---

## Configuration

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | Yes | API key for direct OpenAI, or any non-empty string when using genOS |
| `OPENAI_EXTRACTION_MODEL` | No | Model for extraction (default: `gpt-4o-mini`). For genOS vision, use the full genOS vision model ID (e.g. `gpt-4o-mini-2024-07-18-oai-vision`) |
| `OPENAI_BASE_URL` | No | Override the API base URL. Omit for direct OpenAI. Set to genOS adapter URL (e.g. `http://localhost:5000/v1`) to use genOS |

### Direct OpenAI (default)

```
OPENAI_API_KEY=sk-...
# OPENAI_BASE_URL omitted -- defaults to api.openai.com
# OPENAI_EXTRACTION_MODEL omitted -- defaults to gpt-4o-mini
```

### genOS adapter

```
OPENAI_API_KEY=anything
OPENAI_BASE_URL=http://localhost:5000/v1
OPENAI_EXTRACTION_MODEL=gpt-4o-mini-2024-07-18-oai-vision
```

> **Note:** genOS requires a `-vision` suffix on model IDs to enable image input. Standard model names (e.g. `gpt-4o-mini`) will reject image content. Set `OPENAI_EXTRACTION_MODEL` to the full genOS vision model ID.

---

## Security / ops notes

- **Server-side only:** The API key is never sent to the browser. All extraction runs in Next.js API routes and the `extraction/` module.
- **Key storage:** `OPENAI_API_KEY` lives in `.env`; `.env` is in `.gitignore`.
- **Auth:** The extract endpoint requires a valid session (same cookie/JWT pattern as other protected routes). Unauthenticated requests receive 401.
- **File limits:** The extract API accepts a single file per request, max 20 MB, PDF and image MIME types only.
- **No file uploads to OpenAI:** Files are converted to base64 images locally and sent inline. No data is stored on OpenAI's servers.

---

One-line summary for tickets:  
*"We use the OpenAI Chat Completions API (key in `.env`) from server-side code to extract structured JSON from uploaded passport, W-2, I-20, and travel history documents via vision input."*
