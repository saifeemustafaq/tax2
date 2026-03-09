import type { FormDocuments } from "./types";
import { daysForYear } from "./types";

const P1 = "topmostSubform[0].Page1[0]";

/**
 * Maps extracted document data to Form 8843 AcroForm field names.
 *
 * The app uses public/forms/empty/f8843.pdf, which has field names with leading zeros
 * (f1_01..f1_34, no Pg1Header). See scripts/output/f8843_actual.json.
 *
 *   f1_01 = Tax year beginning, f1_02 = ending month, f1_03 = 2-digit year
 *   f1_04 = First name and initial, f1_05 = Last name, f1_06 = TIN
 *   f1_07 = Address in country of residence, f1_08 = Address in the United States
 *   f1_09 = Type of U.S. visa, f1_10 = Current nonimmigrant status
 *   f1_11 = Country(ies) of citizenship, f1_12 = Passport issuing country, f1_13 = Passport number(s)
 *   f1_14 = Days present (current year), f1_15 = (1st prior year), f1_16 = (2nd prior year)
 *   f1_17 = Days in current year you claim to exclude
 *   Part III: f1_26..f1_34 (school, director, etc.)
 */
export function mapToF8843(
  docs: FormDocuments
): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  const { passport, i20, w2, duration } = docs;

  // Tax year (f1_01, f1_02, f1_03)
  v[`${P1}.f1_01[0]`] = "01";
  v[`${P1}.f1_02[0]`] = "12";
  v[`${P1}.f1_03[0]`] = "25"; // 2025

  // Name and TIN (f1_04, f1_05, f1_06)
  v[`${P1}.f1_04[0]`] = passport?.given_names ?? "";
  v[`${P1}.f1_05[0]`] = passport?.surname ?? "";
  v[`${P1}.f1_06[0]`] = docs.ssn ?? "";

  // Address in country of residence (f1_07)
  const addr = passport?.address;
  const foreignAddr = addr
    ? [addr.address_line1, addr.address_line2, addr.city_or_district, addr.state, addr.postal_code, addr.country]
        .filter(Boolean)
        .join(", ")
    : "";
  v[`${P1}.f1_07[0]`] = foreignAddr;

  // US address (f1_08)
  v[`${P1}.f1_08[0]`] = w2?.employee.address || i20?.school_information?.school_address || "";

  // 1a: Visa type and date of entry (f1_09)
  const visaType = i20?.class_of_admission ?? "";
  const entryDate = i20?.program_of_study?.earliest_admission_date ?? "";
  v[`${P1}.f1_09[0]`] = visaType + (entryDate ? ` ${entryDate}` : "");

  // 1b: Current nonimmigrant status (f1_10)
  v[`${P1}.f1_10[0]`] = i20?.class_of_admission ?? "";

  // 2: Country of citizenship (f1_11)
  v[`${P1}.f1_11[0]`] = passport?.nationality ?? passport?.issuing_country ?? "";

  // 3a: Passport issuing country, 3b: Passport number (f1_12, f1_13)
  v[`${P1}.f1_12[0]`] = passport?.issuing_country ?? "";
  v[`${P1}.f1_13[0]`] = passport?.passport_number ?? "";

  // 4a-4d: Days present and excluded (f1_14..f1_17)
  v[`${P1}.f1_14[0]`] = daysForYear(duration, 2025);
  v[`${P1}.f1_15[0]`] = daysForYear(duration, 2024);
  v[`${P1}.f1_16[0]`] = daysForYear(duration, 2023);
  v[`${P1}.f1_17[0]`] = daysForYear(duration, 2025);

  // Part III — Student info (f1_26..f1_34 in this PDF)
  if (i20) {
    v[`${P1}.f1_26[0]`] = i20?.school_information?.school_name ?? "";
    v[`${P1}.f1_27[0]`] = [i20?.program_of_study?.education_level, i20?.program_of_study?.major_1?.name].filter(Boolean).join(" - ") || "";
    const dso = i20?.school_information?.school_official_contact;
    const schoolAddr = i20?.school_information?.school_address ?? "";
    if (dso) {
      v[`${P1}.f1_30[0]`] = [dso.name, dso.title].filter(Boolean).join(", ");
      v[`${P1}.f1_31[0]`] = schoolAddr;
      v[`${P1}.f1_32[0]`] = "";
    }
    v[`${P1}.f1_33[0]`] = i20?.program_of_study?.program_start_date ?? "";
    v[`${P1}.f1_34[0]`] = i20?.program_of_study?.program_end_date ?? "";
  }

  return v;
}
