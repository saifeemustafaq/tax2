import { NextResponse } from "next/server";
import { loadPdfFromDisk, fillPdfFields } from "@/lib/pdf";
import { fetchFormDocuments } from "@/lib/form-mappers/fetch-docs";
import { mapToF1040NRO } from "@/lib/form-mappers/f1040nro";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await fetchFormDocuments();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const values = mapToF1040NRO(result.docs);
    const pdf = await loadPdfFromDisk("public/forms/empty/f1040nro.pdf");
    const bytes = await fillPdfFields(pdf, values);

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="schedule_oi_filled.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("f1040nro fill error:", e);
    return NextResponse.json({ error: "Failed to fill PDF" }, { status: 500 });
  }
}
