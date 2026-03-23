import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getDocumentsCollection, ensureDocumentsIndexes } from "@/lib/mongodb";

export type DocumentListItem = {
  id: string;
  originalFilename: string;
  documentType: string;
  createdAt: string;
  w2Index?: number;
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
    const cursor = documents.find(
      { userId: new ObjectId(payload.sub) },
      { projection: { originalFilename: 1, documentType: 1, createdAt: 1, w2Index: 1 }, sort: { createdAt: -1 } }
    );
    const list: DocumentListItem[] = [];
    for await (const doc of cursor) {
      const item: DocumentListItem = {
        id: doc._id!.toString(),
        originalFilename: doc.originalFilename ?? "",
        documentType: doc.documentType,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
      };
      if (doc.documentType === "w2") {
        item.w2Index = (doc as { w2Index?: number }).w2Index ?? 0;
      }
      list.push(item);
    }
    return NextResponse.json({ documents: list });
  } catch (err) {
    console.error("List documents error:", err);
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 }
    );
  }
}
