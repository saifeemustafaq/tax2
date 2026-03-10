import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getDocumentsCollection, ensureDocumentsIndexes } from "@/lib/mongodb";
import type { StoredDocumentPassport } from "@/lib/types/document";
import { isIndianCitizen } from "@/lib/tax-engine";

export type FormEligibility = {
  schedule_oi: boolean;
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

    const passport = (await documents.findOne({
      userId: new ObjectId(payload.sub),
      documentType: "passport",
    })) as StoredDocumentPassport | null;

    const eligibility: FormEligibility = {
      schedule_oi: isIndianCitizen(passport?.data ?? null),
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
