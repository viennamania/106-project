#!/usr/bin/env node

safeLoadEnvFile(".env.local");
safeLoadEnvFile(".env");

const INSIGHT_WEBHOOKS_URL = "https://insight.thirdweb.com/v1/webhooks";
const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const ERC20_TRANSFER_SIG_HASH =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ERC20_TRANSFER_ABI = JSON.stringify({
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

const secretKey = process.env.THIRDWEB_SECRET_KEY?.trim();
const projectWallet = process.env.PROJECT_WALLET?.trim();
const explicitWebhookUrl = process.env.THIRDWEB_WEBHOOK_URL?.trim();
const baseUrl =
  process.env.THIRDWEB_WEBHOOK_BASE_URL?.trim() ??
  process.env.NEXT_PUBLIC_APP_URL?.trim();

if (!secretKey) {
  throw new Error("THIRDWEB_SECRET_KEY is required.");
}

if (!projectWallet) {
  throw new Error("PROJECT_WALLET is required.");
}

const webhookUrl =
  explicitWebhookUrl ||
  (baseUrl
    ? new URL("/api/webhooks/thirdweb", baseUrl).toString()
    : undefined);

if (!webhookUrl) {
  throw new Error(
    "Set THIRDWEB_WEBHOOK_URL or THIRDWEB_WEBHOOK_BASE_URL/NEXT_PUBLIC_APP_URL.",
  );
}

assertPublicWebhookUrl(webhookUrl);

const desiredWebhooks = ["inbound", "outbound"].map((direction) => ({
  filters: {
    "v1.events": {
      addresses: [BSC_USDT_ADDRESS],
      chain_ids: ["56"],
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
  },
  name: buildWebhookName(direction, projectWallet),
  webhook_url: webhookUrl,
}));

const existing = await fetchInsightWebhooks(secretKey);
const managed = groupByName(existing.data);
const active = [];

for (const desiredWebhook of desiredWebhooks) {
  const matches = managed.get(desiredWebhook.name) ?? [];

  if (matches.length > 1) {
    for (const duplicate of matches.slice(1)) {
      await deleteWebhook(secretKey, duplicate.id);
      console.log(`deleted duplicate webhook: ${duplicate.name} (${duplicate.id})`);
    }
  }

  const current = matches[0];

  if (current && isEquivalentWebhook(current, desiredWebhook)) {
    active.push(current);
    console.log(`kept webhook: ${current.name} (${current.id})`);
    continue;
  }

  if (current) {
    await deleteWebhook(secretKey, current.id);
    console.log(`replaced webhook: ${current.name} (${current.id})`);
  }

  const created = await createWebhook(secretKey, desiredWebhook);
  active.push(created.data);
  console.log(`created webhook: ${created.data.name} (${created.data.id})`);
}

const secrets = active.map((item) => item.webhook_secret).join(",");

console.log("");
console.log("Webhook URL:");
console.log(webhookUrl);
console.log("");
console.log("Add this to .env.local:");
console.log(`THIRDWEB_WEBHOOK_SECRETS=${secrets}`);

async function fetchInsightWebhooks(secret) {
  const response = await fetch(INSIGHT_WEBHOOKS_URL, {
    headers: {
      "x-secret-key": secret,
    },
  });

  return parseResponse(response);
}

async function createWebhook(secret, body) {
  const response = await fetch(INSIGHT_WEBHOOKS_URL, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-secret-key": secret,
    },
    method: "POST",
  });

  return parseResponse(response);
}

async function deleteWebhook(secret, webhookId) {
  const response = await fetch(`${INSIGHT_WEBHOOKS_URL}/${webhookId}`, {
    headers: {
      "x-secret-key": secret,
    },
    method: "DELETE",
  });

  return parseResponse(response);
}

async function parseResponse(response) {
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      typeof data === "string" ? data : JSON.stringify(data, null, 2),
    );
  }

  return data;
}

function groupByName(webhooks) {
  return webhooks.reduce((map, webhook) => {
    const current = map.get(webhook.name) ?? [];
    current.push(webhook);
    map.set(webhook.name, current);
    return map;
  }, new Map());
}

function buildWebhookName(direction, wallet) {
  return `pocket-bsc-usdt-${direction}-${normalizeAddress(wallet).slice(-8)}`;
}

function normalizeAddress(address) {
  return address.trim().toLowerCase();
}

function assertPublicWebhookUrl(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();

  if (url.protocol !== "https:") {
    throw new Error("Webhook URL must use https.");
  }

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local")
  ) {
    throw new Error("Webhook URL must be publicly reachable.");
  }
}

function isEquivalentWebhook(existingWebhook, desiredWebhook) {
  return (
    existingWebhook.webhook_url === desiredWebhook.webhook_url &&
    stringifyWebhookFilters(existingWebhook.filters) ===
      stringifyWebhookFilters(desiredWebhook.filters)
  );
}

function stringifyWebhookFilters(filters) {
  const events = filters["v1.events"];

  return JSON.stringify({
    "v1.events": {
      addresses: (events.addresses ?? []).map(normalizeAddress).sort(),
      chain_ids: [...(events.chain_ids ?? [])].sort(),
      signatures: (events.signatures ?? []).map((signature) => ({
        abi: signature.abi ?? null,
        params: normalizeParams(signature.params ?? {}),
        sig_hash: signature.sig_hash ?? null,
      })),
    },
  });
}

function normalizeParams(params) {
  return Object.fromEntries(
    Object.entries(params)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [
        key,
        typeof value === "string" && value.startsWith("0x")
          ? normalizeAddress(value)
          : value,
      ]),
  );
}

function safeLoadEnvFile(path) {
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}
