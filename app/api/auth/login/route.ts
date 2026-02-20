import { NextResponse } from "next/server";
import { getUserCollection } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/auth";
import { signToken, COOKIE_NAME } from "@/lib/jwt";
import type { ApiUser } from "@/lib/types/user";
import { ObjectId } from "mongodb";

const COOKIE_OPTS =
  process.env.NODE_ENV === "production"
    ? "Path=/; HttpOnly; SameSite=Lax; Max-Age=604800; Secure"
    : "Path=/; HttpOnly; SameSite=Lax; Max-Age=604800";

function toApiUser(doc: { _id: ObjectId; email: string; firstName: string; middleName?: string; lastName: string }): ApiUser {
  return {
    id: doc._id.toString(),
    email: doc.email,
    firstName: doc.firstName,
    ...(doc.middleName && { middleName: doc.middleName }),
    lastName: doc.lastName,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
    const users = getUserCollection();
    const user = await users.findOne({ email });
    if (!user?.hashedPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
    const ok = await verifyPassword(password, user.hashedPassword);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
    const token = await signToken({ sub: user._id!.toString() });
    const response = NextResponse.json({
      user: toApiUser(user),
    });
    response.headers.set(
      "Set-Cookie",
      `${COOKIE_NAME}=${token}; ${COOKIE_OPTS}`
    );
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
