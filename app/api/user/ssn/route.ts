import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getUserCollection, getDocumentsCollection, ensureDocumentsIndexes } from "@/lib/mongodb";
import type { StoredDocumentW2, StoredDocumentI20, StoredDocumentTravelHistory } from "@/lib/types/document";
import type { W2Extraction, I20Extraction, TravelHistoryExtraction } from "@/extraction/prompts";

const SSN_REGEX = /^\d{3}-\d{2}-\d{4}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

    const userId = new ObjectId(payload.sub);
    const users = await getUserCollection();
    await ensureDocumentsIndexes();
    const docs = await getDocumentsCollection();

    const [user, w2Doc, i20Doc, travelHistoryDoc] = await Promise.all([
      users.findOne({ _id: userId }),
      docs.findOne({ userId, documentType: "w2" }) as Promise<StoredDocumentW2 | null>,
      docs.findOne({ userId, documentType: "i20" }) as Promise<StoredDocumentI20 | null>,
      docs.findOne({ userId, documentType: "travel-history" }) as Promise<StoredDocumentTravelHistory | null>,
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    let ssnLast4: string | undefined;
    if (w2Doc) {
      const rawSsn = (w2Doc.data as W2Extraction)?.employee?.ssn ?? "";
      const digits = rawSsn.replace(/\D/g, "");
      if (digits.length >= 4) ssnLast4 = digits.slice(-4);
    }

    let schoolName: string | undefined;
    if (i20Doc) {
      schoolName = (i20Doc.data as I20Extraction)?.school_information?.school_name ?? undefined;
    }

    let entryDate: string | undefined;
    if (travelHistoryDoc) {
      const records = (travelHistoryDoc.data as TravelHistoryExtraction)?.records ?? [];
      const mostRecentArrival = records
        .filter((r) => r.type === "Arrival")
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (mostRecentArrival?.date) entryDate = mostRecentArrival.date;
    }

    return NextResponse.json({
      ssn: user.ssn ?? null,
      f1VisaEntryDate: user.f1VisaEntryDate ?? null,
      institutionName: user.institutionName ?? null,
      programDirectorName: user.programDirectorName ?? null,
      institutionAddress: user.institutionAddress ?? null,
      institutionPhone: user.institutionPhone ?? null,
      visaHistory: user.visaHistory ?? null,
      ssnLast4: ssnLast4 ?? null,
      schoolName: schoolName ?? null,
      entryDate: entryDate ?? null,
    });
  } catch (err) {
    console.error("GET /api/user/ssn error:", err);
    return NextResponse.json(
      { error: "An error occurred while fetching user information." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body.ssn !== "string") {
      return NextResponse.json({ error: "Missing ssn field." }, { status: 400 });
    }

    const ssn = body.ssn.trim();
    if (!SSN_REGEX.test(ssn)) {
      return NextResponse.json(
        { error: "Invalid SSN format. Expected XXX-XX-XXXX." },
        { status: 400 }
      );
    }

    if (typeof body.f1VisaEntryDate !== "string" || !DATE_REGEX.test(body.f1VisaEntryDate.trim())) {
      return NextResponse.json(
        { error: "Invalid or missing F1 visa entry date. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }
    const f1VisaEntryDate = body.f1VisaEntryDate.trim();

    for (const field of ["institutionName", "programDirectorName", "institutionAddress", "institutionPhone"] as const) {
      if (typeof body[field] !== "string" || !body[field].trim()) {
        return NextResponse.json(
          { error: `Missing or empty field: ${field}.` },
          { status: 400 }
        );
      }
    }
    const institutionName = (body.institutionName as string).trim();
    const programDirectorName = (body.programDirectorName as string).trim();
    const institutionAddress = (body.institutionAddress as string).trim();
    const institutionPhone = (body.institutionPhone as string).trim();

    const visaHistory: Record<string, string> = {};
    if (body.visaHistory && typeof body.visaHistory === "object") {
      for (const [year, visa] of Object.entries(body.visaHistory)) {
        if (typeof visa === "string" && visa) {
          visaHistory[year] = visa;
        }
      }
    }

    const users = await getUserCollection();
    const result = await users.updateOne(
      { _id: new ObjectId(payload.sub) },
      {
        $set: {
          ssn,
          f1VisaEntryDate,
          institutionName,
          programDirectorName,
          institutionAddress,
          institutionPhone,
          visaHistory,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("SSN save error:", err);
    return NextResponse.json(
      { error: "An error occurred while saving your SSN." },
      { status: 500 }
    );
  }
}
