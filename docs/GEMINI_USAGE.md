# How This Application Uses Gemini

**Summary for IT / Security:** This app uses **Google’s Gemini API** (Generative Language API) for development and testing. We call it via **REST** from a Node script; the key is stored in `.env` and never committed.

---

## What we use it for

- **Validating the Gemini API key** so the team can confirm `GEMINI_API_KEY` is correct before building features that will call an LLM.
- **Testing a simple text prompt** against the `gemini-1.5-flash` model to ensure the key has access and the API responds.

This is implemented in a **standalone script** (`scripts/test-openai-key.mjs`), not in the main web app at runtime. The script is run manually (e.g. `node scripts/test-openai-key.mjs`).

---

## Technical implementation

| Item | Detail |
|------|--------|
| **Provider** | Google (Generative Language API) |
| **Base URL** | `https://generativelanguage.googleapis.com/v1beta` |
| **Model** | `gemini-1.5-flash` |
| **Auth** | API key in header `x-goog-api-key` |
| **Config** | Key read from `.env` as `GEMINI_API_KEY` (not in source control) |
| **Client** | Native `fetch()` — no Gemini SDK dependency |

We do **two** calls:

1. **List models** — `GET .../models` — to verify the key is valid.
2. **Generate content** — `POST .../models/gemini-1.5-flash:generateContent` — to send a short test prompt and confirm we get a text response.

---

## Code snippet: how we call Gemini

The script sends a small prompt and reads the first text part from the response:

```javascript
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const key = process.env.GEMINI_API_KEY;  // from .env

// 1) Validate key by listing models
const modelsRes = await fetch(`${GEMINI_BASE}/models`, {
  headers: { 'x-goog-api-key': key },
});

// 2) Send a test prompt to gemini-1.5-flash
const generateUrl = `${GEMINI_BASE}/models/gemini-1.5-flash:generateContent`;
const chatRes = await fetch(generateUrl, {
  method: 'POST',
  headers: {
    'x-goog-api-key': key,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'Reply in one short sentence: confirm that you received this message.' }] }],
    generationConfig: { maxOutputTokens: 150 },
  }),
});

const chatData = await chatRes.json();
const reply = chatData.candidates?.[0]?.content?.parts?.[0]?.text;
```

So in practice: **we only call Gemini’s REST API from a local/dev script to check the API key and that the model responds.** The key is kept in `.env` and is not used in the browser or in committed code.

---

## Security / ops notes

- **No SDK:** We use the public REST API only; no extra Google client libraries.
- **Key storage:** `GEMINI_API_KEY` lives in `.env` in the project root; `.env` is in `.gitignore`.
- **Outbound only:** The script makes HTTPS requests to `generativelanguage.googleapis.com`; no inbound exposure.
- **Scope today:** Script-only; the main Next.js app does not call Gemini in production paths yet. Any future in-app LLM features may use this key (or another approved mechanism) behind server-side API routes.

If you need a one-line summary for a ticket or form:  
*“We use Google’s Gemini API (REST, key in .env) from a Node script to validate the API key and test the gemini-1.5-flash model; the key is not committed and is not used in the browser.”*
