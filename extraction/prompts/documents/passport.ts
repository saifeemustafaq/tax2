import { z } from "zod";

export const passportSchema = z.object({
  documentNumber: z.string().describe("Passport document number"),
  fullName: z.string().describe("Full name as shown on the passport"),
  nationality: z.string().describe("Nationality / country of citizenship"),
  dateOfBirth: z.string().describe("Date of birth (YYYY-MM-DD if possible)"),
  placeOfBirth: z.string().optional().describe("Place of birth"),
  sex: z.string().optional().describe("Sex / gender as shown"),
  dateOfIssue: z.string().optional().describe("Date of issue (YYYY-MM-DD if possible)"),
  dateOfExpiry: z.string().describe("Date of expiry (YYYY-MM-DD if possible)"),
  issuingAuthority: z.string().optional().describe("Issuing authority / country"),
  mrzLine1: z.string().optional().describe("MRZ line 1 if visible"),
  mrzLine2: z.string().optional().describe("MRZ line 2 if visible"),
});

export type PassportExtraction = z.infer<typeof passportSchema>;

export const passportPrompt = `Extract the following fields from this passport image or PDF. Return only valid JSON matching the schema. Use empty string for fields you cannot read. For dates use YYYY-MM-DD when possible, otherwise the exact text as shown.`;

export const passportJsonSchema = {
  type: "object" as const,
  properties: {
    documentNumber: { type: "string", description: "Passport document number" },
    fullName: { type: "string", description: "Full name as shown on the passport" },
    nationality: { type: "string", description: "Nationality / country of citizenship" },
    dateOfBirth: { type: "string", description: "Date of birth (YYYY-MM-DD if possible)" },
    placeOfBirth: { type: "string", description: "Place of birth" },
    sex: { type: "string", description: "Sex / gender as shown" },
    dateOfIssue: { type: "string", description: "Date of issue (YYYY-MM-DD if possible)" },
    dateOfExpiry: { type: "string", description: "Date of expiry (YYYY-MM-DD if possible)" },
    issuingAuthority: { type: "string", description: "Issuing authority / country" },
    mrzLine1: { type: "string", description: "MRZ line 1 if visible" },
    mrzLine2: { type: "string", description: "MRZ line 2 if visible" },
  },
  required: ["documentNumber", "fullName", "nationality", "dateOfBirth", "dateOfExpiry"],
  additionalProperties: false,
};
