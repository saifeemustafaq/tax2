import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchFormDocuments } from "@/lib/form-mappers/fetch-docs";
import {
  compute1040NRTax,
  computeAZ140NRTax,
  compute540NRTax,
} from "@/lib/tax-engine";
import { parseNum } from "@/lib/form-mappers/types";
import { getStateTaxConfig } from "@/lib/state-tax-config";
import { Card, CardContent } from "@/components/ui/card";
import SummaryClient from "./summary-client";
import type { SummaryData, StateSummaryRow } from "./summary-client";

export default async function SummaryPage() {
  const result = await fetchFormDocuments();

  if (!result.ok) {
    redirect("/login");
  }

  const { docs } = result;

  // Empty state — no W-2 uploaded yet
  if (docs.w2All.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Tax Summary
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload your documents to see a full tax computation breakdown.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No W-2 found. Upload your documents to generate a tax summary.
            </p>
            <Link
              href="/documents/upload"
              className="text-sm font-medium underline underline-offset-4"
            >
              Go to Upload
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const taxYear = parseInt(docs.w2?.tax_year ?? "2025", 10);

  // Federal computation
  const federal = compute1040NRTax(docs);

  // Income source rows — one per W-2
  const w2Rows = docs.w2All.map((w) => ({
    employerName: w.employer.name,
    ein: w.employer.ein,
    wages: parseNum(w.wages_tips_other),
    federalWithheld: parseNum(w.federal_income_tax_withheld),
  }));

  // Detect states: unique codes with positive wages across all W-2s
  const stateCodes = new Set<string>();
  for (const w of docs.w2All) {
    for (const sl of w.state_local ?? []) {
      if (sl.state && parseNum(sl.state_wages) > 0) {
        stateCodes.add(sl.state.toUpperCase());
      }
    }
  }

  // Build per-state summary rows
  const states: StateSummaryRow[] = [];
  for (const code of stateCodes) {
    const config = getStateTaxConfig(code);
    if (!config) continue;

    // Aggregate raw wages and withheld for this state across all W-2s
    let stateWages = 0;
    let stateWithheld = 0;
    for (const w of docs.w2All) {
      for (const sl of w.state_local ?? []) {
        if (sl.state.toUpperCase() === code) {
          stateWages += parseNum(sl.state_wages);
          stateWithheld += parseNum(sl.state_income_tax);
        }
      }
    }

    let stateTaxComputed: number | null = null;
    let stateRefund: number | null = null;
    let stateAmountOwed: number | null = null;

    if (config.implemented) {
      if (code === "CA") {
        const ca = compute540NRTax(docs);
        stateTaxComputed = ca.caNetTax;
        stateRefund = ca.caRefund;
        stateAmountOwed = ca.caAmountOwed;
      } else if (code === "AZ") {
        const az = computeAZ140NRTax(docs);
        stateTaxComputed = az.azNetTax;
        stateRefund = az.azRefund;
        stateAmountOwed = az.azAmountOwed;
      }
    }

    states.push({
      stateCode: code,
      stateName: config.name,
      stateWages,
      stateWithheld,
      hasIncomeTax: config.hasIncomeTax,
      implemented: config.implemented,
      stateTaxComputed,
      stateRefund,
      stateAmountOwed,
    });
  }

  const summaryData: SummaryData = {
    w2Rows,
    federal: {
      totalWages: federal.totalWages,
      otherIncome: federal.otherIncome,
      totalIncome: federal.totalIncome,
      agi: federal.agi,
      isIndianNational: federal.isIndianNational,
      standardDeduction: federal.standardDeduction,
      taxableIncome: federal.taxableIncome,
      tax: federal.tax,
      federalWithheld: federal.federalWithheld,
      refund: federal.refund,
      amountOwed: federal.amountOwed,
    },
    states,
    taxYear,
  };

  return <SummaryClient data={summaryData} />;
}
