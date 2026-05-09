"use client";

import Link from "next/link";
import { BellPlus, CheckCircle2, Loader2, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import type { FanletterCharacterFollowStateResponse } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { thirdwebClient } from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";

type FollowButtonTheme = "dark" | "green";
type FollowButtonStatus = "error" | "idle" | "loading" | "ready" | "updating";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        connectedRequired: "연결 후 팔로우",
        error: "다시 시도",
        follow: "팔로우",
        followed: "팔로잉",
        follower: "팔로워",
        loading: "확인 중",
        updating: "저장 중",
      }
    : {
        connectedRequired: "Connect to follow",
        error: "Try again",
        follow: "Follow",
        followed: "Following",
        follower: "followers",
        loading: "Checking",
        updating: "Saving",
      };
}

function formatCount(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(value);
}

function getButtonClassName({
  className,
  followed,
  theme,
}: {
  className?: string;
  followed: boolean;
  theme: FollowButtonTheme;
}) {
  if (className) {
    return className;
  }

  if (theme === "dark") {
    return `inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
      followed
        ? "border border-black/14 bg-white text-black hover:border-black/28"
        : "bg-black !text-white hover:bg-black/82"
    }`;
  }

  return `inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition ${
    followed
      ? "border border-[#44f26e]/36 bg-white/10 !text-white hover:bg-white/14"
      : "bg-[#44f26e] !text-black hover:bg-[#64ff84]"
  }`;
}

async function readApiJson<T>(response: Response, fallback: string): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(data?.error || fallback);
  }

  if (!data) {
    throw new Error(fallback);
  }

  return data;
}

export function FanletterFollowButton({
  className,
  creatorReferralCode,
  fallbackHref,
  locale,
  theme = "green",
}: {
  className?: string;
  creatorReferralCode: string;
  fallbackHref: string;
  locale: Locale;
  theme?: FollowButtonTheme;
}) {
  const copy = getCopy(locale);
  const account = useActiveAccount();
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    disconnectedResolveGraceMs: 1800,
    resolveGraceMs: 1800,
    status: connectionStatus,
  });
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [followed, setFollowed] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [status, setStatus] = useState<FollowButtonStatus>("idle");
  const buttonClassName = getButtonClassName({
    className,
    followed,
    theme,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadFollowState() {
      setStatus((current) => (current === "idle" ? "loading" : current));

      try {
        let resolvedEmail = memberSession.email;

        if (!resolvedEmail && connection.isConnected && accountAddress) {
          resolvedEmail = await getThirdwebUserEmail({ client: thirdwebClient });
        }

        if (!cancelled) {
          setEmail(resolvedEmail ?? null);
        }

        const params = new URLSearchParams({
          creatorReferralCode,
        });

        if (resolvedEmail && accountAddress) {
          params.set("email", resolvedEmail);
          params.set("walletAddress", accountAddress);
        }

        const data = await readApiJson<FanletterCharacterFollowStateResponse>(
          await fetch(`/api/fanletter/follows?${params.toString()}`, {
            cache: "no-store",
          }),
          copy.error,
        );

        if (cancelled) {
          return;
        }

        setFollowed(data.followed);
        setFollowerCount(data.followerCount);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    void loadFollowState();

    return () => {
      cancelled = true;
    };
  }, [
    accountAddress,
    connection.isConnected,
    copy.error,
    creatorReferralCode,
    memberSession.email,
  ]);

  async function toggleFollow() {
    if (!email || !accountAddress || status === "updating") {
      return;
    }

    setStatus("updating");

    try {
      const data = await readApiJson<FanletterCharacterFollowStateResponse>(
        await fetch("/api/fanletter/follows", {
          body: JSON.stringify({
            action: followed ? "unfollow" : "follow",
            creatorReferralCode,
            email,
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        }),
        copy.error,
      );

      setFollowed(data.followed);
      setFollowerCount(data.followerCount);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  const followerLabel = `${formatCount(followerCount, locale)} ${copy.follower}`;
  const isBusy = status === "loading" || status === "updating";
  const label = isBusy
    ? status === "updating"
      ? copy.updating
      : copy.loading
    : followed
      ? copy.followed
      : status === "error"
        ? copy.error
        : copy.follow;
  const Icon = isBusy ? Loader2 : followed ? CheckCircle2 : BellPlus;

  if (!connection.isConnected || !accountAddress || !email) {
    return (
      <Link className={buttonClassName} href={fallbackHref}>
        <BellPlus className="size-4" />
        <span>{connection.isResolving ? copy.loading : copy.connectedRequired}</span>
        <span className="inline-flex items-center gap-1 text-current/62">
          <UsersRound className="size-3.5" />
          {followerLabel}
        </span>
      </Link>
    );
  }

  return (
    <button
      className={buttonClassName}
      disabled={isBusy}
      onClick={() => {
        void toggleFollow();
      }}
      type="button"
    >
      <Icon className={`size-4 ${isBusy ? "animate-spin" : ""}`} />
      <span>{label}</span>
      <span className="inline-flex items-center gap-1 text-current/62">
        <UsersRound className="size-3.5" />
        {followerLabel}
      </span>
    </button>
  );
}
