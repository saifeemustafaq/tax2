"use client";

import { useState, useCallback } from "react";
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

export function SSNDialog({ open, onOpenChange, ssnLast4 }: SSNDialogProps) {
  const router = useRouter();
  const [ssn, setSSN] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSSN(formatSSN(e.target.value));
  }, []);

  const valid = isValidSSN(ssn);
  const enteredLast4 = valid ? ssn.replace(/\D/g, "").slice(-4) : null;

  let matchIndicator: "match" | "mismatch" | null = null;
  if (ssnLast4 && enteredLast4) {
    matchIndicator = enteredLast4 === ssnLast4 ? "match" : "mismatch";
  }

  const handleContinue = useCallback(async () => {
    if (!valid) {
      setError("Please enter a valid SSN in the format XXX-XX-XXXX.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/user/ssn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssn }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = typeof body?.error === "string" ? body.error : "Failed to save SSN.";
        setError(message);
        toast.error(message);
        return;
      }

      router.push("/duration");
    } catch {
      const message = "Failed to save SSN. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [ssn, valid, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Enter your Social Security Number</DialogTitle>
          <DialogDescription>
            Your SSN is required for tax form filing and will not be
            auto-detected from uploaded documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ssn-input">Social Security Number</Label>
            <Input
              id="ssn-input"
              type="text"
              inputMode="numeric"
              placeholder="XXX-XX-XXXX"
              value={ssn}
              onChange={handleChange}
              maxLength={11}
              autoComplete="off"
              aria-label="Social Security Number"
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
          <Button onClick={handleContinue} disabled={!valid || loading}>
            {loading ? "Saving…" : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
