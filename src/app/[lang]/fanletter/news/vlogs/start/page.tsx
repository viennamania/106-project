import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  FileVideo,
  ImageIcon,
  LayoutDashboard,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  WalletCards,
} from "lucide-react";

import { FanletterNewsReportsSessionBridge } from "@/components/fanletter-news-reports-session-bridge";
import { getCreatorStudioPostsForMember } from "@/lib/content-service";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  getFanletterNewsVlogManageHref,
  getFanletterNewsVlogStartHref,
  getFanletterNewsVlogsHref,
} from "@/lib/fanletter-news-vlog-routing";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsVlogStartSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        actions: {
          ai: "AI로 만들기",
          connect: "뉴스 계정 연결",
          feed: "4컷 피드로 돌아가기",
          manage: "내 브이로그 관리",
          paidUpload: "팬 요청 답장 업로드",
          profile: "캐릭터 설정",
          publicArchive: "공개 브이로그 보기",
          upload: "휴대폰 영상 업로드",
        },
        connectBody:
          "휴대폰 영상을 올리고 뉴스에 노출하려면 AIAVpark News 계정 연결이 필요합니다.",
        connectTitle: "브이로거 작업은 로그인 후 이어집니다.",
        description:
          "컷 피드에서 바로 넘어와 휴대폰 영상 업로드, AI 브이로그 생성, 프레임 관리까지 이어가는 모바일 브이로거 작업대입니다.",
        heroBody:
          "컷 피드 반응을 보다가 바로 새 원본을 만들고, 프리뷰 영상과 프레임 후보까지 한 번에 준비하세요.",
        heroEyebrow: "AIAVpark News Vlogger",
        heroTitle: "새 원본 브이로그 만들기",
        latest: "최근 작업",
        memberFallback: "AIAVpark 브이로거",
        mobileFlow: [
          "영상 선택",
          "프리뷰 확인",
          "프레임 정리",
          "공개",
        ],
        primary: {
          aiBody:
            "캐릭터 프로필을 기준으로 새 세로형 브이로그를 생성합니다.",
          manageBody:
            "공개 상태, 대표 커버, 프레임 후보, 뉴스 노출 상태를 정리합니다.",
          paidBody:
            "팬 요청을 선택해 유료 팬 전용 답장 영상을 올립니다.",
          uploadBody:
            "MP4, MOV, WEBM을 바로 올리고 프리뷰 영상과 프레임 후보를 자동 준비합니다.",
        },
        readiness: {
          account: "계정 연결",
          frames: "프레임 후보",
          profile: "캐릭터 프로필",
          publish: "뉴스 공개",
        },
        stats: {
          all: "전체",
          free: "무료",
          paid: "유료",
          published: "공개",
        },
        title: "브이로거 제작 시작 | AIAVpark News",
      }
    : {
        actions: {
          ai: "Create with AI",
          connect: "Connect News account",
          feed: "Back to cut feed",
          manage: "Manage my vlogs",
          paidUpload: "Fan request reply",
          profile: "Character setup",
          publicArchive: "Public vlogs",
          upload: "Upload phone video",
        },
        connectBody:
          "Connect your AIAVpark News account to upload phone video and publish it into News.",
        connectTitle: "Vlogger work continues after sign-in.",
        description:
          "A mobile-first vlogger desk that opens from the cut feed into phone upload, AI creation, preview video, and frame management.",
        heroBody:
          "Turn cut-feed reactions into the next source vlog, then prepare preview video and frame candidates in one flow.",
        heroEyebrow: "AIAVpark News Vlogger",
        heroTitle: "Create a Source Vlog",
        latest: "Recent work",
        memberFallback: "AIAVpark vlogger",
        mobileFlow: ["Choose video", "Review preview", "Keep frames", "Publish"],
        primary: {
          aiBody:
            "Generate a new vertical vlog from your character profile.",
          manageBody:
            "Review status, cover, frame candidates, and News exposure.",
          paidBody:
            "Choose a fan request and upload a paid fan-only reply.",
          uploadBody:
            "Upload MP4, MOV, or WEBM and prepare preview video plus frame candidates automatically.",
        },
        readiness: {
          account: "Account",
          frames: "Frame candidates",
          profile: "Character profile",
          publish: "News publish",
        },
        stats: {
          all: "All",
          free: "Free",
          paid: "Paid",
          published: "Published",
        },
        title: "Start Vlogger Production | AIAVpark News",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

async function readVloggerData(email: string, locale: Locale) {
  try {
    return await getCreatorStudioPostsForMember(email, {
      locale,
      media: "video",
      page: 1,
      pageSize: 3,
      status: "all",
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? (lang as Locale) : defaultLocale;
  const copy = getCopy(locale);

  return {
    description: copy.description,
    robots: {
      follow: false,
      index: false,
    },
    title: copy.title,
  };
}

export default async function LocalizedFanletterNewsVlogStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsVlogStartSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const cutsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts`,
    referralCode,
  );
  const startHref = getFanletterNewsVlogStartHref({
    locale,
    referralCode,
    returnToHref: getSafeFanletterReturnTo({
      fallbackPath: cutsHref,
      locale,
      referralCode,
      returnTo: query.returnTo,
    }),
  });
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: startHref },
  );
  const session = await readMemberServerSession();

  if (!session) {
    return (
      <main className="min-h-screen bg-[#050706] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-white">
        <FanletterNewsReportsSessionBridge
          hasServerSession={false}
          locale={locale}
          serverSessionEmail={null}
          serverSessionWalletAddress={null}
        />
        <section className="mx-auto max-w-md">
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm font-black !text-white"
            href={cutsHref}
          >
            <ArrowLeft className="size-4 text-[#44f26e]" />
            {copy.actions.feed}
          </Link>
          <div className="mt-4 rounded-lg border border-[#44f26e]/24 bg-[#07110a] p-5 shadow-[0_18px_52px_rgba(0,0,0,0.28)]">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#44f26e] text-[#111510]">
              <WalletCards className="size-6" />
            </span>
            <p className="mt-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight tracking-normal [word-break:keep-all]">
              {copy.connectTitle}
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/64 [word-break:keep-all]">
              {copy.connectBody}
            </p>
            <Link
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black !text-[#111510]"
              href={connectHref}
            >
              {copy.actions.connect}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const data = await readVloggerData(session.email, locale);
  const effectiveReferralCode =
    referralCode ?? data?.member.referralCode ?? null;
  const effectiveCutsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts`,
    effectiveReferralCode,
  );
  const effectiveStartHref = getFanletterNewsVlogStartHref({
    locale,
    referralCode: effectiveReferralCode,
    returnToHref: effectiveCutsHref,
  });
  const manageHref = getFanletterNewsVlogManageHref({
    locale,
    referralCode: effectiveReferralCode,
  });
  const uploadHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/vlogs/new`,
      effectiveReferralCode,
    ),
    {
      planSource: "upload",
      returnTo: manageHref,
    },
  );
  const aiHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/vlogs/new`,
      effectiveReferralCode,
    ),
    { returnTo: manageHref },
  );
  const paidUploadHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/studio`,
      effectiveReferralCode,
    ),
    { returnTo: manageHref },
  );
  const publicArchiveHref = getFanletterNewsVlogsHref({
    locale,
    referralCode: effectiveReferralCode,
  });
  const profileHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/profile/character`,
      effectiveReferralCode,
    ),
    { returnTo: effectiveStartHref },
  );
  const displayName =
    data?.profile.characterPersona?.name ??
    data?.profile.displayName ??
    data?.member.publicProfile?.displayName ??
    copy.memberFallback;
  const avatarImageUrl =
    data?.profile.avatarImageUrl ?? data?.profile.avatarImageSet[0]?.url ?? null;
  const summary = data?.summary;
  const latestPost = data?.posts[0] ?? null;
  const isProfileReady = Boolean(data?.profileConfigured);
  const stats = [
    {
      label: copy.stats.all,
      value: formatNumber(summary?.all ?? 0, locale),
    },
    {
      label: copy.stats.published,
      value: formatNumber(summary?.published ?? 0, locale),
    },
    {
      label: copy.stats.free,
      value: formatNumber(summary?.free ?? 0, locale),
    },
    {
      label: copy.stats.paid,
      value: formatNumber(summary?.paid ?? 0, locale),
    },
  ];
  const readinessItems = [
    {
      active: true,
      label: copy.readiness.account,
    },
    {
      active: isProfileReady,
      label: copy.readiness.profile,
    },
    {
      active: Boolean(latestPost?.previewClipVideoUrl),
      label: copy.readiness.publish,
    },
    {
      active: Boolean(latestPost && latestPost.coverImageCandidates.length > 0),
      label: copy.readiness.frames,
    },
  ];
  const primaryActions = [
    {
      body: copy.primary.uploadBody,
      href: uploadHref,
      icon: UploadCloud,
      label: copy.actions.upload,
      primary: true,
    },
    {
      body: copy.primary.aiBody,
      href: aiHref,
      icon: Sparkles,
      label: copy.actions.ai,
      primary: false,
    },
    {
      body: copy.primary.manageBody,
      href: manageHref,
      icon: LayoutDashboard,
      label: copy.actions.manage,
      primary: false,
    },
    {
      body: copy.primary.paidBody,
      href: `${paidUploadHref}#fan-requests`,
      icon: MessageCircleHeart,
      label: copy.actions.paidUpload,
      primary: false,
    },
  ];

  return (
    <main className="min-h-screen bg-[#050706] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-white">
      <FanletterNewsReportsSessionBridge
        hasServerSession
        locale={locale}
        serverSessionEmail={session.email}
        serverSessionWalletAddress={session.walletAddress}
        serverVloggerProfile={
          data?.profile
            ? {
                avatarImageUrl,
                displayName,
                referralCode: data.profile.referralCode,
              }
            : null
        }
      />
      <section className="mx-auto max-w-md">
        <div className="flex items-center justify-between gap-2">
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm font-black !text-white"
            href={effectiveCutsHref}
          >
            <ArrowLeft className="size-4 text-[#44f26e]" />
            {copy.actions.feed}
          </Link>
          <Link
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] !text-white"
            href={publicArchiveHref}
            title={copy.actions.publicArchive}
          >
            <Clapperboard className="size-5" />
          </Link>
        </div>

        <div className="mt-4 rounded-lg border border-[#44f26e]/24 bg-[#07110a] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.28)]">
          <div className="flex items-center gap-3">
            <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/12 bg-white/[0.08] text-[#44f26e]">
              {avatarImageUrl ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="64px"
                  src={avatarImageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(
                    avatarImageUrl,
                  )}
                />
              ) : (
                <UserRound className="size-7" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
                {copy.heroEyebrow}
              </p>
              <h1 className="mt-1 text-2xl font-black leading-tight tracking-normal [word-break:keep-all]">
                {copy.heroTitle}
              </h1>
              <p className="mt-1 truncate text-sm font-bold text-white/58">
                {displayName}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-white/64 [word-break:keep-all]">
            {copy.heroBody}
          </p>
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {stats.map((item) => (
              <div
                className="min-w-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-2 text-center"
                key={item.label}
              >
                <p className="truncate text-[0.56rem] font-black text-white/44">
                  {item.label}
                </p>
                <p className="mt-1 truncate text-sm font-black text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {copy.mobileFlow.map((step, index) => (
            <div
              className="rounded-lg border border-white/10 bg-white/[0.055] px-2 py-2 text-center"
              key={step}
            >
              <p className="text-[0.58rem] font-black text-[#44f26e]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-1 text-[0.62rem] font-black leading-tight text-white/72 [word-break:keep-all]">
                {step}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-2">
          {primaryActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                className={`grid min-h-[5.5rem] grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 transition ${
                  action.primary
                    ? "border-[#44f26e] bg-[#44f26e] !text-[#111510] shadow-[0_16px_38px_rgba(68,242,110,0.18)]"
                    : "border-white/10 bg-white/[0.06] !text-white hover:border-[#44f26e]/40 hover:bg-[#44f26e]/10"
                }`}
                href={action.href}
                key={action.label}
              >
                <span
                  className={`flex size-11 items-center justify-center rounded-lg ${
                    action.primary
                      ? "bg-[#111510] text-[#44f26e]"
                      : "bg-[#44f26e]/14 text-[#44f26e]"
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-black leading-tight [word-break:keep-all]">
                    {action.label}
                  </span>
                  <span
                    className={`mt-1 block text-xs font-bold leading-5 [word-break:keep-all] ${
                      action.primary ? "text-black/62" : "text-white/52"
                    }`}
                  >
                    {action.body}
                  </span>
                </span>
                <ArrowRight className="size-5 shrink-0 opacity-70" />
              </Link>
            );
          })}
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.055] p-3">
          <div className="grid grid-cols-2 gap-2">
            {readinessItems.map((item) => (
              <div
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-black/24 px-3 text-xs font-black text-white/74"
                key={item.label}
              >
                <CheckCircle2
                  className={`size-4 shrink-0 ${
                    item.active ? "text-[#44f26e]" : "text-white/24"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
          {!isProfileReady ? (
            <Link
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#44f26e]/32 bg-[#44f26e]/12 px-4 text-sm font-black !text-[#d8ffe0]"
              href={profileHref}
            >
              <ShieldCheck className="size-4" />
              {copy.actions.profile}
            </Link>
          ) : null}
        </div>

        {latestPost ? (
          <Link
            className="mt-3 grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.055] p-3 !text-white transition hover:border-[#44f26e]/34"
            href={manageHref}
          >
            <span className="flex size-12 items-center justify-center rounded-lg bg-[#44f26e]/14 text-[#44f26e]">
              {latestPost.previewClipVideoUrl ? (
                <FileVideo className="size-5" />
              ) : (
                <ImageIcon className="size-5" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
                {copy.latest}
              </span>
              <span className="mt-1 block truncate text-sm font-black">
                {latestPost.title}
              </span>
            </span>
            <ArrowRight className="size-4 text-white/44" />
          </Link>
        ) : null}
      </section>
    </main>
  );
}
