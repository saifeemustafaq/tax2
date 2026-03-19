import type { PassportExtraction, I20Extraction, W2Extraction, TravelHistoryExtraction } from "@/extraction/prompts";
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
  travelHistory: TravelHistoryExtraction | null;
  ssn: string | null;
  f1VisaEntryDate: string | null;
  institutionName: string | null;
  programDirectorName: string | null;
  institutionAddress: string | null;
  institutionPhone: string | null;
  visaHistory: Record<string, string> | null;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Converts a YYYY-MM-DD string to "DD Month YYYY" (e.g. "24 August 2026"). */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const mi = parseInt(m, 10);
  if (!y || !m || !d || !mi || mi < 1 || mi > 12) return iso;
  return `${parseInt(d, 10)} ${MONTHS[mi - 1]} ${y}`;
}

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

export function parseAddress(raw: string | undefined) {
  const out = { street: "", apt: "", city: "", state: "", zip: "" };
  if (!raw) return out;
  const m = raw.match(/^(.*),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/i);
  if (!m) {
    out.street = raw.trim();
    return out;
  }
  const pre = (m[1] || "").trim();
  out.city = (m[2] || "").trim();
  out.state = (m[3] || "").trim().toUpperCase();
  out.zip = (m[4] || "").trim();
  const tokens = pre
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  out.street = tokens.shift() || "";
  out.apt = tokens.join(", ");
  if (!out.apt) {
    const aptInline = out.street.match(/\b(?:Apt\.?|Apartment|#)\s*([\w-]+)/i);
    if (aptInline) {
      out.apt = aptInline[1];
      out.street = out.street.replace(aptInline[0], "").trim();
    }
  }
  return out;
}
