"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineEye,
  HiOutlineDownload,
  HiOutlineDocumentDownload,
} from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  FormViewerModal,
  type FormViewerProps,
} from "@/components/form-viewer-modal";
import { toast } from "sonner";
import type { FormEligibility } from "@/app/api/forms/eligibility/route";

type FormDef = {
  id: string;
  fillApiId: string;
  title: string;
  subtitle: string;
  description: string;
  emptyFile: string;
  filledFilename: string;
  visibleWhen?: "schedule_oi";
};

const FEDERAL_FORMS: FormDef[] = [
  {
    id: "8843",
    fillApiId: "f8843",
    title: "Form 8843",
    subtitle: "Statement for Exempt Individuals",
    description:
      "Required for all F-1 and J-1 visa holders, even if you had no U.S. income. Declares days of presence excluded under the Substantial Presence Test.",
    emptyFile: "f8843.pdf",
    filledFilename: "f8843_filled.pdf",
  },
  {
    id: "1040nr",
    fillApiId: "f1040nr",
    title: "Form 1040-NR",
    subtitle: "U.S. Nonresident Alien Income Tax Return",
    description:
      "The primary federal tax return for nonresident aliens who earned U.S.-source income such as wages, scholarships, or fellowships.",
    emptyFile: "f1040nr.pdf",
    filledFilename: "f1040nr_filled.pdf",
  },
  {
    id: "1040nro",
    fillApiId: "f1040nro",
    title: "Schedule OI",
    subtitle: "Other Information (Form 1040-NR)",
    description:
      "Supplement to Form 1040-NR. Reports visa type, days of presence, prior returns, trust filing, treaty benefits, and other information required for nonresident alien filers.",
    emptyFile: "f1040nro.pdf",
    filledFilename: "schedule_oi_filled.pdf",
    visibleWhen: "schedule_oi",
  },
];

