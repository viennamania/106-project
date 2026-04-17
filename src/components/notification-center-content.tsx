"use client";

import type { ReactNode } from "react";

import { NotificationPushCard } from "@/components/notification-push-card";
import type {
  AppNotificationPreferencesRecord,
  AppNotificationRecord,
} from "@/lib/notifications";
import { type Dictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function MessageCard({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4 text-sm leading-6 break-words",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-950"
          : "border-slate-200 bg-white/90 text-slate-600",
      )}
    >
      {children}
    </div>
  );
}

export function NotificationPreferenceCard({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      role="switch"
      className={cn(
        "group flex items-center justify-between gap-3 rounded-[22px] border px-4 py-4 text-left shadow-[0_18px_45px_rgba(15,23,42,0.05)] transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/14 focus-visible:ring-offset-2 active:translate-y-0",
        checked
          ? "border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.98),rgba(209,250,229,0.92))] hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_22px_48px_rgba(16,185,129,0.14)]"
          : "border-slate-200 bg-white/90 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_22px_48px_rgba(15,23,42,0.10)]",
      )}
      onClick={() => {
        onChange(!checked);
      }}
      type="button"
    >
      <span
        className={cn(
          "pr-4 text-sm font-semibold transition-colors duration-200",
          checked
            ? "text-emerald-950"
            : "text-slate-950 group-hover:text-slate-950",
        )}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 rounded-full border transition duration-200 ease-out group-hover:scale-[1.04]",
          checked
            ? "border-emerald-400 bg-emerald-100 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]"
            : "border-slate-200 bg-slate-100 group-hover:border-slate-300 group-hover:bg-slate-200/80",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition duration-200 ease-out group-hover:shadow-[0_12px_24px_rgba(15,23,42,0.18)]",
            checked ? "right-1" : "left-1",
          )}
        />
      </span>
    </button>
  );
}

export function NotificationCard({
  dictionary,
  locale,
  notification,
  onOpen,
}: {
  dictionary: Dictionary;
  locale: Locale;
  notification: AppNotificationRecord;
  onOpen: () => void;
}) {
  return (
    <button
      className={cn(
        "w-full rounded-[22px] border px-4 py-4 text-left shadow-[0_18px_45px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50",
        notification.isRead
          ? "border-slate-200 bg-white/90"
          : "border-sky-200 bg-sky-50/70",
      )}
      onClick={onOpen}
      type="button"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                notification.type === "network_level_completed"
                  ? "bg-violet-100 text-violet-900"
                  : notification.type === "member_announcement"
                    ? "bg-amber-100 text-amber-900"
                  : notification.type === "network_member_completed"
                    ? "bg-sky-100 text-sky-900"
                    : "bg-emerald-100 text-emerald-900",
              )}
            >
              {notification.type === "network_level_completed"
                ? `${dictionary.activateNetworkPage.labels.level} ${notification.targetLevel ?? ""}`.trim()
                : notification.type === "member_announcement"
                  ? dictionary.activateNetworkPage.notifications.announcementBadge
                : notification.type === "network_member_completed"
                  ? `${dictionary.activateNetworkPage.labels.level} ${notification.targetLevel ?? ""}`.trim()
                  : dictionary.activateNetworkPage.labels.currentMember}
            </span>
            {!notification.isRead ? (
              <span className="inline-flex size-2 rounded-full bg-slate-950">
                <span className="sr-only">{notification.title}</span>
              </span>
            ) : null}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-950">
              {notification.title}
            </p>
            <p className="text-sm leading-6 text-slate-600">
              {notification.body}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-xs font-medium text-slate-500">
          {formatDateTime(notification.createdAt, locale)}
        </div>
      </div>
    </button>
  );
}

export function NotificationCenterContent({
  activePushCard,
  dictionary,
  hasMore,
  isLoadingMore,
  locale,
  memberEmail,
  notifications,
  notificationsError,
  notificationsStatus,
  onLoadMore,
  onOpenNotification,
  onUpdatePreference,
  preferences,
  walletAddress,
}: {
  activePushCard: boolean;
  dictionary: Dictionary;
  hasMore: boolean;
  isLoadingMore: boolean;
  locale: Locale;
  memberEmail: string | null;
  notifications: AppNotificationRecord[];
  notificationsError: string | null;
  notificationsStatus: "idle" | "loading" | "ready" | "error";
  onLoadMore: () => void;
  onOpenNotification: (notification: AppNotificationRecord) => void;
  onUpdatePreference: (
    key:
      | "directMemberCompletedEnabled"
      | "networkMemberCompletedEnabled"
      | "networkLevelCompletedEnabled",
    value: boolean,
  ) => void;
  preferences: AppNotificationPreferencesRecord | null;
  walletAddress: string | null;
}) {
  const notificationCopy = dictionary.activateNetworkPage.notifications;

  return (
    <>
      <div className="space-y-3">
        <NotificationPushCard
          active={activePushCard}
          copy={notificationCopy.push}
          locale={locale}
          memberEmail={memberEmail}
          walletAddress={walletAddress}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <NotificationPreferenceCard
            checked={preferences?.directMemberCompletedEnabled ?? true}
            label={notificationCopy.preferenceDirect}
            onChange={(checked) => {
              onUpdatePreference("directMemberCompletedEnabled", checked);
            }}
          />
          <NotificationPreferenceCard
            checked={preferences?.networkMemberCompletedEnabled ?? true}
            label={notificationCopy.preferenceNetworkMembers}
            onChange={(checked) => {
              onUpdatePreference("networkMemberCompletedEnabled", checked);
            }}
          />
          <NotificationPreferenceCard
            checked={preferences?.networkLevelCompletedEnabled ?? true}
            label={notificationCopy.preferenceLevel}
            onChange={(checked) => {
              onUpdatePreference("networkLevelCompletedEnabled", checked);
            }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {notificationsError ? (
          <MessageCard tone="error">{notificationsError}</MessageCard>
        ) : null}

        {notificationsStatus === "loading" && notifications.length === 0 ? (
          <MessageCard>{dictionary.activateNetworkPage.loading}</MessageCard>
        ) : notifications.length === 0 ? (
          <MessageCard>{notificationCopy.empty}</MessageCard>
        ) : (
          notifications.map((notification) => (
            <NotificationCard
              dictionary={dictionary}
              key={notification.notificationId}
              locale={locale}
              notification={notification}
              onOpen={() => {
                onOpenNotification(notification);
              }}
            />
          ))
        )}
      </div>

      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoadingMore}
            onClick={onLoadMore}
            type="button"
          >
            {isLoadingMore
              ? notificationCopy.loadingMore
              : notificationCopy.loadMore}
          </button>
        </div>
      ) : null}
    </>
  );
}
