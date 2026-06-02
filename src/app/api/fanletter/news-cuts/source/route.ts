import { cookies } from "next/headers";

import { CONTENT_PAID_USDT_AMOUNT } from "@/lib/content";
import { getFanletterPublicContentDetail } from "@/lib/fanletter-content-service";
import {
  type FanletterNewsPublicCutSourceAccessState,
  type FanletterNewsPublicCutSourceLoadResponse,
} from "@/lib/fanletter-news-public-cuts-shared";
import { createFanletterNewsSourceRevealState } from "@/lib/fanletter-news-source-reveal";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral, setPathSearchParams } from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";
import { buildWalletUnlockHref } from "@/lib/wallet-unlock";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function resolveSourceAccessState({
  hasVideo,
  isNsfwOptInRequired,
  isPaidLocked,
  isSourceRevealLocked,
  videoUrl,
}: {
  hasVideo: boolean;
  isNsfwOptInRequired: boolean;
  isPaidLocked: boolean;
  isSourceRevealLocked: boolean;
  videoUrl: string | null;
}): FanletterNewsPublicCutSourceAccessState {
  if (!hasVideo) {
    return "no_video";
  }

  if (isNsfwOptInRequired) {
    return "nsfw_opt_in_required";
  }

  if (isSourceRevealLocked) {
    return "source_reveal_locked";
  }

  if (isPaidLocked) {
    return "paid_locked";
  }

  return videoUrl ? "playable" : "no_video";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get("contentId")?.trim() ?? "";
  const localeParam = searchParams.get("locale");

  if (!contentId) {
    return jsonError("contentId is required.", 400);
  }

  if (!localeParam || !hasLocale(localeParam)) {
    return jsonError("locale is required.", 400);
  }

  const locale = localeParam as Locale;
  const referralCode = readFanletterReferralCode(
    searchParams.get("ref") ?? undefined,
  );
  const returnTo =
    searchParams.get("returnTo")?.startsWith(`/${locale}/`)
      ? searchParams.get("returnTo")
      : `/${locale}/fanletter/news/cuts`;

  try {
    const [session, cookieStore] = await Promise.all([
      readMemberServerSession(),
      cookies(),
    ]);
    const includeNsfw = isFanletterNsfwOptedIn(
      cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
    );
    const content = await getFanletterPublicContentDetail(
      contentId,
      locale,
      session?.email ?? null,
      {
        includeLockedPreviewVideo: true,
        includeNsfw,
      },
    );

    if (!content) {
      return jsonError("Source vlog was not found.", 404);
    }

    const detailHref = buildPathWithReferral(
      `/${locale}/fanletter/news/vlogs/${content.contentId}`,
      referralCode ?? content.authorReferralCode,
    );
    const currentDetailHref = setPathSearchParams(detailHref, {
      returnTo,
    });
    const connectHref = setPathSearchParams(
      buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
      {
        returnTo,
      },
    );
    const pinUnlockHref = buildWalletUnlockHref({
      locale,
      referralCode,
      returnTo,
    });
    const paidUnlockHref =
      content.priceType === "paid"
        ? `${currentDetailHref}#fanletter-news-vlog-paid-unlock`
        : null;
    const sourceReveal = createFanletterNewsSourceRevealState(content.social);
    const isOwner = content.viewerRelation === "owner";
    const isPaidLocked =
      content.priceType === "paid" &&
      !content.canViewerAccess &&
      !content.viewerHasPaidEntitlement &&
      !isOwner;
    const isSourceRevealLocked =
      content.priceType === "free" && !sourceReveal.unlocked && !isOwner;
    const isNsfwOptInRequired =
      content.contentMaturityRating === "nsfw" &&
      !content.nsfwOptInEnabled &&
      !content.viewerHasPaidEntitlement &&
      !isOwner;
    const fullVideoUrl =
      isSourceRevealLocked || isPaidLocked || isNsfwOptInRequired
        ? null
        : content.contentVideoUrls[0] ?? content.primaryVideoUrl ?? null;
    const response: FanletterNewsPublicCutSourceLoadResponse = {
      source: {
        accessState: resolveSourceAccessState({
          hasVideo: content.contentVideoCount > 0,
          isNsfwOptInRequired,
          isPaidLocked,
          isSourceRevealLocked,
          videoUrl: fullVideoUrl,
        }),
        authorName: content.authorName,
        canViewerAccess: content.canViewerAccess,
        connectHref,
        contentId: content.contentId,
        contentMaturityRating: content.contentMaturityRating,
        coverImageUrl: content.coverImageUrl,
        detailHref: currentDetailHref,
        mediaType: content.mediaType,
        paidUnlockHref,
        pinUnlockHref,
        previewVideoUrl: content.sourcePreviewVideoUrl,
        priceType: content.priceType,
        priceUsdt: content.priceUsdt ?? CONTENT_PAID_USDT_AMOUNT,
        sourceReveal,
        summary: content.summary,
        title: content.title,
        videoUrl: fullVideoUrl,
        viewerHasPaidEntitlement: content.viewerHasPaidEntitlement,
        viewerRelation: content.viewerRelation,
      },
    };

    return Response.json(response);
  } catch {
    return jsonError("Failed to load the source vlog.", 500);
  }
}
