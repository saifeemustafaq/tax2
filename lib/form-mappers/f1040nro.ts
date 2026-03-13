import type { FormDocuments } from "./types";
import { daysForYear, formatDateLong } from "./types";

/**
 * Schedule OI (Form 1040-NR) — Other Information.
 *
 * Field layout from scripts/output/f1040nro.json (prefix: form1040-NR[0].Page1[0]):
 *
 * Header:
 *   f1_1 = Name shown on Form 1040-NR
 *   f1_2 = Your identifying number (SSN/ITIN)
 *
 * A. f1_3 = Of what country or countries were you a citizen or national during the tax year?
 * B. f1_4 = In what country did you claim residence for tax purposes during the tax year?
 *
 * C. c1_3[0]=Yes, c1_3[1]=No — Have you ever applied to be a green card holder?
 *    f1_5 = If yes, explain
 *
 * D. c1_1[0]/c1_1[1] — Were you ever a U.S. citizen? Yes/No
 *    c1_2[0]/c1_2[1] — Were you ever a green card holder? Yes/No
 *
 * E. Visa type / U.S. immigration status on last day of tax year → LineG_Table1 BodyRow1 f1_7
 * F. c1_4[0]/c1_4[1] — Have you ever changed your visa type? f1_6 = date and nature of change
 *
 * G. LineG_Table1 (BodyRow1..4): f1_7,f1_8 = enter/depart row1; f1_9,f1_10 = row2; f1_11,f1_12 = row3; f1_13,f1_14 = row4
 *    LineG_Table2 (BodyRow1..4): f1_15..f1_22 — status changes
 *
 * H. f1_23 = days in US 2025, f1_24 = 2024, f1_25 = 2023
 *
 * I. c1_7[0]/c1_7[1] — Did you file a U.S. return for any prior year? f1_26 = latest year and form number
 * J. c1_8[0]/c1_8[1] — Filing for a trust? c1_9 = if yes, sub-question
 * K. c1_10[0]/c1_10[1] — Compensation $250k or more?
 *
 * L. LineL1_Table BodyRow1..3: f1_27..f1_38 (treaty table). c1_11, c1_12 = L2, L3. f1_39 = additional explanation
 * M. c1_13, c1_14 = section 871(d) elections
 */
const P1 = "form1040-NR[0].Page1[0]";

export function mapToF1040NRO(
  docs: FormDocuments
): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  const { passport, i20, w2, duration } = docs;

  // Name shown on Form 1040-NR, Your identifying number
  const fullName = [passport?.given_names, passport?.surname].filter(Boolean).join(" ");
  v[`${P1}.f1_1[0]`] = fullName;
  v[`${P1}.f1_2[0]`] = docs.ssn ?? "";

  // A. Country(ies) citizen during tax year
  v[`${P1}.f1_3[0]`] = passport?.nationality ?? passport?.issuing_country ?? "";
  // B. Country of tax residence
  v[`${P1}.f1_4[0]`] = passport?.nationality ?? passport?.issuing_country ?? "";

  // C. Green card applied? — No (default)
  v[`${P1}.c1_3[1]`] = true;
  // D1. Ever U.S. citizen? — No
  v[`${P1}.c1_1[1]`] = true;
  // D2. Ever green card holder? — No
  v[`${P1}.c1_2[1]`] = true;

  // E. Visa type / immigration status on last day of tax year (first row of G table used for visa type)
  v[`${P1}.LineG_Table1[0].BodyRow1[0].f1_7[0]`] = i20?.class_of_admission ?? "";
  // G. First entry/depart dates (user-provided most recent F1 visa entry)
  const entryDate = formatDateLong(docs.f1VisaEntryDate);
  v[`${P1}.LineG_Table1[0].BodyRow1[0].f1_8[0]`] = entryDate;

  // F. Changed visa type? — No (default); f1_6 left blank
  v[`${P1}.c1_4[1]`] = true;

  // H. Days present in the United States during 2023, 2024, 2025
  v[`${P1}.f1_23[0]`] = daysForYear(duration, 2025);
  v[`${P1}.f1_24[0]`] = daysForYear(duration, 2024);
  v[`${P1}.f1_25[0]`] = daysForYear(duration, 2023);

  // I. Filed prior year return? — No (default)
  v[`${P1}.c1_7[1]`] = true;
  // J. Filing for a trust? — No
  v[`${P1}.c1_8[1]`] = true;
  // K. Compensation $250k or more? — No (default)
  v[`${P1}.c1_10[1]`] = true;

  // I. Treaty benefits — No (default)
  v[`${P1}.c1_6[1]`] = true;
  // L2, L3, M — leave unchecked (No) or leave as-is
  v[`${P1}.c1_11[1]`] = true;
  v[`${P1}.c1_12[1]`] = true;

  return v;
}
