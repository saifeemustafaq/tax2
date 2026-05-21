import type { FormDocuments } from "./types";
import { formatDateLong } from "./types";
import { isIndianCitizen, getStandardDeduction } from "@/lib/tax-engine";

/**
 * Schedule OI (Form 1040-NR) — Other Information.
 *
 * Field layout from scripts/output/f1040nro.json (prefix: form1040-NR[0].Page1[0]):
 *
 * Header:
 *   f1_1 = Name shown on Form 1040-NR
 *   f1_2 = Your identifying number (SSN/ITIN)
 *
 * A. f1_3 = Of what country or countries were you a citizen or national during the tax year?
 * B. f1_4 = In what country did you claim residence for tax purposes during the tax year?
 *
 * C. c1_3[0]=Yes, c1_3[1]=No — Have you ever applied to be a green card holder?
 *    f1_5 = If yes, explain
 *
 * D. c1_1[0]/c1_1[1] — Were you ever a U.S. citizen? Yes/No
 *    c1_2[0]/c1_2[1] — Were you ever a green card holder? Yes/No
 *
 * E. c1_5[0]/c1_5[1] — Subject to tax in foreign country? Yes/No
 *
 * F. c1_4[0]/c1_4[1] — Have you ever changed your visa type? f1_6 = date and nature of change
 *
 * G. LineG_Table1 (BodyRow1..4): entry/departure dates per row
 *      BodyRow1: f1_7 = visa type or date entered, f1_8 = date departed
 *      BodyRow2: f1_9 = date entered, f1_10 = date departed
 *      BodyRow3: f1_11 = date entered, f1_12 = date departed
 *      BodyRow4: f1_13 = date entered, f1_14 = date departed
 *    LineG_Table2 (BodyRow1..4): visa/immigration status changes
 *      f1_15/f1_16 Row1, f1_17/f1_18 Row2, f1_19/f1_20 Row3, f1_21/f1_22 Row4
 *
 * H. f1_23 = days in US 2025, f1_24 = 2024, f1_25 = 2023
 *
 * I. c1_7[0]/c1_7[1] — Did you file a U.S. return for any prior year? f1_26 = latest year and form number
 * J. c1_8[0]/c1_8[1] — Filing for a trust? c1_9[0]/c1_9[1] = sub-question
 * K. c1_10[0]/c1_10[1] — Compensation $250k or more?
 *
 * L. c1_6[0]/c1_6[1] = treaty benefits claimed Yes/No
 *    LineL1_Table BodyRow1..3: f1_27..f1_38 (treaty table). c1_11, c1_12 = L2, L3. f1_39 = additional explanation
 * M. c1_13, c1_14 = section 871(d) elections
 */
const P1 = "form1040-NR[0].Page1[0]";

