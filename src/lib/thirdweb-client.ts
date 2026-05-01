"use client";

import { getUserEmail } from "thirdweb/wallets/in-app";

const THIRDWEB_EMAIL_RETRY_DELAYS_MS = [0, 120, 260, 420];

export async function getThirdwebUserEmail(
  options: Parameters<typeof getUserEmail>[0],
) {
  let lastEmail: string | null | undefined = null;

  for (const delayMs of THIRDWEB_EMAIL_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    lastEmail = await getUserEmail(options);

    if (lastEmail) {
      return lastEmail;
    }
  }

  return lastEmail ?? null;
}
