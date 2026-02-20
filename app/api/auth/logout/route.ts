import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/jwt";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  const clearCookie =
    process.env.NODE_ENV === "production"
      ? `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`
      : `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  response.headers.set("Set-Cookie", clearCookie);
  return response;
}
