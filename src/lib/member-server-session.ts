import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { normalizeEmail } from "@/lib/member";
import { normalizeAddress } from "@/lib/thirdweb-webhooks";

export const MEMBER_SERVER_SESSION_COOKIE = "member_session";
export const MEMBER_SERVER_SESSION_MAX_AGE_SECONDS = 30 * 60;

type MemberServerSessionPayload = {
  email: string;
  exp: number;
  iat: number;
  v: 1;
  walletAddress: string;
};

function getMemberSessionSecret() {
  const dedicatedSecret = process.env.MEMBER_SESSION_SECRET?.trim();

  if (dedicatedSecret) {
    return dedicatedSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("MEMBER_SESSION_SECRET is required in production.");
  }

  return (
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.THIRDWEB_SECRET_KEY?.trim() ||
    ""
  );
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function signPayload(payload: string) {
  const secret = getMemberSessionSecret();

  if (!secret) {
    throw new Error("MEMBER_SESSION_SECRET is not configured.");
  }

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeSignatureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function createSessionValue({
  email,
  now = Date.now(),
  walletAddress,
}: {
  email: string;
  now?: number;
  walletAddress: string;
}) {
  const issuedAt = Math.floor(now / 1000);
  const payload: MemberServerSessionPayload = {
    email: normalizeEmail(email),
    exp: issuedAt + MEMBER_SERVER_SESSION_MAX_AGE_SECONDS,
    iat: issuedAt,
    v: 1,
    walletAddress: normalizeAddress(walletAddress),
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function parseSessionValue(value?: string | null, now = Date.now()) {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  let expectedSignature: string;

  try {
    expectedSignature = signPayload(encodedPayload);
  } catch {
    return null;
  }

  if (!safeSignatureEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<MemberServerSessionPayload>;
    const email = normalizeEmail(payload.email ?? "");
    const walletAddress = normalizeAddress(payload.walletAddress ?? "");

    if (
      payload.v !== 1 ||
      !email ||
      !walletAddress ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(now / 1000)
    ) {
      return null;
    }

    return {
      email,
      exp: payload.exp,
      iat: payload.iat,
      v: 1,
      walletAddress,
    } satisfies MemberServerSessionPayload;
  } catch {
    return null;
  }
}

export async function readMemberServerSession() {
  const cookieStore = await cookies();

  return parseSessionValue(
    cookieStore.get(MEMBER_SERVER_SESSION_COOKIE)?.value,
  );
}

export async function setMemberServerSessionCookie({
  email,
  walletAddress,
}: {
  email: string;
  walletAddress: string;
}) {
  const cookieStore = await cookies();

  cookieStore.set({
    httpOnly: true,
    maxAge: MEMBER_SERVER_SESSION_MAX_AGE_SECONDS,
    name: MEMBER_SERVER_SESSION_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: createSessionValue({ email, walletAddress }),
  });
}

export async function clearMemberServerSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.delete(MEMBER_SERVER_SESSION_COOKIE);
}
