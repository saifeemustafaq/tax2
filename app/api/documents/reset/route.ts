import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getDocumentsCollection, ensureDocumentsIndexes } from "@/lib/mongodb";

export async function DELETE() {
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
    const result = await documents.deleteMany({
      userId: new ObjectId(payload.sub),
    });

    return NextResponse.json({
      deleted: result.deletedCount,
    });
  } catch (err) {
    console.error("Reset documents error:", err);
    return NextResponse.json(
      { error: "Failed to reset documents" },
      { status: 500 }
    );
  }
}
