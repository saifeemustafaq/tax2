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

export function parseNum(v: string | number | undefined | null): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function amt(n: string | number | undefined | null): string {
  const num = parseNum(n);
  return num ? String(Math.round(num * 100) / 100) : "";
}
