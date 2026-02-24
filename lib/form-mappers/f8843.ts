import type { FormDocuments } from "./types";
import { daysForYear } from "./types";

const P1 = "topmostSubform[0].Page1[0]";
const P2 = "topmostSubform[0].Page2[0]";

/**
 * Maps extracted document data to Form 8843 AcroForm field names.
 *
 * Field layout (our PDF version uses f1_01 with leading zeros):
 *   f1_01 = First name and middle initial
 *   f1_02 = Last name
 *   f1_03 = SSN / ITIN
 *   f1_04 = Address in country of residence
 *   f1_05 = Address in the United States
 *   f1_06 = 1a  Visa type and date of entry
 *   f1_07 = 1b  Current nonimmigrant status
 *   f1_08 = 2   Country(ies) of citizenship
 *   f1_09 = 3a  Passport issuing country(ies)
 *   f1_10 = 3b  Passport number(s)
 *   f1_11 = 4a  Days present in US (current year)
 *   f1_12 = 4b  Days present in US (1st prior year)
 *   f1_13 = 4c  Days present in US (2nd prior year)
 *   f1_14 = 4d  Days excluded (current year)
 *
 *   Part III (Students) — f1_15 through f1_25:
 *   f1_15 = 10  Name of academic institution
 *   f1_16 = 11  Director / DSO name and address
 *   f1_17 = 12  Current visa type held
 *   f1_18 = 13a Date you entered the US
 *   f1_19 = 13b Was the program completed?
 *   f1_20 = 14  Type of degree / education level
 *   f1_21 = 15  Major / field of study
 *   f1_22 = 16  Program start date
 *   f1_23 = 17  Program end date
 *   f1_24 = (extra field if needed)
 *   f1_25 = (extra field if needed)
 *   c1_1[0] / c1_1[1] = Yes/No checkbox for student Part III
 *   c1_2[0] / c1_2[1] = Yes/No checkbox
 *   c1_3[0] / c1_3[1] = Yes/No checkbox
 *
 *   Page 2 (Part V / other):
 *   f2_01..f2_08
 */
export function mapToF8843(
  docs: FormDocuments
): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  const { passport, i20, w2, duration } = docs;

  // Header fields
  v[`${P1}.f1_01[0]`] = passport?.given_names ?? "";
  v[`${P1}.f1_02[0]`] = passport?.surname ?? "";
  v[`${P1}.f1_03[0]`] = w2?.employee.ssn ?? "";

  // Address in country of residence (from passport)
  const addr = passport?.address;
  const foreignAddr = addr
    ? [addr.address_line1, addr.address_line2, addr.city_or_district, addr.state, addr.postal_code, addr.country]
        .filter(Boolean)
        .join(", ")
    : "";
  v[`${P1}.f1_04[0]`] = foreignAddr;

  // US address (from W-2 employee address, or I-20 school address)
  v[`${P1}.f1_05[0]`] = w2?.employee.address || i20?.school_information.school_address || "";

  // 1a: Visa type and date of entry
  const visaType = i20?.class_of_admission ?? "";
  const entryDate = i20?.program_of_study.earliest_admission_date ?? "";
  v[`${P1}.f1_06[0]`] = visaType + (entryDate ? ` - Entered: ${entryDate}` : "");

  // 1b: Current nonimmigrant status
  v[`${P1}.f1_07[0]`] = i20?.class_of_admission ?? "";

  // 2: Country of citizenship
  v[`${P1}.f1_08[0]`] = passport?.nationality ?? passport?.issuing_country ?? "";

  // 3a: Passport issuing country
  v[`${P1}.f1_09[0]`] = passport?.issuing_country ?? "";

  // 3b: Passport number
  v[`${P1}.f1_10[0]`] = passport?.passport_number ?? "";

  // 4a-4c: Days present in the US (current year 2025, prior years 2024, 2023)
  v[`${P1}.f1_11[0]`] = daysForYear(duration, 2025);
  v[`${P1}.f1_12[0]`] = daysForYear(duration, 2024);
  v[`${P1}.f1_13[0]`] = daysForYear(duration, 2023);

  // 4d: Days excluded (same as 4a for F-1 students exempt under SPT)
  v[`${P1}.f1_14[0]`] = daysForYear(duration, 2025);

  // Part III — Student info (from I-20)
  v[`${P1}.f1_15[0]`] = i20?.school_information.school_name ?? "";
  const dso = i20?.school_information.school_official_contact;
  v[`${P1}.f1_16[0]`] = dso
    ? `${dso.name}${dso.title ? `, ${dso.title}` : ""}`
    : "";
  v[`${P1}.f1_17[0]`] = i20?.class_of_admission ?? "";
  v[`${P1}.f1_18[0]`] = i20?.program_of_study.earliest_admission_date ?? "";
  v[`${P1}.f1_20[0]`] = i20?.program_of_study.education_level ?? "";
  v[`${P1}.f1_21[0]`] = i20?.program_of_study.major_1?.name ?? "";
  v[`${P1}.f1_22[0]`] = i20?.program_of_study.program_start_date ?? "";
  v[`${P1}.f1_23[0]`] = i20?.program_of_study.program_end_date ?? "";

  return v;
}
