import type { FormDocuments } from "./types";
import { amt, parseAddress } from "./types";
import { compute540NRTax } from "@/lib/tax-engine";

/**
 * Maps extracted document data to California Form 540NR AcroForm fields.
 *
 * Field naming: "540NR_form_XYYY" where X = page section, YYY = field number.
 *
 * Physical field positions verified via scripts/debug-540nr-fields.ts
 * (coordinate dump in scripts/output/540nr-layout.json).
 *
 * Page 1 (1xxx): Personal info, filing status, exemptions
 *   1003     First name
 *   1004     Middle initial
 *   1005     Last name
 *   1006     Suffix (narrow, top=108 left=385 w=43) — NOT SSN
 *   1007     SSN / ITIN (top=108 left=432 w=108)
 *   1013     Additional information (top=169 left=36 w=426) — do NOT use for city
 *   1014     PBA code (top=169 left=466 w=73) — do NOT use for state
 *   1015     Street address (top=198 left=36 w=348)
 *   1016     Apt / Ste (top=198 left=388 w=73)
 *   1018     City (top=228 left=36 w=361)
 *   1019     State (top=228 left=401 w=25)
 *   1020     ZIP code (top=228 left=430 w=110)
 *   1021     Foreign country (top=258 left=36 w=213) — non-US address
 *   1024     Date of birth (top=297 left=74 w=97)
 *   1029 RB  Filing status radio
 *   1030     Personal exemption count (Line 7)
 *
 * Page 2 (2xxx): Income
 *   2001     Page header: taxpayer name (repeats pages 2-6, top=46 x=90 w=131)
 *   2002     Page header: SSN/ITIN    (repeats pages 2-6, top=46 x=306 w=73)
 *   2003     Line 11: Exemption amount (top=70, x=457, w=116)
 *   2004     Line 12: Total CA wages / W-2 Box 16 (top=106, x=277, w=116)
 *   2005     Line 13: Federal AGI (top=130, x=435, w=116)
 *   2028     CA adjusted gross income
 *   2036     CA taxable income
 *
 * Page 3 (3xxx): Tax computation
 *   3-column layout: left(w=127) | narrow(w=26) | right(w=113, x=437)
 *   3003     Right col, row 1 (top=69)  — CA tax amount (Line 31)
 *   3006     Right col, row 2 (top=94)  — MHST
 *   3011     Proration CA source income (top=225, right col)
 *   3012     Proration total income / federal AGI (top=249, right col)
 *   3013     Proration ratio 4-decimal (top=273, right col)
 *   3014     Prorated exemption credit amount (top=297, right col)
 *   3022     Net CA tax after all credits (top=502, right col)
 *   3029     Final net CA tax (top=693, right col)
 *
 * Page 4 (4xxx): Payments
 *   4003     CA income tax withheld (W-2 Box 17)
 *   4004     CA SDI withheld (W-2 Box 14)
 *   4022     Total payments
 *
 * Page 5 (5xxx): Refund / amount owed
 *   5001     Net CA tax — first right-col field (top=82)
 *   5002     Total payments (top=118)
 *   5005     Overpayment (top=154)
 *   5006     Refund amount (top=179)
 *   5007     Amount owed (top=215)
 *
 * Page 6 (6xxx): Signature block
 *   6002     Taxpayer name (wide, top=178 left=97 w=354)
 *   6003     Date signed (top=178 left=463 w=111)
 */
