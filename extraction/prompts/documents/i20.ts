import { z } from "zod";

const studentSchema = z.object({
  surname_primary_name: z.string(),
  given_name: z.string(),
  preferred_name: z.string(),
  passport_name: z.string(),
  country_of_birth: z.string(),
  city_of_birth: z.string(),
  country_of_citizenship: z.string(),
  date_of_birth: z.string(),
  admission_number: z.string(),
  form_issue_reason: z.string(),
});

const schoolOfficialContactSchema = z.object({
  name: z.string(),
  title: z.string(),
});

const schoolInformationSchema = z.object({
  school_name: z.string(),
  school_address: z.string(),
  school_official_contact: schoolOfficialContactSchema,
  school_code: z.string(),
  school_approval_date: z.string(),
});

const majorSchema = z.object({
  name: z.string(),
  cip_code: z.string(),
});

const programOfStudySchema = z.object({
  education_level: z.string(),
  major_1: majorSchema,
  major_2: majorSchema,
  program_english_proficiency: z.string(),
  english_proficiency_notes: z.string(),
  earliest_admission_date: z.string(),
  start_of_classes: z.string(),
  program_start_date: z.string(),
  program_end_date: z.string(),
});

const expensesOfDependentsSchema = z.object({
  count: z.number(),
  amount: z.string(),
});

const estimatedAverageCostsSchema = z.object({
  tuition_and_fees: z.string(),
  living_expenses: z.string(),
  expenses_of_dependents: expensesOfDependentsSchema,
  health_insurance_books_supplies: z.string(),
  total: z.string(),
});

const studentsFundingSchema = z.object({
  personal_funds: z.string(),
  funds_from_this_school: z.string(),
  family_funds: z.string(),
  on_campus_employment: z.string(),
  total: z.string(),
});

const financialsSchema = z.object({
  period_months: z.number(),
  estimated_average_costs: estimatedAverageCostsSchema,
  students_funding: studentsFundingSchema,
});

const schoolAttestationSchema = z.object({
  dso_signature_present: z.boolean(),
  signature_of_name: z.string(),
  signature_of_title: z.string(),
  date_issued: z.string(),
  place_issued: z.string(),
});

const parentOrGuardianSchema = z.object({
  name: z.string(),
  signature_present: z.boolean(),
  address: z.string(),
  date: z.string(),
});

const studentAttestationSchema = z.object({
  student_signature_present: z.boolean(),
  signature_of_name: z.string(),
  date: z.string(),
  parent_or_guardian: parentOrGuardianSchema,
});

const currentSessionDatesSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
});

const travelEndorsementSchema = z.object({
  designated_school_official: z.string(),
  title: z.string(),
  signature_present: z.boolean(),
  date_issued: z.string(),
  place_issued: z.string(),
});

const page2Schema = z.object({
  employment_authorizations: z.string(),
  change_of_status_cap_gap_extension: z.string(),
  authorized_reduced_course_load: z.string(),
  current_session_dates: currentSessionDatesSchema,
  travel_endorsements: z.array(travelEndorsementSchema),
});

const formMetaSchema = z.object({
  form_name: z.string(),
  omb_number: z.string(),
  edition_date: z.string(),
});

export const i20Schema = z.object({
  sevis_id: z.string(),
  class_of_admission: z.string(),
  student: studentSchema,
  school_information: schoolInformationSchema,
  program_of_study: programOfStudySchema,
  financials: financialsSchema,
  remarks: z.string(),
  school_attestation: schoolAttestationSchema,
  student_attestation: studentAttestationSchema,
  page_2: page2Schema,
  form_meta: formMetaSchema,
});

export type I20Extraction = z.infer<typeof i20Schema>;

