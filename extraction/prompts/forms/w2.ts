import { z } from "zod";

export const w2Schema = z.object({
  employerName: z.string().describe("Employer's name"),
  employerEin: z.string().optional().describe("Employer's EIN"),
  employerAddress: z.string().optional().describe("Employer's address"),
  employeeSsn: z.string().optional().describe("Employee's SSN (mask if desired)"),
  employeeName: z.string().describe("Employee's name"),
  employeeAddress: z.string().optional().describe("Employee's address"),
  wagesTipsOther: z.number().optional().describe("Wages, tips, other compensation (Box 1)"),
  federalIncomeTaxWithheld: z.number().optional().describe("Federal income tax withheld (Box 2)"),
  socialSecurityWages: z.number().optional().describe("Social security wages (Box 3)"),
  socialSecurityTaxWithheld: z.number().optional().describe("Social security tax withheld (Box 4)"),
  medicareWagesAndTips: z.number().optional().describe("Medicare wages and tips (Box 5)"),
  medicareTaxWithheld: z.number().optional().describe("Medicare tax withheld (Box 6)"),
  socialSecurityTips: z.number().optional().describe("Social security tips (Box 7)"),
  allocatedTips: z.number().optional().describe("Allocated tips (Box 8)"),
  dependentCareBenefits: z.number().optional().describe("Dependent care benefits (Box 10)"),
  nonqualifiedPlans: z.number().optional().describe("Nonqualified plans (Box 11)"),
  taxYear: z.string().optional().describe("Tax year (e.g. 2024)"),
});

export type W2Extraction = z.infer<typeof w2Schema>;

export const w2Prompt = `Extract the following fields from this W-2 Wage and Tax Statement image or PDF. Return only valid JSON matching the schema. Use null or omit optional numeric fields if not present. Box numbers refer to the standard IRS W-2 form.`;

export const w2JsonSchema = {
  type: "object" as const,
  properties: {
    employerName: { type: "string", description: "Employer's name" },
    employerEin: { type: "string", description: "Employer's EIN" },
    employerAddress: { type: "string", description: "Employer's address" },
    employeeSsn: { type: "string", description: "Employee's SSN" },
    employeeName: { type: "string", description: "Employee's name" },
    employeeAddress: { type: "string", description: "Employee's address" },
    wagesTipsOther: { type: "number", description: "Wages, tips, other compensation (Box 1)" },
    federalIncomeTaxWithheld: { type: "number", description: "Federal income tax withheld (Box 2)" },
    socialSecurityWages: { type: "number", description: "Social security wages (Box 3)" },
    socialSecurityTaxWithheld: { type: "number", description: "Social security tax withheld (Box 4)" },
    medicareWagesAndTips: { type: "number", description: "Medicare wages and tips (Box 5)" },
    medicareTaxWithheld: { type: "number", description: "Medicare tax withheld (Box 6)" },
    socialSecurityTips: { type: "number", description: "Social security tips (Box 7)" },
    allocatedTips: { type: "number", description: "Allocated tips (Box 8)" },
    dependentCareBenefits: { type: "number", description: "Dependent care benefits (Box 10)" },
    nonqualifiedPlans: { type: "number", description: "Nonqualified plans (Box 11)" },
    taxYear: { type: "string", description: "Tax year" },
  },
  required: ["employerName", "employeeName"],
  additionalProperties: false,
};
