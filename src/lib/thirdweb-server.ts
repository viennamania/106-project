import "server-only";

import { createThirdwebClient } from "thirdweb";

import { thirdwebClientId } from "@/lib/thirdweb";

const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY?.trim() ?? "";

export const hasThirdwebSecretKey = thirdwebSecretKey.length > 0;

export const serverThirdwebClient = createThirdwebClient(
  hasThirdwebSecretKey
    ? {
        secretKey: thirdwebSecretKey,
      }
    : {
        clientId: thirdwebClientId || "demo",
      },
);
