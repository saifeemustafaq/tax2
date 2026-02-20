#!/usr/bin/env node
/**
 * Test Gemini API key. Loads GEMINI_API_KEY from .env in the project root.
 * Usage: node scripts/test-openai-key.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env');

if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    if (key) process.env[key] = value;
  }
}

const key = process.env.GEMINI_API_KEY;

if (!key) {
  console.error('Error: GEMINI_API_KEY is not set.');
  console.error('Add GEMINI_API_KEY=your-key to the .env file in the project root.');
  process.exit(1);
}

const TEST_PROMPT = 'Reply in one short sentence: confirm that you received this message and the API is working.';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function parseErrorBody(body) {
  try {
    const j = JSON.parse(body);
    return j.error?.message || j.error?.status || body;
  } catch (_) {
    return body;
  }
}

async function testKey() {
  const modelsUrl = `${GEMINI_BASE}/models`;
  const res = await fetch(modelsUrl, {
    headers: { 'x-goog-api-key': key },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('API key test failed.');
    console.error('Status:', res.status, res.statusText);
    console.error('Message:', parseErrorBody(body));
    process.exit(1);
  }

  const data = await res.json();
  const models = data.models ?? [];
  const count = models.length;
  console.log('API key is valid. You have access to', count, 'model(s).');
  if (count > 0) {
    const names = models.slice(0, 3).map((m) => (m.name || '').replace(/^models\//, '')).join(', ');
    console.log('Examples:', names + (count > 3 ? '...' : ''));
  }

  console.log('\n--- Prompt test ---');
  console.log('Prompt:', TEST_PROMPT);

  const generateUrl = `${GEMINI_BASE}/models/gemini-1.5-flash:generateContent`;
  const chatRes = await fetch(generateUrl, {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: TEST_PROMPT }] }],
      generationConfig: { maxOutputTokens: 150 },
    }),
  });

  if (!chatRes.ok) {
    const body = await chatRes.text();
    console.error('Chat request failed.');
    console.error('Status:', chatRes.status, chatRes.statusText);
    console.error('Message:', parseErrorBody(body));
    process.exit(1);
  }

  const chatData = await chatRes.json();
  const textPart = chatData.candidates?.[0]?.content?.parts?.[0];
  const reply = textPart?.text?.trim();
  if (reply) {
    console.log('Response:', reply);
  } else {
    console.error('No reply in response:', JSON.stringify(chatData, null, 2));
    process.exit(1);
  }

  console.log('\nAll tests passed.');
}

testKey().catch((err) => {
  console.error('Request failed:', err.message);
  process.exit(1);
});
