import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "auth_token";
const EXPIRY = "7d";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: { sub: string }): Promise<string> {
  return new SignJWT({ sub: payload.sub })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export interface JwtPayload {
  sub: string;
}

export async function verifyToken(
  token: string
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    if (typeof sub !== "string") return null;
    return { sub };
  } catch {
    return null;
  }
}
