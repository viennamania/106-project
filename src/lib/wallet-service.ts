import "server-only";

import {
  getMembersCollection,
  getThirdwebWebhookEventsCollection,
  getWalletTransfersCollection,
  getWalletTransferSyncStatesCollection,
} from "@/lib/mongodb";
import {
  REFERRAL_TREE_DEPTH_LIMIT,
  type MemberDocument,
  normalizeEmail,
  normalizeReferralCode,
} from "@/lib/member";
import {
  WALLET_HISTORY_DEFAULT_LIMIT,
  WALLET_HISTORY_MAX_LIMIT,
  WALLET_MEMBER_SEARCH_LIMIT,
  type WalletTransferDirection,
  type WalletMemberLookupRecord,
  type WalletTransferDocument,
  type WalletTransferRecord,
  type WalletTransferSource,
  type WalletTransferStatus,
  type WalletTransferSyncStateDocument,
  serializeWalletMemberLookup,
} from "@/lib/wallet";
import {
  BSC_USDT_ADDRESS,
  smartWalletChain,
} from "@/lib/thirdweb";
import { serverThirdwebClient } from "@/lib/thirdweb-server";
import { ERC20_TRANSFER_SIG_HASH, normalizeAddress } from "@/lib/thirdweb-webhooks";
import { Insight } from "thirdweb";
import { transferEvent } from "thirdweb/extensions/erc20";
import {
  eth_blockNumber,
  eth_getBlockByNumber,
  eth_getLogs,
  eth_getTransactionReceipt,
  getRpcClient,
} from "thirdweb/rpc";
import { toTokens } from "thirdweb/utils";

const WALLET_HISTORY_INITIAL_LOG_CHUNK = BigInt(15_000);
const WALLET_HISTORY_MIN_LOG_CHUNK = BigInt(250);
const WALLET_HISTORY_MAX_LOOKBACK = BigInt(2_000_000);
const WALLET_HISTORY_CACHE_TTL_MS = 1_500;
const WALLET_HISTORY_DB_SYNC_STALE_MS = 5 * 60_000;
const WALLET_HISTORY_INSIGHT_TIMEOUT_MS = 8_000;
const WALLET_HISTORY_RPC_TIMEOUT_MS = 8_000;

type WalletTransferLog = {
  blockNumber: bigint;
  data: string;
  logIndex: bigint;
  topics: string[];
  transactionHash: string;
};

type WalletDraftTransfer = Omit<
  WalletTransferRecord,
  "counterparty" | "timestamp"
> & {
  counterpartyLookupKey: string;
  timestampMs: number;
};

type InsightTransferEvent = Awaited<
  ReturnType<typeof Insight.getContractEvents>
>[number];

type WalletTransferHistoryCacheEntry = {
  createdAt: number;
  transfers: WalletTransferRecord[];
};

type WalletStoredHistorySnapshot = {
  hasStoredHistory: boolean;
  hasPendingAppTransfers: boolean;
  isWebhookBacked: boolean;
  syncState: WalletTransferSyncStateDocument | null;
  transfers: WalletTransferRecord[];
};

type WalletChainSyncResult = {
  draftTransfers: WalletDraftTransfer[];
  source: WalletTransferSource;
};

type WalletTransferHistorySnapshot = {
  hasStoredHistory: boolean;
  needsSync: boolean;
  transfers: WalletTransferRecord[];
};

const walletTransferHistoryCache = new Map<
  string,
  WalletTransferHistoryCacheEntry
>();
const walletTransferHistoryInFlight = new Map<
  string,
  Promise<WalletTransferRecord[]>
>();
const walletTransferSyncInFlight = new Map<string, Promise<void>>();
const normalizedProjectWalletAddress = normalizeAddress(
  process.env.PROJECT_WALLET?.trim() ?? "",
);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function encodeTopicAddress(address: string): `0x${string}` {
  return `0x000000000000000000000000${normalizeAddress(address).slice(2)}`;
}

function extractTopicAddress(topic?: string | null) {
  if (!topic || topic.length < 42) {
    return null;
  }

  return normalizeAddress(`0x${topic.slice(-40)}`);
}

function getSmallerBlockChunk(blockChunk: bigint) {
  const nextChunk = blockChunk / BigInt(2);
  return nextChunk >= WALLET_HISTORY_MIN_LOG_CHUNK
    ? nextChunk
    : WALLET_HISTORY_MIN_LOG_CHUNK;
}

function isRpcLimitExceededError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === -32005
  ) {
    return true;
  }

  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("limit exceeded")
  );
}

function getSearchRank({
  member,
  normalizedExactEmail,
  normalizedQuery,
  normalizedReferralCode,
  normalizedWallet,
}: {
  member: MemberDocument;
  normalizedExactEmail: string;
  normalizedQuery: string;
  normalizedReferralCode: string | null;
  normalizedWallet: string | null;
}) {
  let score = 0;
  const email = normalizeEmail(member.email);
  const referralCode = member.referralCode?.trim().toUpperCase() ?? "";
  const walletAddress = normalizeAddress(member.lastWalletAddress);

  if (email === normalizedExactEmail) {
    score += 120;
  } else if (email.startsWith(normalizedQuery)) {
    score += 80;
  } else if (email.includes(normalizedQuery)) {
    score += 45;
  }

  if (normalizedReferralCode && referralCode === normalizedReferralCode) {
    score += 110;
  } else if (
    normalizedReferralCode &&
    referralCode.startsWith(normalizedReferralCode)
  ) {
    score += 60;
  }

  if (normalizedWallet && walletAddress === normalizedWallet) {
    score += 100;
  } else if (normalizedWallet && walletAddress.includes(normalizedWallet)) {
    score += 35;
  }

  if (member.status === "completed") {
    score += 10;
  }

  return score;
}

