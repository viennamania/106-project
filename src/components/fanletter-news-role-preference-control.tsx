"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleUserRound,
  PenLine,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useSyncExternalStore } from "react";

import type { Locale } from "@/lib/i18n";
import {
  FANLETTER_NEWS_ROLE_PREFERENCE_CHANGE_EVENT,
  FANLETTER_NEWS_ROLE_PREFERENCE_STORAGE_KEY,
  normalizeFanletterNewsRolePreference,
  type FanletterNewsRolePreference,
} from "@/lib/fanletter-news-role-preference";
import { cn } from "@/lib/utils";

type RolePreferenceOption = {
  body: string;
  cta: string;
  href: string;
  icon: LucideIcon;
  key: FanletterNewsRolePreference;
  label: string;
  metric: string;
};

function subscribeToRolePreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(
    FANLETTER_NEWS_ROLE_PREFERENCE_CHANGE_EVENT,
    onStoreChange,
  );

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(
      FANLETTER_NEWS_ROLE_PREFERENCE_CHANGE_EVENT,
      onStoreChange,
    );
  };
}

function getRolePreferenceSnapshot() {
  return normalizeFanletterNewsRolePreference(
    window.localStorage.getItem(FANLETTER_NEWS_ROLE_PREFERENCE_STORAGE_KEY),
  );
}

function getServerRolePreferenceSnapshot(): FanletterNewsRolePreference {
  return "general";
}

function saveRolePreference(value: FanletterNewsRolePreference) {
  window.localStorage.setItem(FANLETTER_NEWS_ROLE_PREFERENCE_STORAGE_KEY, value);
  window.dispatchEvent(new Event(FANLETTER_NEWS_ROLE_PREFERENCE_CHANGE_EVENT));
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        eyebrow: "모바일 바로가기",
        saved: "선택됨",
        title: "내가 주로 쓸 역할",
        options: {
          general: {
            body: "구매 콘텐츠, 지갑, 캐릭터 탐색을 한곳에서 이어봅니다.",
            cta: "내 허브 열기",
            label: "일반 사용자",
          },
          reporter: {
            body: "팬 리포트를 빠르게 발행하고 성과를 확인합니다.",
            cta: "새 리포트 작성",
            label: "팬 리포터",
          },
          vlogger: {
            body: "뉴스 전용 브이로그 화면에서 공개 영상과 팬 전용 티저를 이어봅니다.",
            cta: "브이로그 뉴스 보기",
            label: "브이로거",
          },
        },
      }
    : {
        eyebrow: "Mobile shortcut",
        saved: "Selected",
        title: "My primary role",
        options: {
          general: {
            body: "Continue purchases, wallet, and character discovery from one place.",
            cta: "Open my hub",
            label: "Member",
          },
          reporter: {
            body: "Publish fan reports quickly and check performance.",
            cta: "Create report",
            label: "Fan reporter",
          },
          vlogger: {
            body: "Continue public vlogs and fan-only teasers inside the News view.",
            cta: "Open vlog news",
            label: "Vlogger",
          },
        },
      };
}

export function FanletterNewsRolePreferenceControl({
  generalHref,
  locale,
  reporterHref,
  reporterReportCount,
  vloggerHref,
  vloggerVideoCount,
}: {
  generalHref: string;
  locale: Locale;
  reporterHref: string;
  reporterReportCount: string;
  vloggerHref: string;
  vloggerVideoCount: string;
}) {
  const selectedRole = useSyncExternalStore(
    subscribeToRolePreference,
    getRolePreferenceSnapshot,
    getServerRolePreferenceSnapshot,
  );
  const copy = getCopy(locale);
  const options: RolePreferenceOption[] = [
    {
      body: copy.options.general.body,
      cta: copy.options.general.cta,
      href: generalHref,
      icon: CircleUserRound,
      key: "general",
      label: copy.options.general.label,
      metric: locale === "ko" ? "허브" : "Hub",
    },
    {
      body: copy.options.reporter.body,
      cta: copy.options.reporter.cta,
      href: reporterHref,
      icon: PenLine,
      key: "reporter",
      label: copy.options.reporter.label,
      metric: reporterReportCount,
    },
    {
      body: copy.options.vlogger.body,
      cta: copy.options.vlogger.cta,
      href: vloggerHref,
      icon: Video,
      key: "vlogger",
      label: copy.options.vlogger.label,
      metric: vloggerVideoCount,
    },
  ];

  return (
    <section className="border border-black/12 bg-white p-4 shadow-[0_16px_42px_rgba(17,21,16,0.08)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
            {copy.eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-black tracking-normal text-[#111510]">
            {copy.title}
          </h2>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const Icon = option.icon;
          const selected = selectedRole === option.key;

          return (
            <div
              className={cn(
                "flex min-h-[9.25rem] flex-col justify-between rounded-lg border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19b84b]",
                selected
                  ? "border-[#19b84b] bg-[#ecfff0] shadow-[0_12px_26px_rgba(25,184,75,0.14)]"
                  : "border-black/10 bg-[#f6f8f4] hover:border-[#19b84b]/60",
              )}
              key={option.key}
            >
              <button
                aria-pressed={selected}
                className="flex w-full flex-1 flex-col justify-between text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19b84b]"
                onClick={() => saveRolePreference(option.key)}
                type="button"
              >
                <span className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex size-10 items-center justify-center rounded-full",
                      selected
                        ? "bg-[#111510] text-[#44f26e]"
                        : "bg-white text-[#16702e]",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span
                    className={cn(
                      "inline-flex min-w-0 items-center gap-1 rounded-full px-2 py-1 text-[0.62rem] font-black",
                      selected
                        ? "bg-[#111510] text-white"
                        : "bg-white text-black/52",
                    )}
                  >
                    {selected ? <Check className="size-3" /> : null}
                    <span className="truncate">
                      {selected ? copy.saved : option.metric}
                    </span>
                  </span>
                </span>
                <span className="mt-3 block">
                  <span className="block text-base font-black tracking-normal text-[#111510]">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs font-bold leading-5 text-black/58">
                    {option.body}
                  </span>
                </span>
              </button>
              <Link
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-[#111510] px-3 text-xs font-black !text-white transition hover:bg-black"
                href={option.href}
              >
                {option.cta}
                <ArrowRight className="size-3.5 text-[#44f26e]" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
