import type { z } from "zod";
import { passportSchema, passportPrompt, passportJsonSchema } from "./documents/passport";
import { i20Schema, i20Prompt, i20JsonSchema } from "./documents/i20";
import { w2Schema, w2Prompt, w2JsonSchema } from "./forms/w2";
import { travelHistorySchema, travelHistoryPrompt, travelHistoryJsonSchema } from "./documents/travel-history";

export type { PassportExtraction } from "./documents/passport";
export type { I20Extraction } from "./documents/i20";
export type { W2Extraction } from "./forms/w2";
export type { TravelHistoryExtraction } from "./documents/travel-history";

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
  i20: {
    prompt: i20Prompt,
    schema: i20Schema,
    jsonSchema: i20JsonSchema,
  },
  w2: {
    prompt: w2Prompt,
    schema: w2Schema,
    jsonSchema: w2JsonSchema,
  },
  "travel-history": {
    prompt: travelHistoryPrompt,
    schema: travelHistorySchema,
    jsonSchema: travelHistoryJsonSchema,
  },
};

export const SUPPORTED_DOCUMENT_TYPES = ["passport", "i20", "w2", "travel-history"] as const;
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
