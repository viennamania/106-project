import "server-only";

import { createRequire } from "node:module";

import type { AppNotificationType, AppPushSubscriptionDocument } from "@/lib/notifications";

type WebPushModule = {
  sendNotification: (
    subscription: {
      endpoint: string;
      keys: {
        auth: string;
        p256dh: string;
      };
    },
    payload?: string,
  ) => Promise<{ body?: string; statusCode?: number }>;
  setVapidDetails: (
    subject: string,
    publicKey: string,
    privateKey: string,
  ) => void;
};

export type NotificationPushPayload = {
  body: string;
  href: string | null;
  notificationId: string;
  title: string;
  type: AppNotificationType;
};

const require = createRequire(import.meta.url);
const webPush = require("web-push") as WebPushModule;
const vapidPublicKey =
  process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";
const vapidPrivateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() ?? "";
const vapidSubject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim() ?? "";

let vapidConfigured = false;

export function isWebPushConfigured() {
  return Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject);
}

export function getWebPushPublicKey() {
  return vapidPublicKey;
}

function ensureVapidDetails() {
  if (!isWebPushConfigured()) {
    throw new Error("Web Push is not configured.");
  }

  if (!vapidConfigured) {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    vapidConfigured = true;
  }
}

export async function sendWebPushNotification(
  subscription: Pick<AppPushSubscriptionDocument, "endpoint" | "keys">,
  payload: NotificationPushPayload,
) {
  ensureVapidDetails();

  return webPush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    },
    JSON.stringify({
      badge: "/icon-192.png",
      body: payload.body,
      href: payload.href,
      icon: "/icon-192.png",
      notificationId: payload.notificationId,
      tag: payload.notificationId,
      title: payload.title,
      type: payload.type,
    }),
  );
}
