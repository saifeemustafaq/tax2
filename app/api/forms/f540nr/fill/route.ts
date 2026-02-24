import { NextResponse } from "next/server";
import { loadPdfFromDisk, fillPdfFields } from "@/lib/pdf";
import { fetchFormDocuments } from "@/lib/form-mappers/fetch-docs";
import { mapToF540NR } from "@/lib/form-mappers/f540nr";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await fetchFormDocuments();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const values = mapToF540NR(result.docs);
    const pdf = await loadPdfFromDisk("public/forms/empty/540nr.pdf");
    const bytes = await fillPdfFields(pdf, values);

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="540nr_filled.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("f540nr fill error:", e);
    return NextResponse.json({ error: "Failed to fill PDF" }, { status: 500 });
  }
}
