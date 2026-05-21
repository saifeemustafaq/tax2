"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { DurationEntry } from "@/lib/types/document";
import type { YearSummary } from "@/lib/duration-calculator";

const YEARS = [2023, 2024, 2025] as const;

type YearDates = Record<number, { arrival: string; departure: string }>;

function daysInUS(arrival: string, departure: string): number | null {
  if (!arrival || !departure) return null;
  const diff = new Date(departure).getTime() - new Date(arrival).getTime();
  if (diff < 0) return null;
  return Math.round(diff / 86_400_000) + 1;
}

export default function DurationPage() {
  const router = useRouter();
  const [dates, setDates] = useState<YearDates>(() =>
    Object.fromEntries(YEARS.map((y) => [y, { arrival: "", departure: "" }]))
  );
  const [computed, setComputed] = useState<YearSummary[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/duration")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          entries?: DurationEntry[];
          computed?: YearSummary[] | null;
        } | null) => {
          if (!data) return;

          if (data.computed) setComputed(data.computed);

          // If no manual entries saved yet, auto-fill from computed data
          if (!data.entries?.length && data.computed?.length) {
            const filled: YearDates = Object.fromEntries(
              YEARS.map((y) => [y, { arrival: "", departure: "" }])
            );
            for (const summary of data.computed) {
              if (summary.year in filled) {
                // Cap departure to year end (inputs are bounded to the year)
                const yearEnd = `${summary.year}-12-31`;
                filled[summary.year] = {
                  arrival: summary.firstArrival,
                  departure:
                    summary.lastDeparture > yearEnd
                      ? yearEnd
                      : summary.lastDeparture,
                };
              }
            }
            setDates(filled);
          } else if (data.entries?.length) {
            setDates((prev) => {
              const next = { ...prev };
              for (const e of data.entries!) {
                if (e.year in next) {
                  next[e.year] = { arrival: e.arrival, departure: e.departure };
                }
              }
              return next;
            });
          }
        }
      )
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback(
    (year: number, field: "arrival" | "departure", value: string) => {
      setDates((prev) => ({
        ...prev,
        [year]: { ...prev[year], [field]: value },
      }));
    },
    []
  );

  const applyComputed = useCallback(() => {
    if (!computed) return;
    setDates((prev) => {
      const next = { ...prev };
      for (const summary of computed) {
        if (summary.year in next) {
          const yearEnd = `${summary.year}-12-31`;
          next[summary.year] = {
            arrival: summary.firstArrival,
            departure:
              summary.lastDeparture > yearEnd ? yearEnd : summary.lastDeparture,
          };
        }
      }
      return next;
    });
  }, [computed]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const entries: DurationEntry[] = YEARS.map((year) => ({
        year,
        arrival: dates[year].arrival,
        departure: dates[year].departure,
      }));
      const res = await fetch("/api/duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Travel dates saved");
      router.push("/forms");
    } catch {
      toast.error("Failed to save travel dates");
    } finally {
      setSaving(false);
    }
  }, [dates]);

  const computedByYear = computed
    ? Object.fromEntries(computed.map((s) => [s.year, s]))
    : {};

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          US travel dates to determine SPT
        </h1>
        <p className="text-base text-muted-foreground">
          Enter your dates of arrival and departure in the US for the past
          years. F-1 students typically have a 5-year exemption for the
          Substantial Presence Test; we use these dates for your record and to
          complete Form 8843, which requires the number of days you were in the
          US in the past three years.
        </p>
      </div>

      {loaded && !computed && (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Upload your I-94 travel history document to auto-compute days in the
          US per year.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {YEARS.map((year) => {
          const minDate = `${year}-01-01`;
          const maxDate = `${year}-12-31`;
          const days = daysInUS(dates[year]?.arrival, dates[year]?.departure);
          const yearComputed = computedByYear[year];
          return (
            <Card key={year} className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">{year}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {yearComputed && (
                  <div className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                    <span className="font-semibold">
                      {yearComputed.totalDays}{" "}
                      {yearComputed.totalDays === 1 ? "day" : "days"}
                    </span>{" "}
                    from travel history &middot;{" "}
                    {yearComputed.trips.length}{" "}
                    {yearComputed.trips.length === 1 ? "trip" : "trips"}
                  </div>
                )}
                <div className="space-y-2">
                  <label
                    htmlFor={`arrival-${year}`}
                    className="text-sm font-medium text-foreground"
                  >
                    Arrival
                  </label>
                  <Input
                    id={`arrival-${year}`}
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={dates[year]?.arrival ?? ""}
                    onChange={(e) => update(year, "arrival", e.target.value)}
                    aria-label={`Arrival date for ${year}`}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor={`departure-${year}`}
                    className="text-sm font-medium text-foreground"
                  >
                    Departure
                  </label>
                  <Input
                    id={`departure-${year}`}
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={dates[year]?.departure ?? ""}
                    onChange={(e) => update(year, "departure", e.target.value)}
                    aria-label={`Departure date for ${year}`}
                  />
                </div>
                {days !== null && (
                  <p className="rounded-md bg-muted px-3 py-2 text-center text-sm font-medium text-muted-foreground">
                    {days} {days === 1 ? "day" : "days"} in the US
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
        <Button variant="outline" size="lg" asChild>
          <Link href="/documents/upload">Back</Link>
        </Button>
        <div className="flex gap-3">
          {computed ? (
            <Button
              variant="outline"
              size="lg"
              type="button"
              onClick={applyComputed}
            >
              Compute from Travel History
            </Button>
          ) : null}
          <Button
            size="lg"
            type="button"
            onClick={save}
            disabled={saving || !loaded}
          >
            {saving ? "Saving…" : "Save & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
