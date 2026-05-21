import type { FormDocuments } from "./types";
import { amt, parseAddress } from "./types";
import { computeAZ140NRTax } from "@/lib/tax-engine";

/**
 * Maps extracted document data to Arizona Form 140NR AcroForm fields.
 *
 * Field names taken verbatim from the PDF AcroForm (see scripts/output/az140nr-layout.json).
 * Visual reference: scripts/output/az140nr-debug.pdf.
 * Form structure verified against the actual AZDOR 140NR 2025 scan.
 *
 * --------------------------------------------------------------------------
 * PAGE 1 — Personal information (yFromTop 55–156)
 *   FY_End Year   Tax year (4-digit)                  (top=58, left=528)
 *   1a            Last name                           (top=84, left=51)
 *   1b            First name + MI                     (top=85, left=288)
 *   1c            SSN / ITIN                          (top=84, left=474)
 *   2a            Street address                      (top=131, left=51)
 *   2b            Apt / unit                          (top=131, left=346)
 *   City, Town, Post Office                           (top=155, left=52)
 *   State                                             (top=155, left=210)
 *   ZIP Code                                          (top=155, left=307)
 *   Last Names 4 years                                (top=156, left=399)
 *
 * PAGE 1 — Filing Status / Residency (yFromTop 171–282)
 *   Filing Status  radiogroup — empty options; cannot be set via pdf-lib
 *   Res Status     radiogroup — Choice1=Resident, Choice2=Part-Year, Choice3=Nonresident
 *   8              Self exemption count (1 for single filer)  (top=241)
 *
 * PAGE 1 — Income section (dual columns: Federal | Arizona) (yFromTop 407–539)
 *   14             Checkbox: military spouse relief — DO NOT SET for NRA
 *   15Fed          Federal wages (W-2 Box 1 total)   (top=419, left=404)
 *   15State        AZ wages (W-2 Box 16 where state=AZ) (top=419, left=490)
 *   16Fed–22State  Other income lines (interest, dividends, etc.) — left blank
 *   23Fed          Total federal income (sum lines 15-22 Fed) (top=515, left=404)
 *   23State        Total AZ income (sum lines 15-22 AZ)       (top=515, left=491)
 *   24Fed / 24State  Federal adjustments — left blank
 *   25Fed          Federal AGI (23Fed - 24Fed)                (top=539, left=404)
 *
 * PAGE 1 — AZ Gross Income / Ratio (yFromTop 551–563)
 *   26             AZ gross income (23State - 24State)        (top=551, left=490)
 *   27             AZ income ratio (Line 26 / Line 25, ≤1.000) (top=563, left=501)
 *                  NOTE: This is a DECIMAL RATIO, not a dollar amount!
 *
 * PAGE 1 — Additions to AZ Gross Income (yFromTop 575–635)
 *   28 / 28S       Small Business Income (Form 140NR-SBI) — DO NOT SET
 *   29             Modified AZ gross income (Line 26 - Line 28) (top=587)
 *   30             Total depreciation included in AZ gross — blank
 *   31             Partnership income adjustment — blank
 *   32             Other additions — blank
 *   33             Subtotal: Add lines 29+30+31+32              (top=635)
 *
 * PAGE 1 — Capital Gains Subtractions (yFromTop 647–743)
 *   34–42          Capital gains computation — left blank for W-2-only NRA
 *
 * --------------------------------------------------------------------------
 * PAGE 2 — Additional Subtractions (yFromTop 61–157)
 *   43–52          Additional subtractions from AZ gross income — blank for basic case
 *
 * PAGE 2 — Deductions (yFromTop 169–205)
 *   53             Standard or itemized deduction amount       (top=181, left=497)
 *   Itemized/Standard  radiogroup: select standard option
 *   54             Personal exemption credit amount            (top=194, left=497)
 *   54C            Checkbox: claiming personal exemption       (top=195)
 *   55             AZ taxable income                           (top=205, left=497)
 *
 * PAGE 2 — Tax Computation (yFromTop 217–290)
 *   56             AZ income tax (2.5% × Line 55)              (top=217)
 *   57             Tax recapture — blank
 *   58             Subtotal (= Line 56 for basic case)         (top=242)
 *   59–60          Credits — blank for basic W-2 case
 *   61             Balance of tax after credits (= Line 58)    (top=278)
 *   62             Other reductions — blank
 *
 * PAGE 2 — Payments (yFromTop ~314–386)
 *   64             AZ income tax withheld from W-2             (top=314, left=496)
 *   66             Total payments (= Line 64 for basic case)   (top=338, left=496)
 *   NOTE: Fields 64 and 66 are tentative; verify against az140nr-debug.pdf
 *
 * PAGE 2 — Balance (yFromTop ~483–544)
 *   85             Tax due (when tax > payments)               (top=483, left=497)
 *   86             Overpayment (when payments > tax)           (top=495, left=496)
 *   87             Refund amount                               (top=544, left=497)
 *   NOTE: Fields 85/86/87 are tentative; verify against az140nr-debug.pdf
 *
 * PAGE 2 — Signature block (yFromTop 679)
 *   91             Taxpayer printed name                       (top=679, left=65)
 *   92             Date signed                                 (top=679, left=426)
 */
