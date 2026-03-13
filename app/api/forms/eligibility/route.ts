import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getDocumentsCollection, ensureDocumentsIndexes } from "@/lib/mongodb";
import type { StoredDocumentPassport, StoredDocumentW2 } from "@/lib/types/document";
import { isIndianCitizen } from "@/lib/tax-engine";
import { parseNum } from "@/lib/form-mappers/types";

export type FormEligibility = {
  schedule_oi: boolean;
  ca_540nr: boolean;
};

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDocumentsIndexes();
    const documents = await getDocumentsCollection();
    const userId = new ObjectId(payload.sub);

    const [passport, w2] = await Promise.all([
      documents.findOne({ userId, documentType: "passport" }) as Promise<StoredDocumentPassport | null>,
      documents.findOne({ userId, documentType: "w2" }) as Promise<StoredDocumentW2 | null>,
    ]);

    const eligibility: FormEligibility = {
      schedule_oi: isIndianCitizen(passport?.data ?? null),
      ca_540nr: (w2?.data.state_local ?? []).some(
        (sl) => sl.state.toUpperCase() === "CA" && parseNum(sl.state_wages) > 0
      ),
    };

    return NextResponse.json(eligibility);
  } catch (err) {
    console.error("Form eligibility error:", err);
    return NextResponse.json(
      { error: "Failed to determine form eligibility" },
      { status: 500 }
    );
  }
}
