import type { FormDocuments } from "./types";
import { amt, parseNum } from "./types";

const P1 = "topmostSubform[0].Page1[0]";
const P2 = "topmostSubform[0].Page2[0]";

function parseAddress(raw: string | undefined) {
  const out = { street: "", apt: "", city: "", state: "", zip: "" };
  if (!raw) return out;
  const m = raw.match(/^(.*),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/i);
  if (!m) {
    out.street = raw.trim();
    return out;
  }
  const pre = (m[1] || "").trim();
  out.city = (m[2] || "").trim();
  out.state = (m[3] || "").trim().toUpperCase();
  out.zip = (m[4] || "").trim();
  const tokens = pre
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  out.street = tokens.shift() || "";
  out.apt = tokens.join(", ");
  if (!out.apt) {
    const aptInline = out.street.match(/\b(?:Apt\.?|Apartment|#)\s*([\w-]+)/i);
    if (aptInline) {
      out.apt = aptInline[1];
      out.street = out.street.replace(aptInline[0], "").trim();
    }
  }
  return out;
}

/**
 * Maps extracted document data to Form 1040-NR AcroForm field names.
 *
 * PDF field layout per scripts/output/f1040nr_filled_sample.json and
 * scripts/add-1040nr-field-names.mjs:
 *
 *   Header: f1_01 = Tax year beginning date, f1_02 = ending date, f1_03 = 2-digit year
 *   c1_1 = Filed pursuant to 301.9100-2, c1_2 = Combat zone, f1_04 = Combat zone text
 *   c1_3 = Deceased, f1_05..f1_07 = Deceased date (MM/DD/YYYY)
 *   c1_4 = Spouse, f1_08..f1_10 = Spouse date, f1_11..f1_13 = Other form header
 *
 *   f1_14 = First name and middle initial, f1_15 = Last name, f1_16 = SSN/ITIN
 *   f1_17..f1_21 = Home address, apt, city, state, ZIP
 *   f1_22..f1_24 = Foreign country, province, postal code (c1_4 = foreign-address indicator in header area; for address block use f1_22..f1_24)
 *
 *   Filing status: c1_5[0..4] = Single, MFS, QSS, Estate, Trust; f1_25 = QSS child name
 *   Digital assets: c1_6[0]=Yes, c1_6[1]=No
 *   Dependents: Table_Dependents Row1..Row6 (f1_26..f1_41, c1_8..c1_15)
 *   Income (Page 1): f1_42=1a wages, f1_44=1c tips, f1_46=1e dep-care, f1_49=1h type, f1_50=1h amount,
 *     f1_54=1z total wages, f1_68=Line 8 other income, f1_69=Line 9 total ECI, f1_71=Line 11a AGI
 *   Tax & Credits (Page 2): f2_01=11b AGI, f2_02=12 deductions, f2_06=14 total deductions,
 *     f2_07=15 taxable income
 *   Payments (Page 2): Line25_ReadOrder[0].f2_21=25a withheld, f2_24=25d subtotal, f2_35=33 total payments
 */
export function mapToF1040NR(
  docs: FormDocuments
): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  const { passport, w2 } = docs;

  const taxYear = w2?.tax_year ?? "2025";
  const taxYearNum = parseInt(taxYear, 10);

  // Header dates
  v[`${P1}.f1_01[0]`] = "01";
  v[`${P1}.f1_02[0]`] = "12";
  v[`${P1}.f1_03[0]`] = String(taxYearNum % 100).padStart(2, "0");

  // Name (f1_14, f1_15 per actual PDF layout)
  v[`${P1}.f1_14[0]`] = passport?.given_names ?? "";
  v[`${P1}.f1_15[0]`] = passport?.surname ?? "";

  // SSN / ITIN (f1_16)
  v[`${P1}.f1_16[0]`] = docs.ssn ?? "";

  // US address (f1_17..f1_21 from W-2 employee address)
  const usAddr = parseAddress(w2?.employee.address);
  v[`${P1}.f1_17[0]`] = usAddr.street;
  v[`${P1}.f1_18[0]`] = usAddr.apt;
  v[`${P1}.f1_19[0]`] = usAddr.city;
  v[`${P1}.f1_20[0]`] = usAddr.state;
  v[`${P1}.f1_21[0]`] = usAddr.zip;

  // Foreign address (f1_22..f1_24 from passport)
  const pAddr = passport?.address;
  if (pAddr) {
    v[`${P1}.f1_22[0]`] = pAddr.country ?? "";
    v[`${P1}.f1_23[0]`] = [pAddr.state, pAddr.city_or_district].filter(Boolean).join(", ");
    v[`${P1}.f1_24[0]`] = pAddr.postal_code ?? "";
  }

  // Filing status — default to "Single" for nonresident aliens
  v[`${P1}.c1_5[0]`] = true;

  // Digital assets — default No
  v[`${P1}.c1_6[1]`] = true;

  // Income from W-2
  const wages = parseNum(w2?.wages_tips_other);
  const fedWithheld = parseNum(w2?.federal_income_tax_withheld);
  const ssTips = parseNum(w2?.social_security_tips);
  const depCare = parseNum(w2?.dependent_care_benefits);
  const allocatedTips = parseNum(w2?.allocated_tips);
  const nonqual = parseNum(w2?.nonqualified_plans);

  // Line 1a: Wages (f1_42)
  v[`${P1}.f1_42[0]`] = amt(wages);
  // Line 1c: Tip income (f1_44)
  if (ssTips) v[`${P1}.f1_44[0]`] = amt(ssTips);
  // Line 1e: Dependent care benefits (f1_46)
  if (depCare) v[`${P1}.f1_46[0]`] = amt(depCare);
  // Line 1h: Other earned income — f1_49 = type label, f1_50 = dollar amount
  if (allocatedTips) {
    v[`${P1}.f1_49[0]`] = "Allocated tips";
    v[`${P1}.f1_50[0]`] = amt(allocatedTips);
  }

  // Line 1z: Total wages (f1_54) — sum of 1a through 1h
  const totalWages = wages + ssTips + depCare + allocatedTips;
  if (totalWages) v[`${P1}.f1_54[0]`] = amt(totalWages);

  // Line 8: Other income from Schedule 1 (f1_68)
  if (nonqual) v[`${P1}.f1_68[0]`] = amt(nonqual);

  // Line 9: Total effectively connected income (f1_69)
  const totalIncome = totalWages + nonqual;
  if (totalIncome) v[`${P1}.f1_69[0]`] = amt(totalIncome);

  // Line 11a: Adjusted gross income (f1_71 — same as total if no adjustments)
  if (totalIncome) v[`${P1}.f1_71[0]`] = amt(totalIncome);

  // Page 2 — Tax and Credits
  // Line 11b: AGI repeated on Page 2 (f2_01)
  if (totalIncome) v[`${P2}.f2_01[0]`] = amt(totalIncome);

  // Lines 12/14/15: Standard deduction only for Indian citizens (US-India tax treaty Art. 21(2))
  const isIndian = ["India", "IND", "IN"].includes(
    (passport?.nationality ?? passport?.issuing_country ?? "").trim()
  );
  const deduction = isIndian ? (taxYearNum >= 2025 ? 15750 : 14600) : 0;
  if (isIndian) {
    v[`${P2}.f2_02[0]`] = amt(deduction); // Line 12: Standard deduction
    v[`${P2}.f2_06[0]`] = amt(deduction); // Line 14: Total deductions
  }
  const taxableIncome = Math.max(0, totalIncome - deduction);
  if (totalIncome) v[`${P2}.f2_07[0]`] = amt(taxableIncome); // Line 15: Taxable income

  // Page 2 — Payments
  // Line 25a: Federal income tax withheld from W-2 (f2_21)
  if (fedWithheld) v[`${P2}.Line25_ReadOrder[0].f2_21[0]`] = amt(fedWithheld);

  // Line 25d: Subtotal (f2_24)
  if (fedWithheld) v[`${P2}.f2_24[0]`] = amt(fedWithheld);

  // Line 33: Total payments (f2_35)
  if (fedWithheld) v[`${P2}.f2_35[0]`] = amt(fedWithheld);

  return v;
}
