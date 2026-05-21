#!/usr/bin/env node
/**
 * Annotates scripts/output/540nr.json with human-readable fieldName values
 * for each AcroForm field discovered in public/forms/empty/540nr.pdf.
 *
 * Run after generating 540nr.json via:
 *   npm run pdf-fields-to-json -- --pdf public/forms/empty/540nr.pdf
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, "output", "540nr.json");

/** Maps AcroForm field name → human-readable description */
const nameToFieldName = {
  // ── Page 1: Personal information ─────────────────────────────────────────
  // Field positions verified via scripts/debug-540nr-fields.ts coordinate dump
  "540NR_form_1001 CB": "Amended return checkbox",
  "540NR_form_1002":    "Tax year",
  "540NR_form_1003":    "Taxpayer first name",
  "540NR_form_1004":    "Taxpayer middle initial",
  "540NR_form_1005":    "Taxpayer last name",
  "540NR_form_1006":    "Taxpayer suffix (top=108 left=385 w=43 — NOT SSN)",
  "540NR_form_1007":    "Taxpayer SSN / ITIN (top=108 left=432 w=108)",
  "540NR_form_1008":    "Spouse / RDP first name",
  "540NR_form_1009":    "Spouse / RDP middle initial",
  "540NR_form_1010":    "Spouse / RDP last name",
  "540NR_form_1011":    "Spouse / RDP suffix",
  "540NR_form_1012":    "Spouse / RDP SSN / ITIN",
  "540NR_form_1013":    "Additional information (top=169 left=36 w=426 — NOT city)",
  "540NR_form_1014":    "PBA code (top=169 left=466 w=73 — NOT state)",
  "540NR_form_1015":    "Street address (mailing) (top=198 left=36 w=348)",
  "540NR_form_1016":    "Apt / Ste / Room (top=198 left=388 w=73)",
  "540NR_form_1017":    "Unknown (top=198 right area — verify before use)",
  "540NR_form_1018":    "City (top=228 left=36 w=361)",
  "540NR_form_1019":    "State (top=228 left=401 w=25)",
  "540NR_form_1020":    "ZIP code (top=228 left=430 w=110)",
  "540NR_form_1021":    "Foreign country (if non-US address) (top=258 left=36 w=213)",
  "540NR_form_1022":    "Foreign province / state / county",
  "540NR_form_1023":    "Foreign postal code",
  "540NR_form_1024":    "Date of birth (MM/DD/YYYY) (top=297 left=74 w=97)",
  "540NR_form_1025":    "Foreign country name (citizenship)",
  "540NR_form_1026":    "Foreign TIN",
  "540NR_form_1027":    "Daytime telephone number",
  // Exemptions
  "540NR_form_1028 CB": "Head of household checkbox (with qualifying person)",
  "540NR_form_1033 CB": "Qualifying surviving spouse / RDP checkbox",
  "540NR_form_1029 RB": "Filing status radio (Single / MFJ / MFS / HOH / QSS)",
  "540NR_form_1030":    "Line 7 — Personal exemption count",
  "540NR_form_1031":    "Line 8 — Blind exemption count",
  "540NR_form_1032":    "Line 9 — Senior exemption count",
  "540NR_form_1034":    "Line 10 — Dependent count (eligible for exemption credit)",
  "540NR_form_1035":    "Line 10 — Dependent exemption credit amount",
  "540NR_form_1036":    "Line 11 — Dependent exemption credit (prorated)",
  "540NR_form_1037":    "Exemption subtotal (lines 7–10)",
  "540NR_form_1038":    "Dependent 1 — First name",
  "540NR_form_1039":    "Dependent 1 — Last name",
  "540NR_form_1040":    "Dependent 1 — SSN",
  "540NR_form_1041":    "Dependent 1 — Relationship",
  "540NR_form_1042":    "Dependent 2 — First name",
  "540NR_form_1043":    "Dependent 2 — Last name",
  "540NR_form_1044":    "Dependent 2 — SSN",
  "540NR_form_1045":    "Dependent 2 — Relationship",
  "540NR_form_1046":    "Dependent 3 — First name",
  "540NR_form_1047":    "Dependent 3 — Last name",
  "540NR_form_1048":    "Dependent 3 — SSN",
  "540NR_form_1049":    "Dependent 3 — Relationship",
  "540NR_form_1050":    "Dependent 4 — First name",
  "540NR_form_1051":    "Dependent 4 — Last name",
  "540NR_form_1052":    "Dependent 4 — SSN",
  "540NR_form_1053":    "Dependent 4 — Relationship",

  // ── Page 2: Income ────────────────────────────────────────────────────────
  "540NR_form_2001":    "Line 12 — Federal AGI (from 1040-NR line 11)",
  "540NR_form_2002":    "CA wages (W-2 Box 15, Column D CA source income)",
  "540NR_form_2003":    "Line 13a — CA addition: interest income",
  "540NR_form_2004":    "Line 13b — CA addition: dividend income",
  "540NR_form_2005":    "Line 13c — CA addition: business income",
  "540NR_form_2006":    "Line 13d — CA addition: capital gains",
  "540NR_form_2007":    "Line 13e — CA addition: IRA distributions",
  "540NR_form_2008":    "Line 13f — CA addition: pensions / annuities",
  "540NR_form_2009":    "Line 13g — CA addition: rental real estate",
  "540NR_form_2010":    "Line 13h — CA addition: farm income",
  "540NR_form_2011":    "Line 13 total — Total CA income additions",
  "540NR_form_2012 CB": "CA adjustment checkbox A",
  "540NR_form_2013 CB": "CA adjustment checkbox B",
  "540NR_form_2014 CB": "CA adjustment checkbox C",
  "540NR_form_2015 CB": "CA adjustment checkbox D",
  "540NR_form_2016":    "Line 15a — CA subtraction: interest income",
  "540NR_form_2017":    "Line 15b — CA subtraction: dividend income",
  "540NR_form_2018":    "Line 15c — CA subtraction: business income",
  "540NR_form_2019":    "Line 15d — CA subtraction: capital gains",
  "540NR_form_2020":    "Line 15e — CA subtraction: IRA distributions",
  "540NR_form_2021":    "Line 15f — CA subtraction: pensions / annuities",
  "540NR_form_2022":    "Line 15g — CA subtraction: rental real estate",
  "540NR_form_2023":    "Line 15h — CA subtraction: farm income",
  "540NR_form_2024":    "Line 15i — CA subtraction: Social Security",
  "540NR_form_2025":    "Line 15 total — Total CA income subtractions",
  "540NR_form_2026 CB": "CA subtraction checkbox A",
  "540NR_form_2027 CB": "CA subtraction checkbox B",
  "540NR_form_2028":    "Line 17 — CA adjusted gross income (fed AGI + adds − subs)",
  "540NR_form_2029":    "Line 18 — Standard deduction or itemized deductions",
  "540NR_form_2030":    "Line 19 — CA itemized deduction worksheet amount",
  "540NR_form_2031":    "Line 20 — Enter larger of Line 18 or Line 19",
  "540NR_form_2032":    "Line 21 — CA AGI minus deductions",
  "540NR_form_2033":    "Line 22 — Exemption allowance from exemption worksheet",
  "540NR_form_2034":    "Line 23 — Subtract Line 22 from Line 21",
  "540NR_form_2035":    "Line 24 — Enter tax from CA Tax Table (reference)",
  "540NR_form_2036":    "Line 32 — CA taxable income",

  // ── Page 3: Tax computation ───────────────────────────────────────────────
  // 3-column layout: left(w=127) | narrow-code(w=26) | right-amount(x=437,w=113)
  // Only the right-column (x=437, w=113) fields hold dollar amounts.
  "540NR_form_3001":    "Line 31 — left col (w=127, not dollar amount — do not fill)",
  "540NR_form_3002":    "Line 31 — narrow code col (w=26 — do not fill)",
  "540NR_form_3003":    "Line 31 — CA tax amount (right col, top=69, x=437, w=113)",
  "540NR_form_3004":    "Line 32 — left col (w=127, not dollar amount — do not fill)",
  "540NR_form_3005":    "Line 32 — narrow code col (w=26 — do not fill)",
  "540NR_form_3006":    "Mental Health Services Tax (right col, top=94, x=437, w=113)",
  "540NR_form_3006":    "Line 36 — Alternative minimum tax (AMT) from Schedule P",
  "540NR_form_3007":    "Line 37 — Other taxes from Schedule P",
  "540NR_form_3008":    "Line 38 — Tax from recapture of credits",
  "540NR_form_3009":    "Line 39 — Additional tax (FTB 3840)",
  "540NR_form_3010":    "Line 40 — Total tax (sum of lines above)",
  "540NR_form_3011":    "Proration — CA source income (numerator)",
  "540NR_form_3012":    "Proration — Total income / federal AGI (denominator)",
  "540NR_form_3013":    "Proration ratio (CA income ÷ total income, 4 decimals)",
  "540NR_form_3014":    "Prorated exemption credit amount",
  "540NR_form_3015":    "Line 48 — Nonrefundable renter's credit",
  "540NR_form_3016":    "Line 49 — Other nonrefundable credits (code ___)",
  "540NR_form_3017":    "Line 50 — Credit from Schedule P",
  "540NR_form_3018":    "Line 51 — Joint custody head of household credit",
  "540NR_form_3019":    "Line 52 — Dependent parent credit",
  "540NR_form_3020":    "Line 53 — Senior head of household credit",
  "540NR_form_3021":    "Line 54 — Total credits (sum of lines 48–53)",
  "540NR_form_3022":    "Line 62 — Net CA tax after all credits (total tax summary)",
  "540NR_form_3023 CB": "Underpayment of estimated tax checkbox (FTB 5805)",
  "540NR_form_3024":    "Line 63 — Underpayment penalty (from FTB 5805 or 5805F)",
  "540NR_form_3025":    "Line 64 — Total tax plus underpayment penalty",
  "540NR_form_3026":    "Line 65 — CA income tax withheld (for transfer to page 4)",
  "540NR_form_3027":    "Line 66 — 2025 CA estimated tax payments",
  "540NR_form_3028":    "Line 67 — Other payments / credits",
  "540NR_form_3029":    "Line 92 — Final net CA tax (after all credits and adjustments)",

  // ── Page 4: Payments ──────────────────────────────────────────────────────
  "540NR_form_4003":    "Line 71 — CA income tax withheld (W-2 Box 17)",
  "540NR_form_4004":    "CA SDI withheld (W-2 Box 14 — excess SDI from multiple employers)",
  "540NR_form_4005":    "Line 73 — CA income tax withheld (1099-R / 1099-MISC)",
  "540NR_form_4006":    "Line 74 — CA income tax withheld (real estate)",
  "540NR_form_4007":    "Line 75 — 2025 CA estimated tax (payment 1)",
  "540NR_form_4008":    "Line 76 — 2025 CA estimated tax (payment 2)",
  "540NR_form_4009":    "Line 77 — 2025 CA estimated tax (payment 3)",
  "540NR_form_4010":    "Line 78 — 2025 CA estimated tax (payment 4)",
  "540NR_form_4011":    "Line 79 — Withholding from Form 593 (real estate withholding)",
  "540NR_form_4012":    "Line 80 — Withholding from S-Corp / Partnership",
  "540NR_form_4013":    "Line 81 — Other CA withholding",
  "540NR_form_4014":    "Line 82 — Credit from joint return (separate filing)",
  "540NR_form_4015":    "Line 83 — Amount paid with extension (FTB 3519)",
  "540NR_form_4016":    "Line 84 — Nonresident withholding credit (FTB 3840)",
  "540NR_form_4017":    "Line 85 — Credit for prior-year AMT",
  "540NR_form_4018":    "Line 86 — Credits from Schedule P",
  "540NR_form_4019":    "Line 87 — Other refundable credits",
  "540NR_form_4020":    "Line 88 — Subtotal",
  "540NR_form_4021":    "Line 89 — Amount paid with original return (amended return only)",
  "540NR_form_4022":    "Line 90 — Total payments (sum of all lines above)",

  // ── Page 5: Refund or Amount Owed ─────────────────────────────────────────
  // 5001 is the FIRST right-col field on page 5 (top=82) = net CA tax
  // 5011 is further down (top=310, use-tax section) — NOT the net CA tax field
  "540NR_form_5001":    "Net CA tax transferred from page 3 (top=82, first right-col field)",
  "540NR_form_5002":    "Total payments transferred from page 4 (top=118)",
  "540NR_form_5003 CB": "Refund type checkbox A",
  "540NR_form_5004 CB": "Refund type checkbox B",
  "540NR_form_5005":    "Line 93 — Overpayment (if total payments > net CA tax)",
  "540NR_form_5006":    "Line 94 — Refund amount",
  "540NR_form_5007":    "Line 95 — Amount applied to 2026 estimated tax",
  "540NR_form_5008":    "Use tax (CA Board of Equalization)",
  "540NR_form_5009":    "Line 96 — Amount you owe (if net CA tax > total payments)",
  "540NR_form_5010A CB":"Interest / penalty checkbox A",
  "540NR_form_5010B CB":"Interest / penalty checkbox B",
  "540NR_form_5011":    "Use-tax section mid-page field (top=310, NOT net CA tax — do not confuse with 5001)",
  "540NR_form_5012":    "Line 97 — Underpayment of estimated tax penalty",
  "540NR_form_5013":    "Line 98 — Total amount owed (line 96 + 97)",
  "540NR_form_5014A CB":"Voluntary contribution checkbox A",
  "540NR_form_5014B CB":"Voluntary contribution checkbox B",
  "540NR_form_5015":    "Total payments after adjustment",
  "540NR_form_5016 CB": "Use tax checkbox",
  "540NR_form_5017 RB": "Bank routing / direct deposit — Yes / No",

  // ── Page 6: Signature block ───────────────────────────────────────────────
  // 6001 is a narrow (w=80) mid-page field (top=142) — unknown purpose, do not use for name
  // 6002 is the wide left-aligned name field (top=178, left=97, w=354) — taxpayer name
  // 6003 is the date field on the same row (top=178, left=463, w=111)
  "540NR_form_6001":    "Narrow mid-page field (top=142 left=269 w=80 — NOT taxpayer name)",
  "540NR_form_6002":    "Taxpayer name (wide, top=178 left=97 w=354)",
  "540NR_form_6003":    "Date signed (top=178 left=463 w=111)",
  "540NR_form_6003b":   "Taxpayer email address",
  "540NR_form_6003c":   "Taxpayer daytime phone number",
  "540NR_form_6004":    "Spouse / RDP name (signature line)",
  "540NR_form_6005":    "Date signed (spouse / RDP)",
  "540NR_form_6006":    "Spouse / RDP occupation",
  "540NR_form_6007":    "Paid preparer's name",
  "540NR_form_6008 RB": "Paid preparer — Yes / No",
  "540NR_form_6009":    "Paid preparer PTIN",
  "540NR_form_6010":    "Paid preparer firm name / address",
};

const data = JSON.parse(readFileSync(jsonPath, "utf8"));
for (const field of data.fields) {
  field.fieldName = nameToFieldName[field.name] ?? "";
}
writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
console.log(`Updated fieldName for ${data.fields.length} fields in ${jsonPath}.`);
