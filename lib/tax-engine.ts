/**
 * Centralized tax calculation engine.
 *
 * Pure module — no DB, no HTTP, no side effects.
 * Receives extracted document data and returns computed tax values.
 * Used by f1040nr.ts, f540nr.ts, f140nr.ts, and any future form mappers.
 */

import type { PassportExtraction, W2Extraction } from "@/extraction/prompts";
import type { FormDocuments } from "./form-mappers/types";
import { parseNum, taxRound } from "./form-mappers/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * String-valued keys of W2Extraction. Used to constrain sumField() so only
 * summable scalar fields (wages, withholding, etc.) can be passed — not
 * object or array fields like `employer`, `state_local`, or `box_12`.
 */
type W2StringField = {
  [K in keyof W2Extraction]-?: W2Extraction[K] extends string ? K : never;
}[keyof W2Extraction];

/**
 * Sums a single numeric string field across all W-2s and applies IRS rounding.
 * Returns 0 when the array is empty (zero-W-2 case).
 */
function sumField(w2s: W2Extraction[], field: W2StringField): number {
  return taxRound(w2s.reduce((acc, w) => acc + parseNum(w[field]), 0));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaxBracket = { min: number; max: number; rate: number };

export type TaxComputation = {
  wages: number;            // Line 1a
  ssTips: number;           // Line 1c
  depCare: number;          // Line 1e
  allocatedTips: number;    // Line 1h
  totalWages: number;       // Line 1z
  otherIncome: number;      // Line 8
  totalIncome: number;      // Line 9 (total ECI)
  agi: number;              // Line 11a/11b
  isIndianNational: boolean;
  standardDeduction: number; // Line 12 (0 if not eligible)
  totalDeductions: number;   // Line 14
  taxableIncome: number;     // Line 15
  tax: number;               // Line 16
  totalTax: number;          // Line 24
  federalWithheld: number;   // Line 25a
  totalPayments: number;     // Line 33
  overpayment: number;       // Line 34
  refund: number;            // Line 35a
  amountOwed: number;        // Line 36
};

// ---------------------------------------------------------------------------
// 2025 federal tax brackets — Single filer
// ---------------------------------------------------------------------------

const FEDERAL_BRACKETS_2025_SINGLE: TaxBracket[] = [
  { min: 0,      max: 11925,    rate: 0.10 },
  { min: 11925,  max: 48475,    rate: 0.12 },
  { min: 48475,  max: 103350,   rate: 0.22 },
  { min: 103350, max: 197300,   rate: 0.24 },
  { min: 197300, max: 250525,   rate: 0.32 },
  { min: 250525, max: 626350,   rate: 0.35 },
  { min: 626350, max: Infinity, rate: 0.37 },
];

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Progressive bracket tax calculation.
 * Returns tax rounded to the nearest cent.
 */
export function computeFederalTax(
  taxableIncome: number,
  brackets: TaxBracket[]
): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }
  return taxRound(tax);
}

const INDIA_IDENTIFIERS = new Set(["india", "indian", "ind", "in"]);

/**
 * Returns true if the passport belongs to an Indian citizen.
 * Checks nationality, country_code, and issuing_country (case-insensitive).
 */
export function isIndianCitizen(passport: PassportExtraction | null): boolean {
  if (!passport) return false;
  const fields = [passport.nationality, passport.country_code, passport.issuing_country];
  return fields.some(
    (v) => typeof v === "string" && INDIA_IDENTIFIERS.has(v.trim().toLowerCase())
  );
}

/**
 * Standard deduction for eligible filers.
 * Indian nationals may claim the US-India tax treaty Art. 21(2) deduction.
 * Returns 0 for non-Indian nationals (NRAs generally cannot claim it).
 */
export function getStandardDeduction(
  taxYear: number,
  isIndianNational: boolean
): number {
  if (!isIndianNational) return 0;
  return taxYear >= 2025 ? 15000 : 14600;
}

/**
 * Returns the federal tax bracket table for the given tax year.
 * Currently only 2025 is supported; falls back to 2025 for future years.
 */
export function getBracketsForYear(taxYear: number): TaxBracket[] {
  if (taxYear >= 2025) return FEDERAL_BRACKETS_2025_SINGLE;
  throw new Error(`No federal bracket table available for tax year ${taxYear}. Only 2025+ is supported.`);
}

// ---------------------------------------------------------------------------
// Top-level orchestrator
// ---------------------------------------------------------------------------