export default function FormsPage() {
  const [eligibility, setEligibility] = useState<FormEligibility | null>(null);
  const [viewerForm, setViewerForm] = useState<FormViewerProps | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/forms/eligibility")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setEligibility(data as FormEligibility | null))
      .catch(() => setEligibility(null));
  }, []);

  const visibleForms = useMemo(() => {
    if (!eligibility) {
      return FEDERAL_FORMS.filter((f) => !f.visibleWhen);
    }
    return FEDERAL_FORMS.filter(
      (f) => !f.visibleWhen || eligibility[f.visibleWhen]
    );
  }, [eligibility]);

  const incomeTaxStateForms = useMemo(
    () => (eligibility?.detectedStates ?? []).filter((s) => s.hasIncomeTax),
    [eligibility]
  );

  const noTaxStateNames = useMemo(
    () =>
      (eligibility?.detectedStates ?? [])
        .filter((s) => !s.hasIncomeTax)
        .map((s) => s.stateName),
    [eligibility]
  );

  const openViewer = useCallback((form: FormDef) => {
    setViewerForm({
      formId: form.id,
      fillApiId: form.fillApiId,
      title: form.title,
      subtitle: form.subtitle,
    });
    setViewerOpen(true);
  }, []);

  const downloadFilled = useCallback(async (form: FormDef) => {
    setDownloading(form.id);
    try {
      const res = await fetch(`/api/forms/${form.fillApiId}/fill`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to generate PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = form.filledFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${form.title} downloaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }, []);

  const federalGridCols =
    visibleForms.length <= 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2 lg:grid-cols-4";

  const stateGridCols =
    incomeTaxStateForms.length <= 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Tax Forms
        </h1>
        <p className="text-sm text-muted-foreground">
          View, download blank forms, or download completed forms pre-filled with
          your uploaded document data.
        </p>
      </div>

      {/* Federal Forms */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Federal Forms</h2>
        <div className={`grid gap-6 ${federalGridCols}`}>
          {visibleForms.map((form) => (
            <Card key={form.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{form.title}</CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                  {form.subtitle}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  {form.description}
                </p>

                <Separator />

                <div className="mt-auto flex flex-col gap-2">
                  <Button
                    variant="default"
                    className="w-full justify-start gap-2"
                    onClick={() => openViewer(form)}
                  >
                    <HiOutlineEye className="size-4" />
                    View {form.title}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    disabled={downloading === form.id}
                    onClick={() => downloadFilled(form)}
                  >
                    <HiOutlineDocumentDownload className="size-4" />
                    {downloading === form.id
                      ? "Generating…"
                      : "Download Completed"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground"
                    asChild
                  >
                    <a
                      href={`/forms/empty/${form.emptyFile}`}
                      download={form.emptyFile}
                    >
                      <HiOutlineDownload className="size-4" />
                      Download Empty Form
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* State Forms */}
      {incomeTaxStateForms.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">State Forms</h2>
          <div className={`grid gap-6 ${stateGridCols}`}>
            {incomeTaxStateForms.map((state) => {
              const stateFormId = `state-${state.stateCode}`;
              const title = state.nonresidentForm ?? state.stateName;
              const subtitle = `${state.stateName} Nonresident Income Tax Return`;

              if (state.implemented && state.formId && state.emptyFile && state.filledFilename) {
                const stateForm: FormDef = {
                  id: stateFormId,
                  fillApiId: state.formId,
                  title,
                  subtitle,
                  description: `State income tax return for ${state.stateName}. Auto-filled with your W-2 and passport data.`,
                  emptyFile: state.emptyFile,
                  filledFilename: state.filledFilename,
                };
                return (
                  <Card key={stateFormId} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-lg">{title}</CardTitle>
                      <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                        {subtitle}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4">
                      <p className="text-sm text-muted-foreground">
                        {stateForm.description}
                      </p>

                      <Separator />

                      <div className="mt-auto flex flex-col gap-2">
                        <Button
                          variant="default"
                          className="w-full justify-start gap-2"
                          onClick={() => openViewer(stateForm)}
                        >
                          <HiOutlineEye className="size-4" />
                          View {title}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2"
                          disabled={downloading === stateFormId}
                          onClick={() => downloadFilled(stateForm)}
                        >
                          <HiOutlineDocumentDownload className="size-4" />
                          {downloading === stateFormId
                            ? "Generating…"
                            : "Download Completed"}
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2 text-muted-foreground"
                          asChild
                        >
                          <a
                            href={`/forms/empty/${stateForm.emptyFile}`}
                            download={stateForm.emptyFile}
                          >
                            <HiOutlineDownload className="size-4" />
                            Download Empty Form
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // Coming Soon card
              return (
                <Card key={stateFormId} className="flex flex-col opacity-70">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{title}</CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                          {subtitle}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        Coming Soon
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                      State income tax return for {state.stateName}. Auto-fill support coming soon.
                    </p>

                    <Separator />

                    <div className="mt-auto flex flex-col gap-2">
                      <Button
                        variant="default"
                        className="w-full justify-start gap-2"
                        disabled
                      >
                        <HiOutlineEye className="size-4" />
                        View {title}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        disabled
                      >
                        <HiOutlineDocumentDownload className="size-4" />
                        Download Completed
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-muted-foreground"
                        disabled
                      >
                        <HiOutlineDownload className="size-4" />
                        Download Empty Form
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* No-income-tax state info note */}
          {noTaxStateNames.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Income detected in{" "}
              {noTaxStateNames.length === 1
                ? noTaxStateNames[0]
                : `${noTaxStateNames.slice(0, -1).join(", ")} and ${noTaxStateNames[noTaxStateNames.length - 1]}`}
              {" "}— no state income tax filing required.
            </p>
          )}
        </div>
      )}

      {/* No-income-tax note when no income-tax states were detected */}
      {incomeTaxStateForms.length === 0 && noTaxStateNames.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">State Forms</h2>
          <p className="text-sm text-muted-foreground">
            Income detected in{" "}
            {noTaxStateNames.length === 1
              ? noTaxStateNames[0]
              : `${noTaxStateNames.slice(0, -1).join(", ")} and ${noTaxStateNames[noTaxStateNames.length - 1]}`}
            {" "}&mdash; no state income tax filing required.
          </p>
        </div>
      )}

      <FormViewerModal
        form={viewerForm}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
}
