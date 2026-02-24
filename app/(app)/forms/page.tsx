"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineEye,
  HiOutlineDownload,
  HiOutlineDocumentDownload,
} from "react-icons/hi";
import { Button } from "@/components/ui/button";
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
import type { FormEligibility } from "@/app/api/forms/eligibility/route";

type FormDef = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  emptyFile: string;
  visibleWhen?: keyof FormEligibility;
};

const FORMS: FormDef[] = [
  {
    id: "8843",
    title: "Form 8843",
    subtitle: "Statement for Exempt Individuals",
    description:
      "Required for all F-1 and J-1 visa holders, even if you had no U.S. income. Declares days of presence excluded under the Substantial Presence Test.",
    emptyFile: "f8843.pdf",
  },
  {
    id: "1040nr",
    title: "Form 1040-NR",
    subtitle: "U.S. Nonresident Alien Income Tax Return",
    description:
      "The primary federal tax return for nonresident aliens who earned U.S.-source income such as wages, scholarships, or fellowships.",
    emptyFile: "f1040nr.pdf",
  },
  {
    id: "1040nro",
    title: "Schedule OI",
    subtitle: "Other Information (Form 1040-NR)",
    description:
      "Supplement to Form 1040-NR that reports visa type, days of presence, tax treaty benefits, and other information required for nonresident alien filers.",
    emptyFile: "f1040nro.pdf",
    visibleWhen: "schedule_oi",
  },
  {
    id: "540nr",
    title: "Form 540NR",
    subtitle: "California Nonresident or Part-Year Resident",
    description:
      "California state income tax return for nonresidents or part-year residents who earned California-source income.",
    emptyFile: "f540nr.pdf",
  },
];

export default function FormsPage() {
  const [eligibility, setEligibility] = useState<FormEligibility | null>(null);
  const [viewerForm, setViewerForm] = useState<FormViewerProps | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    fetch("/api/forms/eligibility")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setEligibility(data as FormEligibility | null))
      .catch(() => setEligibility(null));
  }, []);

  const visibleForms = useMemo(() => {
    if (!eligibility) {
      return FORMS.filter((f) => !f.visibleWhen);
    }
    return FORMS.filter(
      (f) => !f.visibleWhen || eligibility[f.visibleWhen]
    );
  }, [eligibility]);

  const openViewer = useCallback((form: FormDef) => {
    setViewerForm({
      formId: form.id,
      title: form.title,
      subtitle: form.subtitle,
    });
    setViewerOpen(true);
  }, []);

  const gridCols =
    visibleForms.length <= 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Tax Forms
      </h1>
      <p className="text-sm text-muted-foreground">
        View, download blank forms, or download completed forms pre-filled with
        your uploaded document data.
      </p>

      <div className={`grid gap-6 ${gridCols}`}>
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
                >
                  <HiOutlineDocumentDownload className="size-4" />
                  Download Completed
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

      <FormViewerModal
        form={viewerForm}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
}
