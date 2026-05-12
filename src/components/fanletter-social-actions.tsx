"use client";

import Link from "next/link";
import {
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Share2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import type {
  ContentCommentCreateResponse,
  ContentCommentRecord,
  ContentCommentsResponse,
  ContentSocialResponse,
  ContentSocialSummaryRecord,
} from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { thirdwebClient } from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";
import { cn } from "@/lib/utils";

type FanletterSocialActionsVariant = "compact" | "panel";
type CommentsStatus = "error" | "idle" | "loading" | "ready" | "submitting";

const COMMENTS_PAGE_SIZE = 5;

type FanletterSocialActionsProps = {
  className?: string;
  commentsHref?: string;
  contentId: string;
  initialSocial: ContentSocialSummaryRecord;
  isOwnContent?: boolean;
  locale: Locale;
  shareHref: string;
  summary?: string;
  title: string;
  variant?: FanletterSocialActionsVariant;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        commentPlaceholder: "이 브이로그에 댓글 남기기...",
        comments: "댓글",
        commentsEyebrow: "Fan reaction",
        commentsHelper:
          "좋아요, 저장, 댓글이 캐릭터 브이로그 랭킹과 다음 콘텐츠 신호로 이어집니다.",
        commentsTitle: "브이로그에 반응하기",
        copied: "링크를 복사했습니다.",
        copyFailed: "링크를 복사하지 못했습니다.",
        like: "좋아요",
        liked: "좋아요 완료",
        loadCommentsFailed: "댓글을 불러오지 못했습니다.",
        loadMoreComments: "댓글 더 보기",
        loading: "확인 중",
        loadingComments: "댓글을 불러오는 중",
        noComments: "아직 댓글이 없습니다.",
        ownerActionBlocked: "내 브이로그에는 팬 반응만 집계합니다.",
        ownerCommentsHelper:
          "이 브이로그는 내 콘텐츠입니다. 공유와 댓글 확인은 가능하고 좋아요/저장은 팬 반응만 집계합니다.",
        ownerCommentPlaceholder: "내 브이로그에 고정할 답글이나 공지를 남기기...",
        post: "게시",
        refresh: "새로고침",
        save: "저장",
        saved: "저장됨",
        share: "공유",
        remainingComments: (remaining: number) =>
          `${remaining.toLocaleString("ko")}개 더 볼 수 있음`,
        showingComments: (visible: number, total: number) =>
          `최근 댓글 ${visible.toLocaleString("ko")}개 표시 중 · 전체 ${total.toLocaleString("ko")}개`,
        signInRequired: "계정 연결 후 사용할 수 있습니다.",
        submitCommentFailed: "댓글을 등록하지 못했습니다.",
        submitting: "게시 중",
      }
    : {
        commentPlaceholder: "Add a comment to this vlog...",
        comments: "Comments",
        commentsEyebrow: "Fan reaction",
        commentsHelper:
          "Likes, saves, and comments feed the character vlog ranking and future content signals.",
        commentsTitle: "React to this vlog",
        copied: "Link copied.",
        copyFailed: "Could not copy the link.",
        like: "Like",
        liked: "Liked",
        loadCommentsFailed: "Failed to load comments.",
        loadMoreComments: "Load more comments",
        loading: "Checking",
        loadingComments: "Loading comments",
        noComments: "No comments yet.",
        ownerActionBlocked: "Only fan reactions are counted on my vlogs.",
        ownerCommentsHelper:
          "This is your content. Sharing and comments remain available, while likes and saves count fan reactions only.",
        ownerCommentPlaceholder: "Add a reply or note to your vlog...",
        post: "Post",
        refresh: "Refresh",
        save: "Save",
        saved: "Saved",
        share: "Share",
        remainingComments: (remaining: number) =>
          `${remaining.toLocaleString("en")} more available`,
        showingComments: (visible: number, total: number) =>
          `Showing ${visible.toLocaleString("en")} recent comments · ${total.toLocaleString("en")} total`,
        signInRequired: "Connect your account to use this.",
        submitCommentFailed: "Failed to post comment.",
        submitting: "Posting",
      };
}

