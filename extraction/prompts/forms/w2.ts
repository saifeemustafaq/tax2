import { z } from "zod";

const employerSchema = z.object({
  name: z.string(),
  ein: z.string(),
  address: z.string(),
});

const employeeSchema = z.object({
  ssn: z.string(),
  name: z.string(),
  address: z.string(),
});

const box12EntrySchema = z.object({
  code: z.string(),
  amount: z.string(),
});

const box13Schema = z.object({
  statutory_employee: z.boolean(),
  retirement_plan: z.boolean(),
  third_party_sick_pay: z.boolean(),
});

const stateLocalEntrySchema = z.object({
  state: z.string(),
  employer_state_id: z.string(),
  state_wages: z.string(),
  state_income_tax: z.string(),
  local_wages: z.string(),
  local_income_tax: z.string(),
  locality_name: z.string(),
});

const sourceSchema = z.object({
  file_name: z.string(),
  pages_included: z.array(z.number()),
});

export const w2Schema = z.object({
  employer: employerSchema,
  employee: employeeSchema,
  control_number: z.string(),
  wages_tips_other: z.string(),
  federal_income_tax_withheld: z.string(),
  social_security_wages: z.string(),
  social_security_tax_withheld: z.string(),
  medicare_wages_and_tips: z.string(),
  medicare_tax_withheld: z.string(),
  social_security_tips: z.string(),
  allocated_tips: z.string(),
  dependent_care_benefits: z.string(),
  nonqualified_plans: z.string(),
  box_12: z.array(box12EntrySchema),
  box_13: box13Schema,
  box_14: z.string(),
  state_local: z.array(stateLocalEntrySchema),
  tax_year: z.string(),
  source: sourceSchema.optional(),
});

export type W2Extraction = z.infer<typeof w2Schema>;

export const w2Prompt = `Extract all visible fields from this W-2 Wage and Tax Statement image or PDF into the exact JSON structure requested. Use empty string "" for any text field you cannot read or that is not present. For dollar amounts use the exact value shown on the form as a string (e.g. "45000.00") or "" if not present. For Box 12a-d extract each coded entry as an object with "code" (the letter code, e.g. "D", "DD", "W") and "amount" (dollar value as string); use an empty array [] if no Box 12 entries are present. For Box 13 set each checkbox to true if checked, false otherwise. For Box 14 (Other) concatenate all entries into a single string or use "" if empty. For state_local (Boxes 15-20) extract each state/local row as an object in the array; use an empty array [] if no state/local information is present. For source include file_name and pages_included when available; omit if not applicable. Return only valid JSON matching the schema.`;

const stringProp = (desc: string) => ({ type: "string" as const, description: desc });
const boolProp = (desc: string) => ({ type: "boolean" as const, description: desc });

export const w2JsonSchema = {
  type: "object" as const,
  properties: {
    employer: {
      type: "object" as const,
      properties: {
        name: stringProp("Employer's name (Box c)"),
        ein: stringProp("Employer identification number (Box b)"),
        address: stringProp("Employer's address, city, state, ZIP (Box c)"),
      },
      required: ["name", "ein", "address"],
      additionalProperties: false,
    },
    employee: {
      type: "object" as const,
      properties: {
        ssn: stringProp("Employee's social security number (Box a)"),
        name: stringProp("Employee's name (Box e)"),
        address: stringProp("Employee's address, city, state, ZIP (Box f)"),
      },
      required: ["ssn", "name", "address"],
      additionalProperties: false,
    },
    control_number: stringProp("Control number (Box d)"),
    wages_tips_other: stringProp("Wages, tips, other compensation (Box 1)"),
    federal_income_tax_withheld: stringProp("Federal income tax withheld (Box 2)"),
    social_security_wages: stringProp("Social security wages (Box 3)"),
    social_security_tax_withheld: stringProp("Social security tax withheld (Box 4)"),
    medicare_wages_and_tips: stringProp("Medicare wages and tips (Box 5)"),
    medicare_tax_withheld: stringProp("Medicare tax withheld (Box 6)"),
    social_security_tips: stringProp("Social security tips (Box 7)"),
    allocated_tips: stringProp("Allocated tips (Box 8)"),
    dependent_care_benefits: stringProp("Dependent care benefits (Box 10)"),
    nonqualified_plans: stringProp("Nonqualified plans (Box 11)"),
    box_12: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          code: stringProp("Box 12 letter code (e.g. D, DD, W)"),
          amount: stringProp("Dollar amount for this code"),
        },
        required: ["code", "amount"],
        additionalProperties: false,
      },
    },
    box_13: {
      type: "object" as const,
      properties: {
        statutory_employee: boolProp("Statutory employee checkbox (Box 13)"),
        retirement_plan: boolProp("Retirement plan checkbox (Box 13)"),
        third_party_sick_pay: boolProp("Third-party sick pay checkbox (Box 13)"),
      },
      required: ["statutory_employee", "retirement_plan", "third_party_sick_pay"],
      additionalProperties: false,
    },
    box_14: stringProp("Other (Box 14) free-form text"),
    state_local: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          state: stringProp("State abbreviation (Box 15)"),
          employer_state_id: stringProp("Employer's state ID number (Box 15)"),
          state_wages: stringProp("State wages, tips, etc. (Box 16)"),
          state_income_tax: stringProp("State income tax (Box 17)"),
          local_wages: stringProp("Local wages, tips, etc. (Box 18)"),
          local_income_tax: stringProp("Local income tax (Box 19)"),
          locality_name: stringProp("Locality name (Box 20)"),
        },
        required: [
          "state",
          "employer_state_id",
          "state_wages",
          "state_income_tax",
          "local_wages",
          "local_income_tax",
          "locality_name",
        ],
        additionalProperties: false,
      },
    },
    tax_year: stringProp("Tax year (e.g. 2024)"),
    source: {
      type: "object" as const,
      properties: {
        file_name: stringProp("Original file name"),
        pages_included: { type: "array" as const, items: { type: "number" as const } },
      },
      required: ["file_name", "pages_included"],
      additionalProperties: false,
    },
  },
  required: [
    "employer",
    "employee",
    "control_number",
    "wages_tips_other",
    "federal_income_tax_withheld",
    "social_security_wages",
    "social_security_tax_withheld",
    "medicare_wages_and_tips",
    "medicare_tax_withheld",
    "social_security_tips",
    "allocated_tips",
    "dependent_care_benefits",
    "nonqualified_plans",
    "box_12",
    "box_13",
    "box_14",
    "state_local",
    "tax_year",
    "source",
  ],
  additionalProperties: false,
};
