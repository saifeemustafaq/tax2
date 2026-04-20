"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatUSD } from "@/lib/format-currency";

// ---------------------------------------------------------------------------
// Types (also imported by page.tsx to build the props)
// ---------------------------------------------------------------------------

export type W2Row = {
  employerName: string;
  ein: string;
  wages: number;
  federalWithheld: number;
};

export type StateSummaryRow = {
  stateCode: string;
  stateName: string;
  stateWages: number;
  stateWithheld: number;
  hasIncomeTax: boolean;
  implemented: boolean;
  /** null when the state computation is not yet implemented */
  stateTaxComputed: number | null;
  stateRefund: number | null;
  stateAmountOwed: number | null;
};

export type FederalSummary = {
  totalWages: number;
  otherIncome: number;
  totalIncome: number;
  agi: number;
  isIndianNational: boolean;
  standardDeduction: number;
  taxableIncome: number;
  tax: number;
  federalWithheld: number;
  refund: number;
  amountOwed: number;
};

export type SummaryData = {
  w2Rows: W2Row[];
  federal: FederalSummary;
  states: StateSummaryRow[];
  taxYear: number;
};

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function LineRow({
  label,
  value,
  note,
  bold,
  variant,
}: {
  label: string;
  value: number;
  note?: string;
  bold?: boolean;
  variant?: "green" | "red";
}) {
  const valueClass =
    variant === "green"
      ? "text-green-600"
      : variant === "red"
      ? "text-red-600"
      : "text-foreground";

  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-1.5 ${
        bold ? "font-semibold" : ""
      }`}
    >
      <span className={`text-sm ${bold ? "" : "text-muted-foreground"}`}>
        {label}
        {note && (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground/70">
            ({note})
          </span>
        )}
      </span>
      <span className={`font-mono text-sm tabular-nums ${valueClass}`}>
        {formatUSD(value)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SummaryClient({ data }: { data: SummaryData }) {
  const { w2Rows, federal, states, taxYear } = data;

  const totalWages = w2Rows.reduce((s, r) => s + r.wages, 0);
  const totalFederalWithheld = w2Rows.reduce(
    (s, r) => s + r.federalWithheld,
    0
  );

  const incomeTaxStates = states.filter((s) => s.hasIncomeTax);
  const noTaxStates = states.filter((s) => !s.hasIncomeTax);

  // States for which we have a full computation
  const implementedStates = incomeTaxStates.filter((s) => s.implemented);
  const unimplementedStates = incomeTaxStates.filter((s) => !s.implemented);

  // Grand totals — only includes jurisdictions with a full computation
  const totalTaxOwed =
    federal.tax +
    implementedStates.reduce((sum, s) => sum + (s.stateTaxComputed ?? 0), 0);
  const totalWithheld =
    federal.federalWithheld +
    incomeTaxStates.reduce((sum, s) => sum + s.stateWithheld, 0);
  const netBalance = totalWithheld - totalTaxOwed;
  const netRefund = netBalance > 0 ? netBalance : 0;
  const netOwed = netBalance < 0 ? Math.abs(netBalance) : 0;

  const totalsArePartial = unimplementedStates.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Page heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tax Summary</h1>
        <p className="text-sm text-muted-foreground">
          Tax year {taxYear} &mdash; U.S. Nonresident Alien
        </p>
      </div>

      {/* ── Income Sources ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income Sources</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Column headings */}
          <div className="flex items-center justify-between gap-4 pb-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              Employer
            </span>
            <div className="flex shrink-0 gap-6">
              <span className="w-28 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                Wages
              </span>
              <span className="w-28 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                Fed. Withheld
              </span>
            </div>
          </div>
          <Separator />

          {/* One row per W-2 */}
          <div className="divide-y">
            {w2Rows.map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 py-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {row.employerName || "Unknown Employer"}
                  </span>
                  {row.ein && (
                    <span className="text-xs text-muted-foreground/70">
                      EIN {row.ein}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-6">
                  <span className="w-28 text-right font-mono text-sm tabular-nums">
                    {formatUSD(row.wages)}
                  </span>
                  <span className="w-28 text-right font-mono text-sm tabular-nums">
                    {formatUSD(row.federalWithheld)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total row when multiple W-2s */}
          {w2Rows.length > 1 && (
            <>
              <Separator />
              <div className="flex items-center justify-between gap-4 py-2 font-semibold">
                <span className="text-sm">Total</span>
                <div className="flex shrink-0 gap-6">
                  <span className="w-28 text-right font-mono text-sm tabular-nums">
                    {formatUSD(totalWages)}
                  </span>
                  <span className="w-28 text-right font-mono text-sm tabular-nums">
                    {formatUSD(totalFederalWithheld)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Federal Tax (1040-NR) ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Federal Tax &mdash; Form 1040-NR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LineRow label="Total Wages" value={federal.totalWages} />
          {federal.otherIncome > 0 && (
            <LineRow label="Other Income" value={federal.otherIncome} />
          )}
          <LineRow label="Total Income" value={federal.totalIncome} />
          <LineRow label="Adjusted Gross Income" value={federal.agi} />
          <Separator className="my-2" />
          {federal.standardDeduction > 0 && (
            <LineRow
              label="Standard Deduction"
              value={federal.standardDeduction}
              note={
                federal.isIndianNational ? "US-India tax treaty" : undefined
              }
            />
          )}
          <LineRow
            label="Taxable Income"
            value={federal.taxableIncome}
            bold
          />
          <Separator className="my-2" />
          <LineRow label="Federal Income Tax" value={federal.tax} />
          <LineRow label="Federal Tax Withheld" value={federal.federalWithheld} />
          <Separator className="my-2" />
          {federal.refund > 0 ? (
            <LineRow
              label="Federal Refund"
              value={federal.refund}
              bold
              variant="green"
            />
          ) : (
            <LineRow
              label="Federal Amount Owed"
              value={federal.amountOwed}
              bold
              variant="red"
            />
          )}
        </CardContent>
      </Card>

      {/* ── State Taxes ────────────────────────────────────────────────────── */}
      {incomeTaxStates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">State Taxes</h2>
          {incomeTaxStates.map((s) => (
            <Card key={s.stateCode}>
              <CardHeader>
                <CardTitle className="text-base">
                  {s.stateName} &mdash; Nonresident Return
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LineRow label="State Wages" value={s.stateWages} />
                {s.implemented && s.stateTaxComputed !== null ? (
                  <>
                    <LineRow
                      label="State Tax Computed"
                      value={s.stateTaxComputed}
                    />
                    <LineRow
                      label="State Tax Withheld"
                      value={s.stateWithheld}
                    />
                    <Separator className="my-2" />
                    {(s.stateRefund ?? 0) > 0 ? (
                      <LineRow
                        label="State Refund"
                        value={s.stateRefund!}
                        bold
                        variant="green"
                      />
                    ) : (
                      <LineRow
                        label="State Amount Owed"
                        value={s.stateAmountOwed!}
                        bold
                        variant="red"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <LineRow
                      label="State Tax Withheld"
                      value={s.stateWithheld}
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      Detailed {s.stateName} tax computation is not yet
                      available.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No-income-tax state note */}
      {noTaxStates.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Income also detected in{" "}
          {noTaxStates.map((s) => s.stateName).join(", ")} &mdash; no state
          income tax filing required.
        </p>
      )}

      {/* ── Overall Totals ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overall Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <LineRow label="Total Tax Computed" value={totalTaxOwed} />
          <LineRow label="Total Tax Withheld" value={totalWithheld} />
          <Separator className="my-2" />
          {netRefund > 0 ? (
            <LineRow
              label="Net Refund"
              value={netRefund}
              bold
              variant="green"
            />
          ) : (
            <LineRow
              label="Net Amount Owed"
              value={netOwed}
              bold
              variant="red"
            />
          )}
          {totalsArePartial && (
            <p className="mt-3 text-xs text-muted-foreground">
              Overall total excludes{" "}
              {unimplementedStates.map((s) => s.stateName).join(", ")} — state
              computation not yet available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