/**
 * Computes all 1040-NR tax values from extracted document data.
 * Single NRA filer flow.
 */
export function compute1040NRTax(docs: FormDocuments): TaxComputation {
  const { passport, w2, w2All } = docs;

  // tax_year is an identity field — always taken from the primary W-2
  const taxYearNum = parseInt(w2?.tax_year ?? "2025", 10);

  // Income components — aggregated across ALL W-2s
  const wages           = sumField(w2All, "wages_tips_other");
  const ssTips          = sumField(w2All, "social_security_tips");
  const depCare         = sumField(w2All, "dependent_care_benefits");
  const allocatedTips   = sumField(w2All, "allocated_tips");
  const otherIncome     = sumField(w2All, "nonqualified_plans"); // Line 8 (Schedule 1)
  const federalWithheld = sumField(w2All, "federal_income_tax_withheld");

  const totalWages  = taxRound(wages + ssTips + depCare + allocatedTips);
  const totalIncome = taxRound(totalWages + otherIncome);
  const agi         = totalIncome; // No above-the-line adjustments for basic NRA case

  // Deductions
  const isIndianNational  = isIndianCitizen(passport);
  const standardDeduction = getStandardDeduction(taxYearNum, isIndianNational);
  const totalDeductions   = standardDeduction;
  const taxableIncome     = taxRound(Math.max(0, agi - totalDeductions));

  // Tax
  const brackets  = getBracketsForYear(taxYearNum);
  const tax       = computeFederalTax(taxableIncome, brackets); // already taxRound'd inside
  const totalTax  = tax;

  // Payments and balance
  const totalPayments = federalWithheld;
  const balance       = totalPayments - totalTax;
  const overpayment   = balance > 0 ? taxRound(balance) : 0;
  const refund        = overpayment;
  const amountOwed    = balance < 0 ? taxRound(Math.abs(balance)) : 0;

  return {
    wages,
    ssTips,
    depCare,
    allocatedTips,
    totalWages,
    otherIncome,
    totalIncome,
    agi,
    isIndianNational,
    standardDeduction,
    totalDeductions,
    taxableIncome,
    tax,
    totalTax,
    federalWithheld,
    totalPayments,
    overpayment,
    refund,
    amountOwed,
  };
}

// ---------------------------------------------------------------------------
// Arizona 2024/2025 flat tax
// ---------------------------------------------------------------------------

// Arizona personal exemption credit for a single nonresident filer (prorated)
const AZ_PERSONAL_EXEMPTION_CREDIT = 100;

// ---------------------------------------------------------------------------
// AZ 140NR computation type
// ---------------------------------------------------------------------------

export type AZ140NRComputation = {
  federalAgi: number;
  azWages: number;
  azAdjustedGrossIncome: number;
  azStandardDeduction: number;
  azTaxableIncome: number;
  azAllocationRatio: number;      // AZ income / federal AGI, capped at 1.0
  azPersonalExemptionCredit: number; // $100 × allocation ratio
  azTax: number;                  // 2.5% flat rate
  azNetTax: number;               // after personal exemption credit
  azWithheld: number;
  azOverpayment: number;
  azRefund: number;
  azAmountOwed: number;
};

// ---------------------------------------------------------------------------
// AZ 140NR top-level orchestrator
// ---------------------------------------------------------------------------

/**
 * Computes all AZ Form 140NR tax values from extracted document data.
 * Single NRA filer, nonresident flow.
 *
 * Key assumptions:
 *   - AZ flat rate 2.5% applies to all taxable income (2024+)
 *   - AZ AGI = AZ wages from W-2 Box 15/16 (no AZ-specific adjustments)
 *   - Standard deduction: $14,600 single (2024) — NRA eligibility TBD; included
 *     per plan specification and subject to legal review
 *   - Personal exemption credit: $100 × allocation ratio (nonresident proration)
 *   - Allocation ratio: AZ wages / federal AGI, capped at 1.0
 */
