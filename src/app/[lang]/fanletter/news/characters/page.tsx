import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  FileText,
  MessageCircleHeart,
  Newspaper,
  PenLine,
  Sparkles,
  UserRound,
} from "lucide-react";

import { FanletterNsfwOptInControl } from "@/components/fanletter-nsfw-opt-in-control";
import type { FanletterNewsReportDocument } from "@/lib/content";
import {
  getFanletterNewsCharacterStats,
  type FanletterNewsCharacterStat,
} from "@/lib/fanletter-news-character-directory";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import { getLatestFanletterNewsReports } from "@/lib/fanletter-news-report-service";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  getFanletterNsfwCopy,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterNewsCharactersSearchParams = {
  ref?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        access: {
          nsfw: "성인 팬 전용",
          paid: "팬 전용",
          public: "공개",
        },
        allNews: "뉴스 홈",
        characterCta: "캐릭터 채널",
        dek:
          "FanLetter News에 실제로 등장한 AI 캐릭터를 뉴스룸 기준으로 모았습니다. 캐릭터별 기사 수, 팬 전용 리포트, 최신 브이로그 뉴스를 한 화면에서 확인하세요.",
        emptyBody:
          "콘텐츠 상세 페이지에서 AI 리포트를 생성하면 뉴스에 등장한 캐릭터 목록이 이곳에 모입니다.",
        emptyTitle: "아직 뉴스에 등장한 AI 캐릭터가 없습니다.",
        fanOnly: "팬 전용 뉴스",
        heroEyebrow: "FanLetter News Character Desk",
        latest: "최신 뉴스",
        navItems: ["뉴스 홈", "AI 캐릭터", "팬 기자", "브이로그 뉴스"],
        news: "뉴스",
        nsfw: "NSFW",
        nsfwControl: {
          disabledBody:
            "NSFW 뉴스 캐릭터는 목록에 유지하되 대표 커버와 기사 미리보기를 블러 처리합니다. 켜면 선명하게 표시됩니다.",
          disabledTitle: "NSFW 캐릭터 뉴스 블러",
          enabledBody:
            "NSFW 캐릭터 뉴스가 선명하게 표시됩니다. 끄면 다시 커버와 기사 미리보기가 블러 처리됩니다.",
          enabledTitle: "NSFW 캐릭터 뉴스 표시 중",
          hiddenCountText: (count: string) =>
            `블러 처리된 NSFW 뉴스 ${count}개`,
        },
        openNews: "최신 뉴스 보기",
        publicNews: "공개 뉴스",
        siteName: "FanLetter News",
        stats: {
          characters: "등장 캐릭터",
          fanOnly: "팬 전용",
          news: "전체 뉴스",
          nsfw: "NSFW",
        },
        title: "뉴스 AI 캐릭터 목록",
        topDesk: "오늘의 캐릭터 데스크",
      }
    : {
        access: {
          nsfw: "Adult fan-only",
          paid: "Fan-only",
          public: "Public",
        },
        allNews: "News Home",
        characterCta: "Character channel",
        dek:
          "A FanLetter News-only directory of AI characters appearing in published reports, with story counts, fan-only coverage, and latest vlog news.",
        emptyBody:
          "Create AI reports from content detail pages and the characters appearing in FanLetter News will collect here.",
        emptyTitle: "No AI characters have appeared in the news yet.",
        fanOnly: "Fan-only news",
        heroEyebrow: "FanLetter News Character Desk",
        latest: "Latest story",
        navItems: ["News home", "AI characters", "Fan reporters", "Vlog news"],
        news: "News",
        nsfw: "NSFW",
        nsfwControl: {
          disabledBody:
            "NSFW news characters remain listed, with lead covers and story previews blurred until opt-in.",
          disabledTitle: "NSFW character news blurred",
          enabledBody:
            "NSFW character news is visible. Turn this off to blur covers and story previews again.",
          enabledTitle: "NSFW character news visible",
          hiddenCountText: (count: string) => `${count} NSFW stories blurred`,
        },
        openNews: "Read latest story",
        publicNews: "Public news",
        siteName: "FanLetter News",
        stats: {
          characters: "Characters",
          fanOnly: "Fan-only",
          news: "Stories",
          nsfw: "NSFW",
        },
        title: "News AI Character Directory",
        topDesk: "Today's Character Desk",
      };
}

