"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type FormViewerProps = {
  formId: string;
  title: string;
  subtitle: string;
};

interface FormViewerModalProps {
  form: FormViewerProps | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Per-form content lives here. Add a case for each form id to render
 * form-specific UI (field editor, PDF preview, etc.).
 */
function FormContent({ form }: { form: FormViewerProps }) {
  switch (form.formId) {
    case "8843":
    case "1040nr":
    case "1040nro":
    case "540nr":
    default:
      return (
        <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed p-8 text-sm text-muted-foreground">
          {form.title} viewer will be implemented here.
        </div>
      );
  }
}

export function FormViewerModal({
  form,
  open,
  onOpenChange,
}: FormViewerModalProps) {
  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{form.title}</DialogTitle>
          <DialogDescription>{form.subtitle}</DialogDescription>
        </DialogHeader>
        <FormContent form={form} />
      </DialogContent>
    </Dialog>
  );
}
