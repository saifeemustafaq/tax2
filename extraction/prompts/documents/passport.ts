import { z } from "zod";

const mrzCheckDigitsSchema = z.object({
  passport_number: z.string(),
  date_of_birth: z.string(),
  date_of_expiry: z.string(),
  personal_number: z.string(),
  composite: z.string(),
});

const mrzParsedSchema = z.object({
  document_code: z.string(),
  issuing_state: z.string(),
  primary_identifier: z.string(),
  secondary_identifiers: z.string(),
  passport_number: z.string(),
  nationality: z.string(),
  date_of_birth: z.string(),
  sex: z.string(),
  date_of_expiry: z.string(),
  personal_number: z.string(),
  check_digits: mrzCheckDigitsSchema,
});

const mrzSchema = z.object({
  line1: z.string(),
  line2: z.string(),
  parsed: mrzParsedSchema,
});

const photoSchema = z.object({
  present: z.boolean(),
  image_ref: z.string(),
});

const signatureSchema = z.object({
  present: z.boolean(),
  image_ref: z.string(),
});

const parentsSchema = z.object({
  father_or_legal_guardian_name: z.string(),
  mother_name: z.string(),
});

const spouseSchema = z.object({
  name: z.string(),
});

const addressSchema = z.object({
  address_line1: z.string(),
  address_line2: z.string(),
  city_or_district: z.string(),
  state: z.string(),
  postal_code: z.string(),
  country: z.string(),
});

const oldPassportSchema = z.object({
  passport_number: z.string(),
  date_of_issue: z.string(),
  place_of_issue: z.string(),
});

const sourceSchema = z.object({
  file_name: z.string(),
  pages_included: z.array(z.number()),
});

export const passportSchema = z.object({
  document_type: z.string(),
  issuing_country: z.string(),
  passport_type: z.string(),
  country_code: z.string(),
  passport_number: z.string(),
  surname: z.string(),
  given_names: z.string(),
  nationality: z.string(),
  sex: z.string(),
  date_of_birth: z.string(),
  place_of_birth: z.string(),
  place_of_issue: z.string(),
  date_of_issue: z.string(),
  date_of_expiry: z.string(),
  photo: photoSchema,
  signature: signatureSchema,
  mrz: mrzSchema.optional(),
  parents: parentsSchema.optional(),
  spouse: spouseSchema.optional(),
  address: addressSchema.optional(),
  old_passport: oldPassportSchema.optional(),
  file_number: z.string().optional(),
  raw_fields: z
    .object({
      all_visible_text_blocks: z.array(z.string()),
      page_map: z.record(z.string(), z.array(z.string())),
    })
    .optional(),
  source: sourceSchema.optional(),
});

export type PassportExtraction = z.infer<typeof passportSchema>;

export const passportPrompt = `Extract all visible passport fields from this passport image or PDF into the exact JSON structure requested. Use empty string "" for any field you cannot read or that is not present. For dates use YYYY-MM-DD when possible. For photo and signature set "present" to true if you can see a photo/signature on the document, and use "" for image_ref (image references are not extracted). Fill MRZ (mrz) line1 and line2 if the machine-readable zone is visible, and parse into mrz.parsed when possible; use "" for any MRZ subfield not available. For mrz, parents, spouse, address, old_passport, and source: always include these objects; use "" for every subfield when the section is not visible. For file_number use "" when not present. Return only valid JSON matching the schema.`;

