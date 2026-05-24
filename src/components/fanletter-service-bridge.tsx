import Link from "next/link";
import {
  ArrowRight,
  Clapperboard,
  LayoutDashboard,
  Newspaper,
  type LucideIcon,
} from "lucide-react";

import type { Locale } from "@/lib/i18n";

type FanletterServiceBridgeVariant = "news" | "studio";

type BridgeItem = {
  body: string;
  cta: string;
  href: string;
  icon: LucideIcon;
  label: string;
  title: string;
};

type FanletterServiceBridgeProps = {
  locale: Locale;
  newsHref: string;
  studioHref: string;
  variant: FanletterServiceBridgeVariant;
  vlogHref: string;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        newsBody:
          "리포트는 AI 캐릭터와 원본 브이로그를 발견하게 만드는 홍보면입니다. 사용자는 뉴스에서 캐릭터 채널, 공개 브이로그, 구매 콘텐츠로 이동합니다.",
        newsEyebrow: "FanLetter 서비스 연결",
        newsTitle: "뉴스는 브이로그 소비 입구입니다",
        studioBody:
          "Studio는 AI 캐릭터, 팬 요청, 브이로그 게시와 유료 콘텐츠를 운영하는 백오피스입니다. 운영 결과는 News의 소비 흐름으로 연결됩니다.",
        studioEyebrow: "FanLetter 운영 구조",
        studioTitle: "Studio는 캐릭터와 브이로그 운영실입니다",
        steps: {
          news: {
            body:
              "팬 기자 리포트와 캐릭터 뉴스로 관심을 만들고 유입을 모읍니다.",
            cta: "뉴스 홈",
            label: "홍보",
            title: "뉴스",
          },
          studio: {
            body:
              "AI 캐릭터 설정, 팬 요청, 브이로그 게시와 유료 운영을 관리합니다.",
            cta: "Studio",
            label: "운영",
            title: "백오피스",
          },
          vlog: {
            body:
              "뉴스에서 발견한 캐릭터의 공개 브이로그와 팬 전용 콘텐츠를 이어 봅니다.",
            cta: "브이로그",
            label: "소비",
            title: "브이로그 콘텐츠",
          },
        },
      }
    : {
        newsBody:
          "Reports are the promotional surface for discovering AI characters and source vlogs. Readers move from news into character channels, public vlogs, and purchased content.",
        newsEyebrow: "FanLetter service link",
        newsTitle: "News is the entry point for vlog consumption",
        studioBody:
          "Studio is the back office for AI characters, fan requests, vlog publishing, and paid content operations. That work feeds the News consumption flow.",
        studioEyebrow: "FanLetter operating model",
        studioTitle: "Studio runs characters and vlogs",
        steps: {
          news: {
            body:
              "Fan reporter stories and character news create attention and traffic.",
            cta: "News home",
            label: "Promote",
            title: "News",
          },
          studio: {
            body:
              "Manage AI character settings, fan requests, vlog publishing, and paid operations.",
            cta: "Studio",
            label: "Operate",
            title: "Back office",
          },
          vlog: {
            body:
              "Continue from news into public vlogs and fan-only character content.",
            cta: "Vlogs",
            label: "Consume",
            title: "Vlog content",
          },
        },
      };
}

export function FanletterServiceBridge({
  locale,
  newsHref,
  studioHref,
  variant,
  vlogHref,
}: FanletterServiceBridgeProps) {
  const copy = getCopy(locale);
  const dark = variant === "studio";
  const items: BridgeItem[] = [
    {
      ...copy.steps.news,
      href: newsHref,
      icon: Newspaper,
    },
    {
      ...copy.steps.vlog,
      href: vlogHref,
      icon: Clapperboard,
    },
    {
      ...copy.steps.studio,
      href: studioHref,
      icon: LayoutDashboard,
    },
  ];

  return (
    <section
      className={
        dark
          ? "rounded-lg border border-white/10 bg-white/[0.055] p-4 text-white shadow-[0_30px_90px_rgba(0,0,0,0.26)] backdrop-blur-md sm:p-5"
          : "border border-black/12 bg-white p-4 text-[#111510] shadow-[0_16px_36px_rgba(17,21,16,0.06)] sm:p-5"
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-end">
        <div className="min-w-0">
          <p
            className={
              dark
                ? "text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#44f26e]"
                : "text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#16702e]"
            }
          >
            {variant === "news" ? copy.newsEyebrow : copy.studioEyebrow}
          </p>
          <h2 className="mt-2 break-words text-2xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-3xl">
            {variant === "news" ? copy.newsTitle : copy.studioTitle}
          </h2>
          <p
            className={
              dark
                ? "mt-2 text-sm font-semibold leading-6 text-white/62"
                : "mt-2 text-sm font-semibold leading-6 text-black/58"
            }
          >
            {variant === "news" ? copy.newsBody : copy.studioBody}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className={
                  dark
                    ? "group min-w-0 rounded-lg border border-white/10 bg-black/24 p-3 !text-white transition hover:border-[#44f26e]/50 hover:bg-black/34"
                    : "group min-w-0 rounded-lg border border-black/10 bg-[#f6f8f4] p-3 !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                }
                href={item.href}
                key={item.title}
              >
                <span
                  className={
                    dark
                      ? "inline-flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#44f26e]"
                      : "inline-flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#16702e]"
                  }
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </span>
                <span className="mt-2 block truncate text-base font-black">
                  {item.title}
                </span>
                <span
                  className={
                    dark
                      ? "mt-1 line-clamp-2 block text-xs font-semibold leading-5 text-white/54"
                      : "mt-1 line-clamp-2 block text-xs font-semibold leading-5 text-black/50"
                  }
                >
                  {item.body}
                </span>
                <span
                  className={
                    dark
                      ? "mt-3 inline-flex items-center gap-1 text-xs font-black text-[#44f26e]"
                      : "mt-3 inline-flex items-center gap-1 text-xs font-black text-[#16702e]"
                  }
                >
                  {item.cta}
                  <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
