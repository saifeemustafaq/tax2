"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HiOutlineCheckCircle, HiOutlineExclamationCircle } from "react-icons/hi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SSNDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Last 4 digits of SSN extracted from W-2, if a W-2 was uploaded. */
  ssnLast4?: string | null;
  /** School name extracted from I-20, used to pre-fill institution name. */
  schoolName?: string | null;
  /** Most recent US arrival date (YYYY-MM-DD) from travel history, used to pre-fill entry date. */
  entryDate?: string | null;
}

function formatSSN(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function isValidSSN(value: string): boolean {
  return /^\d{3}-\d{2}-\d{4}$/.test(value);
}

const VISA_TYPES = ["", "F", "J", "M", "Q"] as const;
const VISA_YEARS = [2019, 2020, 2021, 2022, 2023, 2024] as const;

export function SSNDialog({ open, onOpenChange, ssnLast4: ssnLast4Prop, schoolName: schoolNameProp, entryDate: entryDateProp }: SSNDialogProps) {
  const router = useRouter();
  const [ssn, setSSN] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [programDirectorName, setProgramDirectorName] = useState("");
  const [institutionAddress, setInstitutionAddress] = useState("");
  const [institutionPhone, setInstitutionPhone] = useState("");
  const [visaHistory, setVisaHistory] = useState<Record<number, string>>(
    () => Object.fromEntries(VISA_YEARS.map((y) => [y, ""])),
  );
  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedSsnLast4, setResolvedSsnLast4] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const ssnLast4 = ssnLast4Prop ?? resolvedSsnLast4;

  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    setFetchingExisting(true);

    fetch("/api/user/ssn")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();

        if (data.ssn && !ssn) setSSN(data.ssn);
        if (data.f1VisaEntryDate && !entryDate) setEntryDate(data.f1VisaEntryDate);
        if (data.institutionName && !institutionName) setInstitutionName(data.institutionName);
        if (data.programDirectorName && !programDirectorName) setProgramDirectorName(data.programDirectorName);
        if (data.institutionAddress && !institutionAddress) setInstitutionAddress(data.institutionAddress);
        if (data.institutionPhone && !institutionPhone) setInstitutionPhone(data.institutionPhone);

        if (data.ssnLast4) setResolvedSsnLast4(data.ssnLast4);

        if (data.schoolName && !institutionName) setInstitutionName(data.schoolName);
        if (data.entryDate && !entryDate) setEntryDate(data.entryDate);

        if (data.visaHistory && typeof data.visaHistory === "object") {
          setVisaHistory((prev) => {
            const merged = { ...prev };
            for (const [year, visa] of Object.entries(data.visaHistory)) {
              const y = Number(year);
              if (!isNaN(y) && typeof visa === "string" && visa && !merged[y]) {
                merged[y] = visa;
              }
            }
            return merged;
          });
        }
      })
      .catch(() => {})
      .finally(() => setFetchingExisting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (schoolNameProp && !institutionName) {
      setInstitutionName(schoolNameProp);
    }
  }, [schoolNameProp, institutionName]);

  useEffect(() => {
    if (entryDateProp && !entryDate) {
      setEntryDate(entryDateProp);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryDateProp]);

  const handleSSNChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSSN(formatSSN(e.target.value));
  }, []);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setEntryDate(e.target.value);
  }, []);

  const handleVisaChange = useCallback((year: number, value: string) => {
    setError(null);
    setVisaHistory((prev) => ({ ...prev, [year]: value }));
  }, []);

  const ssnValid = isValidSSN(ssn);
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(entryDate);
  const institutionValid =
    institutionName.trim() !== "" &&
    programDirectorName.trim() !== "" &&
    institutionAddress.trim() !== "" &&
    institutionPhone.trim() !== "";
  const canSubmit = ssnValid && dateValid && institutionValid;

  const enteredLast4 = ssnValid ? ssn.replace(/\D/g, "").slice(-4) : null;
  let matchIndicator: "match" | "mismatch" | null = null;
  if (ssnLast4 && enteredLast4) {
    matchIndicator = enteredLast4 === ssnLast4 ? "match" : "mismatch";
  }

  const handleContinue = useCallback(async () => {
    if (!ssnValid) {
      setError("Please enter a valid SSN in the format XXX-XX-XXXX.");
      return;
    }
    if (!dateValid) {
      setError("Please enter a valid date for your most recent F1 visa entry.");
      return;
    }
    if (!institutionValid) {
      setError("Please fill in all academic institution fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const visaHistoryPayload: Record<string, string> = {};
    for (const year of VISA_YEARS) {
      if (visaHistory[year]) {
        visaHistoryPayload[String(year)] = visaHistory[year];
      }
    }

    try {
      const res = await fetch("/api/user/ssn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ssn,
          f1VisaEntryDate: entryDate,
          institutionName: institutionName.trim(),
          programDirectorName: programDirectorName.trim(),
          institutionAddress: institutionAddress.trim(),
          institutionPhone: institutionPhone.trim(),
          visaHistory: visaHistoryPayload,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = typeof body?.error === "string" ? body.error : "Failed to save information.";
        setError(message);
        toast.error(message);
        return;
      }

      router.push("/duration");
    } catch {
      const message = "Failed to save information. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [
    ssn, ssnValid, entryDate, dateValid,
    institutionName, programDirectorName, institutionAddress, institutionPhone,
    institutionValid, visaHistory, router,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Additional Information</DialogTitle>
          <DialogDescription>
            Please provide the following details required for your tax forms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* SSN */}
          <div className="space-y-2">
            <Label htmlFor="ssn-input">Social Security Number</Label>
            <Input
              id="ssn-input"
              type="text"
              inputMode="numeric"
              placeholder="XXX-XX-XXXX"
              value={ssn}
              onChange={handleSSNChange}
              maxLength={11}
              autoComplete="off"
            />
          </div>

          {matchIndicator === "match" && (
            <p className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-500">
              <HiOutlineCheckCircle className="size-4 shrink-0" />
              Last 4 digits match your W-2.
            </p>
          )}
          {matchIndicator === "mismatch" && (
            <p className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500">
              <HiOutlineExclamationCircle className="size-4 shrink-0" />
              Last 4 digits do not match your W-2. Please verify.
            </p>
          )}

          {/* F1 Visa Entry Date */}
          <div className="space-y-2">
            <Label htmlFor="entry-date-input">Most Recent U.S. Entry Date on F1 Visa</Label>
            <Input
              id="entry-date-input"
              type="date"
              value={entryDate}
              onChange={handleDateChange}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              This is the date you most recently entered the United States on
              your F1 visa. This is not necessarily the first time you entered
              the US &mdash; it is your most recent entry.
            </p>
          </div>

          {/* Academic Institution */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Academic Institution</legend>

            <div className="space-y-2">
              <Label htmlFor="inst-name">Name of Institution</Label>
              <Input
                id="inst-name"
                type="text"
                value={institutionName}
                onChange={(e) => { setError(null); setInstitutionName(e.target.value); }}
                placeholder="e.g. Carnegie Mellon University"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dir-name">Name of the Director of the Program</Label>
              <Input
                id="dir-name"
                type="text"
                value={programDirectorName}
                onChange={(e) => { setError(null); setProgramDirectorName(e.target.value); }}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inst-address">Address of the Institution</Label>
              <Input
                id="inst-address"
                type="text"
                value={institutionAddress}
                onChange={(e) => { setError(null); setInstitutionAddress(e.target.value); }}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inst-phone">Telephone Number</Label>
              <Input
                id="inst-phone"
                type="tel"
                value={institutionPhone}
                onChange={(e) => { setError(null); setInstitutionPhone(e.target.value); }}
                placeholder="e.g. (412) 268-2000"
                autoComplete="off"
              />
            </div>
          </fieldset>

          {/* Visa History */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Visa Type Held Per Year</legend>
            <p className="text-xs text-muted-foreground">
              Select the type of U.S. visa (F, J, M, Q) you held during each year.
              Leave blank for years that do not apply.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {VISA_YEARS.map((year) => (
                <div key={year} className="flex items-center gap-2">
                  <Label htmlFor={`visa-${year}`} className="w-10 shrink-0 text-sm">
                    {year}
                  </Label>
                  <select
                    id={`visa-${year}`}
                    value={visaHistory[year] ?? ""}
                    onChange={(e) => handleVisaChange(year, e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {VISA_TYPES.map((v) => (
                      <option key={v} value={v}>
                        {v || "—"}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </fieldset>

          {error && (
            <p
              className="flex items-center gap-1.5 text-sm text-destructive"
              role="alert"
            >
              <HiOutlineExclamationCircle className="size-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={!canSubmit || loading}>
            {loading ? "Saving…" : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