export function computeAZ140NRTax(docs: FormDocuments): AZ140NRComputation {
  const { w2All } = docs;

  // Aggregate AZ wages and AZ income tax withheld across all W-2s
  let azWagesRaw = 0;
  let azWithheldRaw = 0;
  for (const w of w2All) {
    for (const sl of w.state_local ?? []) {
      if (sl.state.toUpperCase() === "AZ") {
        azWagesRaw    += parseNum(sl.state_wages);
        azWithheldRaw += parseNum(sl.state_income_tax);
      }
    }
  }
  const azWages    = taxRound(azWagesRaw);
  const azWithheld = taxRound(azWithheldRaw);

  // Federal AGI from the 1040-NR computation (aggregated across all W-2s)
  const { agi: federalAgi } = compute1040NRTax(docs);

  // AZ adjusted gross income — for a nonresident with only W-2 wages,
  // AZ AGI equals AZ wages (no AZ-specific additions or subtractions)
  const azAdjustedGrossIncome = azWages;

  // Allocation ratio (AZ income / federal AGI), used to prorate the
  // personal exemption credit for nonresidents; capped at 1.0
  const azAllocationRatio =
    federalAgi > 0
      ? Math.min(1.0, azWages / federalAgi)
      : azWages > 0 ? 1.0 : 0;

  // Arizona standard deduction — single filer 2024: $14,600, but nonresidents
  // must prorate it by the AZ income ratio (AZ gross / federal AGI).
  // Unlike federal 1040-NR (which bars most NRAs from the SD entirely), AZ
  // allows the deduction but apportions it to AZ-source income only.
  const azStandardDeduction = taxRound(14600 * azAllocationRatio);

  // AZ taxable income: AZ AGI minus standard deduction
  const azTaxableIncome = taxRound(Math.max(0, azAdjustedGrossIncome - azStandardDeduction));

  // AZ tax: flat 2.5% rate (effective 2023+, no brackets)
  const azTax = taxRound(azTaxableIncome * 0.025);

  // Personal exemption credit: $100 × allocation ratio (nonresident proration)
  const azPersonalExemptionCredit = taxRound(AZ_PERSONAL_EXEMPTION_CREDIT * azAllocationRatio);

  // Net AZ tax after personal exemption credit (not less than 0)
  const azNetTax = taxRound(Math.max(0, azTax - azPersonalExemptionCredit));

  // Payments and balance
  const balance      = azWithheld - azNetTax;
  const azOverpayment = balance > 0 ? taxRound(balance) : 0;
  const azRefund      = azOverpayment;
  const azAmountOwed  = balance < 0 ? taxRound(Math.abs(balance)) : 0;

  return {
    federalAgi,
    azWages,
    azAdjustedGrossIncome,
    azStandardDeduction,
    azTaxableIncome,
    azAllocationRatio,
    azPersonalExemptionCredit,
    azTax,
    azNetTax,
    azWithheld,
    azOverpayment,
    azRefund,
    azAmountOwed,
  };
}

// ---------------------------------------------------------------------------
// California 2025 tax brackets — Single filer
// ---------------------------------------------------------------------------

export const CA_BRACKETS_2025_SINGLE: TaxBracket[] = [
  { min: 0,       max: 10756,    rate: 0.01  },
  { min: 10756,   max: 25499,    rate: 0.02  },
  { min: 25499,   max: 40245,    rate: 0.04  },
  { min: 40245,   max: 55866,    rate: 0.06  },
  { min: 55866,   max: 70606,    rate: 0.08  },
  { min: 70606,   max: 360659,   rate: 0.093 },
  { min: 360659,  max: 432787,   rate: 0.103 },
  { min: 432787,  max: 721314,   rate: 0.113 },
  { min: 721314,  max: Infinity, rate: 0.123 },
];

// 2025 CA personal exemption credit (single filer)
const CA_PERSONAL_EXEMPTION_CREDIT_2025 = 144;
// Mental Health Services Tax: 1% surcharge on CA taxable income over $1,000,000
const CA_MHST_THRESHOLD_2025 = 1_000_000;
const CA_MHST_RATE = 0.01;

// ---------------------------------------------------------------------------
// CA 540NR computation type
// ---------------------------------------------------------------------------

export type CA540NRComputation = {
  federalAgi: number;
  caWages: number;
  caAdjustedGrossIncome: number;
  caStandardDeduction: number;
  caTaxableIncome: number;
  caProrationRatio: number;     // CA income / total federal income (0–1)
  caTaxBeforeCredits: number;
  caMhst: number;
  caExemptionCredit: number;    // prorated personal exemption credit
  caNetTax: number;
  caSdi: number;                // CA SDI withheld (from W-2 Box 14)
  caWithheld: number;           // CA income tax withheld (from W-2 Box 17)
  caOverpayment: number;
  caRefund: number;
  caAmountOwed: number;
};

