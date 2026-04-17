import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getBankDetailsCollection, ensureBankDetailsIndexes } from "@/lib/mongodb";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureBankDetailsIndexes();
    const coll = await getBankDetailsCollection();
    const items = await coll
      .find({ userId: new ObjectId(payload.sub) })
      .sort({ isDefault: -1, createdAt: -1 })
      .toArray();

    const result = items.map((item) => ({
      id: item._id!.toString(),
      bankName: item.bankName,
      accountHolderName: item.accountHolderName,
      routingNumber: item.routingNumber,
      accountNumber: item.accountNumber,
      accountType: item.accountType,
      isDefault: item.isDefault,
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
    }));

    return NextResponse.json({ bankDetails: result });
  } catch (err) {
    console.error("Bank details GET error:", err);
    return NextResponse.json({ error: "Failed to load bank details" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const existing = await coll.countDocuments({ userId });
    const shouldBeDefault = isDefault || existing === 0;

    if (shouldBeDefault) {
      await coll.updateMany({ userId, isDefault: true }, { $set: { isDefault: false } });
    }

    const now = new Date();
    const result = await coll.insertOne({
      userId,
      bankName,
      accountHolderName,
      routingNumber,
      accountNumber,
      accountType,
      isDefault: shouldBeDefault,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      id: result.insertedId.toString(),
      bankName,
      accountHolderName,
      routingNumber,
      accountNumber,
      accountType,
      isDefault: shouldBeDefault,
      createdAt: now.toISOString(),
    });
  } catch (err) {
    console.error("Bank details POST error:", err);
    return NextResponse.json({ error: "Failed to create bank detail" }, { status: 500 });
  }
}