export function mapToF140NR(docs: FormDocuments): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  const { passport, w2 } = docs;

  const c = computeAZ140NRTax(docs);

  // -------------------------------------------------------------------------
  // Page 1 — Personal information
  // -------------------------------------------------------------------------

  v["FY_End Year"] = w2?.tax_year ?? "2024";

  v["1a"] = passport?.surname ?? "";
  const givenParts = (passport?.given_names ?? "").split(" ");
  const firstName  = givenParts[0] ?? "";
  const middleInit = givenParts.length > 1 ? givenParts[givenParts.length - 1].charAt(0) : "";
  v["1b"] = middleInit ? `${firstName} ${middleInit}` : firstName;

  v["1c"] = docs.ssn ?? "";

  const addr = parseAddress(w2?.employee?.address);
  if (addr.city) {
    v["2a"]                      = addr.street;
    if (addr.apt) v["2b"]        = addr.apt;
    v["City, Town, Post Office"] = addr.city;
    v["State"]                   = addr.state;
    v["ZIP Code"]                = addr.zip;
  } else if (addr.street) {
    v["2a"] = addr.street;
  }

  if (passport?.surname) v["Last Names 4 years"] = passport.surname;

  // -------------------------------------------------------------------------
  // Page 1 — Filing Status / Residency
  // "Choice3" = Nonresident (verified from PDF radio options)
  // Filing Status radio has empty options — cannot be set via pdf-lib
  // Line 14 is the military spouse checkbox — DO NOT set for NRA filer
  // -------------------------------------------------------------------------
  v["Res Status"] = "Choice3";
  v["8"] = "1"; // self exemption count (single filer)

  // -------------------------------------------------------------------------
  // Page 1 — Income (dual columns: Federal / Arizona)
  //
  // For a W-2-only NRA filer, all income is wages, so:
  //   Line 15 = wages from W-2 (the only income line with values)
  //   Lines 16-22 = other income types — left blank
  //   Line 23 = total income = Line 15 (no other income)
  //   Line 24 = federal adjustments — left blank (no AZ-specific adjustments)
  //   Line 25 = Federal AGI = Line 23 Fed - Line 24 Fed = federalAgi
  //   Line 26 = AZ gross income = Line 23 AZ - Line 24 AZ = azWages
  //   Line 27 = AZ income ratio = Line 26 / Line 25 (decimal ≤ 1.000, NOT dollars)
  // -------------------------------------------------------------------------
  if (c.federalAgi) {
    v["15Fed"]  = amt(c.federalAgi);
    v["23Fed"]  = amt(c.federalAgi); // Line 23 Fed = Line 15 Fed (W-2 only)
    v["25Fed"]  = amt(c.federalAgi); // Federal AGI
  }
  if (c.azWages) {
    v["15State"] = amt(c.azWages);
    v["23State"] = amt(c.azWages);   // Line 23 AZ = Line 15 AZ (W-2 only)
    v["26"]      = amt(c.azWages);   // AZ gross income
  }

  // Line 27: AZ income ratio — this is a DECIMAL ratio (e.g. "0.8500"), not dollars
  v["27"] = c.azAllocationRatio.toFixed(4);

  // -------------------------------------------------------------------------
  // Page 1 — Additions to AZ Gross Income (lines 28-33)
  //
  // Line 28 / 28S: Small Business Income from Form 140NR-SBI — DO NOT set.
  //   (28S is the checkbox for filing the Small Business form, NOT a standard
  //    deduction checkbox as previously believed.)
  //
  // Line 29: Modified AZ gross income = Line 26 - Line 28 = AZ wages - 0 = AZ wages
  // Lines 30-32: Depreciation / partnership / other additions — left blank
  // Line 33: Subtotal = Lines 29+30+31+32 = AZ wages for basic W-2 case
  // -------------------------------------------------------------------------
  if (c.azWages) {
    v["29"] = amt(c.azWages); // Line 29 = AZ gross - Small Biz (0) = AZ gross
    v["33"] = amt(c.azWages); // Line 33 = 29+30+31+32 = AZ wages for simple case
  }

  // Lines 34-42: Capital gains subtractions — left blank (no capital gains for basic NRA)

  // -------------------------------------------------------------------------
  // Page 2 — Additional Subtractions (lines 43-52)
  // All left blank for basic W-2-only NRA case.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Page 2 — Deductions
  //
  // Line 53: Standard deduction ($14,600 single filer 2024)
  //   Itemized/Standard radio: select standard option
  //   NOTE: The exact option name for "Standard" is tentative; verify against
  //         az140nr-debug.pdf by checking which radio value fills when "Standard"
  //         is selected.
  // Line 54: Personal exemption credit ($100 × allocation ratio)
  //   54C checkbox: checked (claiming the personal exemption)
  // Line 55: AZ taxable income (AZ gross income - subtractions - deductions - exemption)
  // -------------------------------------------------------------------------
  if (c.azStandardDeduction) {
    v["53"] = amt(c.azStandardDeduction);
    // TODO: verify "Choice2" is the "Standard" option (vs "Choice1" = Itemized)
    // Check az140nr-debug.pdf page 2 near field 53 to confirm.
    v["Itemized/Standard"] = "Choice2";
  }
  if (c.azPersonalExemptionCredit) {
    v["54"]  = amt(c.azPersonalExemptionCredit);
    v["54C"] = true;
  }
  if (c.azTaxableIncome) v["55"] = amt(c.azTaxableIncome);

  // -------------------------------------------------------------------------
  // Page 2 — Tax Computation
  //
  // Line 56: AZ income tax (2.5% flat rate × Line 55)
  // Line 57: Tax recapture from prior year credits — blank
  // Line 58: Subtotal (= Line 56 for basic case, no recapture)
  // Lines 59-60: Family income credit, Form 301 credits — blank
  // Line 61: Balance of tax after credits (= Line 58 for basic case)
  // Line 62: Other reductions — blank
  // -------------------------------------------------------------------------
  if (c.azTax)    v["56"] = amt(c.azTax);
  if (c.azTax)    v["58"] = amt(c.azTax);    // Subtotal = Line 56 + recapture(0)
  if (c.azNetTax) v["61"] = amt(c.azNetTax); // Balance after credits

  // -------------------------------------------------------------------------
  // Page 2 — Payments
  //
  // TODO: Verify field numbers 64 and 66 against az140nr-debug.pdf page 2.
  //   Field 64 (top=314): likely "AZ income tax withheld from W-2"
  //   Field 66 (top=338): likely "Total payments" (= withholding for basic case)
  // -------------------------------------------------------------------------
  if (c.azWithheld) {
    v["64"] = amt(c.azWithheld); // AZ withholding from W-2 — tentative field
    v["66"] = amt(c.azWithheld); // Total payments — tentative field
  }

  // -------------------------------------------------------------------------
  // Page 2 — Balance (Refund / Amount Due)
  //
  // TODO: Verify field numbers 85/86/87 against az140nr-debug.pdf page 2.
  //   Field 85 (top=483): tentative — tax due (when tax > payments)
  //   Field 86 (top=495): tentative — overpayment (when payments > tax)
  //   Field 87 (top=544): tentative — refund amount
  // -------------------------------------------------------------------------
  if (c.azAmountOwed)  v["85"] = amt(c.azAmountOwed);
  if (c.azOverpayment) v["86"] = amt(c.azOverpayment);
  if (c.azRefund)      v["87"] = amt(c.azRefund);

  // Direct deposit — routing number, account type, account number
  if (c.azRefund && docs.bankDetail) {
    v["Routing Number"] = docs.bankDetail.routingNumber;
    v["Account Number"] = docs.bankDetail.accountNumber;
    // "Refund" radio: Choice1 = Checking, Choice2 = Savings
    v["Refund"] = docs.bankDetail.accountType === "checking" ? "Choice1" : "Choice2";
  }

  // -------------------------------------------------------------------------
  // Page 2 — Signature block
  // -------------------------------------------------------------------------
  const fullName = [passport?.given_names, passport?.surname]
    .filter(Boolean)
    .join(" ");
  if (fullName) v["91"] = fullName;
  v["92"] = new Date().toISOString().slice(0, 10);

  return v;
}
