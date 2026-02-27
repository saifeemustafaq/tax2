import { NextResponse } from "next/server";
import { loadPdfFromDisk, fillPdfFields } from "@/lib/pdf";
import { fetchFormDocuments } from "@/lib/form-mappers/fetch-docs";
import { mapToF8843 } from "@/lib/form-mappers/f8843";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await fetchFormDocuments();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const values = mapToF8843(result.docs);
    const pdf = await loadPdfFromDisk("public/forms/empty/f8843.pdf");
    const bytes = await fillPdfFields(pdf, values);

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="f8843_filled.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("f8843 fill error:", e);
    return NextResponse.json({ error: "Failed to fill PDF" }, { status: 500 });
  }
}
