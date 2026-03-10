import OpenAI from "openai";
import {
  getDocumentPromptConfig,
  isSupportedDocumentType,
  type SupportedDocumentType,
} from "@/extraction/prompts";
import { sanitizeW2, type W2Extraction } from "@/extraction/prompts/forms/w2";

const DEFAULT_MODEL = "gpt-4o-mini";

function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      "OPENAI_API_KEY is not set. Document extraction requires an OpenAI API key.",
    );
  }
  return new OpenAI({ apiKey: key });
}

function getModel(): string {
  return process.env.OPENAI_EXTRACTION_MODEL?.trim() || DEFAULT_MODEL;
}

export async function uploadFile(
  file: File | Blob | Buffer,
  filename: string,
  mimeType?: string,
): Promise<string> {
  const client = getClient();
  const uploadable =
    file instanceof Buffer
      ? new File([new Uint8Array(file)], filename, {
          type: mimeType ?? "application/octet-stream",
        })
      : file instanceof Blob && !(file instanceof File)
        ? new File([file], filename, {
            type: (mimeType ?? file.type) || "application/octet-stream",
          })
        : file;
  const created = await client.files.create({
    file: uploadable as File,
    purpose: "user_data",
  });
  return created.id;
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "missing_key"
      | "unsupported_type"
      | "parse"
      | "validation"
      | "api",
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

export async function extractDocument(
  documentType: string,
  file: File | Blob | Buffer,
  filename?: string,
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

  const name = filename ?? (file instanceof File ? file.name : "document");
  const fileId = await uploadFile(
    file,
    name,
    file instanceof Blob ? file.type : undefined,
  );

  const prompt = config.prompt;
  const jsonSchema = config.jsonSchema;

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_file", file_id: fileId },
          { type: "input_text", text: prompt },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: `extract_${documentType}`,
        schema: jsonSchema as Record<string, unknown>,
        strict: true,
      },
    },
  });

  const outputText = response.output_text?.trim();
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

export type { SupportedDocumentType };
