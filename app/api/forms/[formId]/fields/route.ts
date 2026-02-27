import { NextRequest, NextResponse } from "next/server";
import { loadPdfFromDisk, listAcroFormFields } from "@/lib/pdf";

const PDF_MAP: Record<string, string> = {
  f8843: "public/forms/empty/f8843.pdf",
  f1040nr: "public/forms/empty/f1040nr.pdf",
  f1040nro: "public/forms/empty/f1040nro.pdf",
  f540nr: "public/forms/empty/540nr.pdf",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const pdfPath = PDF_MAP[formId];
  if (!pdfPath) {
    return NextResponse.json(
      { error: `Unknown form: ${formId}` },
      { status: 404 }
    );
  }

  try {
    const pdf = await loadPdfFromDisk(pdfPath);
    const fields = await listAcroFormFields(pdf);
    return NextResponse.json({ formId, count: fields.length, fields });
  } catch (err) {
    console.error(`Fields listing error for ${formId}:`, err);
    return NextResponse.json(
      { error: "Failed to list PDF fields" },
      { status: 500 }
    );
  }
}
