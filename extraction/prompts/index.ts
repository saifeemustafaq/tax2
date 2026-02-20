import type { z } from "zod";
import { passportSchema, passportPrompt, passportJsonSchema } from "./documents/passport";
import { w2Schema, w2Prompt, w2JsonSchema } from "./forms/w2";

export type { PassportExtraction } from "./documents/passport";
export type { W2Extraction } from "./forms/w2";

export interface DocumentPromptConfig<T = unknown> {
  prompt: string;
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
}

const registry: Record<string, DocumentPromptConfig> = {
  passport: {
    prompt: passportPrompt,
    schema: passportSchema,
    jsonSchema: passportJsonSchema,
  },
  w2: {
    prompt: w2Prompt,
    schema: w2Schema,
    jsonSchema: w2JsonSchema,
  },
};

export const SUPPORTED_DOCUMENT_TYPES = ["passport", "w2"] as const;
export type SupportedDocumentType = (typeof SUPPORTED_DOCUMENT_TYPES)[number];

export function getDocumentPromptConfig(
  documentType: string
): DocumentPromptConfig | null {
  return registry[documentType] ?? null;
}

export function isSupportedDocumentType(
  documentType: string
): documentType is SupportedDocumentType {
  return SUPPORTED_DOCUMENT_TYPES.includes(documentType as SupportedDocumentType);
}
