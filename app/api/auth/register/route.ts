import { NextResponse } from "next/server";
import { getUserCollection, ensureUserIndexes } from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth";
import { signToken, COOKIE_NAME } from "@/lib/jwt";
import type { ApiUser, RegisterInput, UserDocument } from "@/lib/types/user";

const COOKIE_OPTS =
  process.env.NODE_ENV === "production"
    ? "Path=/; HttpOnly; SameSite=Lax; Max-Age=604800; Secure"
    : "Path=/; HttpOnly; SameSite=Lax; Max-Age=604800";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateBody(body: unknown): { ok: true; data: RegisterInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body is required" };
  }
  const b = body as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const firstName = typeof b.firstName === "string" ? b.firstName.trim() : "";
  const middleName = typeof b.middleName === "string" ? b.middleName.trim() : undefined;
  const lastName = typeof b.lastName === "string" ? b.lastName.trim() : "";
  const contactNumber = typeof b.contactNumber === "string" ? b.contactNumber.trim() : "";
  const address = typeof b.address === "string" ? b.address.trim() : "";
  const password = typeof b.password === "string" ? b.password : "";

  if (!email) return { ok: false, error: "Email is required" };
  if (!EMAIL_REGEX.test(email)) return { ok: false, error: "Invalid email format" };
  if (!firstName) return { ok: false, error: "First name is required" };
  if (!lastName) return { ok: false, error: "Last name is required" };
  if (!contactNumber) return { ok: false, error: "Contact number is required" };
  if (!address) return { ok: false, error: "Address is required" };
  if (!password) return { ok: false, error: "Password is required" };

  return {
    ok: true,
    data: {
      email,
      firstName,
      middleName: middleName || undefined,
      lastName,
      contactNumber,
      address,
      password,
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = validateBody(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error },
        { status: 400 }
      );
    }
    const { email, firstName, middleName, lastName, contactNumber, address, password } = validated.data;

    await ensureUserIndexes();
    const users = await getUserCollection();

    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const doc: UserDocument = {
      email,
      firstName,
      ...(middleName && { middleName }),
      lastName,
      contactNumber,
      address,
      hashedPassword,
      createdAt: new Date(),
    };

    const result = await users.insertOne(doc);
    const id = result.insertedId.toString();
    const token = await signToken({ sub: id });
    const user: ApiUser = {
      id,
      email,
      firstName,
      ...(middleName && { middleName }),
      lastName,
    };
    const response = NextResponse.json({ user }, { status: 201 });
    response.headers.set(
      "Set-Cookie",
      `${COOKIE_NAME}=${token}; ${COOKIE_OPTS}`
    );
    return response;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
