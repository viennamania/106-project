"use client";

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
  Copy,
  ExternalLink,
  Heart,
  Share2,
  Send,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { getContentCopy } from "@/lib/content-copy";
import type {
  ContentDetailLoadResponse,
  ContentDetailResponse,
} from "@/lib/content";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
} from "@/lib/landing-branding";
import type { MemberRecord } from "@/lib/member";
import {
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import type { Dictionary, Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DetailState = {
  content: ContentDetailResponse["content"] | null;
  error: string | null;
  member: MemberRecord | null;
  status: "idle" | "loading" | "ready" | "error";
};

type LikeBurst = {
  id: number;
  x: number;
  y: number;
};

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

export function ContentDetailPage({
  contentId,
  dictionary,
  locale,
  referralCode = null,
  returnToHref = null,
}: {
  contentId: string;
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
  returnToHref?: string | null;
}) {
  const contentCopy = getContentCopy(locale);
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const homeHref = buildReferralLandingPath(locale, referralCode);
  const feedHref = buildPathWithReferral(`/${locale}/network-feed`, referralCode);
  const backHref = returnToHref ?? feedHref;
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const [state, setState] = useState<DetailState>({
    content: null,
    error: null,
    member: null,
    status: "idle",
  });
  const [shareState, setShareState] = useState<
    "copied" | "error" | "idle" | "sharing"
  >("idle");
  const [isLiked, setIsLiked] = useState(false);
  const [likeBursts, setLikeBursts] = useState<LikeBurst[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const heroRef = useRef<HTMLDivElement | null>(null);
  const lastTapAtRef = useRef(0);
  const isDisconnected = status !== "connected" || !accountAddress;
  const publishedLabel = formatDateTime(state.content?.publishedAt ?? null, locale);

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

      const response = await fetch(`/api/content/posts/${encodeURIComponent(contentId)}`, {
        body: JSON.stringify({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          syncMode: "light",
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
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

      if (!member) {
        throw new Error(contentCopy.messages.memberMissing);
      }

      if ("validationError" in data && data.validationError) {
        setState({
          content: null,
          error: data.validationError,
          member,
          status: "ready",
        });
        return;
      }

      if (member.status !== "completed") {
        setState({
          content: null,
          error: contentCopy.messages.paymentRequired,
          member,
          status: "ready",
        });
        return;
      }

      setState({
        content: "content" in data ? data.content : null,
        error: null,
        member,
        status: "ready",
      });
    } catch (error) {
      setState({
        content: null,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.detailLoadFailed,
        member: null,
        status: "error",
      });
    }
  }, [
    accountAddress,
    chain.id,
    chain.name,
    contentCopy.messages.detailLoadFailed,
    contentCopy.messages.memberMissing,
    contentCopy.messages.paymentRequired,
    contentId,
    dictionary.member.errors.missingEmail,
    locale,
  ]);

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setState({
        content: null,
        error: null,
        member: null,
        status: "idle",
      });
      return;
    }

    void loadDetail();
  }, [accountAddress, loadDetail, status]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setShareUrl(window.location.href);

    try {
      setIsLiked(window.localStorage.getItem(`content-like:${contentId}`) === "1");
    } catch {}
  }, [contentId]);

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

  const copyShareLink = useCallback(async () => {
    if (!shareUrl) {
      setShareState("error");
      return false;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareState("copied");
      return true;
    } catch {
      setShareState("error");
      return false;
    }
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (!state.content) {
      return;
    }

    if (!shareUrl) {
      setShareState("error");
      return;
    }

    if (typeof navigator.share === "function") {
      setShareState("sharing");

      try {
        await navigator.share({
          text: state.content.summary,
          title: state.content.title,
          url: shareUrl,
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

    await copyShareLink();
  }, [copyShareLink, shareUrl, state.content]);

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

  const twitterShareHref =
    shareUrl && state.content
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(state.content.title)}&url=${encodeURIComponent(shareUrl)}`
      : null;
  const telegramShareHref =
    shareUrl && state.content
      ? `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(state.content.title)}`
      : null;
  const facebookShareHref = shareUrl
    ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
      {hasThirdwebClientId ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={appMetadata}
          chain={smartWalletChain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}

      <header className="glass-card flex flex-col gap-3 rounded-[24px] px-4 py-3 sm:gap-4 sm:rounded-[28px] sm:px-5 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <Link
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:size-12 sm:rounded-2xl"
            href={backHref}
          >
            <ArrowLeft className="size-4 sm:size-5" />
          </Link>
          <div className="space-y-1">
            <p className="eyebrow hidden sm:block">{contentCopy.page.detailEyebrow}</p>
            <div>
              <h1 className="text-[1.05rem] font-semibold tracking-tight text-slate-950 sm:text-lg">
                {contentCopy.meta.detailTitle}
              </h1>
              <p className="hidden text-sm text-slate-600 sm:block">
                {contentCopy.page.detailDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Link
            className="hidden h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 sm:inline-flex"
            href={homeHref}
          >
            {contentCopy.actions.backHome}
          </Link>
        </div>
      </header>

      {isDisconnected ? (
        <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>
      ) : state.status === "loading" ? (
        <MessageCard>{contentCopy.actions.refresh}...</MessageCard>
      ) : state.error ? (
        <MessageCard tone="error">
          {state.error}
          {state.member?.status !== "completed" ? (
            <span className="mt-3 block">
              <Link className="font-semibold text-slate-950 underline" href={activateHref}>
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
            {state.content.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={state.content.title}
                className="block aspect-[4/5] h-full w-full object-cover sm:aspect-[16/9]"
                loading="eager"
                src={state.content.coverImageUrl}
              />
            ) : (
              <div className="aspect-[4/5] w-full bg-[radial-gradient(circle_at_top_left,rgba(249,168,212,0.32),transparent_34%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.26),transparent_28%),linear-gradient(180deg,#0f172a_0%,#111827_45%,#1e293b_100%)] sm:aspect-[16/9]" />
            )}

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.34)_38%,rgba(2,6,23,0.88)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_34%)]" />

            <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6 lg:p-8">
              <div className="flex flex-wrap gap-2">
                <HeroBadge>{contentCopy.labels.free}</HeroBadge>
                {state.content.authorProfile?.displayName ? (
                  <HeroBadge>{state.content.authorProfile.displayName}</HeroBadge>
                ) : null}
                {state.content.authorProfile?.referralCode ? (
                  <HeroBadge>{state.content.authorProfile.referralCode}</HeroBadge>
                ) : null}
                {publishedLabel ? <HeroBadge>{publishedLabel}</HeroBadge> : null}
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

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
              <ActionChip
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
              {twitterShareHref ? (
                <SocialShareChip href={twitterShareHref} label="X" />
              ) : null}
              {telegramShareHref ? (
                <SocialShareChip
                  href={telegramShareHref}
                  icon={Send}
                  label="Telegram"
                />
              ) : null}
              {facebookShareHref ? (
                <SocialShareChip href={facebookShareHref} label="Facebook" />
              ) : null}
            </div>

            {shareState === "error" ? (
              <p className="mt-3 text-sm font-medium text-rose-600">
                {contentCopy.messages.shareFailed}
              </p>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-7">
            <p className="whitespace-pre-wrap text-[1.04rem] leading-8 text-slate-800 sm:text-[1.02rem] sm:leading-8">
              {state.content.body}
            </p>
          </section>

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
      ) : null}
    </main>
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

function ActionChip({
  icon: Icon,
  label,
  onClick,
  tone = "neutral",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  tone?: "neutral" | "primary";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
        tone === "primary"
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_16px_34px_rgba(15,23,42,0.22)] hover:bg-slate-900"
          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </button>
  );
}

function SocialShareChip({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon?: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <a
      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {Icon ? <Icon className="size-4" /> : null}
      <span>{label}</span>
    </a>
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
