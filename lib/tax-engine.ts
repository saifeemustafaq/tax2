/**
 * Centralized tax calculation engine.
 *
 * Pure module — no DB, no HTTP, no side effects.
 * Receives extracted document data and returns computed tax values.
 * Used by f1040nr.ts, f540nr.ts, and any future form mappers.
 */

import type { PassportExtraction } from "@/extraction/prompts";
import type { FormDocuments } from "./form-mappers/types";
import { parseNum } from "./form-mappers/types";

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
  return Math.round(tax * 100) / 100;
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

  const totalWages  = wages + ssTips + depCare + allocatedTips;
  const totalIncome = totalWages + otherIncome;
  const agi         = totalIncome; // No above-the-line adjustments for basic NRA case

  // Deductions
  const isIndianNational  = isIndianCitizen(passport);
  const standardDeduction = getStandardDeduction(taxYearNum, isIndianNational);
  const totalDeductions   = standardDeduction;
  const taxableIncome     = Math.max(0, agi - totalDeductions);

  // Tax
  const brackets  = getBracketsForYear(taxYearNum);
  const tax       = computeFederalTax(taxableIncome, brackets);
  const totalTax  = tax; // No additional taxes (Schedule 2) for basic case

  // Payments and balance
  const totalPayments = federalWithheld;
  const balance       = totalPayments - totalTax;
  const overpayment   = balance > 0 ? Math.round(balance * 100) / 100 : 0;
  const refund        = overpayment;
  const amountOwed    = balance < 0 ? Math.round(Math.abs(balance) * 100) / 100 : 0;

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
