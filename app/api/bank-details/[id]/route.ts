import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getBankDetailsCollection, ensureBankDetailsIndexes } from "@/lib/mongodb";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

    const { bankName, accountHolderName, routingNumber, accountNumber, accountType, isDefault } = body;

    if (!bankName || !accountHolderName || !routingNumber || !accountNumber || !accountType) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!["checking", "savings"].includes(accountType)) {
      return NextResponse.json({ error: "Account type must be checking or savings" }, { status: 400 });
    }

    await ensureBankDetailsIndexes();
    const coll = await getBankDetailsCollection();
    const userId = new ObjectId(payload.sub);
    const docId = new ObjectId(id);

    const existing = await coll.findOne({ _id: docId, userId });
    if (!existing) {
      return NextResponse.json({ error: "Bank detail not found" }, { status: 404 });
    }

    if (isDefault && !existing.isDefault) {
      await coll.updateMany({ userId, isDefault: true }, { $set: { isDefault: false } });
    }

    await coll.updateOne(
      { _id: docId, userId },
      {
        $set: {
          bankName,
          accountHolderName,
          routingNumber,
          accountNumber,
          accountType,
          isDefault: isDefault ?? existing.isDefault,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Bank details PUT error:", err);
    return NextResponse.json({ error: "Failed to update bank detail" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await ensureBankDetailsIndexes();
    const coll = await getBankDetailsCollection();
    const userId = new ObjectId(payload.sub);
    const docId = new ObjectId(id);

    const doc = await coll.findOne({ _id: docId, userId });
    if (!doc) {
      return NextResponse.json({ error: "Bank detail not found" }, { status: 404 });
    }

    await coll.deleteOne({ _id: docId, userId });

    if (doc.isDefault) {
      const next = await coll.findOne({ userId }, { sort: { createdAt: -1 } });
      if (next) {
        await coll.updateOne({ _id: next._id }, { $set: { isDefault: true } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Bank details DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete bank detail" }, { status: 500 });
  }
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await ensureBankDetailsIndexes();
    const coll = await getBankDetailsCollection();
    const userId = new ObjectId(payload.sub);
    const docId = new ObjectId(id);

    const doc = await coll.findOne({ _id: docId, userId });
    if (!doc) {
      return NextResponse.json({ error: "Bank detail not found" }, { status: 404 });
    }

    await coll.updateMany({ userId, isDefault: true }, { $set: { isDefault: false } });
    await coll.updateOne({ _id: docId }, { $set: { isDefault: true, updatedAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Bank details PATCH error:", err);
    return NextResponse.json({ error: "Failed to set default" }, { status: 500 });
  }
}
