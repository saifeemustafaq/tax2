/**
 * Centralized tax calculation engine.
 *
 * Pure module — no DB, no HTTP, no side effects.
 * Receives extracted document data and returns computed tax values.
 * Used by f1040nr.ts, f540nr.ts, and any future form mappers.
 */

import type { PassportExtraction } from "@/extraction/prompts";
import type { FormDocuments } from "./form-mappers/types";
import { parseNum, taxRound } from "./form-mappers/types";

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
  const { passport, w2 } = docs;

  const taxYearNum = parseInt(w2?.tax_year ?? "2025", 10);

  // Income components
  const wages           = parseNum(w2?.wages_tips_other);
  const ssTips          = parseNum(w2?.social_security_tips);
  const depCare         = parseNum(w2?.dependent_care_benefits);
  const allocatedTips   = parseNum(w2?.allocated_tips);
  const otherIncome     = parseNum(w2?.nonqualified_plans); // Line 8 (Schedule 1)
  const federalWithheld = parseNum(w2?.federal_income_tax_withheld);

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
  const { w2 } = docs;

  // Federal AGI from the 1040-NR computation
  const { agi: federalAgi } = compute1040NRTax(docs);

  // CA wages and income tax withheld from W-2 Box 15–17
  const caEntry = w2?.state_local?.find(
    (sl) => sl.state.toUpperCase() === "CA"
  );
  const caWages    = parseNum(caEntry?.state_wages);
  const caWithheld = parseNum(caEntry?.state_income_tax);

  // CA SDI from W-2 Box 14 (informational; only excess SDI from multiple
  // employers offsets income tax — shown on the form but excluded from balance)
  const caSdi = parseCaSdi(w2?.box_14);

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
