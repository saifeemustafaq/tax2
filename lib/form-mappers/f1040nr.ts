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
 * Our PDF field layout (numbered with leading zeros, e.g. f1_01):
 *   f1_01 = Tax year begin month (MM)
 *   f1_02 = Tax year end month (MM)
 *   f1_03 = Tax year (2-digit YY)
 *   c1_1  = Deceased checkbox
 *   c1_2  = Amended return checkbox
 *   f1_04 = First name and middle initial
 *   c1_3  = Standard deduction from another return
 *   f1_05 = Last name
 *   f1_06 = SSN / ITIN
 *   f1_07 = Home address (street number and name)
 *   f1_08 = Apt no
 *   f1_09 = City, town
 *   f1_10 = State
 *   c1_4  = Foreign address checkbox
 *   f1_11 = ZIP code
 *   f1_12 = Foreign country name
 *   f1_13 = Foreign province / state / county
 *   f1_14 = Foreign postal code
 *   f1_15..f1_24 = Country, dates info (Schedule OI cross-refs)
 *
 *   Filing status: c1_5[0..4] = Single, MFS, QSS, Estate, Trust
 *   f1_25 = Child's name (if QSS)
 *
 *   Digital assets: c1_6[0]=Yes, c1_6[1]=No
 *
 *   Dependents table: Row1 f1_26..f1_29, Row2 f1_30..f1_33, etc.
 *
 *   Income lines (1a..15): f1_42..f1_71
 *
 *   Page 2 — Tax & credits, payments, refund:
 *   f2_01..f2_56
 */
export function mapToF1040NR(
  docs: FormDocuments
): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  const { passport, i20, w2 } = docs;

  const taxYear = w2?.tax_year ?? "2025";
  const taxYearNum = parseInt(taxYear, 10);

  // Header dates
  v[`${P1}.f1_01[0]`] = "01";
  v[`${P1}.f1_02[0]`] = "12";
  v[`${P1}.f1_03[0]`] = String(taxYearNum % 100).padStart(2, "0");

  // Name
  v[`${P1}.f1_04[0]`] = passport?.given_names ?? "";
  v[`${P1}.f1_05[0]`] = passport?.surname ?? "";

  // SSN / ITIN
  v[`${P1}.f1_06[0]`] = w2?.employee.ssn ?? "";

  // US address (from W-2 employee address)
  const usAddr = parseAddress(w2?.employee.address);
  v[`${P1}.f1_07[0]`] = usAddr.street;
  v[`${P1}.f1_08[0]`] = usAddr.apt;
  v[`${P1}.f1_09[0]`] = usAddr.city;
  v[`${P1}.f1_10[0]`] = usAddr.state;
  v[`${P1}.f1_11[0]`] = usAddr.zip;

  // Foreign address (from passport)
  const pAddr = passport?.address;
  if (pAddr) {
    v[`${P1}.c1_4[0]`] = true;
    v[`${P1}.f1_12[0]`] = pAddr.country ?? "";
    v[`${P1}.f1_13[0]`] = [pAddr.state, pAddr.city_or_district].filter(Boolean).join(", ");
    v[`${P1}.f1_14[0]`] = pAddr.postal_code ?? "";
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
  // Line 1h: Other earned income (f1_49)
  if (allocatedTips) v[`${P1}.f1_49[0]`] = amt(allocatedTips);

  // Line 1z: Total wages (f1_54) — sum of 1a through 1h
  const totalWages = wages + ssTips + depCare + allocatedTips;
  if (totalWages) v[`${P1}.f1_54[0]`] = amt(totalWages);

  // Line 8: Other income from Schedule 1 (f1_63)
  if (nonqual) v[`${P1}.f1_63[0]`] = amt(nonqual);

  // Line 9: Total effectively connected income (f1_64)
  const totalIncome = totalWages + nonqual;
  if (totalIncome) v[`${P1}.f1_64[0]`] = amt(totalIncome);

  // Line 11: Adjusted gross income (f1_66 — same as total if no adjustments)
  if (totalIncome) v[`${P1}.f1_66[0]`] = amt(totalIncome);

  // Line 12: Itemized deductions or standard ($14,600 for 2024, $15,000 for 2025 single)
  const standardDeduction = taxYearNum >= 2025 ? 15000 : 14600;
  v[`${P1}.f1_67[0]`] = amt(standardDeduction);

  // Line 14: Total deductions (f1_70)
  v[`${P1}.f1_70[0]`] = amt(standardDeduction);

  // Line 15: Taxable income (f1_71)
  const taxableIncome = Math.max(0, totalIncome - standardDeduction);
  if (totalIncome) v[`${P1}.f1_71[0]`] = amt(taxableIncome);

  // Page 2 — Payments
  // Line 25a: Federal income tax withheld from W-2 (f2_21)
  if (fedWithheld) v[`${P2}.Line25_ReadOrder[0].f2_21[0]`] = amt(fedWithheld);

  // Line 25d: Subtotal (f2_24)
  if (fedWithheld) v[`${P2}.f2_24[0]`] = amt(fedWithheld);

  // Line 33: Total payments (f2_35)
  if (fedWithheld) v[`${P2}.f2_35[0]`] = amt(fedWithheld);

  return v;
}
