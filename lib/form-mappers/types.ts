import type { PassportExtraction, I20Extraction, W2Extraction } from "@/extraction/prompts";
import type {
  DurationEntry,
  VisaExtraction,
  I94Extraction,
  EadExtraction,
} from "@/lib/types/document";

export type FormDocuments = {
  passport: PassportExtraction | null;
  i20: I20Extraction | null;
  w2: W2Extraction | null;
  duration: DurationEntry[] | null;
  visa: VisaExtraction | null;
  i94: I94Extraction | null;
  ead: EadExtraction | null;
  ssn: string | null;
};

export function daysInRange(arrival: string, departure: string): number {
  const a = new Date(arrival);
  const d = new Date(departure);
  if (!Number.isFinite(a.getTime()) || !Number.isFinite(d.getTime())) return 0;
  const ms = d.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / 86_400_000) + 1);
}

export function daysForYear(
  entries: DurationEntry[] | null,
  year: number
): string {
  if (!entries) return "";
  const e = entries.find((x) => x.year === year);
  if (!e || !e.arrival || !e.departure) return "";
  return String(daysInRange(e.arrival, e.departure));
}

/**
 * IRS-compatible whole-dollar rounding.
 * Fractional part >= 0.51 → round up; < 0.51 → round down (truncate).
 * Operates in integer cents to avoid IEEE 754 floating-point comparison bugs.
 * Idempotent: taxRound(taxRound(n)) === taxRound(n).
 */
export function taxRound(n: number): number {
  if (!Number.isFinite(n) || n === 0) return 0;
  const cents = Math.round(n * 100);
  const wholeDollars = Math.trunc(cents / 100);
  const remainderCents = Math.abs(cents % 100);
  if (remainderCents === 0) return wholeDollars;
  if (cents > 0) {
    return remainderCents >= 51 ? wholeDollars + 1 : wholeDollars;
  }
  return remainderCents >= 51 ? wholeDollars - 1 : wholeDollars;
}

export function parseNum(v: string | number | undefined | null): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? taxRound(n) : 0;
}

export function amt(n: string | number | undefined | null): string {
  const num = taxRound(parseNum(n));
  return num ? String(num) : "";
}