function formatCount(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatCommentDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function getNextSocial(
  social: ContentSocialSummaryRecord,
  action: "like" | "save",
  value: boolean,
): ContentSocialSummaryRecord {
  if (action === "like") {
    return {
      ...social,
      likedByViewer: value,
      likeCount: Math.max(0, social.likeCount + (value ? 1 : -1)),
    };
  }

  return {
    ...social,
    savedByViewer: value,
    saveCount: Math.max(0, social.saveCount + (value ? 1 : -1)),
  };
}

function CommentAvatar({ comment }: { comment: ContentCommentRecord }) {
  const initial =
    comment.authorDisplayName.trim().charAt(0).toUpperCase() ||
    comment.memberEmail.trim().charAt(0).toUpperCase() ||
    "F";

  if (comment.authorAvatarImageUrl) {
    return (
      <span
        aria-hidden="true"
        className="size-9 shrink-0 rounded-lg bg-cover bg-center"
        style={{ backgroundImage: `url(${comment.authorAvatarImageUrl})` }}
      />
    );
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-sm font-semibold text-black">
      {initial}
    </span>
  );
}

export function FanletterSocialActions({
  className,
  commentsHref,
  contentId,
  initialSocial,
  isOwnContent = false,
  locale,
  shareHref,
  summary,
  title,
  variant = "panel",
}: FanletterSocialActionsProps) {
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
  const [social, setSocial] =
    useState<ContentSocialSummaryRecord>(initialSocial);
  const [toast, setToast] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"like" | "save" | "share" | null>(
    null,
  );
  const [comments, setComments] = useState<ContentCommentRecord[]>([]);
  const [commentsPageInfo, setCommentsPageInfo] =
    useState<ContentCommentsResponse["pageInfo"] | null>(null);
  const [commentsStatus, setCommentsStatus] =
    useState<CommentsStatus>("idle");
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const isPanel = variant === "panel";

  useEffect(() => {
    setSocial(initialSocial);
  }, [initialSocial]);

  useEffect(() => {
    if (memberSession.email) {
      setEmail(memberSession.email);
    }
  }, [memberSession.email]);

  const resolveEmail = useCallback(async () => {
    if (email) {
      return email;
    }

    const resolvedEmail =
      memberSession.email ??
      (await getThirdwebUserEmail({ client: thirdwebClient }));

    setEmail(resolvedEmail ?? null);

    return resolvedEmail ?? null;
  }, [email, memberSession.email]);

  const loadViewerSocial = useCallback(async () => {
    if (!connection.isConnected || !accountAddress) {
      return;
    }

    const resolvedEmail = await resolveEmail();

    if (!resolvedEmail) {
      return;
    }

    const params = new URLSearchParams({
      email: resolvedEmail,
      walletAddress: accountAddress,
    });
    const response = await fetch(
      `/api/content/posts/${encodeURIComponent(contentId)}/social?${params.toString()}`,
      { cache: "no-store" },
    );
    const data = (await response.json().catch(() => null)) as
      | ContentSocialResponse
      | { error?: string }
      | null;

    if (response.ok && data && "social" in data) {
      setSocial(data.social);
    }
  }, [accountAddress, connection.isConnected, contentId, resolveEmail]);

  const loadComments = useCallback(async ({
    append = false,
    offset = 0,
  }: {
    append?: boolean;
    offset?: number;
  } = {}) => {
    setCommentsError(null);
    setCommentsStatus("loading");

    try {
      const params = new URLSearchParams({
        offset: String(offset),
        pageSize: String(COMMENTS_PAGE_SIZE),
      });

      if (connection.isConnected && accountAddress) {
        const resolvedEmail = await resolveEmail();

        if (resolvedEmail) {
          params.set("email", resolvedEmail);
          params.set("walletAddress", accountAddress);
        }
      }

      const query = params.toString();
      const response = await fetch(
        `/api/content/posts/${encodeURIComponent(contentId)}/comments${query ? `?${query}` : ""}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as
        | ContentCommentsResponse
        | { error?: string };

      if (!response.ok || !("comments" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.loadCommentsFailed,
        );
      }

      setComments((current) => {
        if (!append) {
          return data.comments;
        }

        const existingIds = new Set(
          current.map((comment) => comment.commentId),
        );

        return [
          ...current,
          ...data.comments.filter(
            (comment) => !existingIds.has(comment.commentId),
          ),
        ];
      });
      setCommentsPageInfo(data.pageInfo);
      setSocial(data.social);
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : copy.loadCommentsFailed,
      );
      setCommentsStatus("error");
    }
  }, [
    accountAddress,
    connection.isConnected,
    contentId,
    copy.loadCommentsFailed,
    resolveEmail,
  ]);

  useEffect(() => {
    if (!isPanel) {
      return;
    }

    void loadComments();
  }, [isPanel, loadComments]);

  useEffect(() => {
    if (!connection.isConnected || !accountAddress) {
      return;
    }

    void loadViewerSocial();
  }, [accountAddress, connection.isConnected, loadViewerSocial]);

  const updateSocialAction = useCallback(
    async (action: "like" | "save", value: boolean) => {
      const previous = social;

      if (isOwnContent) {
        setToast(copy.ownerActionBlocked);
        return;
      }

      setToast(null);
      setBusyAction(action);
      setSocial(getNextSocial(previous, action, value));

      if (!connection.isConnected || !accountAddress) {
        setSocial(previous);
        setToast(connection.isResolving ? copy.loading : copy.signInRequired);
        setBusyAction(null);
        return;
      }

      try {
        const resolvedEmail = await resolveEmail();

        if (!resolvedEmail) {
          throw new Error(copy.signInRequired);
        }

        const response = await fetch(
          `/api/content/posts/${encodeURIComponent(contentId)}/social`,
          {
            body: JSON.stringify({
              action,
              email: resolvedEmail,
              value,
              walletAddress: accountAddress,
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          },
        );
        const data = (await response.json()) as
          | ContentSocialResponse
          | { error?: string };

        if (!response.ok || !("social" in data)) {
          throw new Error(
            "error" in data && data.error ? data.error : copy.signInRequired,
          );
        }

        setSocial(data.social);
      } catch (error) {
        setSocial(previous);
        setToast(error instanceof Error ? error.message : copy.signInRequired);
      } finally {
        setBusyAction(null);
      }
    },
    [
      accountAddress,
      connection.isConnected,
      connection.isResolving,
      contentId,
      copy.loading,
      copy.ownerActionBlocked,
      copy.signInRequired,
      isOwnContent,
      resolveEmail,
      social,
    ],
  );

  const submitComment = useCallback(async () => {
    const body = commentBody.trim();

    if (!body) {
      return;
    }

    if (!connection.isConnected || !accountAddress) {
      setCommentsError(
        connection.isResolving ? copy.loading : copy.signInRequired,
      );
      return;
    }

    setCommentsStatus("submitting");
    setCommentsError(null);

    try {
      const resolvedEmail = await resolveEmail();

      if (!resolvedEmail) {
        throw new Error(copy.signInRequired);
      }

      const response = await fetch(
        `/api/content/posts/${encodeURIComponent(contentId)}/comments`,
        {
          body: JSON.stringify({
            body,
            email: resolvedEmail,
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
          "error" in data && data.error ? data.error : copy.submitCommentFailed,
        );
      }

      setComments((current) => [
        data.comment,
        ...current.filter((comment) => comment.commentId !== data.comment.commentId),
      ]);
      setCommentsPageInfo((current) =>
        current
          ? {
              ...current,
              nextOffset:
                current.nextOffset === null ? null : current.nextOffset + 1,
            }
          : current,
      );
      setSocial(data.social);
      setCommentBody("");
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : copy.submitCommentFailed,
      );
      setCommentsStatus("error");
    }
  }, [
    accountAddress,
    commentBody,
    connection.isConnected,
    connection.isResolving,
    contentId,
    copy.loading,
    copy.signInRequired,
    copy.submitCommentFailed,
    resolveEmail,
  ]);

  const shareContent = useCallback(async () => {
    setToast(null);
    setBusyAction("share");

    try {
      const shareUrl = new URL(shareHref, window.location.origin).toString();

      if (navigator.share) {
        try {
          await navigator.share({
            text: summary ?? "",
            title,
            url: shareUrl,
          });
          setBusyAction(null);
          return;
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "name" in error &&
            error.name === "AbortError"
          ) {
            setBusyAction(null);
            return;
          }
        }
      }

      await copyToClipboard(shareUrl);
      setToast(copy.copied);
    } catch {
      setToast(copy.copyFailed);
    } finally {
      setBusyAction(null);
    }
  }, [copy.copied, copy.copyFailed, shareHref, summary, title]);

  const compactButtonClassName =
    "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-[#f6f8f4] px-2.5 py-2 text-xs font-semibold text-black/64 transition hover:border-[#29d85f]/60 hover:bg-[#effff3] hover:text-black disabled:cursor-not-allowed disabled:opacity-60";
  const panelButtonClassName =
    "inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-3 text-sm font-semibold text-white/72 transition hover:border-[#44f26e]/46 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

  const actionButtonClassName = isPanel
    ? panelButtonClassName
    : compactButtonClassName;
  const activeClassName = isPanel
    ? "border-[#44f26e]/54 bg-[#44f26e]/14 text-[#b9ffc8]"
    : "border-[#29d85f]/70 bg-[#e9ffef] text-black";
  const actionIconClassName = isPanel ? "size-4" : "size-3.5";
  const likeLabel = social.likedByViewer ? copy.liked : copy.like;
  const saveLabel = social.savedByViewer ? copy.saved : copy.save;
  const commentsHelper = isOwnContent
    ? copy.ownerCommentsHelper
    : copy.commentsHelper;
  const commentPlaceholder = isOwnContent
    ? copy.ownerCommentPlaceholder
    : copy.commentPlaceholder;

  if (!isPanel) {
    return (
      <div className={cn("mt-4", className)}>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            aria-label={likeLabel}
            className={cn(
              actionButtonClassName,
              social.likedByViewer && activeClassName,
              isOwnContent && "opacity-70",
            )}
            disabled={busyAction === "like"}
            onClick={() => {
              void updateSocialAction("like", !social.likedByViewer);
            }}
            type="button"
          >
            {busyAction === "like" ? (
              <Loader2 className={`${actionIconClassName} animate-spin`} />
            ) : (
              <Heart
                className={actionIconClassName}
                fill={social.likedByViewer ? "currentColor" : "none"}
              />
            )}
            <span>{formatCount(social.likeCount, locale)}</span>
          </button>
          <Link
            aria-label={copy.comments}
            className={actionButtonClassName}
            href={commentsHref ?? shareHref}
          >
            <MessageCircle className={actionIconClassName} />
            <span>{formatCount(social.commentCount, locale)}</span>
          </Link>
          <button
            aria-label={saveLabel}
            className={cn(
              actionButtonClassName,
              social.savedByViewer && activeClassName,
              isOwnContent && "opacity-70",
            )}
            disabled={busyAction === "save"}
            onClick={() => {
              void updateSocialAction("save", !social.savedByViewer);
            }}
            type="button"
          >
            {busyAction === "save" ? (
              <Loader2 className={`${actionIconClassName} animate-spin`} />
            ) : (
              <Bookmark
                className={actionIconClassName}
                fill={social.savedByViewer ? "currentColor" : "none"}
              />
            )}
            <span>{formatCount(social.saveCount, locale)}</span>
          </button>
          <button
            aria-label={copy.share}
            className={actionButtonClassName}
            disabled={busyAction === "share"}
            onClick={() => {
              void shareContent();
            }}
            type="button"
          >
            {busyAction === "share" ? (
              <Loader2 className={`${actionIconClassName} animate-spin`} />
            ) : (
              <Share2 className={actionIconClassName} />
            )}
            <span className="sr-only">{copy.share}</span>
          </button>
        </div>
        {toast ? (
          <p
            aria-live="polite"
            className="mt-2 rounded-lg border border-black/10 bg-black px-3 py-2 text-xs font-semibold text-white"
          >
            {toast}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={cn(
        "mt-6 rounded-lg border border-[#44f26e]/22 bg-[#07100b] p-5 text-white shadow-[0_24px_70px_rgba(8,18,12,0.18)] sm:p-6",
        className,
      )}
      id="fanletter-comments"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
            {copy.commentsEyebrow}
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[2.45rem]">
            {copy.commentsTitle}
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-white/62 sm:text-base sm:leading-7">
            {commentsHelper}
          </p>
        </div>
        <button
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold text-black transition hover:bg-[#64ff84] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={commentsStatus === "loading"}
          onClick={() => {
            void loadComments();
          }}
          type="button"
        >
          <RefreshCw
            className={`size-4 ${commentsStatus === "loading" ? "animate-spin" : ""}`}
          />
          {copy.refresh}
        </button>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-4">
        <button
          className={cn(
            actionButtonClassName,
            social.likedByViewer && activeClassName,
            isOwnContent && "opacity-70",
          )}
          disabled={busyAction === "like"}
          onClick={() => {
            void updateSocialAction("like", !social.likedByViewer);
          }}
          type="button"
        >
          {busyAction === "like" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Heart className="size-4" fill={social.likedByViewer ? "currentColor" : "none"} />
          )}
          <span>{likeLabel}</span>
          <span className="text-current/56">{formatCount(social.likeCount, locale)}</span>
        </button>
        <a className={actionButtonClassName} href="#fanletter-comments">
          <MessageCircle className="size-4" />
          <span>{copy.comments}</span>
          <span className="text-current/56">
            {formatCount(social.commentCount, locale)}
          </span>
        </a>
        <button
          className={cn(
            actionButtonClassName,
            social.savedByViewer && activeClassName,
            isOwnContent && "opacity-70",
          )}
          disabled={busyAction === "save"}
          onClick={() => {
            void updateSocialAction("save", !social.savedByViewer);
          }}
          type="button"
        >
          {busyAction === "save" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Bookmark className="size-4" fill={social.savedByViewer ? "currentColor" : "none"} />
          )}
          <span>{saveLabel}</span>
          <span className="text-current/56">{formatCount(social.saveCount, locale)}</span>
        </button>
        <button
          className={actionButtonClassName}
          disabled={busyAction === "share"}
          onClick={() => {
            void shareContent();
          }}
          type="button"
        >
          {busyAction === "share" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Share2 className="size-4" />
          )}
          <span>{copy.share}</span>
        </button>
      </div>

      {toast ? (
        <p
          aria-live="polite"
          className="mt-3 rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-2 text-sm font-semibold text-[#b9ffc8]"
        >
          {toast}
        </p>
      ) : null}

      <div className="mt-5 rounded-lg border border-white/10 bg-black/22 p-3 sm:p-4">
        {social.commentCount > 0 ? (
          <div className="mb-3 flex flex-col gap-1 text-xs font-semibold text-white/42 sm:flex-row sm:items-center sm:justify-between">
            <p>{copy.showingComments(comments.length, social.commentCount)}</p>
            {commentsPageInfo?.hasMore ? (
              <p>
                {copy.remainingComments(
                  Math.max(social.commentCount - comments.length, 0),
                )}
              </p>
            ) : null}
          </div>
        ) : null}
        {commentsStatus === "loading" && comments.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-9 text-sm font-semibold text-white/52">
            <Loader2 className="size-4 animate-spin" />
            {copy.loadingComments}
          </div>
        ) : commentsError && comments.length === 0 ? (
          <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
            {commentsError}
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/12 bg-white/[0.035] px-4 py-8 text-center text-sm font-medium text-white/48">
            {copy.noComments}
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div className="flex gap-3" key={comment.commentId}>
                <CommentAvatar comment={comment} />
                <div className="min-w-0 flex-1 rounded-lg border border-white/8 bg-white/[0.055] px-3.5 py-3">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-sm font-semibold text-white">
                      {comment.authorDisplayName}
                    </p>
                    <p className="text-xs font-medium text-white/38">
                      {formatCommentDate(comment.createdAt, locale)}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-white/68">
                    {comment.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {comments.length > 0 && commentsPageInfo?.hasMore ? (
          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#44f26e]/28 bg-[#44f26e]/10 px-4 text-sm font-semibold text-[#b9ffc8] transition hover:border-[#44f26e]/50 hover:bg-[#44f26e]/16 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={commentsStatus === "loading"}
            onClick={() => {
              void loadComments({
                append: true,
                offset: commentsPageInfo.nextOffset ?? comments.length,
              });
            }}
            type="button"
          >
            {commentsStatus === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageCircle className="size-4" />
            )}
            {copy.loadMoreComments}
          </button>
        ) : null}

        {commentsError && comments.length > 0 ? (
          <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm leading-5 text-rose-100">
            {commentsError}
          </p>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.055] p-2">
        <div className="flex items-end gap-2">
          <textarea
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium leading-5 text-white outline-none placeholder:text-white/32"
            maxLength={500}
            onChange={(event) => {
              setCommentBody(event.target.value);
            }}
            placeholder={commentPlaceholder}
            rows={1}
            value={commentBody}
          />
          <button
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black transition hover:bg-[#64ff84] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!commentBody.trim() || commentsStatus === "submitting"}
            onClick={() => {
              void submitComment();
            }}
            type="button"
          >
            {commentsStatus === "submitting" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="sr-only">
              {commentsStatus === "submitting" ? copy.submitting : copy.post}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
