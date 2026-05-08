import OpenAI from "openai";
import {
  getDocumentPromptConfig,
  isSupportedDocumentType,
  type SupportedDocumentType,
} from "@/extraction/prompts";
import { sanitizeW2, type W2Extraction } from "@/extraction/prompts/forms/w2";
import { ExtractionError } from "@/extraction/errors";
import { fileToBase64Images } from "@/extraction/pdf-to-images";

const DEFAULT_MODEL = "gpt-4o-mini";

function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      "OPENAI_API_KEY is not set. Document extraction requires an OpenAI API key.",
    );
  }
  return new OpenAI({
    apiKey: key,
    baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
    maxRetries: 3,
    timeout: 120_000, // Increased from 60s: vision processing is slower for multi-page docs
  });
}

function getModel(): string {
  return process.env.OPENAI_EXTRACTION_MODEL?.trim() || DEFAULT_MODEL;
}

export async function extractDocument(
  documentType: string,
  file: File | Blob | Buffer,
  _filename?: string,
): Promise<unknown> {
  if (!isSupportedDocumentType(documentType)) {
    throw new ExtractionError(
      `Unsupported document type: ${documentType}. Supported: passport, w2.`,
      "unsupported_type",
    );
  }

  const config = getDocumentPromptConfig(documentType);
  if (!config) {
    throw new ExtractionError(
      `No prompt config for document type: ${documentType}.`,
      "unsupported_type",
    );
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new ExtractionError("OPENAI_API_KEY is not set.", "missing_key");
  }

  const client = getClient();
  const model = getModel();

  const mimeHint =
    file instanceof File
      ? file.type
      : file instanceof Blob
        ? file.type
        : undefined;

  let images: Awaited<ReturnType<typeof fileToBase64Images>>;
  try {
    images = await fileToBase64Images(file, mimeHint);
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError(
      "Could not reach the extraction service. Check your network and try again.",
      "api",
    );
  }

  const content: OpenAI.Chat.ChatCompletionContentPart[] = [
    ...images.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
        detail: "high" as const,
      },
    })),
    { type: "text" as const, text: config.prompt },
  ];

  let response: OpenAI.Chat.ChatCompletion;
  try {
    response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: `extract_${documentType}`,
          schema: config.jsonSchema as Record<string, unknown>,
          strict: true,
        },
      },
      // max_tokens is a ceiling, not an expectation. Actual output ranges from
      // ~200 tokens (travel-history) to ~1500 tokens (I-20). 4096 provides safe
      // headroom for all document types without risking truncation.
      max_tokens: 4096,
    });
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError(
      "Could not reach the extraction service. Check your network and try again.",
      "api",
    );
  }

  const outputText = response.choices[0]?.message?.content?.trim();
  if (!outputText) {
    throw new ExtractionError("No output text in API response.", "api");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new ExtractionError("Failed to parse API response as JSON.", "parse");
  }

  const result = config.schema.safeParse(parsed);
  if (!result.success) {
    throw new ExtractionError(
      `Validation failed: ${result.error.message}`,
      "validation",
    );
  }

  if (documentType === "w2") {
    return sanitizeW2(result.data as W2Extraction);
  }

  return result.data;
}

// Re-export ExtractionError so existing callers importing from this module are unaffected
export { ExtractionError };
export type { SupportedDocumentType };
