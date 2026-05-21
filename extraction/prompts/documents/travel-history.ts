import { z } from "zod";

const recordSchema = z.object({
  date: z.string(),
  type: z.string(),
  location: z.string(),
});

export const travelHistorySchema = z.object({
  document_number: z.string(),
  document_country_of_issuance: z.string(),
  records: z.array(recordSchema),
});

export type TravelHistoryExtraction = z.infer<typeof travelHistorySchema>;

export const travelHistoryPrompt = `Extract the I-94 travel history document into the exact JSON structure requested. Extract the document number and country of issuance from the header. Extract all rows from the travel history table as records, each with date (YYYY-MM-DD format), type (e.g. "Arrival" or "Departure"), and location (port code, e.g. "SFR"). Use "" for missing string fields and an empty array for records if no rows are present. Return only valid JSON matching the schema.`;

export const travelHistoryJsonSchema = {
  type: "object" as const,
  properties: {
    document_number: { type: "string", description: "Document number (e.g. W9209895)" },
    document_country_of_issuance: { type: "string", description: "Country of issuance (e.g. India)" },
    records: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          type: { type: "string", description: "Arrival or Departure" },
          location: { type: "string", description: "Port code (e.g. SFR)" },
        },
        required: ["date", "type", "location"],
        additionalProperties: false,
      },
    },
  },
  required: ["document_number", "document_country_of_issuance", "records"],
  additionalProperties: false,
};