function createWalletLookupMap(members: MemberDocument[]) {
  return new Map<string, WalletMemberLookupRecord>(
    members.map((member) => [
      normalizeAddress(member.lastWalletAddress),
      serializeWalletMemberLookup(member),
    ]),
  );
}

function sortTransferLogsDesc<
  T extends { blockNumber: bigint; logIndex: bigint },
>(left: T, right: T) {
  if (left.blockNumber === right.blockNumber) {
    return Number(right.logIndex - left.logIndex);
  }

  return left.blockNumber > right.blockNumber ? -1 : 1;
}

function sortTransferEventsDesc(
  left: InsightTransferEvent,
  right: InsightTransferEvent,
) {
  if (left.block_number === right.block_number) {
    return right.log_index - left.log_index;
  }

  return right.block_number - left.block_number;
}

function rememberWalletTransferHistory(
  cacheKey: string,
  transfers: WalletTransferRecord[],
) {
  if (walletTransferHistoryCache.size >= 128) {
    const oldestEntry = walletTransferHistoryCache.keys().next();

    if (!oldestEntry.done) {
      walletTransferHistoryCache.delete(oldestEntry.value);
    }
  }

  walletTransferHistoryCache.set(cacheKey, {
    createdAt: Date.now(),
    transfers,
  });
}

function isProjectWallet(normalizedWalletAddress: string) {
  return (
    normalizedProjectWalletAddress.length > 0 &&
    normalizedWalletAddress === normalizedProjectWalletAddress
  );
}

function resolveWalletHistoryRequest({
  limit,
  walletAddress,
}: {
  limit?: number;
  walletAddress: string;
}) {
  const normalizedWalletAddress = normalizeAddress(walletAddress);

  if (!/^0x[a-f0-9]{40}$/u.test(normalizedWalletAddress)) {
    throw new Error("A valid wallet address is required.");
  }

  const historyLimit =
    limit === undefined || limit < 1
      ? WALLET_HISTORY_DEFAULT_LIMIT
      : limit > WALLET_HISTORY_MAX_LIMIT
        ? WALLET_HISTORY_MAX_LIMIT
        : limit;

  return {
    historyLimit,
    normalizedWalletAddress,
  };
}

function buildWalletTransferDocument({
  draftTransfer,
  normalizedWalletAddress,
  source,
}: {
  draftTransfer: WalletDraftTransfer;
  normalizedWalletAddress: string;
  source: WalletTransferSource;
}): WalletTransferDocument {
  const synchronizedAt = new Date();

  return {
    amountWei: draftTransfer.amountWei,
    blockNumber: draftTransfer.blockNumber,
    blockTimestamp: new Date(draftTransfer.timestampMs),
    chainId: Number(smartWalletChain.id),
    counterpartyWalletAddress: normalizeAddress(
      draftTransfer.counterpartyWalletAddress,
    ),
    createdAt: synchronizedAt,
    direction: draftTransfer.direction,
    logIndex: draftTransfer.logIndex,
    source,
    status: draftTransfer.status,
    tokenAddress: normalizeAddress(BSC_USDT_ADDRESS),
    transactionHash: draftTransfer.transactionHash,
    updatedAt: synchronizedAt,
    walletAddress: normalizedWalletAddress,
  };
}

function createDraftTransferFromStoredDocument(
  document: WalletTransferDocument,
): WalletDraftTransfer {
  return {
    amountDisplay: toTokens(BigInt(document.amountWei), 18),
    amountWei: document.amountWei,
    blockNumber: document.blockNumber,
    counterpartyLookupKey: normalizeAddress(document.counterpartyWalletAddress),
    counterpartyWalletAddress: document.counterpartyWalletAddress,
    direction: document.direction,
    logIndex: document.logIndex,
    status: document.status,
    timestampMs: document.blockTimestamp.getTime(),
    transactionHash: document.transactionHash,
  };
}

async function readStoredWalletTransferHistory({
  historyLimit,
  normalizedWalletAddress,
}: {
  historyLimit: number;
  normalizedWalletAddress: string;
}): Promise<WalletStoredHistorySnapshot> {
  const [syncStatesCollection, walletTransfersCollection] = await Promise.all([
    getWalletTransferSyncStatesCollection(),
    getWalletTransfersCollection(),
  ]);
  const [syncState, storedTransfers] = await Promise.all([
    syncStatesCollection.findOne({ walletAddress: normalizedWalletAddress }),
    walletTransfersCollection
      .find({
        walletAddress: normalizedWalletAddress,
      })
      .sort({
        blockTimestamp: -1,
        blockNumber: -1,
        logIndex: -1,
      })
      .limit(historyLimit)
      .toArray(),
  ]);

  if (storedTransfers.length === 0 && isProjectWallet(normalizedWalletAddress)) {
    const webhookEventsCollection = await getThirdwebWebhookEventsCollection();
    const webhookTransfers = await webhookEventsCollection
      .find({
        projectWallet: normalizedWalletAddress,
      })
      .sort({
        blockTimestamp: -1,
        blockNumber: -1,
        logIndex: -1,
      })
      .limit(historyLimit)
      .toArray();

    return {
      hasStoredHistory: webhookTransfers.length > 0,
      hasPendingAppTransfers: false,
      isWebhookBacked: webhookTransfers.length > 0,
      syncState,
      transfers: await hydrateWalletTransfers({
        counterpartyWallets: new Set(
          webhookTransfers.map((transfer) =>
            normalizeAddress(
              transfer.direction === "inbound"
                ? transfer.fromAddress
                : transfer.toAddress,
            ),
          ),
        ),
        draftTransfers: webhookTransfers.map((transfer) => {
          const counterpartyWalletAddress =
            transfer.direction === "inbound"
              ? transfer.fromAddress
              : transfer.toAddress;

          return {
            amountDisplay: toTokens(BigInt(transfer.amount), 18),
            amountWei: transfer.amount,
            blockNumber: transfer.blockNumber,
            counterpartyLookupKey: normalizeAddress(counterpartyWalletAddress),
            counterpartyWalletAddress,
            direction: transfer.direction,
            logIndex: transfer.logIndex,
            status: "confirmed",
            timestampMs: transfer.blockTimestamp * 1000,
            transactionHash: transfer.transactionHash,
          };
        }),
      }),
    };
  }

  return {
    hasStoredHistory: storedTransfers.length > 0,
    hasPendingAppTransfers: storedTransfers.some(
      (transfer) =>
        transfer.source === "app_send" && transfer.status === "pending",
    ),
    isWebhookBacked: false,
    syncState,
    transfers: await hydrateWalletTransfers({
      counterpartyWallets: new Set(
        storedTransfers.map((transfer) =>
          normalizeAddress(transfer.counterpartyWalletAddress),
        ),
      ),
      draftTransfers: storedTransfers.map(createDraftTransferFromStoredDocument),
    }),
  };
}

