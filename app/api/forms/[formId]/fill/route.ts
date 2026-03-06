import { NextResponse } from "next/server";
import { fillForm } from "@/lib/forms/registry";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const result = await fillForm(formId);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return new NextResponse(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Form fill error:", e);
    return NextResponse.json(
      { error: "Failed to fill PDF" },
      { status: 500 }
    );
  }
}
