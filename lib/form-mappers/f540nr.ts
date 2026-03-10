import type { FormDocuments } from "./types";
import { amt, parseNum } from "./types";
import { compute1040NRTax } from "@/lib/tax-engine";

/**
 * Maps extracted document data to California Form 540NR AcroForm fields.
 *
 * Field names use the pattern "540NR_form_XYYY" where X=page, YYY=field number.
 * Page 1 (1xxx): Taxpayer info, filing status, exemptions
 * Page 2 (2xxx): Income adjustments
 * Page 3 (3xxx): Tax computation
 * Page 4 (4xxx): Payments & credits
 * Page 5 (5xxx): Refund / amount owed
 * Page 6 (6xxx): Signature
 *
 * Key page-1 fields (from PDF field discovery):
 *   1001 CB = Amended return checkbox
 *   1002 = Tax year
 *   1003 = Your first name
 *   1004 = Your middle initial
 *   1005 = Your last name
 *   1006 = Your SSN
 *   1007 = Spouse first name
 *   1008 = Spouse middle initial
 *   1009 = Spouse last name
 *   1010 = Spouse SSN
 *   1011 = Street address (current mailing)
 *   1012 = Apt/Ste
 *   1013 = City
 *   1014 = State
 *   1015 = ZIP code
 *   1016 = Country (if foreign)
 *   1017..1027 = Additional identity / prior-year info
 *   1028 CB = Head of household checkbox
 *   1029 RB = Filing status radio
 *   1030..1053 = Exemptions, dependents, CA income
 *
 * Page 2 fields (California AGI):
 *   2001 = Federal AGI (from 1040-NR)
 *   2002 = CA wages
 *   2003..2036 = Various CA adjustments
 *
 * Page 3 fields (Tax):
 *   3001..3029 = Tax, credits, net tax
 *
 * Page 4 fields (Payments):
 *   4003..4022 = CA withholding, estimated payments, credits
 */
export function mapToF540NR(
  docs: FormDocuments
): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  const { passport, w2 } = docs;

  const taxYear = w2?.tax_year ?? "2025";

  // Tax year
  v["540NR_form_1002"] = taxYear;

  // Your name
  const givenParts = (passport?.given_names ?? "").split(" ");
  v["540NR_form_1003"] = givenParts[0] ?? "";
  v["540NR_form_1004"] = givenParts.length > 1 ? givenParts[givenParts.length - 1].charAt(0) : "";
  v["540NR_form_1005"] = passport?.surname ?? "";

  // SSN
  v["540NR_form_1006"] = docs.ssn ?? "";

  // Mailing address (from W-2 employee address)
  const rawAddr = w2?.employee.address ?? "";
  const addrMatch = rawAddr.match(
    /^(.*),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/i
  );
  if (addrMatch) {
    v["540NR_form_1011"] = (addrMatch[1] || "").trim();
    v["540NR_form_1013"] = (addrMatch[2] || "").trim();
    v["540NR_form_1014"] = (addrMatch[3] || "").trim().toUpperCase();
    v["540NR_form_1015"] = (addrMatch[4] || "").trim();
  } else {
    v["540NR_form_1011"] = rawAddr;
  }

  // Filing status radio — Single (value "1" typically)
  // Radio groups need the option name; we'll try "1" for single
  v["540NR_form_1029 RB"] = "1";

  // CA state wages and state income tax from W-2 state_local entries
  const caEntry = w2?.state_local?.find(
    (sl) => sl.state.toUpperCase() === "CA"
  );

  const caWages = parseNum(caEntry?.state_wages);
  const caWithheld = parseNum(caEntry?.state_income_tax);

  // Page 2: Federal AGI — use computed AGI from tax engine (not raw wages)
  const { agi } = compute1040NRTax(docs);
  if (agi) v["540NR_form_2001"] = amt(agi);

  // CA wages
  if (caWages) v["540NR_form_2002"] = amt(caWages);

  // Page 4: CA state tax withheld (line 71 ≈ field 4003)
  if (caWithheld) v["540NR_form_4003"] = amt(caWithheld);

  // Page 5: Signature info — name
  const fullName = [passport?.given_names, passport?.surname]
    .filter(Boolean)
    .join(" ");
  v["540NR_form_6001"] = fullName;
  v["540NR_form_6002"] = new Date().toISOString().slice(0, 10);

  return v;
}