export const passportJsonSchema = {
  type: "object" as const,
  properties: {
    document_type: { type: "string", description: "Document type e.g. P" },
    issuing_country: { type: "string", description: "Issuing country name or code" },
    passport_type: { type: "string", description: "Passport type" },
    country_code: { type: "string", description: "Country code" },
    passport_number: { type: "string", description: "Passport number" },
    surname: { type: "string", description: "Surname / family name" },
    given_names: { type: "string", description: "Given names" },
    nationality: { type: "string", description: "Nationality" },
    sex: { type: "string", description: "Sex / gender" },
    date_of_birth: { type: "string", description: "Date of birth YYYY-MM-DD" },
    place_of_birth: { type: "string", description: "Place of birth" },
    place_of_issue: { type: "string", description: "Place of issue" },
    date_of_issue: { type: "string", description: "Date of issue YYYY-MM-DD" },
    date_of_expiry: { type: "string", description: "Date of expiry YYYY-MM-DD" },
    photo: {
      type: "object",
      properties: {
        present: { type: "boolean" },
        image_ref: { type: "string" },
      },
      required: ["present", "image_ref"],
      additionalProperties: false,
    },
    signature: {
      type: "object",
      properties: {
        present: { type: "boolean" },
        image_ref: { type: "string" },
      },
      required: ["present", "image_ref"],
      additionalProperties: false,
    },
    mrz: {
      type: "object",
      properties: {
        line1: { type: "string" },
        line2: { type: "string" },
        parsed: {
          type: "object",
          properties: {
            document_code: { type: "string" },
            issuing_state: { type: "string" },
            primary_identifier: { type: "string" },
            secondary_identifiers: { type: "string" },
            passport_number: { type: "string" },
            nationality: { type: "string" },
            date_of_birth: { type: "string" },
            sex: { type: "string" },
            date_of_expiry: { type: "string" },
            personal_number: { type: "string" },
            check_digits: {
              type: "object",
              properties: {
                passport_number: { type: "string" },
                date_of_birth: { type: "string" },
                date_of_expiry: { type: "string" },
                personal_number: { type: "string" },
                composite: { type: "string" },
              },
              required: [
                "passport_number",
                "date_of_birth",
                "date_of_expiry",
                "personal_number",
                "composite",
              ],
              additionalProperties: false,
            },
          },
          required: [
            "document_code",
            "issuing_state",
            "primary_identifier",
            "secondary_identifiers",
            "passport_number",
            "nationality",
            "date_of_birth",
            "sex",
            "date_of_expiry",
            "personal_number",
            "check_digits",
          ],
          additionalProperties: false,
        },
      },
      required: ["line1", "line2", "parsed"],
      additionalProperties: false,
    },
    parents: {
      type: "object",
      properties: {
        father_or_legal_guardian_name: { type: "string" },
        mother_name: { type: "string" },
      },
      required: ["father_or_legal_guardian_name", "mother_name"],
      additionalProperties: false,
    },
    spouse: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
      additionalProperties: false,
    },
    address: {
      type: "object",
      properties: {
        address_line1: { type: "string" },
        address_line2: { type: "string" },
        city_or_district: { type: "string" },
        state: { type: "string" },
        postal_code: { type: "string" },
        country: { type: "string" },
      },
      required: [
        "address_line1",
        "address_line2",
        "city_or_district",
        "state",
        "postal_code",
        "country",
      ],
      additionalProperties: false,
    },
    old_passport: {
      type: "object",
      properties: {
        passport_number: { type: "string" },
        date_of_issue: { type: "string" },
        place_of_issue: { type: "string" },
      },
      required: ["passport_number", "date_of_issue", "place_of_issue"],
      additionalProperties: false,
    },
    file_number: { type: "string" },
    source: {
      type: "object",
      properties: {
        file_name: { type: "string" },
        pages_included: { type: "array", items: { type: "number" } },
      },
      required: ["file_name", "pages_included"],
      additionalProperties: false,
    },
  },
  required: [
    "document_type",
    "issuing_country",
    "passport_type",
    "country_code",
    "passport_number",
    "surname",
    "given_names",
    "nationality",
    "sex",
    "date_of_birth",
    "place_of_birth",
    "place_of_issue",
    "date_of_issue",
    "date_of_expiry",
    "photo",
    "signature",
    "mrz",
    "parents",
    "spouse",
    "address",
    "old_passport",
    "file_number",
    "source",
  ],
  additionalProperties: false,
};