// ---------------------------------------------------------------------------
// CA SDI helper
// ---------------------------------------------------------------------------

/**
 * Extracts the CA SDI amount from W-2 Box 14 free-text.
 * Handles labels like "CASDI 234.56", "CA SDI: 234.56", "CASDI-234.56".
 */
function parseCaSdi(box14: string | undefined | null): number {
  if (!box14) return 0;
  const m = box14.match(/(?:CA\s*SDI|CASDI)\s*[:\-]?\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return 0;
  return parseNum(m[1].replace(/,/g, ""));
}

// ---------------------------------------------------------------------------
// CA 540NR top-level orchestrator
// ---------------------------------------------------------------------------

/**
 * Computes all CA 540NR tax values from extracted document data.
 * Single NRA filer, nonresident flow.
 *
 * Key simplifications for the basic NRA case:
 *   - No CA-specific income additions or subtractions
 *   - CA AGI = CA wages from W-2 state_local (Box 15)
 *   - No CA standard deduction (NRA nonresidents are not eligible)
 *   - Proration ratio = CA wages / federal AGI (capped at 1.0)
 *   - Balance uses CA income tax withheld only (SDI credit applies only
 *     to excess withholding from multiple employers)
 */
export function compute540NRTax(docs: FormDocuments): CA540NRComputation {
  const { w2All } = docs;

  // Federal AGI from the 1040-NR computation (already aggregated across w2All)
  const { agi: federalAgi } = compute1040NRTax(docs);

  // CA wages and income tax withheld — aggregate CA entries across ALL W-2s
  let caWagesRaw = 0;
  let caWithheldRaw = 0;
  for (const w of w2All) {
    for (const sl of w.state_local ?? []) {
      if (sl.state.toUpperCase() === "CA") {
        caWagesRaw    += parseNum(sl.state_wages);
        caWithheldRaw += parseNum(sl.state_income_tax);
      }
    }
  }
  const caWages    = taxRound(caWagesRaw);
  const caWithheld = taxRound(caWithheldRaw);

  // CA SDI from Box 14 — aggregate across ALL W-2s
  const caSdi = taxRound(w2All.reduce((sum, w) => sum + parseCaSdi(w.box_14), 0));

  // CA adjusted gross income (= CA wages for basic NRA, no adjustments)
  const caAdjustedGrossIncome = caWages;

  // NRA nonresidents cannot claim the CA standard deduction
  const caStandardDeduction = 0;

  // CA taxable income
  const caTaxableIncome = taxRound(
    Math.max(0, caAdjustedGrossIncome - caStandardDeduction)
  );

  // Proration ratio: CA source income / total federal income, capped at 1.0
  const caProrationRatio =
    federalAgi > 0 ? Math.min(1.0, caWages / federalAgi) : caWages > 0 ? 1.0 : 0;

  // CA tax from 2025 brackets
  const caTaxBeforeCredits = computeFederalTax(
    caTaxableIncome,
    CA_BRACKETS_2025_SINGLE
  );

  // Mental Health Services Tax (1% on CA taxable income over $1M)
  const caMhst =
    caTaxableIncome > CA_MHST_THRESHOLD_2025
      ? taxRound((caTaxableIncome - CA_MHST_THRESHOLD_2025) * CA_MHST_RATE)
      : 0;

  // Prorated personal exemption credit: $144 × proration ratio
  const caExemptionCredit = taxRound(
    CA_PERSONAL_EXEMPTION_CREDIT_2025 * caProrationRatio
  );

  // Net CA tax after exemption credit (not less than 0)
  const caNetTax = taxRound(
    Math.max(0, caTaxBeforeCredits + caMhst - caExemptionCredit)
  );

  // Balance: CA income tax withheld vs. CA tax owed
  const balance      = caWithheld - caNetTax;
  const caOverpayment = balance > 0 ? taxRound(balance)      : 0;
  const caRefund      = caOverpayment;
  const caAmountOwed  = balance < 0 ? taxRound(Math.abs(balance)) : 0;

  return {
    federalAgi,
    caWages,
    caAdjustedGrossIncome,
    caStandardDeduction,
    caTaxableIncome,
    caProrationRatio,
    caTaxBeforeCredits,
    caMhst,
    caExemptionCredit,
    caNetTax,
    caSdi,
    caWithheld,
    caOverpayment,
    caRefund,
    caAmountOwed,
  };
}
