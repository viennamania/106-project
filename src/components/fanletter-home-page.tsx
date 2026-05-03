import Image from "next/image";
import Link from "next/link";
import {
  BadgeDollarSign,
  Bot,
  ChartNoAxesCombined,
  Clapperboard,
  Crown,
  MessageCircleHeart,
  Network,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

const FANLETTER_IMAGE_VERSION = "20260415";
const FANLETTER_PHONE_IMAGE = `/landing/premium-phone.png?v=${FANLETTER_IMAGE_VERSION}`;

type FanletterCopy = {
  announcement: {
    label: string;
    prize: string;
  };
  brandSuffix: string;
  cta: {
    creator: string;
    fan: string;
    login: string;
  };
  creatorWall: {
    count: string;
    label: string;
  };
  economy: {
    body: string;
    cta: string;
    title: string;
  };
  faq: Array<{
    answer: string;
    question: string;
  }>;
  faqTitle: string;
  features: {
    eyebrow: string;
    items: Array<{
      badge?: string;
      description: string;
      title: string;
    }>;
  };
  footer: {
    title: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
  };
  languageLabel: string;
  nav: {
    creators: string;
    faq: string;
    features: string;
  };
  niche: {
    body: string;
    cta: string;
    title: string;
    categories: string[];
  };
  proof: {
    title: string;
    stats: Array<{
      label: string;
      value: string;
    }>;
  };
};

const koCopy: FanletterCopy = {
  announcement: {
    label: "AI 크리에이터 스튜디오 공개",
    prize: "콘텐츠 생성부터 판매까지 한 번에",
  },
  brandSuffix: "Creator AI",
  cta: {
    creator: "크리에이터로 시작",
    fan: "팬 피드 보기",
    login: "로그인",
  },
  creatorWall: {
    count: "201,548",
    label: "creator-AI economy를 시작한 네트워크",
  },
  economy: {
    body: "인물 페르소나, AI 이미지와 동영상, 팬 전용 콘텐츠, 레퍼럴 네트워크를 하나의 모바일 흐름으로 연결합니다.",
    cta: "지금 시작하기",
    title: "Creator-AI Economy를 더 빠르게 시작하세요.",
  },
  faq: [
    {
      answer: "가입 후 크리에이터 프로필과 인물 페르소나를 설정하면 AI 콘텐츠 생성과 게시 흐름을 바로 사용할 수 있습니다.",
      question: "FanLetter는 무엇인가요?",
    },
    {
      answer: "AI 콘텐츠를 만들고 팬 전용 콘텐츠, 네트워크 피드, 판매 페이지로 연결하려는 크리에이터에게 맞춰져 있습니다.",
      question: "누가 사용할 수 있나요?",
    },
    {
      answer: "크리에이터 스튜디오에서 AI 이미지와 동영상을 만들고, 가격과 공개 범위를 정해 콘텐츠로 게시합니다.",
      question: "콘텐츠는 어떻게 수익화하나요?",
    },
    {
      answer: "모바일에서 프로필 설정, 콘텐츠 생성, 피드 확인, 지갑 연결까지 이어지도록 설계되어 있습니다.",
      question: "모바일에서도 충분히 사용할 수 있나요?",
    },
  ],
  faqTitle: "FAQ",
  features: {
    eyebrow: "Features",
    items: [
      {
        badge: "New",
        description: "고정 인물 페르소나와 아바타를 바탕으로 일관된 이미지 콘텐츠를 생성합니다.",
        title: "AI 이미지 생성",
      },
      {
        badge: "New",
        description: "짧은 세로형 동영상 콘텐츠를 만들고 네트워크 피드와 상세 페이지에서 재생합니다.",
        title: "AI 동영상 생성",
      },
      {
        description: "팬 전용 콘텐츠, 유료 콘텐츠, 저장과 공유 흐름을 하나의 피드로 운영합니다.",
        title: "팬 전용 피드",
      },
      {
        description: "레퍼럴 코드와 공유 링크로 유입을 추적하고 네트워크 콘텐츠로 확장합니다.",
        title: "네트워크 성장",
      },
      {
        description: "지갑 연결, USDT 기반 결제 흐름, 판매 내역을 크리에이터 스튜디오에서 확인합니다.",
        title: "지갑과 정산",
      },
    ],
  },
  footer: {
    title: "가장 빠른 AI 크리에이터 홈을 시작하세요.",
  },
  hero: {
    eyebrow: "FANLETTER",
    title: "팬에게 팔 수 있는 AI 콘텐츠를 더 빠르게 만드세요.",
    description:
      "FanLetter는 크리에이터 프로필, 인물 페르소나, AI 이미지와 동영상 생성, 팬 전용 피드, 판매 흐름을 모바일 중심으로 묶은 크리에이터 수익화 홈입니다.",
  },
  languageLabel: "언어",
  nav: {
    creators: "크리에이터",
    faq: "FAQ",
    features: "기능",
  },
  niche: {
    body: "하나의 인물 정체성을 유지하면서 장르와 상황을 바꿔 더 많은 콘텐츠를 만듭니다.",
    cta: "크리에이터 스튜디오 열기",
    title: "모든 니치에 맞는 AI 콘텐츠 홈.",
    categories: ["Beauty", "Fitness", "Music", "Fashion", "Travel"],
  },
  proof: {
    title: "AI 콘텐츠 생성부터 팬 전용 판매까지",
    stats: [
      { label: "creator studio", value: "01" },
      { label: "AI content flow", value: "05" },
      { label: "mobile first", value: "24/7" },
    ],
  },
};

const enCopy: FanletterCopy = {
  announcement: {
    label: "Creator AI Studio is live",
    prize: "Create, publish, and sell in one flow",
  },
  brandSuffix: "Creator AI",
  cta: {
    creator: "Become a creator",
    fan: "Explore the feed",
    login: "Login",
  },
  creatorWall: {
    count: "201,548",
    label: "network touchpoints ready for the creator-AI economy",
  },
  economy: {
    body: "Persona, AI images, AI videos, paid content, and referral growth move through one mobile creator workflow.",
    cta: "Start now",
    title: "The Creator-AI Economy starts faster here.",
  },
  faq: [
    {
      answer: "FanLetter brings creator profiles, character personas, AI content generation, fan feeds, and monetisation into one mobile-first flow.",
      question: "What is FanLetter?",
    },
    {
      answer: "It is built for creators who want to publish AI-assisted content, build fan access, and grow through shareable networks.",
      question: "Who is it for?",
    },
    {
      answer: "Create image or video content in the studio, set pricing and visibility, then publish it to the fan content experience.",
      question: "How do creators monetise?",
    },
    {
      answer: "Yes. Profile setup, generation, feed browsing, wallet connection, and sales views are designed around mobile use.",
      question: "Is it mobile first?",
    },
  ],
  faqTitle: "FAQ",
  features: {
    eyebrow: "Features",
    items: [
      {
        badge: "New",
        description: "Generate consistent image content from a fixed character persona and avatar reference.",
        title: "AI image creation",
      },
      {
        badge: "New",
        description: "Create short vertical videos and play them inside the network feed and detail pages.",
        title: "AI video creation",
      },
      {
        description: "Run fan-only content, paid content, saves, comments, and shares from one feed system.",
        title: "Fan content feed",
      },
      {
        description: "Use referral codes and share links to track traffic and grow through network content.",
        title: "Network growth",
      },
      {
        description: "Connect wallets, support USDT purchase flows, and review sales from Creator Studio.",
        title: "Wallets and payouts",
      },
    ],
  },
  footer: {
    title: "Start your fastest AI creator home.",
  },
  hero: {
    eyebrow: "FANLETTER",
    title: "Create AI content your fans can buy, faster.",
    description:
      "FanLetter combines creator profiles, character personas, AI image and video generation, fan-only feeds, and sales flows into one mobile-first monetisation home.",
  },
  languageLabel: "Language",
  nav: {
    creators: "Creators",
    faq: "FAQ",
    features: "Features",
  },
  niche: {
    body: "Keep the same character identity while changing scenes, formats, and content categories.",
    cta: "Open Creator Studio",
    title: "Built for every AI creator niche.",
    categories: ["Beauty", "Fitness", "Music", "Fashion", "Travel"],
  },
  proof: {
    title: "From AI content creation to fan-only sales",
    stats: [
      { label: "creator studio", value: "01" },
      { label: "AI content flow", value: "05" },
      { label: "mobile first", value: "24/7" },
    ],
  },
};

const featureIcons = [
  Bot,
  Clapperboard,
  MessageCircleHeart,
  Network,
  WalletCards,
] as const;

function getFanletterCopy(locale: Locale) {
  return locale === "ko" ? koCopy : enCopy;
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function FanletterHomePage({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getFanletterCopy(locale);
  const creatorHref = buildPathWithReferral(
    `/${locale}/creator/studio/profile`,
    referralCode,
  );
  const feedHref = buildPathWithReferral(`/${locale}/network-feed`, referralCode);
  const loginHref = buildPathWithReferral(`/${locale}/activate`, referralCode);

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="relative min-h-[88svh] overflow-hidden border-b border-white/10 sm:min-h-[92svh]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.64]"
          style={{
            backgroundImage: `url(${FANLETTER_PHONE_IMAGE})`,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,4,0.42)_0%,rgba(3,5,4,0.54)_42%,#030504_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[88svh] w-full max-w-7xl flex-col px-4 pb-8 pt-3 sm:min-h-[92svh] sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-black/42 px-3 py-2 text-[0.68rem] font-semibold uppercase text-white/78 backdrop-blur-md sm:text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="size-3.5 shrink-0 text-[#44f26e]" />
              <span className="truncate">{copy.announcement.label}</span>
            </div>
            <Link className="shrink-0 text-[#44f26e]" href={creatorHref}>
              {copy.announcement.prize}
            </Link>
          </div>

          <header className="mt-4 flex items-center justify-between gap-4">
            <Link className="flex items-center gap-2" href={`/${locale}/fanletter`}>
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="text-xl font-semibold tracking-tight">FanLetter</span>
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-semibold text-white/82 md:flex">
              <a href="#features">{copy.nav.features}</a>
              <a href="#creators">{copy.nav.creators}</a>
              <a href="#faq">{copy.nav.faq}</a>
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <LanguageSwitcher label={copy.languageLabel} locale={locale} />
              </div>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold text-white transition hover:border-white/40"
                href={loginHref}
              >
                {copy.cta.login}
              </Link>
            </div>
          </header>

          <div className="mt-auto grid gap-8 pb-2 pt-24 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end lg:pt-32">
            <div className="max-w-4xl">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {copy.hero.eyebrow}
              </p>
              <h1 className="mt-4 max-w-4xl text-[3rem] font-semibold leading-[0.95] tracking-normal text-white sm:text-[4.9rem] lg:text-[5.8rem]">
                {copy.hero.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/74 sm:text-lg">
                {copy.hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#67ff88] sm:h-[3.25rem] sm:px-7"
                  href={creatorHref}
                >
                  {copy.cta.creator}
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/22 bg-black/34 px-5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/42 sm:h-[3.25rem] sm:px-7"
                  href={feedHref}
                >
                  {copy.cta.fan}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              {copy.proof.stats.map((stat) => (
                <div
                  className="rounded-lg border border-white/12 bg-black/38 p-3 backdrop-blur-md sm:p-4"
                  key={stat.label}
                >
                  <p className="text-2xl font-semibold leading-none text-white sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-white/54 sm:text-[0.68rem]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/8 bg-black px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mx-auto max-w-3xl text-[2.25rem] font-semibold leading-[1] tracking-normal text-white sm:text-[3.5rem]">
            {copy.proof.title}
          </p>
          <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-lg border border-white/10 bg-[#08120e]">
            <Image
              alt="FanLetter mobile creator experience preview"
              className="h-auto w-full"
              height={1088}
              sizes="(max-width: 768px) 100vw, 768px"
              src={FANLETTER_PHONE_IMAGE}
              width={1920}
            />
          </div>
        </div>
      </section>

      <section
        className="overflow-hidden bg-black px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        id="features"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-lg font-semibold text-white">
            {copy.features.eyebrow}
          </p>
          <div className="mt-10 flex snap-x gap-4 overflow-x-auto pb-6">
            {copy.features.items.map((feature, index) => {
              const Icon = featureIcons[index] ?? Sparkles;

              return (
                <article
                  className="min-w-[17.5rem] snap-start rounded-lg border border-white/12 bg-white p-4 text-black sm:min-w-[20rem]"
                  key={feature.title}
                >
                  <div
                    className={joinClasses(
                      "flex aspect-square items-center justify-center rounded-lg",
                      index === 0
                        ? "bg-[#44f26e]"
                        : index === 1
                          ? "bg-[#e8f5ff]"
                          : "bg-[#f4f4f1]",
                    )}
                  >
                    <Icon className="size-14" />
                  </div>
                  <div className="mt-4 min-h-[8.5rem]">
                    {feature.badge ? (
                      <span className="inline-flex rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.66rem] font-semibold uppercase text-black">
                        {feature.badge}
                      </span>
                    ) : null}
                    <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-normal">
                      {feature.title}
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-black/58">
                      {feature.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="bg-black px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8"
        id="creators"
      >
        <div className="mx-auto max-w-5xl">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#44f26e]">
            Creator network
          </p>
          <h2 className="mx-auto mt-5 max-w-4xl text-[2.7rem] font-semibold leading-[0.98] tracking-normal text-white sm:text-[4.4rem]">
            {copy.economy.title}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-7 text-white/68 sm:text-lg">
            {copy.economy.body}
          </p>
          <Link
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#44f26e] px-6 text-sm font-semibold text-black"
            href={creatorHref}
          >
            {copy.economy.cta}
          </Link>

          <div className="mx-auto mt-20 max-w-md rounded-lg border border-white/10 bg-[#2f322f] p-7 text-left">
            <div className="flex items-center justify-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-[#44f26e] text-black">
                <Crown className="size-9" />
              </div>
              <div className="-ml-3 mt-16 flex size-16 items-center justify-center rounded-full border-4 border-[#2f322f] bg-white text-black">
                <Bot className="size-7" />
              </div>
              <div className="-ml-5 flex size-24 items-center justify-center rounded-full border-4 border-[#2f322f] bg-black text-[#44f26e]">
                <Network className="size-10" />
              </div>
            </div>
            <p className="mt-10 text-5xl font-semibold leading-none text-white">
              {copy.creatorWall.count}
            </p>
            <p className="mt-2 text-sm font-semibold text-white/78">
              {copy.creatorWall.label}
            </p>
          </div>
        </div>
      </section>

      <section className="min-h-[110svh] bg-[#2f3f2e] px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="mx-auto max-w-4xl text-[3rem] font-semibold leading-[0.95] tracking-normal sm:text-[5rem]">
            {copy.niche.title}
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base font-semibold leading-7 text-white/82">
            {copy.niche.body}
          </p>
          <Link
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#44f26e] px-6 text-sm font-semibold text-black"
            href={creatorHref}
          >
            {copy.niche.cta}
          </Link>

          <div className="mt-24 flex flex-col items-center gap-2 text-[3rem] font-semibold leading-none tracking-normal sm:text-[5rem]">
            {copy.niche.categories.map((category, index) => (
              <span
                className={index === 0 ? "text-white" : "text-white/28"}
                key={category}
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        className="grid gap-10 bg-black px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:px-8"
        id="faq"
      >
        <h2 className="text-[4rem] font-semibold leading-none tracking-normal text-white sm:text-[7rem]">
          {copy.faqTitle}
        </h2>
        <div className="space-y-3">
          {copy.faq.map((item) => (
            <details
              className="group rounded-lg border border-white/12 bg-white/[0.03] p-4"
              key={item.question}
            >
              <summary className="flex list-none items-center justify-between gap-4 text-base font-semibold text-white">
                <span>{item.question}</span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/14 text-[#44f26e] group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm font-medium leading-6 text-white/64">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <footer className="bg-white px-4 py-12 text-black sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="max-w-lg text-4xl font-semibold leading-[1] tracking-normal">
              {copy.footer.title}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[#44f26e] px-5 text-sm font-semibold text-black"
                href={creatorHref}
              >
                {copy.cta.creator}
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-lg border border-black/12 px-5 text-sm font-semibold text-black"
                href={feedHref}
              >
                {copy.cta.fan}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm font-semibold text-black/62 sm:grid-cols-4">
            <div>
              <p className="text-black">FanLetter</p>
              <div className="mt-4 space-y-2">
                <Link className="block" href={creatorHref}>
                  Studio
                </Link>
                <Link className="block" href={feedHref}>
                  Feed
                </Link>
                <Link className="block" href={loginHref}>
                  Activate
                </Link>
              </div>
            </div>
            <div>
              <p className="text-black">{copy.nav.features}</p>
              <div className="mt-4 space-y-2">
                <a className="block" href="#features">
                  AI Content
                </a>
                <a className="block" href="#creators">
                  Network
                </a>
              </div>
            </div>
            <div>
              <p className="text-black">{copy.nav.faq}</p>
              <div className="mt-4 space-y-2">
                <a className="block" href="#faq">
                  Help
                </a>
              </div>
            </div>
            <div>
              <p className="text-black">Trust</p>
              <div className="mt-4 flex items-center gap-2">
                <ShieldCheck className="size-4" />
                <span>Mobile first</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <BadgeDollarSign className="size-4" />
                <span>USDT ready</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <ChartNoAxesCombined className="size-4" />
                <span>Creator growth</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
