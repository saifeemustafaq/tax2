import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getUserCollection } from "@/lib/mongodb";

const SSN_REGEX = /^\d{3}-\d{2}-\d{4}$/;

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

    const users = await getUserCollection();
    const result = await users.updateOne(
      { _id: new ObjectId(payload.sub) },
      { $set: { ssn } }
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
