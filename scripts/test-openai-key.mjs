#!/usr/bin/env node
/**
 * Test OpenAI API key. Loads OPENAI_API_KEY from .env in the project root.
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

const key = process.env.OPENAI_API_KEY;

if (!key) {
  console.error('Error: OPENAI_API_KEY is not set.');
  console.error('Add OPENAI_API_KEY=your-key to the .env file in the project root.');
  process.exit(1);
}

const model = process.env.OPENAI_EXTRACTION_MODEL || 'gpt-4o-mini';
const TEST_PROMPT = 'Reply in one short sentence: confirm that you received this message and the API is working.';
const OPENAI_BASE = 'https://api.openai.com/v1';

function parseErrorBody(body) {
  try {
    const j = JSON.parse(body);
    return j.error?.message || j.error?.type || body;
  } catch (_) {
    return body;
  }
}

async function testKey() {
  // 1. Validate key by listing models
  const modelsUrl = `${OPENAI_BASE}/models`;
  const res = await fetch(modelsUrl, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('API key validation failed.');
    console.error('Status:', res.status, res.statusText);
    console.error('Message:', parseErrorBody(body));
    process.exit(1);
  }

  const data = await res.json();
  const models = data.data ?? [];
  const count = models.length;
  console.log('API key is valid. You have access to', count, 'model(s).');
  if (count > 0) {
    const names = models.slice(0, 5).map((m) => m.id).join(', ');
    console.log('Examples:', names + (count > 5 ? '...' : ''));
  }

  // 2. Test a chat completion
  console.log('\n--- Prompt test ---');
  console.log('Model:', model);
  console.log('Prompt:', TEST_PROMPT);

  const chatUrl = `${OPENAI_BASE}/chat/completions`;
  const chatRes = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: TEST_PROMPT }],
      max_tokens: 150,
    }),
  });

  if (!chatRes.ok) {
    const body = await chatRes.text();
    console.error('Chat completion failed.');
    console.error('Status:', chatRes.status, chatRes.statusText);
    console.error('Message:', parseErrorBody(body));
    process.exit(1);
  }

  const chatData = await chatRes.json();
  const reply = chatData.choices?.[0]?.message?.content?.trim();
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
