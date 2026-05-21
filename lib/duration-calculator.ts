import type { TravelHistoryExtraction } from "@/extraction/prompts";

type TravelRecord = TravelHistoryExtraction["records"][number];

export type TripSummary = {
  arrival: string;
  departure: string; // YYYY-MM-DD or "present" if still in US
  days: number;
};

export type YearSummary = {
  year: number;
  totalDays: number;
  firstArrival: string; // first day present in this year (YYYY-MM-DD)
  lastDeparture: string; // last day present in this year (YYYY-MM-DD)
  trips: TripSummary[];
};

/**
 * Pairs each Arrival record with the next chronological Departure,
 * then computes per-year overlap for every year spanned by the travel history.
 *
 * An unpaired Arrival (no subsequent Departure) is treated as "still in the US"
 * and capped at today's date for day counting.
 *
 * Returns one YearSummary per year that has at least one day of US presence,
 * sorted ascending. All years found in the records are included — not just
 * a fixed list — so callers can pick whichever years they need.
 */
export function computeDaysFromTravelHistory(
  records: TravelRecord[]
): YearSummary[] {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Sort ascending by date
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  // Pair each Arrival with the next Departure (greedy, in-order scan)
  type Trip = { arrival: string; departure: string; isOpen: boolean };
  const trips: Trip[] = [];

  let pendingArrival: string | null = null;
  for (const r of sorted) {
    const rtype = r.type.toLowerCase();
    if (rtype.includes("arrival")) {
      pendingArrival = r.date;
    } else if (rtype.includes("departure") && pendingArrival !== null) {
      trips.push({ arrival: pendingArrival, departure: r.date, isOpen: false });
      pendingArrival = null;
    }
  }
  // Unpaired arrival — still in the US
  if (pendingArrival !== null) {
    trips.push({ arrival: pendingArrival, departure: today, isOpen: true });
  }

  if (trips.length === 0) return [];

  // Collect every year spanned by the travel history (records + trip ranges)
  const yearsSet = new Set<number>();
  for (const r of sorted) {
    const y = parseInt(r.date.substring(0, 4), 10);
    if (!isNaN(y)) yearsSet.add(y);
  }
  for (const t of trips) {
    const startY = parseInt(t.arrival.substring(0, 4), 10);
    const endY = parseInt(t.departure.substring(0, 4), 10);
    for (let y = startY; y <= endY; y++) yearsSet.add(y);
  }

  const allYears = Array.from(yearsSet).sort((a, b) => a - b);
  const result: YearSummary[] = [];

  for (const year of allYears) {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    let totalDays = 0;
    let firstArrival = "";
    let lastDeparture = "";
    const tripSummaries: TripSummary[] = [];

    for (const trip of trips) {
      // Clamp trip to this calendar year
      const overlapStart =
        trip.arrival > yearStart ? trip.arrival : yearStart;
      const overlapEnd =
        trip.departure < yearEnd ? trip.departure : yearEnd;

      if (overlapEnd < overlapStart) continue; // no overlap with this year

      const startMs = new Date(overlapStart).getTime();
      const endMs = new Date(overlapEnd).getTime();
      const days = Math.round((endMs - startMs) / 86_400_000) + 1;

      totalDays += days;
      tripSummaries.push({
        arrival: trip.arrival,
        departure: trip.isOpen ? "present" : trip.departure,
        days,
      });

      if (!firstArrival || overlapStart < firstArrival)
        firstArrival = overlapStart;
      if (!lastDeparture || overlapEnd > lastDeparture)
        lastDeparture = overlapEnd;
    }

    if (totalDays > 0) {
      result.push({
        year,
        totalDays,
        firstArrival,
        lastDeparture,
        trips: tripSummaries,
      });
    }
  }

  return result;
}