export function mapToF1040NRO(
  docs: FormDocuments
): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  const { passport, i20, w2, duration, visaHistory } = docs;

  // Name shown on Form 1040-NR, Your identifying number
  const fullName = [passport?.given_names, passport?.surname].filter(Boolean).join(" ");
  v[`${P1}.f1_1[0]`] = fullName;
  v[`${P1}.f1_2[0]`] = docs.ssn ?? "";

  // A. Country(ies) citizen during tax year
  v[`${P1}.f1_3[0]`] = passport?.nationality ?? passport?.issuing_country ?? "";
  // B. Country of tax residence
  v[`${P1}.f1_4[0]`] = passport?.nationality ?? passport?.issuing_country ?? "";

  // C. Green card applied? — No (default)
  v[`${P1}.c1_3[1]`] = true;
  // D1. Ever U.S. citizen? — No
  v[`${P1}.c1_1[1]`] = true;
  // D2. Ever green card holder? — No
  v[`${P1}.c1_2[1]`] = true;

  // E. Subject to tax in foreign country? — No (default for NRA students)
  v[`${P1}.c1_5[1]`] = true;

  // F. Changed visa type? — No (default); f1_6 left blank
  v[`${P1}.c1_4[1]`] = true;

  // G. LineG_Table1 — visa type in Row 1 Col 1; entry/departure dates from travel history or duration fallback
  const visaType = i20?.class_of_admission ?? "";
  v[`${P1}.LineG_Table1[0].BodyRow1[0].f1_7[0]`] = visaType;

  const tableRows: [string, string][] = [
    [`${P1}.LineG_Table1[0].BodyRow2[0].f1_9[0]`,  `${P1}.LineG_Table1[0].BodyRow2[0].f1_10[0]`],
    [`${P1}.LineG_Table1[0].BodyRow3[0].f1_11[0]`, `${P1}.LineG_Table1[0].BodyRow3[0].f1_12[0]`],
    [`${P1}.LineG_Table1[0].BodyRow4[0].f1_13[0]`, `${P1}.LineG_Table1[0].BodyRow4[0].f1_14[0]`],
  ];

  const { travelHistory } = docs;
  if (travelHistory && travelHistory.records.length > 0) {
    // Sort records ascending (oldest first) so each Arrival is followed by its
    // actual Departure in the array, not a departure from a prior trip.
    const sorted = [...travelHistory.records].sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    // Pair each Arrival with the next chronological Departure
    const pairs: { arrival: string; departure: string }[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].type === "Arrival") {
        const dep = sorted.slice(i + 1).find((r) => r.type === "Departure");
        pairs.push({ arrival: sorted[i].date, departure: dep?.date ?? "" });
      }
    }

    // Reverse so the most recent trip fills Row 1, then cap at 4
    const displayPairs = pairs.reverse().slice(0, 4);

    // Row 1: departure of most recent pair (visa type already set above)
    if (displayPairs[0]) {
      v[`${P1}.LineG_Table1[0].BodyRow1[0].f1_8[0]`] = formatDateLong(displayPairs[0].departure);
    }
    // Rows 2–4: arrival + departure
    displayPairs.slice(1).forEach((pair, i) => {
      v[tableRows[i][0]] = formatDateLong(pair.arrival);
      v[tableRows[i][1]] = formatDateLong(pair.departure);
    });
  } else {
    // Fallback: use duration entries (sorted descending by year)
    const sortedDuration = duration
      ? [...duration].sort((a, b) => b.year - a.year)
      : [];

    if (sortedDuration[0]) {
      v[`${P1}.LineG_Table1[0].BodyRow1[0].f1_8[0]`] = formatDateLong(sortedDuration[0].departure);
    }
    sortedDuration.slice(1, 4).forEach((entry, i) => {
      v[tableRows[i][0]] = formatDateLong(entry.arrival);
      v[tableRows[i][1]] = formatDateLong(entry.departure);
    });
  }

  // G. LineG_Table2 — visa/immigration status changes from visaHistory
  if (visaHistory) {
    const historyEntries = Object.entries(visaHistory).slice(0, 4);
    const table2Rows = [
      [`${P1}.LineG_Table2[0].BodyRow1[0].f1_15[0]`, `${P1}.LineG_Table2[0].BodyRow1[0].f1_16[0]`],
      [`${P1}.LineG_Table2[0].BodyRow2[0].f1_17[0]`, `${P1}.LineG_Table2[0].BodyRow2[0].f1_18[0]`],
      [`${P1}.LineG_Table2[0].BodyRow3[0].f1_19[0]`, `${P1}.LineG_Table2[0].BodyRow3[0].f1_20[0]`],
      [`${P1}.LineG_Table2[0].BodyRow4[0].f1_21[0]`, `${P1}.LineG_Table2[0].BodyRow4[0].f1_22[0]`],
    ];
    historyEntries.forEach(([visaTypeKey, dateChanged], i) => {
      v[table2Rows[i][0]] = visaTypeKey;
      v[table2Rows[i][1]] = formatDateLong(dateChanged);
    });
  }

  // H. Days present in the United States during 2023, 2024, 2025
  // Compute inline from sorted duration rather than calling daysForYear (avoids duplicate sort)
  function daysForYearLocal(year: number): string {
    const entry = (duration ?? []).find((x) => x.year === year);
    if (!entry || !entry.arrival || !entry.departure) return "";
    const a = new Date(entry.arrival);
    const d = new Date(entry.departure);
    if (!Number.isFinite(a.getTime()) || !Number.isFinite(d.getTime())) return "";
    const ms = d.getTime() - a.getTime();
    return String(Math.max(0, Math.round(ms / 86_400_000) + 1));
  }
  v[`${P1}.f1_23[0]`] = daysForYearLocal(2025);
  v[`${P1}.f1_24[0]`] = daysForYearLocal(2024);
  v[`${P1}.f1_25[0]`] = daysForYearLocal(2023);

  // I. Filed prior year return? — No (default)
  v[`${P1}.c1_7[1]`] = true;
  // J. Filing for a trust? — No; sub-question also No
  v[`${P1}.c1_8[1]`] = true;
  v[`${P1}.c1_9[1]`] = true;
  // K. Compensation $250k or more? — No (default)
  v[`${P1}.c1_10[1]`] = true;

  // L. Treaty benefits
  const taxYear = parseInt(w2?.tax_year ?? "2025", 10);
  const isIndian = isIndianCitizen(passport);
  if (isIndian) {
    // Indian nationals claim US-India treaty Article 21(2) standard deduction
    const treatyAmount = getStandardDeduction(taxYear, true);
    v[`${P1}.c1_6[0]`] = true;   // Yes — treaty benefits claimed
    // Treaty table Row 1: India / Article 21(2) / amount exempt
    v[`${P1}.LineL1_Table[0].BodyRow1[0].f1_27[0]`] = "India";
    v[`${P1}.LineL1_Table[0].BodyRow1[0].f1_28[0]`] = "21(2)";
    v[`${P1}.LineL1_Table[0].BodyRow1[0].f1_29[0]`] = "";
    v[`${P1}.LineL1_Table[0].BodyRow1[0].f1_30[0]`] = String(treatyAmount);
    // L2: Subject to tax in India — Yes (Indian residents are taxed by India)
    v[`${P1}.c1_11[0]`] = true;
    // L3: Competent authority — No (default)
    v[`${P1}.c1_12[1]`] = true;
  } else {
    // No treaty benefits claimed
    v[`${P1}.c1_6[1]`] = true;
    v[`${P1}.c1_11[1]`] = true;
    v[`${P1}.c1_12[1]`] = true;
  }

  return v;
}
