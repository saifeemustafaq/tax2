import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserCollection } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import type { ApiUser } from "@/lib/types/user";
import { ObjectId } from "mongodb";

function toApiUser(doc: { _id: ObjectId; email: string; firstName: string; middleName?: string; lastName: string }): ApiUser {
  return {
    id: doc._id.toString(),
    email: doc.email,
    firstName: doc.firstName,
    ...(doc.middleName && { middleName: doc.middleName }),
    lastName: doc.lastName,
  };
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
    const users = await getUserCollection();
    const user = await users.findOne({ _id: new ObjectId(payload.sub) });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ user: toApiUser(user) });
  } catch (err) {
    console.error("Auth me error:", err);
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}
