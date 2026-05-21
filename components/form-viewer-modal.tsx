"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type FormViewerProps = {
  formId: string;
  fillApiId: string;
  title: string;
  subtitle: string;
};

interface FormViewerModalProps {
  form: FormViewerProps | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FormContent({ form }: { form: FormViewerProps }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPdfUrl(null);

    fetch(`/api/forms/${form.fillApiId}/fill`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Failed to generate PDF");
        }
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setPdfUrl(url);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load PDF")
      )
      .finally(() => setLoading(false));

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [form.fillApiId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Generating PDF…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <iframe
      src={pdfUrl!}
      className="h-full w-full rounded-md border border-border"
      title={form.title}
    />
  );
}

export function FormViewerModal({
  form,
  open,
  onOpenChange,
}: FormViewerModalProps) {
  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle>{form.title}</DialogTitle>
          <DialogDescription>{form.subtitle}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1">
          <FormContent form={form} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
