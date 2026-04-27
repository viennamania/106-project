"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Heart,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  RefreshCw,
  Share2,
  Send,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  AutoConnect,
  TransactionButton,
  useActiveAccount,
  useActiveWalletConnectionStatus,
  useWalletBalance,
} from "thirdweb/react";
import { getContract } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { AndroidInstallBanner } from "@/components/android-install-banner";
import {
  useWalletUnlockGate,
  WalletUnlockAction,
} from "@/components/wallet-unlock-gate";
import { getContentCopy } from "@/lib/content-copy";
import type {
  ContentCommentCreateResponse,
  ContentCommentRecord,
  ContentCommentsResponse,
  ContentDetailRecord,
  ContentDetailLoadResponse,
  ContentDetailResponse,
  ContentOrderCreateResponse,
  ContentOrderRecord,
  ContentOrderVerifyResponse,
  ContentPriceType,
  ContentSocialSummaryRecord,
} from "@/lib/content";
import {
  CONTENT_PAID_USDT_AMOUNT,
  CONTENT_PAID_USDT_AMOUNT_WEI,
  createEmptyContentSocialSummary,
} from "@/lib/content";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
  setPathSearchParams,
} from "@/lib/landing-branding";
import {
  createShareId,
  setShareIdOnHref,
} from "@/lib/share-tracking";
import { trackFunnelEvent } from "@/lib/funnel-client";
import { normalizeEmail, type MemberRecord } from "@/lib/member";
import {
  getAppMetadata,
  BSC_EXPLORER,
  BSC_USDT_ADDRESS,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import { WALLET_UNLOCK_PIN_LENGTH } from "@/lib/wallet-unlock";
import type { Dictionary, Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DetailState = {
  content: ContentDetailResponse["content"] | null;
  error: string | null;
  gateReason: ContentDetailLoadResponse["gateReason"];
  member: MemberRecord | null;
  status: "idle" | "loading" | "ready" | "error";
};

type LikeBurst = {
  id: number;
  x: number;
  y: number;
};

type CommentsStatus = "idle" | "loading" | "ready" | "submitting" | "error";
type PaidProofTier = "hot" | "new" | "proven";

type ContentDetailCommentCopy = {
  completeSignup: string;
  countSuffix: string;
  eyebrow: string;
  helper: string;
  loadFailed: string;
  loading: string;
  noComments: string;
  post: string;
  refresh: string;
  signInRequired: string;
  submitFailed: string;
  title: string;
  writePlaceholder: string;
};

type ContentLockedTeaser = {
  authorAvatarImageUrl: string | null;
  authorDisplayName: string | null;
  coverImageUrl: string | null;
  priceType: ContentPriceType;
  priceUsdt: string | null;
  publishedAt: string | null;
  summary: string;
  title: string;
};

const HERO_IMAGE_SIZES = "(max-width: 640px) 100vw, (max-width: 1280px) 960px, 1024px";
const PAID_GALLERY_PIN_SESSION_MS = 15 * 60 * 1000;
const usdtContract = getContract({
  address: BSC_USDT_ADDRESS,
  chain: smartWalletChain,
  client: thirdwebClient,
});

type PaidUnlockState = {
  error: string | null;
  order: ContentOrderRecord | null;
  recipientWalletAddress: string | null;
  status: "idle" | "creating" | "sent" | "verifying" | "unlocked" | "error";
  txHash: string | null;
};

function HeroImage({
  alt,
  preload = false,
  src,
}: {
  alt: string;
  preload?: boolean;
  src: string;
}) {
  return (
    <div className="relative aspect-[4/5] w-full sm:aspect-[16/9]">
      <Image
        alt={alt}
        className="object-cover"
        fill
        preload={preload}
        sizes={HERO_IMAGE_SIZES}
        src={src}
      />
    </div>
  );
}

function formatDateTime(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(date);
}

function formatCommentDateTime(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatUsdtAmountLabel(value: string | null | undefined, locale: Locale) {
  const parsed = Number(value ?? "0");

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "0";
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 6,
  }).format(parsed);
}

function getPaidProofTier(social: ContentSocialSummaryRecord): PaidProofTier {
  const paidTotal = Number(social.paidTotalUsdt);

  if ((Number.isFinite(paidTotal) && paidTotal >= 10) || social.paidBuyerCount >= 10) {
    return "hot";
  }

  if ((Number.isFinite(paidTotal) && paidTotal > 0) || social.paidBuyerCount > 0) {
    return "proven";
  }

  return "new";
}

function formatAddressLabel(address?: string | null) {
  const trimmed = address?.trim();

  if (!trimmed) {
    return "-";
  }

  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function getPaidGalleryPinSessionKey({
  contentId,
  email,
  walletAddress,
}: {
  contentId: string;
  email: string;
  walletAddress: string;
}) {
  return `content-gallery-pin:${contentId}:${normalizeEmail(email)}:${walletAddress.trim().toLowerCase()}`;
}

function isPaidGalleryPinUnlockedForSession({
  contentId,
  email,
  walletAddress,
}: {
  contentId: string;
  email: string | null | undefined;
  walletAddress: string | null | undefined;
}) {
  if (!email || !walletAddress || typeof window === "undefined") {
    return false;
  }

  const key = getPaidGalleryPinSessionKey({
    contentId,
    email,
    walletAddress,
  });
  const rawSession = window.sessionStorage.getItem(key);

  if (!rawSession) {
    return false;
  }

  try {
    const session = JSON.parse(rawSession) as { expiresAt?: unknown };

    if (
      typeof session.expiresAt === "number" &&
      session.expiresAt > Date.now()
    ) {
      return true;
    }
  } catch {
    // Fall through and clear malformed session data.
  }

  window.sessionStorage.removeItem(key);
  return false;
}

function markPaidGalleryPinUnlockedForSession({
  contentId,
  email,
  walletAddress,
}: {
  contentId: string;
  email: string;
  walletAddress: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    getPaidGalleryPinSessionKey({ contentId, email, walletAddress }),
    JSON.stringify({
      expiresAt: Date.now() + PAID_GALLERY_PIN_SESSION_MS,
    }),
  );
}

export function ContentDetailPage({
  contentId,
  dictionary,
  initialPreview = null,
  initialTeaser = null,
  locale,
  presentation = "page",
  referralCode = null,
  returnToHref = null,
  shareId = null,
}: {
  contentId: string;
  dictionary: Dictionary;
  initialPreview?: ContentDetailRecord | null;
  initialTeaser?: ContentLockedTeaser | null;
  locale: Locale;
  presentation?: "modal" | "page";
  referralCode?: string | null;
  returnToHref?: string | null;
  shareId?: string | null;
}) {
  const contentCopy = getContentCopy(locale);
  const commentCopy: ContentDetailCommentCopy =
    locale === "ko"
      ? {
          completeSignup: "가입 완료 후 댓글 쓰기",
          countSuffix: "댓글",
          eyebrow: "Conversation",
          helper: "댓글은 공개로 보이며, 작성은 가입 완료 회원만 가능합니다.",
          loadFailed: "댓글을 불러오지 못했습니다.",
          loading: "댓글을 불러오는 중",
          noComments: "아직 댓글이 없습니다.",
          post: "게시",
          refresh: "새로고침",
          signInRequired: "댓글을 작성하려면 가입을 완료해야 합니다.",
          submitFailed: "댓글을 등록하지 못했습니다.",
          title: "댓글",
          writePlaceholder: "댓글 달기...",
        }
      : {
          completeSignup: "Complete signup to comment",
          countSuffix: "comments",
          eyebrow: "Conversation",
          helper: "Comments are public. Posting is available after signup.",
          loadFailed: "Failed to load comments.",
          loading: "Loading comments",
          noComments: "No comments yet.",
          post: "Post",
          refresh: "Refresh",
          signInRequired: "Complete signup to write a comment.",
          submitFailed: "Failed to post comment.",
          title: "Comments",
          writePlaceholder: "Add a comment...",
        };
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const { data: usdtBalance } = useWalletBalance({
    address: accountAddress,
    chain: smartWalletChain,
    client: thirdwebClient,
    tokenAddress: BSC_USDT_ADDRESS,
  });
  const [state, setState] = useState<DetailState>({
    content: initialPreview,
    error: null,
    gateReason: "connect",
    member: null,
    status: initialPreview ? "ready" : "idle",
  });
  const [paidUnlock, setPaidUnlock] = useState<PaidUnlockState>({
    error: null,
    order: null,
    recipientWalletAddress: null,
    status: "idle",
    txHash: null,
  });
  const paidOrderRef = useRef<ContentOrderRecord | null>(null);
  const paidRecipientWalletRef = useRef<string | null>(null);
  const [isPaidConfirmOpen, setIsPaidConfirmOpen] = useState(false);
  const shareReferralCode =
    state.member?.referralCode ??
    referralCode ??
    state.content?.authorProfile?.referralCode ??
    initialPreview?.authorProfile?.referralCode ??
    null;
  const homeHref = buildReferralLandingPath(locale, shareReferralCode);
  const feedHref = buildPathWithReferral(`/${locale}/network-feed`, shareReferralCode);
  const backHref = returnToHref ?? feedHref;
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, shareReferralCode),
    { returnTo: backHref, shareId },
  );
  const walletUnlock = useWalletUnlockGate({
    email: state.member?.email,
    locale,
    referralCode: shareReferralCode,
    walletAddress: accountAddress,
  });
  const [shareState, setShareState] = useState<
    "copied" | "error" | "idle" | "sharing"
  >("idle");
  const [isLiked, setIsLiked] = useState(false);
  const [likeBursts, setLikeBursts] = useState<LikeBurst[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [comments, setComments] = useState<ContentCommentRecord[]>([]);
  const [commentsStatus, setCommentsStatus] = useState<CommentsStatus>("idle");
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentCount, setCommentCount] = useState(0);
  const [isGalleryPinUnlocked, setIsGalleryPinUnlocked] = useState(false);
  const [socialSummary, setSocialSummary] = useState<ContentSocialSummaryRecord>(
    () => createEmptyContentSocialSummary(),
  );
  const heroRef = useRef<HTMLDivElement | null>(null);
  const lastTapAtRef = useRef(0);
  const isDisconnected = status !== "connected" || !accountAddress;
  const isModalPresentation = presentation === "modal";
  const loadDetail = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      status: "loading",
    }));

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        throw new Error(dictionary.member.errors.missingEmail);
      }

      const response = await fetch(
        `/api/content/posts/${encodeURIComponent(contentId)}?${new URLSearchParams({
          email,
          locale,
          walletAddress: accountAddress,
        }).toString()}`,
      );
      const data = (await response.json()) as
        | ContentDetailLoadResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.detailLoadFailed,
        );
      }

      const member = "member" in data ? data.member : null;
      setSocialSummary(
        "social" in data && data.social
          ? data.social
          : createEmptyContentSocialSummary(),
      );

      if ("validationError" in data && data.validationError) {
        setState({
          content: "content" in data ? data.content : initialPreview,
          error: null,
          gateReason: "gateReason" in data ? data.gateReason : "signup",
          member,
          status: "ready",
        });
        return;
      }

      if (!member) {
        setState({
          content: "content" in data ? data.content : initialPreview,
          error: null,
          gateReason: "gateReason" in data ? data.gateReason : "signup",
          member,
          status: "ready",
        });
        return;
      }

      setState({
        content: "content" in data ? data.content : null,
        error: null,
        gateReason: "gateReason" in data ? data.gateReason : null,
        member,
        status: "ready",
      });
    } catch (error) {
      setState({
        content: initialPreview,
        error: initialPreview
          ? null
          : error instanceof Error
            ? error.message
            : contentCopy.messages.detailLoadFailed,
        gateReason: "connect",
        member: null,
        status: initialPreview ? "ready" : "error",
      });
      setSocialSummary(createEmptyContentSocialSummary());
    }
  }, [
    accountAddress,
    contentCopy.messages.detailLoadFailed,
    contentId,
    dictionary.member.errors.missingEmail,
    initialPreview,
    locale,
  ]);

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setState({
        content: initialPreview,
        error: null,
        gateReason: "connect",
        member: null,
        status: initialPreview ? "ready" : "idle",
      });
      setSocialSummary(createEmptyContentSocialSummary());
      return;
    }

    void loadDetail();
  }, [accountAddress, initialPreview, loadDetail, status]);

  useEffect(() => {
    paidOrderRef.current = null;
    paidRecipientWalletRef.current = null;
    setIsPaidConfirmOpen(false);
    setPaidUnlock({
      error: null,
      order: null,
      recipientWalletAddress: null,
      status: "idle",
      txHash: null,
    });
  }, [accountAddress, contentId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const bridgePath = buildPathWithReferral(
      `/${locale}/content/bridge/${contentId}`,
      shareReferralCode,
    );
    setShareUrl(
      new URL(
        setShareIdOnHref(bridgePath, shareId),
        window.location.origin,
      ).toString(),
    );

    try {
      setIsLiked(window.localStorage.getItem(`content-like:${contentId}`) === "1");
    } catch {}
  }, [contentId, locale, shareId, shareReferralCode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(`content-like:${contentId}`, isLiked ? "1" : "0");
    } catch {}
  }, [contentId, isLiked]);

  useEffect(() => {
    if (shareState !== "copied" && shareState !== "error") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShareState("idle");
    }, 2200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [shareState]);

  const spawnLikeBurst = useCallback((clientX: number, clientY: number) => {
    const rect = heroRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const id = Date.now() + Math.random();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    setLikeBursts((current) => [...current, { id, x, y }]);
    window.setTimeout(() => {
      setLikeBursts((current) => current.filter((burst) => burst.id !== id));
    }, 900);
  }, []);

  const triggerLike = useCallback(
    (options?: {
      clientX?: number;
      clientY?: number;
    }) => {
      setIsLiked(true);

      if (
        typeof options?.clientX === "number" &&
        typeof options?.clientY === "number"
      ) {
        spawnLikeBurst(options.clientX, options.clientY);
        return;
      }

      const rect = heroRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      spawnLikeBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [spawnLikeBurst],
  );
  const isPreviewLocked = Boolean(state.content && !state.content.canAccess);
  const isPaidLocked =
    isPreviewLocked &&
    state.gateReason === "paid" &&
    state.content?.priceType === "paid";
  const paidUnlockAmount = state.content?.priceUsdt ?? CONTENT_PAID_USDT_AMOUNT;
  const isInsufficientPaidUnlockBalance =
    typeof usdtBalance?.value === "bigint" &&
    usdtBalance.value < BigInt(CONTENT_PAID_USDT_AMOUNT_WEI);
  const shouldEncourageSignup =
    state.gateReason === "connect" ||
    state.gateReason === "signup" ||
    state.member?.status !== "completed";
  const canWriteComment = !isDisconnected && state.member?.status === "completed";
  const requiresMembershipGate =
    !state.content &&
    (isDisconnected ||
      state.gateReason === "connect" ||
      state.gateReason === "signup" ||
      state.member?.status !== "completed");
  const heroImageUrl =
    state.content?.coverImageUrl ??
    state.content?.contentImageUrls[0] ??
    initialTeaser?.coverImageUrl ??
    null;
  const heroAuthorDisplayName =
    state.content?.authorProfile?.displayName ?? initialTeaser?.authorDisplayName ?? null;
  const heroAuthorAvatarUrl =
    state.content?.authorProfile?.avatarImageUrl ??
    initialTeaser?.authorAvatarImageUrl ??
    null;
  const heroPublishedLabel = formatDateTime(
    state.content?.publishedAt ?? initialTeaser?.publishedAt ?? null,
    locale,
  );
  const heroTitle = state.content?.title ?? initialTeaser?.title ?? null;
  const heroSummary = state.content?.summary ?? initialTeaser?.summary ?? null;
  const detailPriceType = state.content?.priceType ?? initialTeaser?.priceType ?? "free";
  const detailPriceUsdt = state.content?.priceUsdt ?? initialTeaser?.priceUsdt ?? null;
  const detailAccessLabel =
    detailPriceType === "paid"
      ? `${locale === "ko" ? "유료" : "Paid"} · ${
          detailPriceUsdt ?? CONTENT_PAID_USDT_AMOUNT
        } USDT`
      : contentCopy.labels.free;
  const isPaidDetail = detailPriceType === "paid";
  const isPaidPurchaseUnlocked =
    isPaidDetail &&
    state.content?.canAccess === true &&
    state.content.entitlementSource === "purchase";
  const shouldRequirePaidGalleryPin =
    isPaidPurchaseUnlocked &&
    Boolean(accountAddress) &&
    Boolean(state.member?.email) &&
    Boolean(state.content?.contentImageUrls.length);
  const isPaidGalleryPinLocked =
    shouldRequirePaidGalleryPin && !isGalleryPinUnlocked;
  const paidProofTier = getPaidProofTier(socialSummary);
  const paidTotalLabel = formatUsdtAmountLabel(socialSummary.paidTotalUsdt, locale);
  const paidBuyerLabel = socialSummary.paidBuyerCount.toLocaleString(locale);
  const hasPaidProof =
    socialSummary.paidBuyerCount > 0 || Number(socialSummary.paidTotalUsdt) > 0;
  const paidProofTitle =
    paidProofTier === "hot"
      ? locale === "ko"
        ? "많이 결제된 유료 콘텐츠"
        : "Top paid content"
      : paidProofTier === "proven"
        ? locale === "ko"
          ? "결제 검증된 유료 콘텐츠"
          : "Payment-proven content"
        : locale === "ko"
          ? "유료 전체 보기"
          : "Paid full access";
  const lockedPreviewTitle = isPaidLocked
    ? locale === "ko"
      ? "유료 콘텐츠입니다"
      : "This is paid content"
    : contentCopy.messages.previewLocked;

  useEffect(() => {
    if (!shouldRequirePaidGalleryPin) {
      setIsGalleryPinUnlocked(false);
      return;
    }

    setIsGalleryPinUnlocked(
      isPaidGalleryPinUnlockedForSession({
        contentId,
        email: state.member?.email,
        walletAddress: accountAddress,
      }),
    );
  }, [
    accountAddress,
    contentId,
    shouldRequirePaidGalleryPin,
    state.member?.email,
  ]);

  const copyShareLink = useCallback(async (nextShareUrl = shareUrl) => {
    if (!nextShareUrl) {
      setShareState("error");
      return false;
    }

    try {
      await navigator.clipboard.writeText(nextShareUrl);
      setShareState("copied");
      return true;
    } catch {
      setShareState("error");
      return false;
    }
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (!shareUrl || !heroTitle) {
      setShareState("error");
      return;
    }

    const nextShareId = createShareId("content");
    const nextShareUrl = setShareIdOnHref(shareUrl, nextShareId);

    trackFunnelEvent("share_click", {
      contentId,
      metadata: {
        source: "content-detail",
      },
      referralCode: shareReferralCode,
      shareId: nextShareId,
      targetHref: nextShareUrl,
    });

    if (typeof navigator.share === "function") {
      setShareState("sharing");

      try {
        await navigator.share({
          text: heroSummary ?? "",
          title: heroTitle,
          url: nextShareUrl,
        });
        setShareState("idle");
        return;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          setShareState("idle");
          return;
        }
      }
    }

    await copyShareLink(nextShareUrl);
  }, [contentId, copyShareLink, heroSummary, heroTitle, shareReferralCode, shareUrl]);

  const loadComments = useCallback(async () => {
    if (!heroTitle) {
      return;
    }

    setCommentsError(null);
    setCommentsStatus("loading");

    try {
      const searchParams = new URLSearchParams();

      if (!isDisconnected && accountAddress) {
        try {
          const email = await getUserEmail({ client: thirdwebClient });

          if (email) {
            searchParams.set("email", email);
            searchParams.set("walletAddress", accountAddress);
          }
        } catch {}
      }

      const query = searchParams.toString();
      const response = await fetch(
        `/api/content/posts/${encodeURIComponent(contentId)}/comments${query ? `?${query}` : ""}`,
      );
      const data = (await response.json()) as
        | ContentCommentsResponse
        | { error?: string };

      if (!response.ok || !("comments" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : commentCopy.loadFailed,
        );
      }

      setComments(data.comments);
      setCommentCount(data.social.commentCount);
      setSocialSummary(data.social);
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : commentCopy.loadFailed,
      );
      setCommentsStatus("error");
    }
  }, [
    accountAddress,
    commentCopy.loadFailed,
    contentId,
    heroTitle,
    isDisconnected,
  ]);

  useEffect(() => {
    if (!heroTitle) {
      setComments([]);
      setCommentsError(null);
      setCommentsStatus("idle");
      setCommentBody("");
      setCommentCount(0);
      return;
    }

    void loadComments();
  }, [contentId, heroTitle, loadComments]);

  const submitComment = useCallback(async () => {
    const body = commentBody.trim();

    if (!body) {
      return;
    }

    if (isDisconnected || state.member?.status !== "completed" || !accountAddress) {
      setCommentsError(commentCopy.signInRequired);
      return;
    }

    setCommentsStatus("submitting");
    setCommentsError(null);

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        throw new Error(dictionary.member.errors.missingEmail);
      }

      const response = await fetch(
        `/api/content/posts/${encodeURIComponent(contentId)}/comments`,
        {
          body: JSON.stringify({
            body,
            email,
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
      const data = (await response.json()) as
        | ContentCommentCreateResponse
        | { error?: string };

      if (!response.ok || !("comment" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : commentCopy.submitFailed,
        );
      }

      setComments((current) => [
        data.comment,
        ...current.filter((comment) => comment.commentId !== data.comment.commentId),
      ]);
      setCommentCount(data.social.commentCount);
      setSocialSummary(data.social);
      setCommentBody("");
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : commentCopy.submitFailed,
      );
      setCommentsStatus("error");
    }
  }, [
    accountAddress,
    commentBody,
    commentCopy.signInRequired,
    commentCopy.submitFailed,
    contentId,
    dictionary.member.errors.missingEmail,
    isDisconnected,
    state.member?.status,
  ]);

  const ensurePaidUnlockOrder = useCallback(async () => {
    if (
      paidOrderRef.current &&
      paidRecipientWalletRef.current &&
      paidOrderRef.current.contentId === contentId &&
      paidOrderRef.current.status === "pending_payment"
    ) {
      return {
        order: paidOrderRef.current,
        recipientWalletAddress: paidRecipientWalletRef.current,
      };
    }

    if (!accountAddress) {
      throw new Error(contentCopy.messages.connectRequired);
    }

    if (!state.content) {
      throw new Error(contentCopy.messages.detailLoadFailed);
    }

    if (isInsufficientPaidUnlockBalance) {
      throw new Error(
        locale === "ko"
          ? `${paidUnlockAmount} USDT 이상이 필요합니다.`
          : `You need at least ${paidUnlockAmount} USDT.`,
      );
    }

    setPaidUnlock((current) => ({
      ...current,
      error: null,
      status: "creating",
      txHash: null,
    }));

    const email = await getUserEmail({ client: thirdwebClient });

    if (!email) {
      throw new Error(dictionary.member.errors.missingEmail);
    }

    const response = await fetch("/api/content/orders", {
      body: JSON.stringify({
        contentId,
        email,
        walletAddress: accountAddress,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const data = (await response.json()) as ContentOrderCreateResponse | {
      error?: string;
    };

    if (!response.ok || !("order" in data)) {
      if ("error" in data && data.error === "Content already unlocked.") {
        await loadDetail();
        setIsPaidConfirmOpen(false);
        setPaidUnlock({
          error: null,
          order: null,
          recipientWalletAddress: null,
          status: "unlocked",
          txHash: null,
        });
      }

      throw new Error(
        "error" in data && data.error
          ? data.error
          : contentCopy.messages.detailLoadFailed,
      );
    }

    paidOrderRef.current = data.order;
    paidRecipientWalletRef.current = data.recipientWalletAddress;
    setPaidUnlock({
      error: null,
      order: data.order,
      recipientWalletAddress: data.recipientWalletAddress,
      status: "idle",
      txHash: null,
    });

    return {
      order: data.order,
      recipientWalletAddress: data.recipientWalletAddress,
    };
  }, [
    accountAddress,
    contentCopy.messages.connectRequired,
    contentCopy.messages.detailLoadFailed,
    contentId,
    dictionary.member.errors.missingEmail,
    isInsufficientPaidUnlockBalance,
    loadDetail,
    locale,
    paidUnlockAmount,
    state.content,
  ]);

  const openPaidUnlockConfirm = useCallback(() => {
    setIsPaidConfirmOpen(true);
    setPaidUnlock((current) => ({
      ...current,
      error: null,
    }));
  }, []);

  const closePaidUnlockConfirm = useCallback(() => {
    if (
      paidUnlock.status === "creating" ||
      paidUnlock.status === "sent" ||
      paidUnlock.status === "verifying"
    ) {
      return;
    }

    setIsPaidConfirmOpen(false);
  }, [paidUnlock.status]);

  const trackSignupCtaClick = useCallback(() => {
    trackFunnelEvent("signup_cta_click", {
      contentId,
      metadata: {
        gateReason: state.gateReason ?? "unknown",
        source: "content-detail",
      },
      referralCode: shareReferralCode,
      shareId,
      targetHref: activateHref,
    });
  }, [activateHref, contentId, shareId, shareReferralCode, state.gateReason]);

  const trackPaidUnlockClick = useCallback(() => {
    trackFunnelEvent("paid_unlock_click", {
      contentId,
      metadata: {
        amountUsdt: paidUnlockAmount,
        source: "content-detail",
      },
      referralCode: shareReferralCode,
      shareId,
    });
  }, [contentId, paidUnlockAmount, shareId, shareReferralCode]);

  const createPaidUnlockTransaction = useCallback(async () => {
    if (!walletUnlock.isUnlocked) {
      throw new Error(walletUnlock.copy.unlockRequired);
    }

    const preparedOrder = await ensurePaidUnlockOrder();

    setPaidUnlock((current) => ({
      ...current,
      error: null,
      order: preparedOrder.order,
      recipientWalletAddress: preparedOrder.recipientWalletAddress,
    }));

    return transfer({
      amount: preparedOrder.order.amountUsdt,
      contract: usdtContract,
      to: preparedOrder.recipientWalletAddress,
    });
  }, [ensurePaidUnlockOrder, walletUnlock.copy.unlockRequired, walletUnlock.isUnlocked]);

  const handlePaidUnlockSent = useCallback(
    (result: { transactionHash: string }) => {
      setPaidUnlock((current) => ({
        ...current,
        error: null,
        status: "sent",
        txHash: result.transactionHash,
      }));
    },
    [],
  );

  const handlePaidUnlockConfirmed = useCallback(
    (receipt: { transactionHash: string }) => {
      void (async () => {
        const order = paidOrderRef.current;

        if (!order || !accountAddress) {
          setPaidUnlock((current) => ({
            ...current,
            error:
              locale === "ko"
                ? "결제 주문 정보를 확인하지 못했습니다."
                : "Payment order is missing.",
            status: "error",
          }));
          return;
        }

        setPaidUnlock((current) => ({
          ...current,
          error: null,
          status: "verifying",
          txHash: receipt.transactionHash,
        }));

        try {
          const email = await getUserEmail({ client: thirdwebClient });

          if (!email) {
            throw new Error(dictionary.member.errors.missingEmail);
          }

          const response = await fetch(
            `/api/content/orders/${encodeURIComponent(order.orderId)}/verify`,
            {
              body: JSON.stringify({
                email,
                txHash: receipt.transactionHash,
                walletAddress: accountAddress,
              }),
              headers: {
                "Content-Type": "application/json",
              },
              method: "POST",
            },
          );
          const data = (await response.json()) as
            | ContentOrderVerifyResponse
            | { error?: string };

          if (!response.ok || !("order" in data)) {
            throw new Error(
              "error" in data && data.error
                ? data.error
                : contentCopy.messages.detailLoadFailed,
            );
          }

          setPaidUnlock((current) => ({
            ...current,
            error: null,
            order: data.order,
            status: "unlocked",
            txHash: receipt.transactionHash,
          }));
          setIsPaidConfirmOpen(false);
          await loadDetail();
        } catch (error) {
          setPaidUnlock((current) => ({
            ...current,
            error:
              error instanceof Error
                ? error.message
                : contentCopy.messages.detailLoadFailed,
            status: "error",
          }));
        }
      })();
    },
    [
      accountAddress,
      contentCopy.messages.detailLoadFailed,
      dictionary.member.errors.missingEmail,
      loadDetail,
      locale,
    ],
  );

  const handlePaidUnlockError = useCallback(
    (error: Error) => {
      if (error.message === "Content already unlocked.") {
        void loadDetail();
        setIsPaidConfirmOpen(false);
        setPaidUnlock((current) => ({
          ...current,
          error: null,
          status: "unlocked",
        }));
        return;
      }

      setPaidUnlock((current) => ({
        ...current,
        error: error.message || contentCopy.messages.detailLoadFailed,
        status: "error",
      }));
    },
    [contentCopy.messages.detailLoadFailed, loadDetail],
  );

  const handleHeroPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "touch") {
        return;
      }

      const now = Date.now();

      if (now - lastTapAtRef.current < 280) {
        lastTapAtRef.current = 0;
        triggerLike({
          clientX: event.clientX,
          clientY: event.clientY,
        });
        return;
      }

      lastTapAtRef.current = now;
    },
    [triggerLike],
  );

  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-col gap-4 sm:gap-5",
        isModalPresentation
          ? "min-h-full max-w-3xl px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:px-5 sm:py-5"
          : "min-h-screen max-w-5xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8",
      )}
    >
      {hasThirdwebClientId && !isModalPresentation ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={appMetadata}
          chain={smartWalletChain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}

      {!isModalPresentation ? <AndroidInstallBanner locale={locale} /> : null}

      {state.status === "loading" && !state.content ? (
        <ContentDetailLoadingState
          backHref={backHref}
          locale={locale}
          subtitle={contentCopy.page.detailEyebrow}
          teaser={heroTitle
            ? {
                authorAvatarImageUrl: heroAuthorAvatarUrl,
                authorDisplayName: heroAuthorDisplayName,
                coverImageUrl: heroImageUrl,
                publishedAt: heroPublishedLabel,
                summary: heroSummary,
                title: heroTitle,
              }
            : null}
          loadingDescription={contentCopy.messages.detailLoadingDescription}
          loadingTitle={contentCopy.messages.detailLoadingTitle}
        />
      ) : requiresMembershipGate ? (
        <div className="space-y-4 sm:space-y-6">
          {heroTitle ? (
            <section className="relative mx-[-0.75rem] overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 shadow-[0_28px_70px_rgba(15,23,42,0.20)] sm:mx-0 sm:rounded-[36px]">
              <HeroTopBar
                authorAvatarUrl={heroAuthorAvatarUrl}
                authorLabel={heroAuthorDisplayName}
                backHref={backHref}
                metaLabel={heroPublishedLabel}
                onShare={() => {
                  void handleShare();
                }}
                shareLabel={contentCopy.actions.share}
                subtitle={contentCopy.page.detailEyebrow}
              />
              {heroImageUrl ? (
                <HeroImage alt={heroTitle} preload src={heroImageUrl} />
              ) : (
                <div className="aspect-[4/5] w-full bg-[radial-gradient(circle_at_top_left,rgba(249,168,212,0.32),transparent_34%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.26),transparent_28%),linear-gradient(180deg,#0f172a_0%,#111827_45%,#1e293b_100%)] sm:aspect-[16/9]" />
              )}

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.34)_38%,rgba(2,6,23,0.88)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_34%)]" />

              <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-wrap gap-2">
                  <HeroBadge>{detailAccessLabel}</HeroBadge>
                  {heroAuthorDisplayName ? (
                    <HeroBadge>{heroAuthorDisplayName}</HeroBadge>
                  ) : null}
                  {heroPublishedLabel ? <HeroBadge>{heroPublishedLabel}</HeroBadge> : null}
                </div>

                <h2 className="mt-4 max-w-4xl text-[2rem] font-semibold leading-[1.06] tracking-tight text-white sm:mt-5 sm:text-[2.8rem]">
                  {heroTitle}
                </h2>
                {heroSummary ? (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/82 sm:mt-4 sm:text-base sm:leading-7">
                    {heroSummary}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
          <LockedContentGate
            activateHref={activateHref}
            homeHref={homeHref}
            locale={locale}
            onSignupClick={trackSignupCtaClick}
            primaryMessage={contentCopy.messages.paymentRequired}
            secondaryMessage={contentCopy.messages.connectRequired}
          />
          {isPaidDetail && !isPaidLocked ? (
            <PaidProofPanel
              buyerLabel={paidBuyerLabel}
              hasProof={hasPaidProof}
              locale={locale}
              priceLabel={`${detailPriceUsdt ?? CONTENT_PAID_USDT_AMOUNT} USDT`}
              tier={paidProofTier}
              title={paidProofTitle}
              totalLabel={paidTotalLabel}
            />
          ) : null}
          {heroTitle ? (
            <ContentCommentsSection
              activateHref={activateHref}
              canWrite={canWriteComment}
              commentBody={commentBody}
              comments={comments}
              commentsError={commentsError}
              commentsStatus={commentsStatus}
              copy={commentCopy}
              count={commentCount}
              locale={locale}
              onCommentBodyChange={setCommentBody}
              onRefresh={() => {
                void loadComments();
              }}
              onSignupClick={trackSignupCtaClick}
              onSubmit={() => {
                void submitComment();
              }}
            />
          ) : null}
        </div>
      ) : state.error && !state.content ? (
        <MessageCard tone="error">
          {state.error}
          {state.member?.status !== "completed" ? (
            <span className="mt-3 block">
              <Link
                className="font-semibold text-slate-950 underline"
                href={activateHref}
                onClick={trackSignupCtaClick}
              >
                {dictionary.referralsPage.actions.completeSignup}
              </Link>
            </span>
          ) : null}
        </MessageCard>
      ) : state.content ? (
        <article className="space-y-4 sm:space-y-6">
          <section
            className="relative mx-[-0.75rem] overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 shadow-[0_28px_70px_rgba(15,23,42,0.20)] sm:mx-0 sm:rounded-[36px]"
            onDoubleClick={(event) => {
              triggerLike({
                clientX: event.clientX,
                clientY: event.clientY,
              });
            }}
            onPointerUp={handleHeroPointerUp}
            ref={heroRef}
          >
            <HeroTopBar
              authorAvatarUrl={heroAuthorAvatarUrl}
              authorLabel={heroAuthorDisplayName}
              backHref={backHref}
              metaLabel={heroPublishedLabel}
              onShare={() => {
                void handleShare();
              }}
              shareLabel={contentCopy.actions.share}
              subtitle={contentCopy.page.detailEyebrow}
            />
            {heroImageUrl ? (
              <HeroImage alt={state.content.title} preload src={heroImageUrl} />
            ) : (
              <div className="aspect-[4/5] w-full bg-[radial-gradient(circle_at_top_left,rgba(249,168,212,0.32),transparent_34%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.26),transparent_28%),linear-gradient(180deg,#0f172a_0%,#111827_45%,#1e293b_100%)] sm:aspect-[16/9]" />
            )}

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.34)_38%,rgba(2,6,23,0.88)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_34%)]" />

            <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6 lg:p-8">
              <div className="flex flex-wrap gap-2">
                <HeroBadge>{detailAccessLabel}</HeroBadge>
                {heroAuthorDisplayName ? (
                  <HeroBadge>{heroAuthorDisplayName}</HeroBadge>
                ) : null}
                {heroPublishedLabel ? <HeroBadge>{heroPublishedLabel}</HeroBadge> : null}
              </div>

              <h2 className="mt-4 max-w-4xl text-[2rem] font-semibold leading-[1.06] tracking-tight text-white sm:mt-5 sm:text-[2.8rem]">
                {state.content.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/82 sm:mt-4 sm:text-base sm:leading-7">
                {state.content.summary}
              </p>
            </div>

            {likeBursts.map((burst) => (
              <LikeBurstOverlay key={burst.id} x={burst.x} y={burst.y} />
            ))}
          </section>

          <section className="relative -mt-6 rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-4 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.10)] sm:mt-0 sm:rounded-[32px] sm:px-6 sm:py-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  {contentCopy.page.detailEyebrow}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {contentCopy.messages.likeHint}
                </p>
              </div>
              <button
                className={cn(
                  "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                  isLiked
                    ? "border-rose-200 bg-rose-50 text-rose-700 shadow-[0_14px_30px_rgba(244,63,94,0.14)]"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                )}
                onClick={() => {
                  if (isLiked) {
                    setIsLiked(false);
                    return;
                  }

                  triggerLike();
                }}
                type="button"
              >
                <Heart
                  className={cn(
                    "size-4 transition-transform",
                    isLiked ? "fill-current text-rose-500" : "",
                  )}
                />
                <span>{isLiked ? contentCopy.actions.liked : contentCopy.actions.like}</span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <ActionChip
                className="w-full justify-center"
                icon={Share2}
                label={
                  shareState === "sharing"
                    ? contentCopy.actions.sharing
                    : contentCopy.actions.share
                }
                onClick={() => {
                  void handleShare();
                }}
                tone="primary"
              />
              <ActionChip
                className="w-full justify-center"
                icon={Copy}
                label={
                  shareState === "copied"
                    ? contentCopy.actions.copiedLink
                    : contentCopy.actions.copyLink
                }
                onClick={() => {
                  void copyShareLink();
                }}
              />
            </div>

            {shareState === "error" ? (
              <p className="mt-3 text-sm font-medium text-rose-600">
                {contentCopy.messages.shareFailed}
              </p>
            ) : null}

          </section>

          {isPaidPurchaseUnlocked ? (
            <PaidUnlockedPanel
              locale={locale}
              priceLabel={`${detailPriceUsdt ?? CONTENT_PAID_USDT_AMOUNT} USDT`}
            />
          ) : null}

          {isPaidDetail ? (
            <PaidProofPanel
              buyerLabel={paidBuyerLabel}
              hasProof={hasPaidProof}
              locale={locale}
              priceLabel={`${detailPriceUsdt ?? CONTENT_PAID_USDT_AMOUNT} USDT`}
              tier={paidProofTier}
              title={paidProofTitle}
              totalLabel={paidTotalLabel}
            />
          ) : null}

          {state.content.contentImageUrls.length > 0 ? (
            <section
              className={cn(
                "mx-[-0.75rem] overflow-hidden rounded-[32px] border shadow-[0_28px_70px_rgba(15,23,42,0.18)] sm:mx-0 sm:rounded-[32px]",
                isPaidGalleryPinLocked
                  ? "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_62%,#f8fafc_100%)] p-4 sm:p-5"
                  : "border-white/70 bg-slate-950 sm:border-white/70 sm:bg-white/92 sm:p-5",
              )}
            >
              <div className="mb-4 hidden items-center justify-between gap-3 sm:flex">
                <div>
                  <p className="eyebrow">{contentCopy.labels.imageGallery}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {isPaidGalleryPinLocked
                      ? locale === "ko"
                        ? "결제 완료된 이미지 갤러리는 PIN 확인 후 열립니다."
                        : "The paid gallery opens after PIN confirmation."
                      : locale === "ko"
                        ? "모바일에서 좌우로 넘기며 이미지 중심으로 콘텐츠를 볼 수 있습니다."
                        : "Swipe through the visual gallery on mobile."}
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  {state.content.contentImageUrls.length}
                </span>
              </div>
              {isPaidGalleryPinLocked ? (
                <PaidGalleryPinGate
                  contentId={contentId}
                  email={state.member?.email ?? null}
                  imageCount={state.content.contentImageUrls.length}
                  locale={locale}
                  onUnlocked={() => {
                    setIsGalleryPinUnlocked(true);
                  }}
                  title={state.content.title}
                  unlockHref={walletUnlock.unlockHref}
                  walletAddress={accountAddress ?? null}
                />
              ) : (
                <ContentImageCarousel
                  images={state.content.contentImageUrls}
                  isPreviewLocked={isPreviewLocked}
                  locale={locale}
                  title={state.content.title}
                />
              )}
            </section>
          ) : null}

          <section
            className={cn(
              "relative overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-7",
              isPreviewLocked ? "min-h-[320px] sm:min-h-[360px]" : "",
            )}
          >
            <div
              className={cn(
                "transition duration-300",
                isPreviewLocked ? "pointer-events-none select-none blur-md saturate-75" : "",
              )}
            >
              <p className="whitespace-pre-wrap text-[1.04rem] leading-8 text-slate-800 sm:text-[1.02rem] sm:leading-8">
                {state.content.body}
              </p>
            </div>

            {isPreviewLocked ? (
              <div className="pointer-events-auto absolute inset-x-0 bottom-0 top-0 z-10 flex items-end justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.18)_20%,rgba(255,255,255,0.84)_52%,rgba(255,255,255,0.98)_100%)] px-4 pb-5 pt-20 sm:px-8 sm:pb-8">
                <div className="pointer-events-auto w-full max-w-xl rounded-[24px] border border-white/90 bg-white/94 p-4 text-center shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:p-5">
                  <p className="text-base font-semibold tracking-tight text-slate-950">
                    {lockedPreviewTitle}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {isPaidLocked
                      ? locale === "ko"
                        ? `콘텐츠 이미지와 전체 본문은 ${paidUnlockAmount} USDT 결제 후 열람할 수 있습니다.`
                        : `Unlock the full gallery and body for ${paidUnlockAmount} USDT.`
                      : shouldEncourageSignup
                        ? contentCopy.messages.paymentRequired
                        : contentCopy.messages.likeHint}
                  </p>
                  {isPaidLocked ? (
                    <div className="mt-3">
                      <PaidProofPanel
                        buyerLabel={paidBuyerLabel}
                        hasProof={hasPaidProof}
                        locale={locale}
                        priceLabel={`${paidUnlockAmount} USDT`}
                        tier={paidProofTier}
                        title={paidProofTitle}
                        totalLabel={paidTotalLabel}
                        variant="compact"
                      />
                    </div>
                  ) : null}
                  {paidUnlock.error ? (
                    <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-700">
                      {paidUnlock.error}
                    </p>
                  ) : null}
                  {paidUnlock.txHash ? (
                    <a
                      className="mt-3 inline-flex text-xs font-semibold text-slate-500 underline"
                      href={`${BSC_EXPLORER}/tx/${paidUnlock.txHash}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {locale === "ko" ? "결제 트랜잭션 보기" : "View payment transaction"}
                    </a>
                  ) : null}
                  {isPaidLocked && isInsufficientPaidUnlockBalance ? (
                    <p className="mt-3 text-xs font-medium text-amber-700">
                      {locale === "ko"
                        ? `${paidUnlockAmount} USDT 이상 보유한 지갑이 필요합니다.`
                        : `A wallet with at least ${paidUnlockAmount} USDT is required.`}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                    {isPaidLocked && !shouldEncourageSignup ? (
                      <button
                        className="inline-flex h-11 items-center justify-center rounded-full border border-amber-200/70 bg-[linear-gradient(135deg,#fef3c7_0%,#fbbf24_100%)] px-4 text-sm font-semibold !text-slate-950 shadow-[0_18px_38px_rgba(251,191,36,0.24)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={
                          paidUnlock.status === "sent" ||
                          paidUnlock.status === "verifying"
                        }
                        onClick={() => {
                          trackPaidUnlockClick();
                          openPaidUnlockConfirm();
                        }}
                        type="button"
                      >
                        <Coins className="mr-2 size-4" />
                        {paidUnlock.status === "verifying"
                          ? locale === "ko"
                            ? "결제 확인 중"
                            : "Verifying"
                          : paidUnlock.status === "creating"
                            ? locale === "ko"
                              ? "결제 정보 준비 중"
                              : "Preparing payment"
                          : `${paidUnlockAmount} USDT ${
                              locale === "ko" ? "결제하고 보기" : "unlock"
                            }`}
                      </button>
                    ) : shouldEncourageSignup ? (
                      <Link
                        className="inline-flex h-11 items-center justify-center rounded-full border border-amber-200/70 bg-[linear-gradient(135deg,#fef3c7_0%,#fbbf24_100%)] px-4 text-sm font-semibold !text-slate-950 shadow-[0_18px_38px_rgba(251,191,36,0.24)] transition hover:brightness-[1.03]"
                        href={activateHref}
                        onClick={trackSignupCtaClick}
                      >
                        <LockKeyhole className="mr-2 size-4" />
                        <span className="sm:hidden">가입 완료하기</span>
                        <span className="hidden sm:inline">
                          {dictionary.referralsPage.actions.completeSignup}
                        </span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <ContentCommentsSection
            activateHref={activateHref}
            canWrite={canWriteComment}
            commentBody={commentBody}
            comments={comments}
            commentsError={commentsError}
            commentsStatus={commentsStatus}
            copy={commentCopy}
            count={commentCount}
            locale={locale}
            onCommentBodyChange={setCommentBody}
            onRefresh={() => {
              void loadComments();
            }}
            onSignupClick={trackSignupCtaClick}
            onSubmit={() => {
              void submitComment();
            }}
          />

          {state.content.sources.length > 0 ? (
            <section className="rounded-[28px] border border-slate-200 bg-slate-50/92 p-4 sm:rounded-[32px] sm:p-5">
              <p className="eyebrow">{contentCopy.labels.references}</p>
              <div className="mt-3 grid gap-3">
                {state.content.sources.map((source) => (
                  <a
                    key={source.url}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 overflow-hidden rounded-[20px] border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:rounded-2xl sm:px-4"
                    href={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="min-w-0">
                      <span className="block break-words font-semibold text-slate-950 sm:truncate">
                        {source.title}
                      </span>
                      <span className="mt-1 block break-all text-xs leading-5 text-slate-500 sm:truncate">
                        {source.url}
                      </span>
                    </span>
                    <ExternalLink className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </article>
      ) : isDisconnected ? (
        <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>
      ) : null}

      {isPaidConfirmOpen && isPaidLocked ? (
        <div className="fixed inset-0 z-[170] flex items-end justify-center bg-slate-950/58 px-0 backdrop-blur-sm sm:items-center sm:px-4">
          <div className="max-h-[92svh] w-full max-w-[520px] overflow-y-auto rounded-t-[30px] border border-white/70 bg-white p-4 shadow-[0_-24px_70px_rgba(15,23,42,0.26)] sm:rounded-[32px] sm:p-5">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-amber-600">
                  {locale === "ko" ? "유료 콘텐츠 결제" : "Paid content"}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  {locale === "ko"
                    ? `${paidUnlockAmount} USDT 결제 후 바로 열람`
                    : `Unlock with ${paidUnlockAmount} USDT`}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {locale === "ko"
                    ? "회원 지갑에서 판매자 지갑으로 결제됩니다. 한 번 결제하면 이 콘텐츠의 전체 본문과 이미지를 계속 볼 수 있습니다."
                    : "Payment is sent from your member wallet to the seller wallet. Unlock once to keep access to the full body and images."}
                </p>
              </div>
              <button
                aria-label={locale === "ko" ? "결제 확인 닫기" : "Close payment confirmation"}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950 disabled:opacity-40"
                disabled={
                  paidUnlock.status === "creating" ||
                  paidUnlock.status === "sent" ||
                  paidUnlock.status === "verifying"
                }
                onClick={closePaidUnlockConfirm}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-3">
              <div className="rounded-[20px] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
                  {state.content?.title}
                </p>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">
                      {locale === "ko" ? "결제 금액" : "Amount"}
                    </span>
                    <span className="font-semibold text-slate-950">
                      {paidUnlockAmount} USDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">
                      {locale === "ko" ? "회원 지갑" : "Member wallet"}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-950">
                      {formatAddressLabel(accountAddress)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">
                      {locale === "ko" ? "판매자 지갑" : "Seller wallet"}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-950">
                      {paidUnlock.recipientWalletAddress
                        ? formatAddressLabel(paidUnlock.recipientWalletAddress)
                        : locale === "ko"
                          ? "승인 시 지정"
                          : "On approval"}
                    </span>
                  </div>
                  {paidUnlock.order ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">
                        {locale === "ko" ? "주문" : "Order"}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-500">
                        {paidUnlock.order.orderId.slice(0, 8)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {hasPaidProof ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-amber-700">
                      {locale === "ko" ? "누적 결제" : "Total paid"}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {paidTotalLabel} USDT
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-amber-700">
                      {locale === "ko" ? "결제 회원" : "Paid members"}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {paidBuyerLabel}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex items-start gap-2 rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
                <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {locale === "ko"
                    ? "지갑 승인 창에서 금액과 받는 주소를 확인한 뒤 승인하면 온체인 전송이 실행됩니다."
                    : "Review the amount and recipient in your wallet. The onchain transfer starts only after approval."}
                </span>
              </div>
            </div>

            {paidUnlock.error ? (
              <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-700">
                {paidUnlock.error}
              </p>
            ) : null}

            {isInsufficientPaidUnlockBalance ? (
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800">
                {locale === "ko"
                  ? `${paidUnlockAmount} USDT 이상 보유한 회원 지갑이 필요합니다.`
                  : `A member wallet with at least ${paidUnlockAmount} USDT is required.`}
              </p>
            ) : null}

            {paidUnlock.txHash ? (
              <a
                className="mt-3 inline-flex text-xs font-semibold text-slate-500 underline"
                href={`${BSC_EXPLORER}/tx/${paidUnlock.txHash}`}
                rel="noreferrer"
                target="_blank"
              >
                {locale === "ko" ? "결제 트랜잭션 보기" : "View payment transaction"}
              </a>
            ) : null}

            <div className="mt-5 grid gap-2.5 sm:grid-cols-[0.82fr_1.18fr]">
              <button
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={
                  paidUnlock.status === "creating" ||
                  paidUnlock.status === "sent" ||
                  paidUnlock.status === "verifying"
                }
                onClick={closePaidUnlockConfirm}
                type="button"
              >
                {locale === "ko" ? "취소" : "Cancel"}
              </button>
              {!walletUnlock.isUnlocked ? (
                <WalletUnlockAction
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-amber-200/70 bg-[linear-gradient(135deg,#fef3c7_0%,#fbbf24_100%)] px-4 text-sm font-semibold !text-slate-950 shadow-[0_18px_38px_rgba(251,191,36,0.24)] transition hover:brightness-[1.03]"
                  href={walletUnlock.unlockHref}
                >
                  {walletUnlock.copy.unlockAction}
                </WalletUnlockAction>
              ) : (
                <TransactionButton
                  className="inline-flex h-12 items-center justify-center rounded-full border border-amber-200/70 bg-[linear-gradient(135deg,#fef3c7_0%,#fbbf24_100%)] px-4 text-sm font-semibold !text-slate-950 shadow-[0_18px_38px_rgba(251,191,36,0.24)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={
                    !accountAddress ||
                    isInsufficientPaidUnlockBalance ||
                    paidUnlock.status === "creating" ||
                    paidUnlock.status === "sent" ||
                    paidUnlock.status === "verifying"
                  }
                  onError={handlePaidUnlockError}
                  onTransactionConfirmed={handlePaidUnlockConfirmed}
                  onTransactionSent={handlePaidUnlockSent}
                  transaction={createPaidUnlockTransaction}
                  type="button"
                  unstyled
                >
                  <Coins className="mr-2 size-4" />
                  {paidUnlock.status === "creating"
                    ? locale === "ko"
                      ? "결제 정보 준비 중"
                      : "Preparing payment"
                    : paidUnlock.status === "sent" || paidUnlock.status === "verifying"
                      ? locale === "ko"
                        ? "결제 확인 중"
                        : "Verifying"
                      : locale === "ko"
                        ? `${paidUnlockAmount} USDT 결제하기`
                        : `Pay ${paidUnlockAmount} USDT`}
                </TransactionButton>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function PaidUnlockedPanel({
  locale,
  priceLabel,
}: {
  locale: Locale;
  priceLabel: string;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_68%)] p-4 shadow-[0_18px_42px_rgba(16,185,129,0.12)] sm:rounded-[32px] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_14px_30px_rgba(16,185,129,0.22)]">
          <CheckCircle2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">
              {locale === "ko" ? "결제 완료 · 전체 열람 가능" : "Payment complete · Full access"}
            </h2>
            <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {priceLabel}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {locale === "ko"
              ? "이 콘텐츠는 이미 결제가 완료되어 전체 본문과 콘텐츠 이미지를 계속 열람할 수 있습니다."
              : "This content is already paid for. You can keep viewing the full body and content images."}
          </p>
        </div>
      </div>
    </section>
  );
}

function PaidProofPanel({
  buyerLabel,
  hasProof,
  locale,
  priceLabel,
  tier,
  title,
  totalLabel,
  variant = "section",
}: {
  buyerLabel: string;
  hasProof: boolean;
  locale: Locale;
  priceLabel: string;
  tier: PaidProofTier;
  title: string;
  totalLabel: string;
  variant?: "compact" | "section";
}) {
  const isCompact = variant === "compact";
  const proofDescription = hasProof
    ? locale === "ko"
      ? `이미 ${buyerLabel}명이 결제했고 누적 ${totalLabel} USDT가 검증되었습니다.`
      : `${buyerLabel} members have paid, with ${totalLabel} USDT verified.`
    : locale === "ko"
      ? "결제하면 전체 본문과 콘텐츠 이미지를 계속 열람할 수 있습니다."
      : "Unlock once to keep access to the full body and content images.";
  const metricLabel = locale === "ko" ? "누적 결제" : "Total paid";
  const buyerCountLabel = locale === "ko" ? "결제 회원" : "Paid members";

  return (
    <section
      className={cn(
        "overflow-hidden border",
        isCompact
          ? "rounded-[20px] border-amber-200 bg-amber-50/92 p-3 text-left"
          : tier === "hot"
            ? "rounded-[28px] border-amber-300 bg-[linear-gradient(135deg,#fff7ed_0%,#fef3c7_48%,#ffffff_100%)] p-4 shadow-[0_22px_55px_rgba(217,119,6,0.16)] sm:rounded-[32px] sm:p-5"
            : tier === "proven"
              ? "rounded-[28px] border-amber-200 bg-amber-50/90 p-4 shadow-[0_18px_42px_rgba(217,119,6,0.10)] sm:rounded-[32px] sm:p-5"
              : "rounded-[28px] border-slate-200 bg-white/94 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.07)] sm:rounded-[32px] sm:p-5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-full",
              isCompact ? "size-9" : "size-11",
              tier === "new" ? "bg-slate-950 text-white" : "bg-amber-400 text-slate-950",
            )}
          >
            {tier === "hot" ? (
              <TrendingUp className={isCompact ? "size-4" : "size-5"} />
            ) : (
              <Coins className={isCompact ? "size-4" : "size-5"} />
            )}
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "font-semibold tracking-tight text-slate-950",
                isCompact ? "text-sm" : "text-lg",
              )}
            >
              {title}
            </p>
            <p
              className={cn(
                "mt-1 leading-6 text-slate-600",
                isCompact ? "text-xs" : "text-sm",
              )}
            >
              {proofDescription}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-white/80 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
          {priceLabel}
        </span>
      </div>

      {hasProof ? (
        <div
          className={cn(
            "mt-3 grid gap-2",
            isCompact ? "grid-cols-2" : "sm:grid-cols-2",
          )}
        >
          <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {metricLabel}
            </p>
            <p className="mt-1 text-base font-bold text-slate-950">
              {totalLabel} USDT
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Users className="size-3.5" />
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
                {buyerCountLabel}
              </p>
            </div>
            <p className="mt-1 text-base font-bold text-slate-950">
              {buyerLabel}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ContentCommentsSection({
  activateHref,
  canWrite,
  commentBody,
  comments,
  commentsError,
  commentsStatus,
  copy,
  count,
  locale,
  onCommentBodyChange,
  onRefresh,
  onSignupClick,
  onSubmit,
}: {
  activateHref: string;
  canWrite: boolean;
  commentBody: string;
  comments: ContentCommentRecord[];
  commentsError: string | null;
  commentsStatus: CommentsStatus;
  copy: ContentDetailCommentCopy;
  count: number;
  locale: Locale;
  onCommentBodyChange: (value: string) => void;
  onRefresh: () => void;
  onSignupClick: () => void;
  onSubmit: () => void;
}) {
  const isBusy = commentsStatus === "loading" || commentsStatus === "submitting";
  const countLabel = `${count.toLocaleString(locale)} ${copy.countSuffix}`;

  return (
    <section className="rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-[0_22px_55px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]">
            <MessageCircle className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-400">
              {copy.eyebrow}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
              {copy.title}
            </h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {countLabel}
          </span>
          <button
            aria-label={copy.refresh}
            className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isBusy}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw
              className={cn("size-4", commentsStatus === "loading" ? "animate-spin" : "")}
            />
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-500">{copy.helper}</p>

      <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
        {commentsStatus === "loading" && comments.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-9 text-sm font-medium text-slate-500">
            <LoaderCircle className="size-4 animate-spin" />
            {copy.loading}
          </div>
        ) : commentsError && comments.length === 0 ? (
          <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
            {commentsError}
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            {copy.noComments}
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div className="flex gap-3" key={comment.commentId}>
                <ContentCommentAvatar
                  imageUrl={comment.authorAvatarImageUrl}
                  label={comment.authorDisplayName}
                />
                <div className="min-w-0 flex-1 rounded-[20px] bg-white px-3.5 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-sm font-semibold text-slate-950">
                      {comment.authorDisplayName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatCommentDateTime(comment.createdAt, locale)}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {comment.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {commentsError && comments.length > 0 ? (
          <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-700">
            {commentsError}
          </p>
        ) : null}
      </div>

      <div className="mt-3 rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
        {canWrite ? (
          <div className="flex items-end gap-2">
            <textarea
              className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400"
              maxLength={500}
              onChange={(event) => {
                onCommentBodyChange(event.target.value);
              }}
              placeholder={copy.writePlaceholder}
              rows={1}
              value={commentBody}
            />
            <button
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!commentBody.trim() || commentsStatus === "submitting"}
              onClick={onSubmit}
              type="button"
            >
              {commentsStatus === "submitting" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              <span className="sr-only">{copy.post}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-500">{copy.signInRequired}</p>
            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold !text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition hover:bg-slate-900"
              href={activateHref}
              onClick={onSignupClick}
            >
              {copy.completeSignup}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function ContentCommentAvatar({
  imageUrl,
  label,
}: {
  imageUrl: string | null;
  label: string;
}) {
  const initial = label.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <span className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={label} className="h-full w-full object-cover" src={imageUrl} />
      ) : (
        initial
      )}
    </span>
  );
}

function HeroBadge({
  children,
}: {
  children: string;
}) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/18 bg-white/12 px-3 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-white backdrop-blur-md">
      {children}
    </span>
  );
}

function HeroTopBar({
  authorAvatarUrl,
  authorLabel,
  backHref,
  metaLabel,
  onShare,
  shareLabel,
  subtitle,
}: {
  authorAvatarUrl?: string | null;
  authorLabel?: string | null;
  backHref: string;
  metaLabel?: string | null;
  onShare: () => void;
  shareLabel: string;
  subtitle: string;
}) {
  const centerPrimary = authorLabel?.trim() || subtitle;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
      <Link
        className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-white/28 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.12))] text-white shadow-[0_14px_32px_rgba(2,6,23,0.24)] backdrop-blur-xl transition hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.3),rgba(255,255,255,0.16))] sm:size-12"
        href={backHref}
      >
        <ArrowLeft className="size-4 stroke-[2.5] drop-shadow-[0_2px_6px_rgba(15,23,42,0.35)] sm:size-5" />
      </Link>
      <div className="flex max-w-[calc(100%-7rem)] items-center gap-2 rounded-full border border-white/12 bg-slate-950/34 px-3 py-2 text-white backdrop-blur-md shadow-[0_14px_30px_rgba(15,23,42,0.16)] sm:max-w-none sm:px-4">
        <span className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/12 shadow-[0_0_0_4px_rgba(255,255,255,0.06)]">
          {authorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={authorLabel?.trim() || subtitle}
              className="h-full w-full object-cover"
              src={authorAvatarUrl}
            />
          ) : (
            <span className="inline-flex size-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
          )}
        </span>
        <div className="min-w-0 leading-none">
          <p className="truncate text-[0.76rem] font-semibold tracking-[0.01em] text-white sm:text-[0.82rem]">
            {centerPrimary}
          </p>
          <p className="mt-1 truncate text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-white/58 sm:text-[0.62rem]">
            {metaLabel ? `${subtitle} • ${metaLabel}` : subtitle}
          </p>
        </div>
      </div>
      <button
        className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-white/16 bg-slate-950/40 text-white backdrop-blur-md transition hover:bg-slate-950/58 sm:size-12"
        onClick={onShare}
        type="button"
      >
        <Share2 className="size-4" />
        <span className="sr-only">{shareLabel}</span>
      </button>
    </div>
  );
}

function ContentDetailLoadingState({
  backHref,
  loadingDescription,
  loadingTitle,
  locale,
  subtitle,
  teaser,
}: {
  backHref: string;
  loadingDescription: string;
  loadingTitle: string;
  locale: Locale;
  subtitle: string;
  teaser: {
    authorAvatarImageUrl: string | null;
    authorDisplayName: string | null;
    coverImageUrl: string | null;
    publishedAt: string | null;
    summary: string | null;
    title: string;
  } | null;
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {teaser ? (
        <section className="relative mx-[-0.75rem] overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 shadow-[0_28px_70px_rgba(15,23,42,0.20)] sm:mx-0 sm:rounded-[36px]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
            <Link
              className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-white/28 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.12))] text-white shadow-[0_14px_32px_rgba(2,6,23,0.24)] backdrop-blur-xl transition hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.3),rgba(255,255,255,0.16))] sm:size-12"
              href={backHref}
            >
              <ArrowLeft className="size-4 stroke-[2.5] drop-shadow-[0_2px_6px_rgba(15,23,42,0.35)] sm:size-5" />
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/38 px-3 py-2 text-[0.72rem] font-semibold text-white backdrop-blur-md shadow-[0_14px_30px_rgba(15,23,42,0.16)]">
              {teaser.authorAvatarImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={teaser.authorDisplayName?.trim() || subtitle}
                  className="size-6 rounded-full border border-white/20 object-cover"
                  src={teaser.authorAvatarImageUrl}
                />
              ) : (
                <LoaderCircle className="size-3.5 animate-spin" />
              )}
              <span>{loadingTitle}</span>
            </div>
          </div>

          {teaser.coverImageUrl ? (
            <HeroImage alt={teaser.title} preload src={teaser.coverImageUrl} />
          ) : (
            <div className="aspect-[4/5] w-full bg-[radial-gradient(circle_at_top_left,rgba(249,168,212,0.32),transparent_34%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.26),transparent_28%),linear-gradient(180deg,#0f172a_0%,#111827_45%,#1e293b_100%)] sm:aspect-[16/9]" />
          )}

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.12)_0%,rgba(2,6,23,0.4)_38%,rgba(2,6,23,0.9)_100%)]" />

          <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap gap-2">
              <HeroBadge>{locale === "ko" ? "미리보기" : "Preview"}</HeroBadge>
              {teaser.authorDisplayName ? (
                <HeroBadge>{teaser.authorDisplayName}</HeroBadge>
              ) : null}
              {teaser.publishedAt ? <HeroBadge>{teaser.publishedAt}</HeroBadge> : null}
            </div>

            <h2 className="mt-4 max-w-4xl text-[2rem] font-semibold leading-[1.06] tracking-tight text-white sm:mt-5 sm:text-[2.8rem]">
              {teaser.title}
            </h2>
            {teaser.summary ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/82 sm:mt-4 sm:text-base sm:leading-7">
                {teaser.summary}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.10)] sm:rounded-[32px] sm:p-7">
        <div className="flex items-start gap-4">
          <div className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.12)]">
            <LoaderCircle className="size-5 animate-spin" />
          </div>
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
              {subtitle}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              {loadingTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {loadingDescription}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/3 rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#334155_100%)] [animation:pulse_1.4s_ease-in-out_infinite]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-slate-200 bg-white/90 p-4">
              <div className="h-2.5 w-20 rounded-full bg-slate-200" />
              <div className="mt-3 h-4 w-24 rounded-full bg-slate-900/85" />
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/90 p-4">
              <div className="h-2.5 w-16 rounded-full bg-slate-200" />
              <div className="mt-3 h-4 w-28 rounded-full bg-slate-200" />
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/90 p-4">
              <div className="h-2.5 w-24 rounded-full bg-slate-200" />
              <div className="mt-3 h-4 w-20 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LockedContentGate({
  activateHref,
  homeHref,
  locale,
  onSignupClick,
  primaryMessage,
  secondaryMessage,
}: {
  activateHref: string;
  homeHref: string;
  locale: Locale;
  onSignupClick: () => void;
  primaryMessage: string;
  secondaryMessage: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_22%),linear-gradient(160deg,#0b1120_0%,#0f172a_42%,#1e293b_100%)] px-5 py-10 text-white shadow-[0_30px_80px_rgba(15,23,42,0.24)] sm:px-8 sm:py-14">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0)_28%,rgba(255,255,255,0.06)_100%)]" />
      <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.46),transparent)]" />
      <div className="relative mx-auto max-w-2xl text-center">
        <div className="mx-auto flex size-[4.5rem] items-center justify-center rounded-full border border-white/16 bg-white/10 shadow-[0_18px_40px_rgba(15,23,42,0.2)] backdrop-blur-md">
          <LockKeyhole className="size-7 text-white" />
        </div>
        <p className="mt-6 text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-white/58">
          Members Only
        </p>
        <h2 className="mt-3 text-[1.9rem] font-semibold leading-[1.04] tracking-tight sm:text-[2.6rem]">
          {primaryMessage}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/76 sm:text-base">
          {secondaryMessage}
        </p>
        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/6 p-3 backdrop-blur-xl sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full border border-amber-200/70 bg-[linear-gradient(135deg,#fef3c7_0%,#fbbf24_100%)] px-5 text-sm font-semibold !text-slate-950 shadow-[0_20px_45px_rgba(251,191,36,0.28)] transition hover:brightness-[1.03]"
              href={activateHref}
              onClick={onSignupClick}
            >
              <LockKeyhole className="mr-2 size-4" />
              {locale === "ko" ? "가입 완료하기" : "Complete signup"}
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/18 bg-slate-950/28 px-5 text-sm font-semibold !text-white backdrop-blur-md transition hover:bg-slate-950/40"
              href={homeHref}
            >
              {locale === "ko" ? "홈으로 돌아가기" : "Back home"}
            </Link>
          </div>
          <p className="mt-3 text-xs leading-6 text-white/58">
            {locale === "ko"
              ? "가입 완료 후 전체 본문과 이미지 갤러리를 바로 확인할 수 있습니다."
              : "Complete signup to unlock the full post and image gallery."}
          </p>
        </div>
      </div>
    </section>
  );
}

function mapGalleryPinError(message: string, locale: Locale) {
  if (message === "Wallet PIN is incorrect.") {
    return locale === "ko"
      ? "PIN이 일치하지 않습니다. 다시 입력하세요."
      : "The PIN does not match. Try again.";
  }

  if (message === "Wallet PIN is temporarily locked.") {
    return locale === "ko"
      ? "PIN 오류가 여러 번 발생했습니다. 잠시 후 다시 시도하세요."
      : "Too many wrong PIN attempts. Try again shortly.";
  }

  if (message === "Wallet PIN is not configured.") {
    return locale === "ko"
      ? "지갑 PIN 설정이 필요합니다. PIN 설정 후 갤러리를 열 수 있습니다."
      : "Wallet PIN setup is required before opening the gallery.";
  }

  return message;
}

function PaidGalleryPinGate({
  contentId,
  email,
  imageCount,
  locale,
  onUnlocked,
  title,
  unlockHref,
  walletAddress,
}: {
  contentId: string;
  email: string | null;
  imageCount: number;
  locale: Locale;
  onUnlocked: () => void;
  title: string;
  unlockHref: string;
  walletAddress: string | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const isSubmitting = status === "submitting";
  const pinReady = pin.length === WALLET_UNLOCK_PIN_LENGTH;
  const imageCountLabel = imageCount.toLocaleString(locale);

  const submitPin = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    if (!pinReady) {
      setError(
        locale === "ko"
          ? `PIN 숫자 ${WALLET_UNLOCK_PIN_LENGTH}자리를 입력하세요.`
          : `Enter the ${WALLET_UNLOCK_PIN_LENGTH}-digit PIN.`,
      );
      inputRef.current?.focus();
      return;
    }

    if (!walletAddress) {
      setError(
        locale === "ko"
          ? "연결된 회원 지갑을 확인하지 못했습니다."
          : "Could not find the connected member wallet.",
      );
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const resolvedEmail = email ?? (await getUserEmail({ client: thirdwebClient }));

      if (!resolvedEmail) {
        throw new Error(
          locale === "ko"
            ? "이메일 지갑 정보를 확인하지 못했습니다."
            : "Could not find the email wallet.",
        );
      }

      const response = await fetch("/api/wallet/unlock", {
        body: JSON.stringify({
          action: "verify",
          email: resolvedEmail,
          pin,
          walletAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ??
            (locale === "ko"
              ? "PIN 확인에 실패했습니다."
              : "PIN confirmation failed."),
        );
      }

      markPaidGalleryPinUnlockedForSession({
        contentId,
        email: resolvedEmail,
        walletAddress,
      });
      setPin("");
      onUnlocked();
    } catch (error) {
      setPin("");
      setError(
        mapGalleryPinError(
          error instanceof Error
            ? error.message
            : locale === "ko"
              ? "PIN 확인에 실패했습니다."
              : "PIN confirmation failed.",
          locale,
        ),
      );
      inputRef.current?.focus();
    } finally {
      setStatus("idle");
    }
  }, [
    contentId,
    email,
    isSubmitting,
    locale,
    onUnlocked,
    pin,
    pinReady,
    walletAddress,
  ]);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-emerald-200 bg-white p-4 text-center shadow-[0_20px_55px_rgba(16,185,129,0.10)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_62%)]" />
      <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_18px_38px_rgba(15,23,42,0.18)]">
        <LockKeyhole className="size-6" />
      </div>
      <p className="relative mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-emerald-700">
        {locale === "ko" ? "결제 완료 갤러리" : "Paid gallery"}
      </p>
      <h2 className="relative mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
        {locale === "ko" ? "PIN으로 이미지 갤러리 열기" : "Open gallery with PIN"}
      </h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        {locale === "ko"
          ? "결제가 완료된 콘텐츠입니다. 이미지 갤러리는 지갑 PIN 확인 후 이 세션에서 열립니다."
          : "Payment is complete. The image gallery opens in this session after wallet PIN confirmation."}
      </p>

      <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3 text-left">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {locale === "ko" ? "콘텐츠" : "Content"}
          </p>
          <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-950">
            {title}
          </p>
        </div>
        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-3 py-3 text-left">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            {locale === "ko" ? "이미지" : "Images"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {imageCountLabel}
          </p>
        </div>
      </div>

      <form
        className="relative mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submitPin();
        }}
      >
        <label
          className="sr-only"
          htmlFor={`paid-gallery-pin-${contentId}`}
        >
          {locale === "ko" ? "갤러리 PIN" : "Gallery PIN"}
        </label>
        <input
          autoComplete="one-time-code"
          className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-xl font-semibold text-slate-950 outline-none transition placeholder:text-base placeholder:font-medium placeholder:text-slate-400 focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          id={`paid-gallery-pin-${contentId}`}
          inputMode="numeric"
          maxLength={WALLET_UNLOCK_PIN_LENGTH}
          onChange={(event) => {
            setPin(
              event.target.value
                .replace(/\D/gu, "")
                .slice(0, WALLET_UNLOCK_PIN_LENGTH),
            );
            setError(null);
          }}
          pattern={`\\d{${WALLET_UNLOCK_PIN_LENGTH}}`}
          placeholder={
            locale === "ko"
              ? `PIN ${WALLET_UNLOCK_PIN_LENGTH}자리`
              : `${WALLET_UNLOCK_PIN_LENGTH}-digit PIN`
          }
          ref={inputRef}
          type="password"
          value={pin}
        />

        {error ? (
          <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_auto]">
          <button
            className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold !text-white shadow-[0_18px_38px_rgba(15,23,42,0.18)] transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            disabled={!pinReady || isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                {locale === "ko" ? "확인 중" : "Verifying"}
              </>
            ) : (
              locale === "ko" ? "갤러리 열기" : "Open gallery"
            )}
          </button>
          <WalletUnlockAction
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            href={unlockHref}
          >
            {locale === "ko" ? "PIN 관리" : "Manage PIN"}
          </WalletUnlockAction>
        </div>
      </form>
    </div>
  );
}

function ContentImageCarousel({
  images,
  isPreviewLocked,
  locale,
  title,
}: {
  images: string[];
  isPreviewLocked: boolean;
  locale: Locale;
  title: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const activeLightboxIndex = lightboxIndex ?? 0;
  const lightboxImage =
    lightboxIndex === null ? null : images[lightboxIndex] ?? null;

  useEffect(() => {
    const animationFrameId =
      typeof window !== "undefined"
        ? window.requestAnimationFrame(() => {
            setActiveIndex(0);
          })
        : null;

    if (trackRef.current) {
      trackRef.current.scrollTo({ left: 0 });
    }

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [images]);

  const scrollToIndex = useCallback(
    (nextIndex: number) => {
      const track = trackRef.current;

      if (!track) {
        return;
      }

      const clampedIndex = Math.max(0, Math.min(images.length - 1, nextIndex));
      track.scrollTo({
        behavior: "smooth",
        left: track.clientWidth * clampedIndex,
      });
      setActiveIndex(clampedIndex);
    },
    [images.length],
  );

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const showLightboxImage = useCallback(
    (nextIndex: number) => {
      setLightboxIndex(Math.max(0, Math.min(images.length - 1, nextIndex)));
    },
    [images.length],
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="relative overflow-hidden bg-slate-950/95 sm:rounded-[26px] sm:border sm:border-slate-200 sm:shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
        <div
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [touch-action:pan-x_pan-y] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
          onScroll={(event) => {
            const target = event.currentTarget;

            if (!target.clientWidth) {
              return;
            }

            const nextIndex = Math.round(target.scrollLeft / target.clientWidth);
            setActiveIndex(Math.max(0, Math.min(images.length - 1, nextIndex)));
          }}
          ref={trackRef}
        >
          {images.map((imageUrl, index) => (
            <div className="w-full shrink-0 snap-center" key={`${imageUrl}-${index}`}>
              <div className="relative">
                <button
                  aria-label={
                    locale === "ko"
                      ? `${title} 이미지 ${index + 1} 전체 보기`
                      : `View ${title} image ${index + 1} fullscreen`
                  }
                  className={cn(
                    "block w-full",
                    isPreviewLocked ? "cursor-default" : "cursor-zoom-in",
                  )}
                  disabled={isPreviewLocked}
                  onClick={() => {
                    if (isPreviewLocked) {
                      return;
                    }

                    showLightboxImage(index);
                  }}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={`${title} ${index + 1}`}
                    className={cn(
                      "block h-[74svh] w-full select-none object-contain sm:h-[min(82vh,760px)]",
                      isPreviewLocked
                        ? "scale-[1.04] blur-xl brightness-90 saturate-75"
                        : "",
                    )}
                    draggable={false}
                    loading={index === 0 ? "eager" : "lazy"}
                    src={imageUrl}
                  />
                </button>
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.18)_0%,rgba(15,23,42,0.06)_22%,rgba(15,23,42,0.1)_48%,rgba(15,23,42,0.42)_100%)]" />
                {isPreviewLocked ? (
                  <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-[22px] border border-white/18 bg-slate-950/58 px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_18px_42px_rgba(15,23,42,0.24)] backdrop-blur-xl">
                    {locale === "ko"
                      ? "결제 후 콘텐츠 이미지를 선명하게 볼 수 있습니다."
                      : "Unlock to view content images clearly."}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {images.length > 1 ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 sm:px-5">
              <span className="rounded-full bg-white/14 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/86 backdrop-blur-md">
                {activeIndex + 1} / {images.length}
              </span>
              <span className="rounded-full bg-slate-950/42 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-md sm:hidden">
                {locale === "ko" ? "스와이프" : "Swipe"}
              </span>
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-3 sm:flex">
              <button
                className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-full border border-white/18 bg-slate-950/55 text-white backdrop-blur-md transition hover:bg-slate-950/72"
                onClick={() => {
                  scrollToIndex(activeIndex - 1);
                }}
                type="button"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-full border border-white/18 bg-slate-950/55 text-white backdrop-blur-md transition hover:bg-slate-950/72"
                onClick={() => {
                  scrollToIndex(activeIndex + 1);
                }}
                type="button"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </>
        ) : null}

        {images.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-4 sm:hidden">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/50 px-3 py-2 backdrop-blur-md">
              {images.map((imageUrl, index) => (
                <span
                  className={cn(
                    "h-1.5 rounded-full transition",
                    index === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/45",
                  )}
                  key={`${imageUrl}-mobile-dot-${index}`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="hidden items-center justify-center gap-2 sm:flex">
          {images.map((imageUrl, index) => (
            <button
              className={cn(
                "h-2.5 rounded-full transition",
                index === activeIndex
                  ? "w-8 bg-slate-950"
                  : "w-2.5 bg-slate-300 hover:bg-slate-400",
              )}
              key={`${imageUrl}-dot-${index}`}
              onClick={() => {
                scrollToIndex(index);
              }}
              type="button"
            />
          ))}
        </div>
      ) : null}

      {lightboxImage ? (
        <div className="fixed inset-0 z-[160] flex flex-col bg-slate-950">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-[linear-gradient(180deg,rgba(2,6,23,0.78),rgba(2,6,23,0))] px-4 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6">
            <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/86 backdrop-blur-md">
              {activeLightboxIndex + 1} / {images.length}
            </span>
            <button
              aria-label={locale === "ko" ? "전체 화면 닫기" : "Close fullscreen view"}
              className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-white/16 bg-white/12 text-white backdrop-blur-md transition hover:bg-white/18"
              onClick={closeLightbox}
              type="button"
            >
              <ArrowLeft className="size-5" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center px-2 py-[calc(env(safe-area-inset-top)+4.25rem)] sm:px-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${title} ${activeLightboxIndex + 1}`}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
              src={lightboxImage}
            />
          </div>

          {images.length > 1 ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3">
              <button
                aria-label={locale === "ko" ? "이전 이미지" : "Previous image"}
                className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-white/16 bg-slate-950/46 text-white backdrop-blur-md transition hover:bg-slate-950/64 disabled:opacity-35"
                disabled={activeLightboxIndex === 0}
                onClick={() => {
                  showLightboxImage(activeLightboxIndex - 1);
                }}
                type="button"
              >
                <ArrowLeft className="size-5" />
              </button>
              <button
                aria-label={locale === "ko" ? "다음 이미지" : "Next image"}
                className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-white/16 bg-slate-950/46 text-white backdrop-blur-md transition hover:bg-slate-950/64 disabled:opacity-35"
                disabled={activeLightboxIndex === images.length - 1}
                onClick={() => {
                  showLightboxImage(activeLightboxIndex + 1);
                }}
                type="button"
              >
                <ArrowRight className="size-5" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ActionChip({
  className,
  icon: Icon,
  label,
  onClick,
  tone = "neutral",
}: {
  className?: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  tone?: "neutral" | "primary";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition",
        tone === "primary"
          ? "border-slate-950 bg-slate-950 !text-white shadow-[0_16px_34px_rgba(15,23,42,0.22)] hover:bg-slate-900"
          : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </button>
  );
}

function LikeBurstOverlay({
  x,
  y,
}: {
  x: number;
  y: number;
}) {
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: `${x}%`,
        top: `${y}%`,
      }}
    >
      <span className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 [animation:ping_900ms_cubic-bezier(0,0,0.2,1)_1]" />
      <span className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 [animation:ping_900ms_cubic-bezier(0,0,0.2,1)_1]" />
      <Heart className="relative size-16 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow-[0_16px_35px_rgba(15,23,42,0.35)] [animation:ping_750ms_cubic-bezier(0,0,0.2,1)_1]" />
    </div>
  );
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
      className={
        tone === "error"
          ? "rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-900"
          : "rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 text-sm leading-6 text-slate-600"
      }
    >
      {children}
    </div>
  );
}
