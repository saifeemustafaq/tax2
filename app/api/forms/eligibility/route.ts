import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getDocumentsCollection, ensureDocumentsIndexes } from "@/lib/mongodb";
import type { StoredDocumentPassport } from "@/lib/types/document";

export type FormEligibility = {
  schedule_oi: boolean;
};

const INDIA_IDENTIFIERS = new Set([
  "india",
  "indian",
  "ind",
  "in",
]);

function isIndianCitizen(doc: StoredDocumentPassport): boolean {
  const fields = [
    doc.data.nationality,
    doc.data.country_code,
    doc.data.issuing_country,
  ];
  return fields.some(
    (v) => typeof v === "string" && INDIA_IDENTIFIERS.has(v.trim().toLowerCase())
  );
}

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
      schedule_oi: passport !== null && isIndianCitizen(passport),
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
