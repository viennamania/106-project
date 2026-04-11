import "server-only";

import { getMembersCollection } from "@/lib/mongodb";
import { type MemberDocument, normalizeEmail } from "@/lib/member";
import {
  WALLET_HISTORY_DEFAULT_LIMIT,
  WALLET_HISTORY_MAX_LIMIT,
  WALLET_MEMBER_SEARCH_LIMIT,
  type WalletMemberLookupRecord,
  type WalletTransferRecord,
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
  getRpcClient,
} from "thirdweb/rpc";
import { toTokens } from "thirdweb/utils";

const WALLET_HISTORY_INITIAL_LOG_CHUNK = BigInt(15_000);
const WALLET_HISTORY_MIN_LOG_CHUNK = BigInt(250);
const WALLET_HISTORY_MAX_LOOKBACK = BigInt(2_000_000);
const WALLET_HISTORY_CACHE_TTL_MS = 1_500;

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

const walletTransferHistoryCache = new Map<
  string,
  WalletTransferHistoryCacheEntry
>();
const walletTransferHistoryInFlight = new Map<
  string,
  Promise<WalletTransferRecord[]>
>();

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
      timestamp: new Date(transfer.timestampMs).toISOString(),
      transactionHash: transfer.transactionHash,
    }));
}

async function getWalletTransferHistoryFromInsight({
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
  const counterpartyWallets = new Set<string>();
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

    counterpartyWallets.add(counterpartyWalletAddress);
    draftTransfers.push({
      amountDisplay: toTokens(amountValue, 18),
      amountWei: amountValue.toString(),
      blockNumber: event.block_number,
      counterpartyLookupKey: normalizeAddress(counterpartyWalletAddress),
      counterpartyWalletAddress,
      direction,
      logIndex: event.log_index,
      timestampMs: event.block_timestamp * 1000,
      transactionHash: event.transaction_hash,
    });
  }

  return hydrateWalletTransfers({
    counterpartyWallets,
    draftTransfers,
  });
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

async function getWalletTransferHistoryFromRpc({
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
  const counterpartyWallets = new Set<string>();
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
    counterpartyWallets.add(counterpartyWalletAddress);

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
      timestampMs: Date.parse(timestamp),
      transactionHash: log.transactionHash,
    });
  }

  return hydrateWalletTransfers({
    counterpartyWallets,
    draftTransfers,
  });
}

async function searchMembersCollection({
  excludeEmail,
  query,
}: {
  excludeEmail?: string | null;
  query: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const normalizedExcludeEmail = excludeEmail ? normalizeEmail(excludeEmail) : null;
  const normalizedReferralCode = query.trim().toUpperCase() || null;
  const normalizedWallet = query.trim().startsWith("0x")
    ? normalizeAddress(query)
    : null;
  const safePattern = escapeRegex(query.trim());
  const collection = await getMembersCollection();
  const results = await collection
    .find({
      ...(normalizedExcludeEmail
        ? {
            email: {
              $ne: normalizedExcludeEmail,
            },
          }
        : {}),
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
    .map(serializeWalletMemberLookup);
}

export async function searchWalletRecipients({
  excludeEmail,
  query,
}: {
  excludeEmail?: string | null;
  query: string;
}) {
  return searchMembersCollection({
    excludeEmail,
    query,
  });
}

export async function getWalletTransferHistory({
  limit = WALLET_HISTORY_DEFAULT_LIMIT,
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
    limit < 1
      ? WALLET_HISTORY_DEFAULT_LIMIT
      : limit > WALLET_HISTORY_MAX_LIMIT
        ? WALLET_HISTORY_MAX_LIMIT
        : limit;
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
      const transfers = await getWalletTransferHistoryFromInsight({
        historyLimit,
        normalizedWalletAddress,
      }).catch(() =>
        getWalletTransferHistoryFromRpc({
          historyLimit,
          normalizedWalletAddress,
        }),
      );

      rememberWalletTransferHistory(cacheKey, transfers);

      return transfers;
    } finally {
      walletTransferHistoryInFlight.delete(cacheKey);
    }
  })();

  walletTransferHistoryInFlight.set(cacheKey, historyPromise);

  return historyPromise;
}
