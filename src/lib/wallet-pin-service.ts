import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import type { Collection } from "mongodb";

import type { MemberDocument } from "@/lib/member";
import { isValidWalletPin } from "@/lib/wallet-unlock";

const scryptAsync = promisify(scrypt);
const WALLET_PIN_KEY_LENGTH = 32;
const WALLET_PIN_MAX_FAILED_ATTEMPTS = 5;
const WALLET_PIN_LOCK_MS = 5 * 60 * 1000;

export class WalletPinError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "WalletPinError";
    this.status = status;
  }
}

async function hashWalletPin(pin: string, salt: string) {
  const derivedKey = (await scryptAsync(
    pin,
    salt,
    WALLET_PIN_KEY_LENGTH,
  )) as Buffer;

  return derivedKey.toString("hex");
}

function assertValidWalletPin(pin: string) {
  if (!isValidWalletPin(pin)) {
    throw new WalletPinError("PIN must be exactly 6 digits.", 400);
  }
}

export function hasWalletPin(member: MemberDocument) {
  return Boolean(member.walletPinHash && member.walletPinSalt);
}

async function writeMemberWalletPin({
  allowExisting,
  collection,
  confirmPin,
  member,
  pin,
}: {
  allowExisting: boolean;
  collection: Collection<MemberDocument>;
  confirmPin: string;
  member: MemberDocument;
  pin: string;
}) {
  assertValidWalletPin(pin);
  assertValidWalletPin(confirmPin);

  if (pin !== confirmPin) {
    throw new WalletPinError("PIN values do not match.", 400);
  }

  if (!allowExisting && hasWalletPin(member)) {
    throw new WalletPinError("Wallet PIN is already configured.", 409);
  }

  const salt = randomBytes(24).toString("hex");
  const hash = await hashWalletPin(pin, salt);
  const now = new Date();

  await collection.updateOne(
    { email: member.email },
    {
      $set: {
        walletPinFailedAttempts: 0,
        walletPinHash: hash,
        walletPinLockedUntil: null,
        walletPinResetAt: allowExisting ? now : member.walletPinResetAt ?? null,
        walletPinSalt: salt,
        walletPinUpdatedAt: now,
      },
    },
  );
}

export async function setMemberWalletPin({
  collection,
  confirmPin,
  member,
  pin,
}: {
  collection: Collection<MemberDocument>;
  confirmPin: string;
  member: MemberDocument;
  pin: string;
}) {
  await writeMemberWalletPin({
    allowExisting: false,
    collection,
    confirmPin,
    member,
    pin,
  });
}

export async function resetMemberWalletPin({
  collection,
  confirmPin,
  member,
  pin,
}: {
  collection: Collection<MemberDocument>;
  confirmPin: string;
  member: MemberDocument;
  pin: string;
}) {
  await writeMemberWalletPin({
    allowExisting: true,
    collection,
    confirmPin,
    member,
    pin,
  });
}

export async function verifyMemberWalletPin({
  collection,
  member,
  pin,
}: {
  collection: Collection<MemberDocument>;
  member: MemberDocument;
  pin: string;
}) {
  assertValidWalletPin(pin);

  if (!member.walletPinHash || !member.walletPinSalt) {
    throw new WalletPinError("Wallet PIN is not configured.", 409);
  }

  if (
    member.walletPinLockedUntil instanceof Date &&
    member.walletPinLockedUntil.getTime() > Date.now()
  ) {
    throw new WalletPinError("Wallet PIN is temporarily locked.", 423);
  }

  const expectedHash = Buffer.from(member.walletPinHash, "hex");
  const receivedHash = Buffer.from(
    await hashWalletPin(pin, member.walletPinSalt),
    "hex",
  );
  const isMatch =
    expectedHash.length === receivedHash.length &&
    timingSafeEqual(expectedHash, receivedHash);

  if (isMatch) {
    await collection.updateOne(
      { email: member.email },
      {
        $set: {
          walletPinFailedAttempts: 0,
          walletPinLockedUntil: null,
          walletPinVerifiedAt: new Date(),
        },
      },
    );
    return;
  }

  const failedAttempts = (member.walletPinFailedAttempts ?? 0) + 1;
  const shouldLock = failedAttempts >= WALLET_PIN_MAX_FAILED_ATTEMPTS;

  await collection.updateOne(
    { email: member.email },
    {
      $set: {
        walletPinFailedAttempts: shouldLock ? 0 : failedAttempts,
        walletPinLockedUntil: shouldLock
          ? new Date(Date.now() + WALLET_PIN_LOCK_MS)
          : null,
      },
    },
  );

  throw new WalletPinError(
    shouldLock
      ? "Wallet PIN is temporarily locked."
      : "Wallet PIN is incorrect.",
    shouldLock ? 423 : 401,
  );
}
