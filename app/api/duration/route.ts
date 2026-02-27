import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getDocumentsCollection, ensureDocumentsIndexes } from "@/lib/mongodb";
import type { StoredDocumentDuration, DurationEntry } from "@/lib/types/document";

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

    const doc = (await documents.findOne({
      userId: new ObjectId(payload.sub),
      documentType: "duration",
    })) as StoredDocumentDuration | null;

    return NextResponse.json({ entries: doc?.data.entries ?? [] });
  } catch (err) {
    console.error("Duration GET error:", err);
    return NextResponse.json(
      { error: "Failed to load duration data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const body = (await req.json().catch(() => ({}))) as {
      entries?: DurationEntry[];
    };
    const entries = Array.isArray(body.entries) ? body.entries : [];

    await ensureDocumentsIndexes();
    const documents = await getDocumentsCollection();
    const userId = new ObjectId(payload.sub);

    await documents.updateOne(
      { userId, documentType: "duration" },
      {
        $set: {
          data: { entries },
          createdAt: new Date(),
        },
        $setOnInsert: {
          userId,
          documentType: "duration",
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Duration POST error:", err);
    return NextResponse.json(
      { error: "Failed to save duration data" },
      { status: 500 }
    );
  }
}
