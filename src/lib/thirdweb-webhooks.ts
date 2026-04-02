import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { BSC_USDT_ADDRESS } from "@/lib/thirdweb";

export const THIRDWEB_INSIGHT_WEBHOOKS_URL =
  "https://insight.thirdweb.com/v1/webhooks";
export const BSC_CHAIN_ID = "56";
export const ERC20_TRANSFER_SIGNATURE =
  "Transfer(address,address,uint256)";
export const ERC20_TRANSFER_SIG_HASH =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export const ERC20_TRANSFER_ABI = JSON.stringify({
  anonymous: false,
  inputs: [
    {
      indexed: true,
      name: "from",
      type: "address",
    },
    {
      indexed: true,
      name: "to",
      type: "address",
    },
    {
      indexed: false,
      name: "value",
      type: "uint256",
    },
  ],
  name: "Transfer",
  type: "event",
});

export type ThirdwebWebhookDirection = "inbound" | "outbound";

export type ThirdwebInsightEventRecord = {
  data: {
    address: string;
    block_hash: string;
    block_number: number;
    block_timestamp: number;
    chain_id: string;
    data: string;
    decoded?: {
      indexed_params?: {
        from?: string;
        to?: string;
      };
      name?: string;
      non_indexed_params?: {
        amount?: string;
        value?: string;
      };
    };
    log_index: number;
    topics: string[];
    transaction_hash: string;
    transaction_index: number;
  };
  id: string;
  status: string;
  type: string;
};

export type ThirdwebInsightEventWebhookPayload = {
  data: ThirdwebInsightEventRecord[];
  timestamp: number;
  topic: "v1.events";
};

export type ThirdwebWebhookEventDocument = {
  amount: string;
  blockNumber: number;
  blockTimestamp: number;
  chainId: number;
  direction: ThirdwebWebhookDirection;
  fromAddress: string;
  logIndex: number;
  payload: ThirdwebInsightEventRecord;
  projectWallet: string;
  receivedAt: Date;
  tokenAddress: string;
  topic: "v1.events";
  toAddress: string;
  transactionHash: string;
  webhookEventId: string;
  webhookEventStatus: string;
};

export type ThirdwebWebhookIngressVerificationStatus =
  | "pending"
  | "verified"
  | "missing_signature"
  | "config_error"
  | "invalid_signature"
  | "invalid_json";

export type ThirdwebWebhookIngressProcessingStatus =
  | "pending"
  | "ignored"
  | "processed"
  | "processing_error";

export type ThirdwebWebhookIngressLogDocument = {
  requestId: string;
  method: string;
  path: string;
  projectWallet: string | null;
  signaturePresent: boolean;
  signaturePrefix: string | null;
  timestampHeader: string | null;
  userAgent: string | null;
  payloadBytes: number;
  payloadSha256: string;
  payloadTopic: string | null;
  payloadEventCount: number | null;
  verificationStatus: ThirdwebWebhookIngressVerificationStatus;
  processingStatus: ThirdwebWebhookIngressProcessingStatus;
  responseStatus: number | null;
  errorMessage: string | null;
  ignoredCount: number | null;
  storedCount: number | null;
  completedCount: number | null;
  receivedAt: Date;
  updatedAt: Date;
};

type VerifyThirdwebWebhookSignatureOptions = {
  payload: string;
  secrets: string[];
  signature: string;
  timestamp?: string | null;
};

export function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

export function getThirdwebWebhookSecrets() {
  const combined = [
    process.env.THIRDWEB_WEBHOOK_SECRET,
    process.env.THIRDWEB_WEBHOOK_SECRETS,
  ]
    .filter(Boolean)
    .join(",");

  return combined
    .split(",")
    .map((secret) => secret.trim())
    .filter(Boolean);
}

export function buildThirdwebWebhookName(
  direction: ThirdwebWebhookDirection,
  projectWallet: string,
) {
  const suffix = normalizeAddress(projectWallet).slice(-8);
  return `pocket-bsc-usdt-${direction}-${suffix}`;
}

export function buildUsdtTransferWebhookFilters(
  projectWallet: string,
  direction: ThirdwebWebhookDirection,
) {
  return {
    "v1.events": {
      addresses: [BSC_USDT_ADDRESS],
      chain_ids: [BSC_CHAIN_ID],
      signatures: [
        {
          abi: ERC20_TRANSFER_ABI,
          params: {
            [direction === "inbound" ? "to" : "from"]: projectWallet,
          },
          sig_hash: ERC20_TRANSFER_SIG_HASH,
        },
      ],
    },
  };
}

export function verifyThirdwebWebhookSignature({
  payload,
  secrets,
  signature,
  timestamp,
}: VerifyThirdwebWebhookSignatureOptions) {
  const signatureBuffer = Buffer.from(signature, "hex");

  for (const secret of secrets) {
    const candidatePayloads = [
      payload,
      timestamp ? `${timestamp}.${payload}` : null,
    ].filter((value): value is string => Boolean(value));

    for (const candidatePayload of candidatePayloads) {
      const computed = createHmac("sha256", secret)
        .update(candidatePayload)
        .digest("hex");
      const computedBuffer = Buffer.from(computed, "hex");

      if (
        computedBuffer.length === signatureBuffer.length &&
        timingSafeEqual(computedBuffer, signatureBuffer)
      ) {
        return secret;
      }
    }
  }

  throw new Error("Invalid webhook signature.");
}

export function extractTrackedTransferEvent(
  event: ThirdwebInsightEventRecord,
  projectWallet: string,
): ThirdwebWebhookEventDocument | null {
  const tokenAddress = normalizeAddress(event.data.address);

  if (Number(event.data.chain_id) !== Number(BSC_CHAIN_ID)) {
    return null;
  }

  if (tokenAddress !== normalizeAddress(BSC_USDT_ADDRESS)) {
    return null;
  }

  const fromAddress = normalizeAddress(
    event.data.decoded?.indexed_params?.from ?? extractTopicAddress(event.data.topics[1]),
  );
  const toAddress = normalizeAddress(
    event.data.decoded?.indexed_params?.to ?? extractTopicAddress(event.data.topics[2]),
  );

  if (!fromAddress || !toAddress) {
    return null;
  }

  const normalizedProjectWallet = normalizeAddress(projectWallet);
  const direction =
    toAddress === normalizedProjectWallet
      ? "inbound"
      : fromAddress === normalizedProjectWallet
        ? "outbound"
        : null;

  if (!direction) {
    return null;
  }

  return {
    amount:
      event.data.decoded?.non_indexed_params?.amount ??
      event.data.decoded?.non_indexed_params?.value ??
      "0",
    blockNumber: event.data.block_number,
    blockTimestamp: event.data.block_timestamp,
    chainId: Number(event.data.chain_id),
    direction,
    fromAddress,
    logIndex: event.data.log_index,
    payload: event,
    projectWallet: normalizedProjectWallet,
    receivedAt: new Date(),
    toAddress,
    tokenAddress,
    topic: "v1.events",
    transactionHash: event.data.transaction_hash,
    webhookEventId: event.id,
    webhookEventStatus: event.status,
  };
}

function extractTopicAddress(topic?: string) {
  if (!topic || topic.length < 40) {
    return "";
  }

  return `0x${topic.slice(-40)}`;
}