function formatDate(value: Date | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(value);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getArticleDisplayTitle(title: string) {
  return title.replace(/^\[(AI 팬 리포트|AI fan report)\]\s*/i, "");
}

function getReportHref(
  report: FanletterNewsReportDocument,
  referralCode: string | null,
) {
  return buildPathWithReferral(
    `/${report.locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );
}

function getAccessLabel(
  report: FanletterNewsReportDocument,
  copy: ReturnType<typeof getCopy>,
) {
  if (report.contentMaturityRating === "nsfw") {
    return copy.access.nsfw;
  }

  return report.priceType === "paid" ? copy.access.paid : copy.access.public;
}

function isNsfwReport(report: FanletterNewsReportDocument) {
  return report.contentMaturityRating === "nsfw";
}

function shouldBlurReport(
  report: FanletterNewsReportDocument,
  nsfwOptInEnabled: boolean,
) {
  return isNsfwReport(report) && !nsfwOptInEnabled;
}

function NewsCharactersMasthead({
  charactersHref,
  copy,
  newsHomeHref,
}: {
  charactersHref: string;
  copy: ReturnType<typeof getCopy>;
  newsHomeHref: string;
}) {
  const navHrefs = [
    newsHomeHref,
    charactersHref,
    `${newsHomeHref}#fan-reporters`,
    `${newsHomeHref}#latest-news`,
  ];

  return (
    <header className="border-b border-black/16 bg-white text-[#111510]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-3">
          <Link
            className="inline-flex items-center text-[2.25rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[4.5rem]"
            href={newsHomeHref}
          >
            {copy.siteName}
          </Link>
          <span className="hidden shrink-0 border border-black/16 px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e] sm:inline-flex">
            {copy.heroEyebrow}
          </span>
        </div>
        <nav
          aria-label={copy.siteName}
          className="flex gap-5 overflow-x-auto border-b border-black/10 py-3"
        >
          {copy.navItems.map((item, index) => (
            <Link
              className={`shrink-0 text-[0.76rem] font-black uppercase tracking-[0.12em] transition ${
                index === 1 ? "text-[#16702e]" : "text-black/58 hover:text-[#16702e]"
              }`}
              href={navHrefs[index] ?? newsHomeHref}
              key={item}
            >
              {item}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function NewsCharacterImage({
  blurred,
  report,
  sizes,
}: {
  blurred: boolean;
  report: FanletterNewsReportDocument;
  sizes: string;
}) {
  const nsfwCopy = getFanletterNsfwCopy(report.locale);

  return (
    <div className="relative h-full min-h-[13rem] overflow-hidden bg-[#111510]">
      {report.coverImageUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className={
            blurred
              ? "scale-[1.06] object-cover blur-md brightness-[0.68] saturate-[0.86]"
              : "object-cover"
          }
          fill
          sizes={sizes}
          src={report.coverImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(
            report.coverImageUrl,
          )}
        />
      ) : (
        <div className="flex h-full min-h-[13rem] w-full items-center justify-center bg-[linear-gradient(145deg,#07100b,#111510_52%,#24372a)] text-[#44f26e]">
          <Newspaper className="size-14" />
        </div>
      )}
      {blurred ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/34 p-3 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-black/62 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white">
            <AlertTriangle className="size-3.5 text-rose-300" />
            {nsfwCopy.badge}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function CharacterLead({
  character,
  copy,
  locale,
  nsfwOptInEnabled,
  referralCode,
}: {
  character: FanletterNewsCharacterStat;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
}) {
  const report = character.representativeReport;
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const reportHref = getReportHref(report, referralCode);
  const creatorHref = buildPathWithReferral(
    `/${locale}/fanletter/creator/${character.referralCode}`,
    referralCode ?? character.referralCode,
  );
  const latestReportAt = formatDate(character.latestReportAt, locale);

  return (
    <section className="grid overflow-hidden border-y-2 border-[#111510] bg-[#111510] text-white lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
      <Link className="relative block min-h-[24rem]" href={reportHref}>
        <NewsCharacterImage
          blurred={shouldBlur}
          report={report}
          sizes="(max-width: 1024px) 100vw, 44rem"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/22 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <span className="inline-flex bg-[#44f26e] px-2.5 py-1 text-xs font-black text-black">
            {copy.topDesk}
          </span>
          <h2 className="mt-3 break-words text-[2.35rem] font-black leading-[1.05] [word-break:keep-all] sm:text-[3.25rem]">
            {character.name}
          </h2>
        </div>
      </Link>
      <div className="flex flex-col justify-between p-5 sm:p-6">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
            @{character.referralCode}
          </p>
          <h3
            className={`mt-4 break-words text-2xl font-black leading-tight [word-break:keep-all] ${
              shouldBlur ? "select-none blur-[2px]" : ""
            }`}
          >
            {getArticleDisplayTitle(report.title)}
          </h3>
          <p
            className={`mt-3 text-sm font-semibold leading-6 text-white/68 ${
              shouldBlur ? "select-none blur-[2px]" : ""
            }`}
          >
            {report.dek}
          </p>
        </div>
        <div className="mt-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: copy.news, value: character.newsCount },
              { label: copy.fanOnly, value: character.fanOnlyCount },
              { label: copy.nsfw, value: character.nsfwCount },
            ].map((stat) => (
              <div
                className="border border-white/12 bg-white/[0.06] p-3"
                key={stat.label}
              >
                <p className="text-xl font-black">
                  {formatNumber(stat.value, locale)}
                </p>
                <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-white/46">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-white/58">
            <span>{getAccessLabel(report, copy)}</span>
            {latestReportAt ? <span>{latestReportAt}</span> : null}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
              href={reportHref}
            >
              {copy.openNews}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 border border-white/18 px-4 text-sm font-black !text-white transition hover:border-white/40"
              href={creatorHref}
            >
              <MessageCircleHeart className="size-4 text-[#44f26e]" />
              {copy.characterCta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CharacterCard({
  character,
  copy,
  locale,
  nsfwOptInEnabled,
  referralCode,
}: {
  character: FanletterNewsCharacterStat;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
}) {
  const report = character.representativeReport;
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const reportHref = getReportHref(report, referralCode);
  const creatorHref = buildPathWithReferral(
    `/${locale}/fanletter/creator/${character.referralCode}`,
    referralCode ?? character.referralCode,
  );
  const latestReportAt = formatDate(character.latestReportAt, locale);

  return (
    <article className="grid min-w-0 overflow-hidden border border-black/12 bg-white sm:grid-rows-[auto_minmax(0,1fr)]">
      <Link className="block" href={reportHref}>
        <NewsCharacterImage
          blurred={shouldBlur}
          report={report}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 24rem"
        />
      </Link>
      <div className="flex min-w-0 flex-col p-4">
        <p className="text-[0.64rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
          {copy.latest}
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black tracking-normal">
              {character.name}
            </h2>
            <p className="mt-0.5 truncate text-xs font-bold text-black/42">
              @{character.referralCode}
            </p>
          </div>
          <span className="shrink-0 bg-[#44f26e] px-2 py-1 text-xs font-black text-black">
            {formatNumber(character.newsCount, locale)}
          </span>
        </div>
        <Link
          className={`mt-3 line-clamp-2 break-words text-base font-black leading-5 [word-break:keep-all] hover:text-[#16702e] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
          href={reportHref}
        >
          {getArticleDisplayTitle(report.title)}
        </Link>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: copy.publicNews, value: character.publicCount },
            { label: copy.fanOnly, value: character.fanOnlyCount },
            { label: copy.nsfw, value: character.nsfwCount },
          ].map((stat) => (
            <div className="bg-[#f5f6f2] p-2" key={stat.label}>
              <p className="text-lg font-black leading-none">
                {formatNumber(stat.value, locale)}
              </p>
              <p className="mt-1 truncate text-[0.54rem] font-black uppercase tracking-[0.08em] text-black/42">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-3">
          <div className="min-w-0 text-[0.66rem] font-bold text-black/42">
            {latestReportAt ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5 text-[#16702e]" />
                {latestReportAt}
              </span>
            ) : null}
          </div>
          <Link
            className="shrink-0 text-xs font-black text-[#16702e] hover:underline"
            href={creatorHref}
          >
            {copy.characterCta}
          </Link>
        </div>
      </div>
    </article>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const copy = getCopy(locale);

  return {
    title: `${copy.title} | FanLetter News`,
    description: copy.dek,
  };
}

export default async function LocalizedFanletterNewsCharactersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsCharactersSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const cookieStore = await cookies();
  const nsfwOptInEnabled = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    referralCode,
  );
  const reports = await getLatestFanletterNewsReports({ limit: 48, locale });
  const characters = getFanletterNewsCharacterStats(reports, 48);
  const [leadCharacter, ...restCharacters] = characters;
  const nsfwNewsCount = reports.filter(isNsfwReport).length;
  const shouldShowNsfwControl = nsfwNewsCount > 0 || nsfwOptInEnabled;
  const stats = [
    {
      icon: <UserRound className="size-4" />,
      label: copy.stats.characters,
      value: characters.length,
    },
    {
      icon: <FileText className="size-4" />,
      label: copy.stats.news,
      value: reports.length,
    },
    {
      icon: <PenLine className="size-4" />,
      label: copy.stats.fanOnly,
      value: characters.reduce(
        (total, character) => total + character.fanOnlyCount,
        0,
      ),
    },
    {
      icon: <AlertTriangle className="size-4" />,
      label: copy.stats.nsfw,
      value: nsfwNewsCount,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f5f6f2] text-[#111510]">
      <NewsCharactersMasthead
        charactersHref={charactersHref}
        copy={copy}
        newsHomeHref={newsHomeHref}
      />

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="border-b-2 border-[#111510] pb-5">
          <p className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
            {copy.heroEyebrow}
          </p>
          <div className="mt-2 grid gap-5 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-end">
            <div>
              <h1 className="max-w-4xl break-words text-[2.15rem] font-black leading-[1.08] [word-break:keep-all] sm:text-[3.15rem]">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
                {copy.dek}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {stats.map((stat) => (
                <div
                  className="border border-black/12 bg-white p-3"
                  key={stat.label}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                      {stat.label}
                    </p>
                    <span className="text-[#16702e]">{stat.icon}</span>
                  </div>
                  <p className="mt-2 text-2xl font-black leading-none">
                    {formatNumber(stat.value, locale)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {shouldShowNsfwControl ? (
          <div className="mt-5">
            <FanletterNsfwOptInControl
              compact
              disabledBody={copy.nsfwControl.disabledBody}
              disabledTitle={copy.nsfwControl.disabledTitle}
              enabled={nsfwOptInEnabled}
              enabledBody={copy.nsfwControl.enabledBody}
              enabledTitle={copy.nsfwControl.enabledTitle}
              hiddenCount={nsfwNewsCount}
              hiddenCountText={copy.nsfwControl.hiddenCountText(
                formatNumber(nsfwNewsCount, locale),
              )}
              locale={locale}
              tone={nsfwOptInEnabled ? "dark" : "light"}
            />
          </div>
        ) : null}

        {leadCharacter ? (
          <div className="mt-7 space-y-7">
            <CharacterLead
              character={leadCharacter}
              copy={copy}
              locale={locale}
              nsfwOptInEnabled={nsfwOptInEnabled}
              referralCode={referralCode}
            />

            {restCharacters.length > 0 ? (
              <section>
                <div className="mb-4 flex items-end justify-between gap-3 border-b-2 border-[#111510] pb-3">
                  <div>
                    <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
                      Character Index
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-normal">
                      {copy.title}
                    </h2>
                  </div>
                  <Sparkles className="size-5 text-[#16702e]" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {restCharacters.map((character) => (
                    <CharacterCard
                      character={character}
                      copy={copy}
                      key={character.referralCode}
                      locale={locale}
                      nsfwOptInEnabled={nsfwOptInEnabled}
                      referralCode={referralCode}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <section className="mt-7 border border-black/12 bg-white p-8 text-center">
            <Newspaper className="mx-auto size-12 text-[#16702e]" />
            <h2 className="mt-4 text-2xl font-black">{copy.emptyTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-black/58">
              {copy.emptyBody}
            </p>
            <Link
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 border border-black/14 px-4 text-sm font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
              href={newsHomeHref}
            >
              {copy.allNews}
              <ArrowRight className="size-4" />
            </Link>
          </section>
        )}
      </section>
    </main>
  );
}
