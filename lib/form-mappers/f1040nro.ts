import type { FormDocuments } from "./types";
import { daysForYear } from "./types";

const P1 = "form1040-NR[0].Page1[0]";

/**
 * Maps extracted document data to Schedule OI (Form 1040-NR) AcroForm fields.
 *
 * Our PDF field layout (prefix: form1040-NR[0].Page1[0]):
 *   f1_1 = Name as shown on Form 1040-NR
 *   f1_2 = Identifying number (SSN/ITIN)
 *   f1_3 = Country of citizenship
 *   f1_4 = Country of tax residence
 *
 *   A. c1_1[0]/c1_1[1] = Were you ever a US citizen? Yes/No
 *   B. c1_2[0]/c1_2[1] = Have you ever filed as US resident? Yes/No
 *   C. c1_3[0]/c1_3[1] = Have you applied for green card? Yes/No
 *   f1_5 = If yes, explain
 *
 *   D. c1_4[0]/c1_4[1] = Have you ever been in the US before? Yes/No
 *   f1_6 = Dates of prior US presence (text)
 *
 *   E. c1_5[0]/c1_5[1] = Were you subject to tax in foreign country? Yes/No
 *
 *   F. LineG_Table1 (BodyRow1..4): f1_7..f1_14 — Current immigration status
 *      Each row has status type (f1_7,f1_9,f1_11,f1_13) and date (f1_8,f1_10,f1_12,f1_14)
 *
 *   G. LineG_Table2 (BodyRow1..4): f1_15..f1_22 — Status changes
 *      Each row has status type and date changed
 *
 *   H. f1_23 = Number of days in US current year
 *      f1_24 = Number of days in US prior year 1
 *      f1_25 = Number of days in US prior year 2
 *
 *   I. c1_6[0]/c1_6[1] = Filing as a treaty resident? Yes/No
 *      f1_26 = Treaty country, article, code section
 *
 *   J. c1_7[0]/c1_7[1], c1_8[0]/c1_8[1], c1_9[0]/c1_9[1], c1_10[0]/c1_10[1]
 *      = Additional Yes/No questions
 *
 *   L. LineL1_Table (BodyRow1..3): f1_27..f1_38
 *      Treaty-based positions table (country, article, tax rate, income type)
 *
 *   f1_39 = Additional explanation text
 *
 *   c1_11..c1_14 = Additional checkboxes
 */
export function mapToF1040NRO(
  docs: FormDocuments
): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  const { passport, i20, w2, duration } = docs;

  // Name and ID
  const fullName = [passport?.given_names, passport?.surname].filter(Boolean).join(" ");
  v[`${P1}.f1_1[0]`] = fullName;
  v[`${P1}.f1_2[0]`] = w2?.employee.ssn ?? "";

  // Country of citizenship
  v[`${P1}.f1_3[0]`] = passport?.nationality ?? passport?.issuing_country ?? "";

  // Country of tax residence (same as citizenship for most NRAs)
  v[`${P1}.f1_4[0]`] = passport?.nationality ?? passport?.issuing_country ?? "";

  // A: Were you ever a US citizen? — No
  v[`${P1}.c1_1[1]`] = true;

  // B: Have you ever filed US return as resident? — No
  v[`${P1}.c1_2[1]`] = true;

  // C: Have you applied for green card? — No
  v[`${P1}.c1_3[1]`] = true;

  // D: Have you ever been in the US before? — Yes (they're filing)
  v[`${P1}.c1_4[0]`] = true;

  // E: Subject to tax in a foreign country? — Yes
  v[`${P1}.c1_5[0]`] = true;

  // F: Current immigration status (row 1)
  v[`${P1}.LineG_Table1[0].BodyRow1[0].f1_7[0]`] = i20?.class_of_admission ?? "";
  v[`${P1}.LineG_Table1[0].BodyRow1[0].f1_8[0]`] =
    i20?.program_of_study.earliest_admission_date ?? "";

  // H: Days present in the US
  v[`${P1}.f1_23[0]`] = daysForYear(duration, 2025);
  v[`${P1}.f1_24[0]`] = daysForYear(duration, 2024);
  v[`${P1}.f1_25[0]`] = daysForYear(duration, 2023);

  // I: Filing under treaty? — No (default)
  v[`${P1}.c1_6[1]`] = true;

  return v;
}
