import { loadPdfFromDisk, fillPdfFields } from "@/lib/pdf";
import { fetchFormDocuments } from "@/lib/form-mappers/fetch-docs";
import type { FormDocuments } from "@/lib/form-mappers/types";
import { mapToF1040NR } from "@/lib/form-mappers/f1040nr";
import { mapToF8843 } from "@/lib/form-mappers/f8843";
import { mapToF1040NRO } from "@/lib/form-mappers/f1040nro";
import { mapToF540NR } from "@/lib/form-mappers/f540nr";
import { mapToF140NR } from "@/lib/form-mappers/f140nr";

export type FormFillDef = {
  formId: string;
  pdfPath: string;
  filledFilename: string;
  mapper: (docs: FormDocuments) => Record<string, unknown>;
  requiredDocTypes?: Array<
    "passport" | "i20" | "w2" | "duration" | "visa" | "i94" | "ead"
  >;
};

const FORM_REGISTRY: FormFillDef[] = [
  {
    formId: "f1040nr",
    pdfPath: "public/forms/empty/f1040nr.pdf",
    filledFilename: "f1040nr_filled.pdf",
    mapper: mapToF1040NR,
    requiredDocTypes: ["passport", "w2"],
  },
  {
    formId: "f8843",
    pdfPath: "public/forms/empty/f8843.pdf",
    filledFilename: "f8843_filled.pdf",
    mapper: mapToF8843,
    requiredDocTypes: ["passport", "i20", "duration"],
  },
  {
    formId: "f1040nro",
    pdfPath: "public/forms/empty/f1040nro.pdf",
    filledFilename: "schedule_oi_filled.pdf",
    mapper: mapToF1040NRO,
    requiredDocTypes: ["passport", "i20", "duration"],
  },
  {
    formId: "f540nr",
    pdfPath: "public/forms/empty/540nr.pdf",
    filledFilename: "540nr_filled.pdf",
    mapper: mapToF540NR,
    requiredDocTypes: ["passport", "w2"],
  },
  {
    formId: "f140nr",
    pdfPath: "public/forms/empty/az140nr.pdf",
    filledFilename: "az140nr_filled.pdf",
    mapper: mapToF140NR,
    requiredDocTypes: ["passport", "w2"],
  },
];

const REGISTRY_MAP = new Map(FORM_REGISTRY.map((f) => [f.formId, f]));

export function getFormFillDef(formId: string): FormFillDef | undefined {
  return REGISTRY_MAP.get(formId);
}

export function getAllFormIds(): string[] {
  return FORM_REGISTRY.map((f) => f.formId);
}

export type FillFormResult =
  | { ok: true; bytes: Uint8Array; filename: string }
  | { ok: false; status: number; error: string };

/**
 * Loads documents, runs the form's mapper, fills the PDF, and returns the bytes.
 * Used by the single dynamic fill route.
 */
export async function fillForm(formId: string): Promise<FillFormResult> {
  const form = REGISTRY_MAP.get(formId);
  if (!form) {
    return { ok: false, status: 404, error: `Unknown form: ${formId}` };
  }

  const result = await fetchFormDocuments();
  if (!result.ok) {
    return { ok: false, status: result.status, error: result.error };
  }

  const values = form.mapper(result.docs);
  const pdf = await loadPdfFromDisk(form.pdfPath);
  const bytes = await fillPdfFields(pdf, values);

  return {
    ok: true,
    bytes,
    filename: form.filledFilename,
  };
}