export function mapToF540NR(docs: FormDocuments): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  const { passport, w2 } = docs;

  const c = compute540NRTax(docs);

  // -------------------------------------------------------------------------
  // Page 1 — Personal information
  // -------------------------------------------------------------------------

  v["540NR_form_1002"] = w2?.tax_year ?? "2025";

  // Taxpayer name
  const givenParts = (passport?.given_names ?? "").split(" ");
  v["540NR_form_1003"] = givenParts[0] ?? "";
  v["540NR_form_1004"] =
    givenParts.length > 1 ? givenParts[givenParts.length - 1].charAt(0) : "";
  v["540NR_form_1005"] = passport?.surname ?? "";

  // SSN / ITIN — field 1007 (top=108 left=432 w=108)
  v["540NR_form_1007"] = docs.ssn ?? "";

  // Mailing address — use parseAddress on W-2 employee address (US postal)
  const addr = parseAddress(w2?.employee.address);
  if (addr.city) {
    // US postal address parsed successfully
    v["540NR_form_1015"] = addr.street;
    if (addr.apt) v["540NR_form_1016"] = addr.apt;
    v["540NR_form_1018"] = addr.city;
    v["540NR_form_1019"] = addr.state;
    v["540NR_form_1020"] = addr.zip;
  } else if (addr.street) {
    // Raw address, no city/state/zip parsed — write street and foreign country
    v["540NR_form_1015"] = addr.street;
    const pAddr = passport?.address;
    if (pAddr?.country) v["540NR_form_1021"] = pAddr.country;
  }

  // Date of birth (MM/DD/YYYY) — prefer passport, fall back to I-20
  const rawDob = passport?.date_of_birth ?? docs.i20?.student?.date_of_birth ?? "";
  if (rawDob) {
    // Convert YYYY-MM-DD → MM/DD/YYYY if needed
    const isoMatch = rawDob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    v["540NR_form_1024"] = isoMatch
      ? `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`
      : rawDob;
  }

  // Filing status: single NRA
  v["540NR_form_1029 RB"] = "Line 1 . Single.";

  // Personal exemption count (Line 7) — 1 for single filer
  v["540NR_form_1030"] = "1";

  // -------------------------------------------------------------------------
  // Page 2 — Income
  // -------------------------------------------------------------------------

  // Page 2-6 repeating header: taxpayer name and SSN
  const headerName = [passport?.given_names, passport?.surname]
    .filter(Boolean)
    .join(" ");
  if (headerName) v["540NR_form_2001"] = headerName;
  v["540NR_form_2002"] = docs.ssn ?? "";

  // Income fields (correct field IDs per layout JSON)
  if (c.federalAgi)            v["540NR_form_2005"] = amt(c.federalAgi);
  if (c.caWages)               v["540NR_form_2004"] = amt(c.caWages);
  if (c.caAdjustedGrossIncome) v["540NR_form_2028"] = amt(c.caAdjustedGrossIncome);
  if (c.caTaxableIncome)       v["540NR_form_2036"] = amt(c.caTaxableIncome);

  // -------------------------------------------------------------------------
  // Page 3 — Tax computation
  // Right column (x=437, w=113) fields are the dollar-amount fields.
  // Left column (w=127) and narrow column (w=26) are not filled here.
  // -------------------------------------------------------------------------

  // Line 31: CA tax from rate schedule (right col, row 1)
  if (c.caTaxBeforeCredits) v["540NR_form_3003"] = amt(c.caTaxBeforeCredits);

  // MHST — 1% on CA taxable income > $1M (right col, row 2)
  if (c.caMhst) v["540NR_form_3006"] = amt(c.caMhst);

  // Proration section (all right col)
  if (c.caWages)           v["540NR_form_3011"] = amt(c.caWages);
  if (c.federalAgi)        v["540NR_form_3012"] = amt(c.federalAgi);
  v["540NR_form_3013"]     = c.caProrationRatio.toFixed(4);
  if (c.caExemptionCredit) v["540NR_form_3014"] = amt(c.caExemptionCredit);

  // Net CA tax after all credits (carried forward)
  if (c.caNetTax) {
    v["540NR_form_3022"] = amt(c.caNetTax);
    v["540NR_form_3029"] = amt(c.caNetTax);
  }

  // -------------------------------------------------------------------------
  // Page 4 — Payments
  // -------------------------------------------------------------------------

  if (c.caWithheld) v["540NR_form_4003"] = amt(c.caWithheld);
  if (c.caSdi)      v["540NR_form_4004"] = amt(c.caSdi);
  if (c.caWithheld) v["540NR_form_4022"] = amt(c.caWithheld);

  // -------------------------------------------------------------------------
  // Page 5 — Refund or Amount Owed
  // 5001 = Net CA tax (top=82, first right-col field on page 5)
  // 5002 = Total payments (top=118)
  // -------------------------------------------------------------------------

  if (c.caNetTax)      v["540NR_form_5001"] = amt(c.caNetTax);
  if (c.caWithheld)    v["540NR_form_5002"] = amt(c.caWithheld);
  if (c.caOverpayment) v["540NR_form_5005"] = amt(c.caOverpayment);
  if (c.caRefund)      v["540NR_form_5006"] = amt(c.caRefund);
  if (c.caAmountOwed)  v["540NR_form_5007"] = amt(c.caAmountOwed);

  // Direct deposit — routing number, account type, account number
  // 5009 = routing number, 5011 = account number
  // 5010A CB = checking, 5010B CB = savings
  if (c.caRefund && docs.bankDetail) {
    v["540NR_form_5009"] = docs.bankDetail.routingNumber;
    v["540NR_form_5011"] = docs.bankDetail.accountNumber;
    if (docs.bankDetail.accountType === "checking") {
      v["540NR_form_5010A CB"] = true;
    } else {
      v["540NR_form_5010B CB"] = true;
    }
  }

  // -------------------------------------------------------------------------
  // Page 6 — Signature block
  // 6002 = Taxpayer name (wide, left-aligned, top=178 left=97 w=354)
  // 6003 = Date signed (top=178 left=463 w=111)
  // -------------------------------------------------------------------------

  const fullName = [passport?.given_names, passport?.surname]
    .filter(Boolean)
    .join(" ");
  if (fullName) v["540NR_form_6002"] = fullName;
  v["540NR_form_6003"] = new Date().toISOString().slice(0, 10);

  return v;
}