async function persistWalletTransferHistory({
  draftTransfers,
  normalizedWalletAddress,
  source,
}: {
  draftTransfers: WalletDraftTransfer[];
  normalizedWalletAddress: string;
  source: WalletTransferSource;
}) {
  const [syncStatesCollection, walletTransfersCollection] = await Promise.all([
    getWalletTransferSyncStatesCollection(),
    getWalletTransfersCollection(),
  ]);
  const synchronizedAt = new Date();
  const transferDocuments = draftTransfers.map((draftTransfer) =>
    buildWalletTransferDocument({
      draftTransfer,
      normalizedWalletAddress,
      source,
    }),
  );

  if (transferDocuments.length > 0) {
    await walletTransfersCollection.bulkWrite(
      transferDocuments.map((transferDocument) => ({
        updateOne: {
          filter: {
            walletAddress: transferDocument.walletAddress,
            transactionHash: transferDocument.transactionHash,
            logIndex: transferDocument.logIndex,
          },
          update: {
            $set: {
              amountWei: transferDocument.amountWei,
              blockNumber: transferDocument.blockNumber,
              blockTimestamp: transferDocument.blockTimestamp,
              chainId: transferDocument.chainId,
              counterpartyWalletAddress:
                transferDocument.counterpartyWalletAddress,
              direction: transferDocument.direction,
              source: transferDocument.source,
              status: transferDocument.status,
              tokenAddress: transferDocument.tokenAddress,
              updatedAt: synchronizedAt,
            },
            $setOnInsert: {
              createdAt: transferDocument.createdAt,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  await syncStatesCollection.updateOne(
    {
      walletAddress: normalizedWalletAddress,
    },
    {
      $set: {
        lastError: null,
        lastSyncedAt: synchronizedAt,
        lastSyncedBlock: transferDocuments[0]?.blockNumber ?? null,
        source,
        updatedAt: synchronizedAt,
      },
      $setOnInsert: {
        walletAddress: normalizedWalletAddress,
      },
    },
    { upsert: true },
  );
}

async function rememberWalletTransferSyncFailure({
  error,
  normalizedWalletAddress,
}: {
  error: unknown;
  normalizedWalletAddress: string;
}) {
  const syncStatesCollection = await getWalletTransferSyncStatesCollection();
  const message = error instanceof Error ? error.message : String(error);

  await syncStatesCollection.updateOne(
    {
      walletAddress: normalizedWalletAddress,
    },
    {
      $set: {
        lastError: message,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        lastSyncedAt: null,
        lastSyncedBlock: null,
        source: null,
        walletAddress: normalizedWalletAddress,
      },
    },
    { upsert: true },
  );
}

async function rememberWalletTransferSyncSuccess({
  lastSyncedBlock,
  normalizedWalletAddress,
  source,
}: {
  lastSyncedBlock: number | null;
  normalizedWalletAddress: string;
  source: WalletTransferSource;
}) {
  const syncStatesCollection = await getWalletTransferSyncStatesCollection();

  await syncStatesCollection.updateOne(
    {
      walletAddress: normalizedWalletAddress,
    },
    {
      $set: {
        lastError: null,
        lastSyncedAt: new Date(),
        lastSyncedBlock,
        source,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        walletAddress: normalizedWalletAddress,
      },
    },
    { upsert: true },
  );
}

function buildAppWalletTransferDraft({
  amountWei,
  blockNumber,
  counterpartyWalletAddress,
  direction,
  logIndex,
  status,
  timestampMs,
  transactionHash,
}: {
  amountWei: string;
  blockNumber: number;
  counterpartyWalletAddress: string;
  direction: WalletTransferDirection;
  logIndex: number;
  status: WalletTransferStatus;
  timestampMs: number;
  transactionHash: string;
}): WalletDraftTransfer {
  return {
    amountDisplay: toTokens(BigInt(amountWei), 18),
    amountWei,
    blockNumber,
    counterpartyLookupKey: normalizeAddress(counterpartyWalletAddress),
    counterpartyWalletAddress,
    direction,
    logIndex,
    status,
    timestampMs,
    transactionHash,
  };
}

async function upsertAppWalletTransfer({
  amountWei,
  blockNumber,
  counterpartyWalletAddress,
  direction,
  logIndex,
  normalizedWalletAddress,
  status,
  timestamp,
  transactionHash,
}: {
  amountWei: string;
  blockNumber: number;
  counterpartyWalletAddress: string;
  direction: WalletTransferDirection;
  logIndex: number;
  normalizedWalletAddress: string;
  status: WalletTransferStatus;
  timestamp: Date;
  transactionHash: string;
}) {
  const collection = await getWalletTransfersCollection();

  await collection.updateOne(
    {
      source: "app_send",
      transactionHash,
      walletAddress: normalizedWalletAddress,
    },
    {
      $set: {
        amountWei,
        blockNumber,
        blockTimestamp: timestamp,
        chainId: Number(smartWalletChain.id),
        counterpartyWalletAddress: normalizeAddress(counterpartyWalletAddress),
        direction,
        logIndex,
        source: "app_send",
        status,
        tokenAddress: normalizeAddress(BSC_USDT_ADDRESS),
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
        transactionHash,
        walletAddress: normalizedWalletAddress,
      },
    },
    { upsert: true },
  );
}

function isUsdtTransferLog(
  log: {
    address: string;
    data: string;
    logIndex: bigint | number | null;
    topics: readonly string[];
  },
  {
    amountWei,
    fromWalletAddress,
    toWalletAddress,
  }: {
    amountWei: string;
    fromWalletAddress: string;
    toWalletAddress: string;
  },
) {
  if (normalizeAddress(log.address) !== normalizeAddress(BSC_USDT_ADDRESS)) {
    return false;
  }

  const topics = log.topics.filter(Boolean) as string[];

  if (topics.length < 3) {
    return false;
  }

  const fromAddress = extractTopicAddress(topics[1]);
  const toAddress = extractTopicAddress(topics[2]);

  if (!fromAddress || !toAddress) {
    return false;
  }

  return (
    fromAddress === normalizeAddress(fromWalletAddress) &&
    toAddress === normalizeAddress(toWalletAddress) &&
    BigInt(log.data).toString() === amountWei
  );
}

async function findConfirmedAppWalletTransfer({
  amountWei,
  fromWalletAddress,
  toWalletAddress,
  transactionHash,
}: {
  amountWei: string;
  fromWalletAddress: string;
  toWalletAddress: string;
  transactionHash: string;
}) {
  const rpcClient = getRpcClient({
    chain: smartWalletChain,
    client: serverThirdwebClient,
  });
  const receipt = await eth_getTransactionReceipt(rpcClient, {
    hash: transactionHash as `0x${string}`,
  });
  const matchingLog = receipt.logs.find((log) =>
    isUsdtTransferLog(log, {
      amountWei,
      fromWalletAddress,
      toWalletAddress,
    }),
  );

  if (!matchingLog || matchingLog.logIndex === null) {
    throw new Error("Matching USDT transfer log not found in receipt.");
  }

  const blockNumber =
    typeof receipt.blockNumber === "bigint"
      ? receipt.blockNumber
      : BigInt(receipt.blockNumber);
  const block = await eth_getBlockByNumber(rpcClient, {
    blockNumber,
  });
  const timestampMs = Number(block.timestamp) * 1000;
  const resolvedLogIndex =
    typeof matchingLog.logIndex === "bigint"
      ? Number(matchingLog.logIndex)
      : matchingLog.logIndex;

  return {
    outbound: buildAppWalletTransferDraft({
      amountWei,
      blockNumber: Number(blockNumber),
      counterpartyWalletAddress: toWalletAddress,
      direction: "outbound",
      logIndex: resolvedLogIndex,
      status: "confirmed",
      timestampMs,
      transactionHash,
    }),
    inbound: buildAppWalletTransferDraft({
      amountWei,
      blockNumber: Number(blockNumber),
      counterpartyWalletAddress: fromWalletAddress,
      direction: "inbound",
      logIndex: resolvedLogIndex,
      status: "confirmed",
      timestampMs,
      transactionHash,
    }),
  };
}

async function hydrateWalletTransfers({
  counterpartyWallets,
  draftTransfers,
}: {
  counterpartyWallets: Set<string>;
  draftTransfers: WalletDraftTransfer[];
}) {
  const membersCollection = await getMembersCollection();
  const counterpartyMembers = counterpartyWallets.size
    ? await membersCollection
        .find({
          lastWalletAddress: {
            $in: [...counterpartyWallets],
          },
        })
        .toArray()
    : [];
  const membersByWalletAddress = createWalletLookupMap(counterpartyMembers);

  return draftTransfers
    .sort((left, right) => right.timestampMs - left.timestampMs)
    .map((transfer) => ({
      amountDisplay: transfer.amountDisplay,
      amountWei: transfer.amountWei,
      blockNumber: transfer.blockNumber,
      counterparty:
        membersByWalletAddress.get(transfer.counterpartyLookupKey) ?? null,
      counterpartyWalletAddress: transfer.counterpartyWalletAddress,
      direction: transfer.direction,
      logIndex: transfer.logIndex,
      status: transfer.status,
      timestamp: new Date(transfer.timestampMs).toISOString(),
      transactionHash: transfer.transactionHash,
    }));
}

async function getWalletTransferDraftsFromInsight({
  historyLimit,
  normalizedWalletAddress,
}: {
  historyLimit: number;
  normalizedWalletAddress: string;
}) {
  const fetchLimit = Math.min(historyLimit * 2, WALLET_HISTORY_MAX_LIMIT);
  const [inboundEvents, outboundEvents] = await Promise.all([
    Insight.getContractEvents({
      chains: [smartWalletChain],
      client: serverThirdwebClient,
      contractAddress: BSC_USDT_ADDRESS,
      event: transferEvent({
        to: normalizedWalletAddress,
      }),
      queryOptions: {
        limit: fetchLimit,
        sort_by: "block_number",
        sort_order: "desc",
      },
    }),
    Insight.getContractEvents({
      chains: [smartWalletChain],
      client: serverThirdwebClient,
      contractAddress: BSC_USDT_ADDRESS,
      event: transferEvent({
        from: normalizedWalletAddress,
      }),
      queryOptions: {
        limit: fetchLimit,
        sort_by: "block_number",
        sort_order: "desc",
      },
    }),
  ]);

  const eventsByKey = new Map<string, InsightTransferEvent>();

  for (const event of [...inboundEvents, ...outboundEvents]) {
    if (
      !Array.isArray(event.topics) ||
      event.topics.length < 3 ||
      !event.transaction_hash
    ) {
      continue;
    }

    const key = `${event.transaction_hash}:${event.log_index}`;

    if (eventsByKey.has(key)) {
      continue;
    }

    eventsByKey.set(key, event);
  }

  const sortedEvents = [...eventsByKey.values()]
    .sort(sortTransferEventsDesc)
    .slice(0, historyLimit);
  const draftTransfers: WalletDraftTransfer[] = [];

  for (const event of sortedEvents) {
    const fromAddress = extractTopicAddress(event.topics[1]);
    const toAddress = extractTopicAddress(event.topics[2]);

    if (!fromAddress || !toAddress) {
      continue;
    }

    const direction =
      fromAddress === normalizedWalletAddress
        ? "outbound"
        : toAddress === normalizedWalletAddress
          ? "inbound"
          : null;

    if (!direction) {
      continue;
    }

    const counterpartyWalletAddress =
      direction === "inbound" ? fromAddress : toAddress;
    const amountValue = BigInt(event.data);

    draftTransfers.push({
      amountDisplay: toTokens(amountValue, 18),
      amountWei: amountValue.toString(),
      blockNumber: event.block_number,
      counterpartyLookupKey: normalizeAddress(counterpartyWalletAddress),
      counterpartyWalletAddress,
      direction,
      logIndex: event.log_index,
      status: "confirmed",
      timestampMs: event.block_timestamp * 1000,
      transactionHash: event.transaction_hash,
    });
  }

  return draftTransfers;
}

async function fetchTransferLogsChunk({
  fromBlock,
  rpcClient,
  toBlock,
  topics,
}: {
  fromBlock: bigint;
  rpcClient: ReturnType<typeof getRpcClient>;
  toBlock: bigint;
  topics: readonly (`0x${string}` | null)[];
}) {
  let chunkSize = toBlock - fromBlock + BigInt(1);

  while (true) {
    const effectiveFromBlock =
      toBlock - chunkSize + BigInt(1) > fromBlock
        ? toBlock - chunkSize + BigInt(1)
        : fromBlock;

    try {
      return await eth_getLogs(rpcClient, {
        address: BSC_USDT_ADDRESS,
        fromBlock: effectiveFromBlock,
        toBlock,
        topics: [...topics],
      });
    } catch (error) {
      if (
        !isRpcLimitExceededError(error) ||
        chunkSize <= WALLET_HISTORY_MIN_LOG_CHUNK
      ) {
        throw error;
      }

      chunkSize = getSmallerBlockChunk(chunkSize);
    }
  }
}

async function getWalletTransferDraftsFromRpc({
  historyLimit,
  normalizedWalletAddress,
}: {
  historyLimit: number;
  normalizedWalletAddress: string;
}) {
  const rpcClient = getRpcClient({
    chain: smartWalletChain,
    client: serverThirdwebClient,
  });
  const latestBlock = await eth_blockNumber(rpcClient);
  const earliestBlock =
    latestBlock > WALLET_HISTORY_MAX_LOOKBACK
      ? latestBlock - WALLET_HISTORY_MAX_LOOKBACK
      : BigInt(0);
  const inboundTopics = [
    ERC20_TRANSFER_SIG_HASH as `0x${string}`,
    null,
    encodeTopicAddress(normalizedWalletAddress),
  ] as const;
  const outboundTopics = [
    ERC20_TRANSFER_SIG_HASH as `0x${string}`,
    encodeTopicAddress(normalizedWalletAddress),
  ] as const;
  const logsByKey = new Map<string, WalletTransferLog>();
  let chunkEnd = latestBlock;

  while (chunkEnd >= earliestBlock && logsByKey.size < historyLimit * 2) {
    const chunkStart =
      chunkEnd >= WALLET_HISTORY_INITIAL_LOG_CHUNK
        ? chunkEnd - WALLET_HISTORY_INITIAL_LOG_CHUNK + BigInt(1)
        : BigInt(0);
    const effectiveChunkStart =
      chunkStart > earliestBlock ? chunkStart : earliestBlock;
    const [inboundLogs, outboundLogs] = await Promise.all([
      fetchTransferLogsChunk({
        fromBlock: effectiveChunkStart,
        rpcClient,
        toBlock: chunkEnd,
        topics: inboundTopics,
      }),
      fetchTransferLogsChunk({
        fromBlock: effectiveChunkStart,
        rpcClient,
        toBlock: chunkEnd,
        topics: outboundTopics,
      }),
    ]);

    for (const log of [...inboundLogs, ...outboundLogs]) {
      if (
        log.blockNumber === null ||
        log.logIndex === null ||
        log.transactionHash === null
      ) {
        continue;
      }

      const topics = log.topics.filter(Boolean) as string[];

      if (topics.length < 3) {
        continue;
      }

      const key = `${log.transactionHash}:${log.logIndex.toString()}`;

      if (logsByKey.has(key)) {
        continue;
      }

      logsByKey.set(key, {
        blockNumber: log.blockNumber,
        data: log.data,
        logIndex:
          typeof log.logIndex === "bigint"
            ? log.logIndex
            : BigInt(log.logIndex),
        topics,
        transactionHash: log.transactionHash,
      });
    }

    if (
      effectiveChunkStart === earliestBlock ||
      effectiveChunkStart === BigInt(0)
    ) {
      break;
    }

    chunkEnd = effectiveChunkStart - BigInt(1);
  }

  const sortedLogs = [...logsByKey.values()]
    .sort(sortTransferLogsDesc)
    .slice(0, historyLimit);
  const blockTimestampCache = new Map<bigint, string>();
  const draftTransfers: WalletDraftTransfer[] = [];

  for (const log of sortedLogs) {
    const fromAddress = extractTopicAddress(log.topics[1]);
    const toAddress = extractTopicAddress(log.topics[2]);

    if (!fromAddress || !toAddress) {
      continue;
    }

    const direction =
      fromAddress === normalizedWalletAddress
        ? "outbound"
        : toAddress === normalizedWalletAddress
          ? "inbound"
          : null;

    if (!direction) {
      continue;
    }

    const counterpartyWalletAddress =
      direction === "inbound" ? fromAddress : toAddress;

    let timestamp = blockTimestampCache.get(log.blockNumber);

    if (!timestamp) {
      const block = await eth_getBlockByNumber(rpcClient, {
        blockNumber: log.blockNumber,
      });
      timestamp = new Date(Number(block.timestamp) * 1000).toISOString();
      blockTimestampCache.set(log.blockNumber, timestamp);
    }

    const amountValue = BigInt(log.data);

    draftTransfers.push({
      amountDisplay: toTokens(amountValue, 18),
      amountWei: amountValue.toString(),
      blockNumber: Number(log.blockNumber),
      counterpartyLookupKey: normalizeAddress(counterpartyWalletAddress),
      counterpartyWalletAddress,
      direction,
      logIndex: Number(log.logIndex),
      status: "confirmed",
      timestampMs: Date.parse(timestamp),
      transactionHash: log.transactionHash,
    });
  }

  return draftTransfers;
}

async function searchMembersCollection({
  memberEmail,
  query,
}: {
  memberEmail: string;
  query: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const normalizedMemberEmail = normalizeEmail(memberEmail);
  const normalizedReferralCode = query.trim().toUpperCase() || null;
  const normalizedWallet = query.trim().startsWith("0x")
    ? normalizeAddress(query)
    : null;
  const safePattern = escapeRegex(query.trim());
  const collection = await getMembersCollection();
  const descendantLevels = await getPlacementDescendantLevels({
    collection,
    memberEmail: normalizedMemberEmail,
  });

  const results = await collection
    .find({
      email: {
        $ne: normalizedMemberEmail,
      },
      lastWalletAddress: {
        $exists: true,
        $ne: "",
        $type: "string",
      },
      $or: [
        {
          email: {
            $regex: safePattern,
            $options: "i",
          },
        },
        {
          referralCode: {
            $regex: safePattern,
            $options: "i",
          },
        },
        ...(normalizedWallet
          ? [
              {
                lastWalletAddress: normalizedWallet,
              },
            ]
          : []),
      ],
    })
    .limit(24)
    .toArray();

  return results
    .sort((left, right) => {
      const scoreDifference =
        getSearchRank({
          member: right,
          normalizedExactEmail: normalizedQuery,
          normalizedQuery,
          normalizedReferralCode,
          normalizedWallet,
        }) -
        getSearchRank({
          member: left,
          normalizedExactEmail: normalizedQuery,
          normalizedQuery,
          normalizedReferralCode,
          normalizedWallet,
        });

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return right.lastConnectedAt.getTime() - left.lastConnectedAt.getTime();
    })
    .slice(0, WALLET_MEMBER_SEARCH_LIMIT)
    .map((member) => ({
      ...serializeWalletMemberLookup(member),
      level: descendantLevels.get(member.email) ?? null,
    }));
}

export async function searchWalletRecipients({
  memberEmail,
  query,
}: {
  memberEmail: string;
  query: string;
}) {
  return searchMembersCollection({
    memberEmail,
    query,
  });
}

export async function recordWalletAppSendTransfer({
  amountWei,
  fromWalletAddress,
  toWalletAddress,
  transactionHash,
}: {
  amountWei: string;
  fromWalletAddress: string;
  toWalletAddress: string;
  transactionHash: string;
}) {
  const normalizedFromWalletAddress = normalizeAddress(fromWalletAddress);
  const normalizedToWalletAddress = normalizeAddress(toWalletAddress);
  const normalizedTransactionHash = transactionHash.trim().toLowerCase();
  const now = new Date();

  await Promise.all([
    upsertAppWalletTransfer({
      amountWei,
      blockNumber: 0,
      counterpartyWalletAddress: normalizedToWalletAddress,
      direction: "outbound",
      logIndex: -1,
      normalizedWalletAddress: normalizedFromWalletAddress,
      status: "pending",
      timestamp: now,
      transactionHash: normalizedTransactionHash,
    }),
    upsertAppWalletTransfer({
      amountWei,
      blockNumber: 0,
      counterpartyWalletAddress: normalizedFromWalletAddress,
      direction: "inbound",
      logIndex: -1,
      normalizedWalletAddress: normalizedToWalletAddress,
      status: "pending",
      timestamp: now,
      transactionHash: normalizedTransactionHash,
    }),
    rememberWalletTransferSyncSuccess({
      lastSyncedBlock: null,
      normalizedWalletAddress: normalizedFromWalletAddress,
      source: "app_send",
    }),
    rememberWalletTransferSyncSuccess({
      lastSyncedBlock: null,
      normalizedWalletAddress: normalizedToWalletAddress,
      source: "app_send",
    }),
  ]);
}

export async function confirmWalletAppSendTransfer({
  amountWei,
  fromWalletAddress,
  toWalletAddress,
  transactionHash,
}: {
  amountWei: string;
  fromWalletAddress: string;
  toWalletAddress: string;
  transactionHash: string;
}) {
  const normalizedFromWalletAddress = normalizeAddress(fromWalletAddress);
  const normalizedToWalletAddress = normalizeAddress(toWalletAddress);
  const normalizedTransactionHash = transactionHash.trim().toLowerCase();
  const confirmedTransfer = await findConfirmedAppWalletTransfer({
    amountWei,
    fromWalletAddress: normalizedFromWalletAddress,
    toWalletAddress: normalizedToWalletAddress,
    transactionHash: normalizedTransactionHash,
  });
  const confirmedTimestamp = new Date(confirmedTransfer.outbound.timestampMs);

  await Promise.all([
    upsertAppWalletTransfer({
      amountWei: confirmedTransfer.outbound.amountWei,
      blockNumber: confirmedTransfer.outbound.blockNumber,
      counterpartyWalletAddress: confirmedTransfer.outbound.counterpartyWalletAddress,
      direction: confirmedTransfer.outbound.direction,
      logIndex: confirmedTransfer.outbound.logIndex,
      normalizedWalletAddress: normalizedFromWalletAddress,
      status: "confirmed",
      timestamp: confirmedTimestamp,
      transactionHash: normalizedTransactionHash,
    }),
    upsertAppWalletTransfer({
      amountWei: confirmedTransfer.inbound.amountWei,
      blockNumber: confirmedTransfer.inbound.blockNumber,
      counterpartyWalletAddress: confirmedTransfer.inbound.counterpartyWalletAddress,
      direction: confirmedTransfer.inbound.direction,
      logIndex: confirmedTransfer.inbound.logIndex,
      normalizedWalletAddress: normalizedToWalletAddress,
      status: "confirmed",
      timestamp: confirmedTimestamp,
      transactionHash: normalizedTransactionHash,
    }),
    rememberWalletTransferSyncSuccess({
      lastSyncedBlock: confirmedTransfer.outbound.blockNumber,
      normalizedWalletAddress: normalizedFromWalletAddress,
      source: "app_send",
    }),
    rememberWalletTransferSyncSuccess({
      lastSyncedBlock: confirmedTransfer.inbound.blockNumber,
      normalizedWalletAddress: normalizedToWalletAddress,
      source: "app_send",
    }),
  ]);
}

async function reconcilePendingAppWalletTransfers({
  normalizedWalletAddress,
}: {
  normalizedWalletAddress: string;
}) {
  const collection = await getWalletTransfersCollection();
  const pendingTransfers = await collection
    .find({
      source: "app_send",
      status: "pending",
      walletAddress: normalizedWalletAddress,
    })
    .sort({
      updatedAt: -1,
    })
    .limit(6)
    .toArray();

  for (const pendingTransfer of pendingTransfers) {
    if (pendingTransfer.direction !== "outbound") {
      continue;
    }

    try {
      await confirmWalletAppSendTransfer({
        amountWei: pendingTransfer.amountWei,
        fromWalletAddress: pendingTransfer.walletAddress,
        toWalletAddress: pendingTransfer.counterpartyWalletAddress,
        transactionHash: pendingTransfer.transactionHash,
      });
    } catch {
      // Leave the transfer pending and try again on the next refresh cycle.
    }
  }
}

async function getPlacementDescendantLevels({
  collection,
  memberEmail,
}: {
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  memberEmail: string;
}) {
  const rootMember = await collection.findOne(
    { email: memberEmail },
    {
      projection: {
        referralCode: 1,
        status: 1,
      },
    },
  );
  const rootReferralCode = normalizeReferralCode(rootMember?.referralCode);

  if (!rootMember || rootMember.status !== "completed" || !rootReferralCode) {
    return new Map<string, number>();
  }

  const descendantLevels = new Map<string, number>();
  const visitedReferralCodes = new Set<string>([rootReferralCode]);
  let currentParentCodes = [rootReferralCode];

  for (
    let depth = 1;
    depth <= REFERRAL_TREE_DEPTH_LIMIT && currentParentCodes.length > 0;
    depth += 1
  ) {
    const levelMembers = await collection
      .find({
        $or: [
          {
            placementReferralCode: { $in: currentParentCodes },
            status: "completed",
          },
          {
            sponsorReferralCode: { $in: currentParentCodes },
            status: "pending_payment",
          },
          {
            referredByCode: { $in: currentParentCodes },
            status: "pending_payment",
          },
        ],
      })
      .project<Pick<MemberDocument, "email" | "referralCode" | "status">>({
        email: 1,
        referralCode: 1,
        status: 1,
      })
      .toArray();

    if (levelMembers.length === 0) {
      break;
    }

    const nextParentCodes: string[] = [];

    for (const levelMember of levelMembers) {
      descendantLevels.set(levelMember.email, depth);

      if (levelMember.status !== "completed") {
        continue;
      }

      const referralCode = normalizeReferralCode(levelMember.referralCode);

      if (!referralCode || visitedReferralCodes.has(referralCode)) {
        continue;
      }

      visitedReferralCodes.add(referralCode);
      nextParentCodes.push(referralCode);
    }

    currentParentCodes = nextParentCodes;
  }

  return descendantLevels;
}

async function fetchWalletTransferDraftsFromChain({
  historyLimit,
  normalizedWalletAddress,
}: {
  historyLimit: number;
  normalizedWalletAddress: string;
}): Promise<WalletChainSyncResult> {
  try {
    return {
      draftTransfers: await withTimeout(
        getWalletTransferDraftsFromInsight({
          historyLimit,
          normalizedWalletAddress,
        }),
        WALLET_HISTORY_INSIGHT_TIMEOUT_MS,
        "Wallet history insight request timed out.",
      ),
      source: "insight_sync",
    };
  } catch {
    return {
      draftTransfers: await withTimeout(
        getWalletTransferDraftsFromRpc({
          historyLimit,
          normalizedWalletAddress,
        }),
        WALLET_HISTORY_RPC_TIMEOUT_MS,
        "Wallet history RPC request timed out.",
      ),
      source: "rpc_sync",
    };
  }
}

async function syncWalletTransferHistory({
  historyLimit,
  normalizedWalletAddress,
}: {
  historyLimit: number;
  normalizedWalletAddress: string;
}) {
  const inFlightSync = walletTransferSyncInFlight.get(normalizedWalletAddress);

  if (inFlightSync) {
    return inFlightSync;
  }

  const syncPromise = (async () => {
    try {
      const { draftTransfers, source } = await fetchWalletTransferDraftsFromChain({
        historyLimit,
        normalizedWalletAddress,
      });

      await persistWalletTransferHistory({
        draftTransfers,
        normalizedWalletAddress,
        source,
      });
    } catch (error) {
      await rememberWalletTransferSyncFailure({
        error,
        normalizedWalletAddress,
      });
      throw error;
    } finally {
      walletTransferSyncInFlight.delete(normalizedWalletAddress);
    }
  })();

  walletTransferSyncInFlight.set(normalizedWalletAddress, syncPromise);

  return syncPromise;
}

export async function getWalletTransferHistorySnapshot({
  limit = WALLET_HISTORY_DEFAULT_LIMIT,
  walletAddress,
}: {
  limit?: number;
  walletAddress: string;
}): Promise<WalletTransferHistorySnapshot> {
  const { historyLimit, normalizedWalletAddress } = resolveWalletHistoryRequest({
    limit,
    walletAddress,
  });
  const storedHistory = await readStoredWalletTransferHistory({
    historyLimit,
    normalizedWalletAddress,
  });
  const lastSyncedAt = storedHistory.syncState?.lastSyncedAt ?? null;

  return {
    hasStoredHistory: storedHistory.hasStoredHistory,
    needsSync:
      storedHistory.hasPendingAppTransfers ||
      (!storedHistory.hasStoredHistory &&
        !storedHistory.isWebhookBacked &&
        (lastSyncedAt === null ||
          Date.now() - lastSyncedAt.getTime() >=
            WALLET_HISTORY_DB_SYNC_STALE_MS)),
    transfers: storedHistory.transfers,
  };
}

export async function refreshWalletTransferHistory({
  limit = WALLET_HISTORY_DEFAULT_LIMIT,
  walletAddress,
}: {
  limit?: number;
  walletAddress: string;
}) {
  const { historyLimit, normalizedWalletAddress } = resolveWalletHistoryRequest({
    limit,
    walletAddress,
  });

  await reconcilePendingAppWalletTransfers({
    normalizedWalletAddress,
  });

  const storedHistory = await readStoredWalletTransferHistory({
    historyLimit,
    normalizedWalletAddress,
  });

  if (storedHistory.hasStoredHistory) {
    return;
  }

  await syncWalletTransferHistory({
    historyLimit,
    normalizedWalletAddress,
  });
}

export async function getWalletTransferHistory({
  limit = WALLET_HISTORY_DEFAULT_LIMIT,
  walletAddress,
}: {
  limit?: number;
  walletAddress: string;
}) {
  const { historyLimit, normalizedWalletAddress } = resolveWalletHistoryRequest({
    limit,
    walletAddress,
  });
  const cacheKey = `${normalizedWalletAddress}:${historyLimit}`;
  const cachedHistory = walletTransferHistoryCache.get(cacheKey);

  if (
    cachedHistory &&
    Date.now() - cachedHistory.createdAt < WALLET_HISTORY_CACHE_TTL_MS
  ) {
    return cachedHistory.transfers;
  }

  const inFlightHistory = walletTransferHistoryInFlight.get(cacheKey);

  if (inFlightHistory) {
    return inFlightHistory;
  }

  const historyPromise = (async () => {
    try {
      const storedHistory = await readStoredWalletTransferHistory({
        historyLimit,
        normalizedWalletAddress,
      });
      const lastSyncedAt = storedHistory.syncState?.lastSyncedAt ?? null;
      const hasFreshStoredHistory =
        storedHistory.isWebhookBacked ||
        (lastSyncedAt !== null &&
          Date.now() - lastSyncedAt.getTime() < WALLET_HISTORY_DB_SYNC_STALE_MS);

      if (storedHistory.hasStoredHistory) {
        rememberWalletTransferHistory(cacheKey, storedHistory.transfers);

        if (!hasFreshStoredHistory) {
          void syncWalletTransferHistory({
            historyLimit,
            normalizedWalletAddress,
          }).catch((error: unknown) => {
            console.error("Failed to refresh stored wallet history.", error);
          });
        }

        return storedHistory.transfers;
      }

      await syncWalletTransferHistory({
        historyLimit,
        normalizedWalletAddress,
      });

      const syncedHistory = await readStoredWalletTransferHistory({
        historyLimit,
        normalizedWalletAddress,
      });
      const transfers = syncedHistory.transfers;

      rememberWalletTransferHistory(cacheKey, transfers);

      return transfers;
    } finally {
      walletTransferHistoryInFlight.delete(cacheKey);
    }
  })();

  walletTransferHistoryInFlight.set(cacheKey, historyPromise);

  return historyPromise;
}