export const i20Prompt = `Extract all visible fields from this Form I-20 (Certificate of Eligibility for Nonimmigrant Student Status) image or PDF, pages 1 and 2. Use empty string "" for any text field you cannot read or that is not present. For dates use YYYY-MM-DD when possible. For monetary amounts use the exact value or "" if missing. For period_months use the number from the form (e.g. 12) or 12 if not specified. For expenses_of_dependents use count 0 and amount "" when there are no dependents. For travel_endorsements extract each endorsement row as an object in the array; use an empty array [] if there are no travel endorsements on page 2. For signature_present and dso_signature_present set true if a signature is visible, false otherwise. Include form_meta with form_name "I-20, Certificate of Eligibility for Nonimmigrant Student Status", omb_number "1653-0038", and edition_date from the form or "11/30/2025". Return only valid JSON matching the schema.`;

const stringProp = (desc: string) => ({ type: "string" as const, description: desc });
const numProp = (desc: string) => ({ type: "number" as const, description: desc });
const boolProp = (desc: string) => ({ type: "boolean" as const, description: desc });

export const i20JsonSchema = {
  type: "object" as const,
  properties: {
    sevis_id: stringProp("SEVIS identification number"),
    class_of_admission: stringProp("Class of admission code"),
    student: {
      type: "object" as const,
      properties: {
        surname_primary_name: stringProp("Family name / surname"),
        given_name: stringProp("Given name"),
        preferred_name: stringProp("Preferred name if any"),
        passport_name: stringProp("Name as on passport"),
        country_of_birth: stringProp("Country of birth"),
        city_of_birth: stringProp("City of birth"),
        country_of_citizenship: stringProp("Country of citizenship"),
        date_of_birth: stringProp("Date of birth YYYY-MM-DD"),
        admission_number: stringProp("Admission number / I-94 number"),
        form_issue_reason: stringProp("Reason form was issued"),
      },
      required: [
        "surname_primary_name",
        "given_name",
        "preferred_name",
        "passport_name",
        "country_of_birth",
        "city_of_birth",
        "country_of_citizenship",
        "date_of_birth",
        "admission_number",
        "form_issue_reason",
      ],
      additionalProperties: false,
    },
    school_information: {
      type: "object" as const,
      properties: {
        school_name: stringProp("Name of school"),
        school_address: stringProp("School address"),
        school_official_contact: {
          type: "object" as const,
          properties: {
            name: stringProp("DSO or official name"),
            title: stringProp("Title"),
          },
          required: ["name", "title"],
          additionalProperties: false,
        },
        school_code: stringProp("School code"),
        school_approval_date: stringProp("School approval date"),
      },
      required: ["school_name", "school_address", "school_official_contact", "school_code", "school_approval_date"],
      additionalProperties: false,
    },
    program_of_study: {
      type: "object" as const,
      properties: {
        education_level: stringProp("Level of education"),
        major_1: {
          type: "object" as const,
          properties: {
            name: stringProp("Primary major name"),
            cip_code: stringProp("CIP code"),
          },
          required: ["name", "cip_code"],
          additionalProperties: false,
        },
        major_2: {
          type: "object" as const,
          properties: {
            name: stringProp("Secondary major name if any"),
            cip_code: stringProp("CIP code"),
          },
          required: ["name", "cip_code"],
          additionalProperties: false,
        },
        program_english_proficiency: stringProp("English proficiency for program"),
        english_proficiency_notes: stringProp("Notes on English proficiency"),
        earliest_admission_date: stringProp("Earliest admission date"),
        start_of_classes: stringProp("Start of classes date"),
        program_start_date: stringProp("Program start date"),
        program_end_date: stringProp("Program end date"),
      },
      required: [
        "education_level",
        "major_1",
        "major_2",
        "program_english_proficiency",
        "english_proficiency_notes",
        "earliest_admission_date",
        "start_of_classes",
        "program_start_date",
        "program_end_date",
      ],
      additionalProperties: false,
    },
    financials: {
      type: "object" as const,
      properties: {
        period_months: numProp("Period in months (e.g. 12)"),
        estimated_average_costs: {
          type: "object" as const,
          properties: {
            tuition_and_fees: stringProp("Tuition and fees amount"),
            living_expenses: stringProp("Living expenses amount"),
            expenses_of_dependents: {
              type: "object" as const,
              properties: {
                count: numProp("Number of dependents"),
                amount: stringProp("Amount for dependents"),
              },
              required: ["count", "amount"],
              additionalProperties: false,
            },
            health_insurance_books_supplies: stringProp("Health insurance, books, supplies"),
            total: stringProp("Total estimated costs"),
          },
          required: [
            "tuition_and_fees",
            "living_expenses",
            "expenses_of_dependents",
            "health_insurance_books_supplies",
            "total",
          ],
          additionalProperties: false,
        },
        students_funding: {
          type: "object" as const,
          properties: {
            personal_funds: stringProp("Personal funds"),
            funds_from_this_school: stringProp("Funds from this school"),
            family_funds: stringProp("Funds from family"),
            on_campus_employment: stringProp("On-campus employment"),
            total: stringProp("Total funding"),
          },
          required: [
            "personal_funds",
            "funds_from_this_school",
            "family_funds",
            "on_campus_employment",
            "total",
          ],
          additionalProperties: false,
        },
      },
      required: ["period_months", "estimated_average_costs", "students_funding"],
      additionalProperties: false,
    },
    remarks: stringProp("Remarks if any"),
    school_attestation: {
      type: "object" as const,
      properties: {
        dso_signature_present: boolProp("DSO signature is present"),
        signature_of_name: stringProp("Signatory name"),
        signature_of_title: stringProp("Signatory title"),
        date_issued: stringProp("Date issued"),
        place_issued: stringProp("Place issued"),
      },
      required: ["dso_signature_present", "signature_of_name", "signature_of_title", "date_issued", "place_issued"],
      additionalProperties: false,
    },
    student_attestation: {
      type: "object" as const,
      properties: {
        student_signature_present: boolProp("Student signature is present"),
        signature_of_name: stringProp("Student name"),
        date: stringProp("Date signed"),
        parent_or_guardian: {
          type: "object" as const,
          properties: {
            name: stringProp("Parent or guardian name"),
            signature_present: boolProp("Parent/guardian signature present"),
            address: stringProp("Address"),
            date: stringProp("Date"),
          },
          required: ["name", "signature_present", "address", "date"],
          additionalProperties: false,
        },
      },
      required: ["student_signature_present", "signature_of_name", "date", "parent_or_guardian"],
      additionalProperties: false,
    },
    page_2: {
      type: "object" as const,
      properties: {
        employment_authorizations: stringProp("Employment authorizations if any"),
        change_of_status_cap_gap_extension: stringProp("Change of status / CAP-GAP extension"),
        authorized_reduced_course_load: stringProp("Authorized reduced course load"),
        current_session_dates: {
          type: "object" as const,
          properties: {
            start_date: stringProp("Current session start date"),
            end_date: stringProp("Current session end date"),
          },
          required: ["start_date", "end_date"],
          additionalProperties: false,
        },
        travel_endorsements: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              designated_school_official: stringProp("DSO name"),
              title: stringProp("Title"),
              signature_present: boolProp("Signature present"),
              date_issued: stringProp("Date issued"),
              place_issued: stringProp("Place issued"),
            },
            required: [
              "designated_school_official",
              "title",
              "signature_present",
              "date_issued",
              "place_issued",
            ],
            additionalProperties: false,
          },
        },
      },
      required: [
        "employment_authorizations",
        "change_of_status_cap_gap_extension",
        "authorized_reduced_course_load",
        "current_session_dates",
        "travel_endorsements",
      ],
      additionalProperties: false,
    },
    form_meta: {
      type: "object" as const,
      properties: {
        form_name: stringProp("Form name"),
        omb_number: stringProp("OMB number"),
        edition_date: stringProp("Edition date"),
      },
      required: ["form_name", "omb_number", "edition_date"],
      additionalProperties: false,
    },
  },
  required: [
    "sevis_id",
    "class_of_admission",
    "student",
    "school_information",
    "program_of_study",
    "financials",
    "remarks",
    "school_attestation",
    "student_attestation",
    "page_2",
    "form_meta",
  ],
  additionalProperties: false,
};
