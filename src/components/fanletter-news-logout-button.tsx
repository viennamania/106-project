"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useActiveWallet, useDisconnect } from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import { clearServerMemberSession } from "@/lib/member-session-client";
import type { Locale } from "@/lib/i18n";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        cancel: "취소",
        confirm: "로그아웃",
        description:
          "현재 AIAVpark News 계정 연결을 해제합니다. 다시 이용하려면 이메일로 다시 연결하면 됩니다.",
        eyebrow: "AIAVpark News",
        pending: "로그아웃 중",
        title: "로그아웃할까요?",
      }
    : {
        cancel: "Cancel",
        confirm: "Log out",
        description:
          "This disconnects the current AIAVpark News account session. You can reconnect with email anytime.",
        eyebrow: "AIAVpark News",
        pending: "Logging out",
        title: "Log out?",
      };
}

export function FanletterNewsLogoutButton({
  className,
  locale,
  postLogoutHref,
  walletAddress,
}: {
  className?: string;
  locale: Locale;
  postLogoutHref: string;
  walletAddress?: string | null;
}) {
  const copy = getCopy(locale);
  const router = useRouter();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { clearMemberSession } = useMemberSession();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoggingOut) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [isLoggingOut, open]);

  async function handleConfirm() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    clearMemberSession(walletAddress);

    await clearServerMemberSession();

    if (wallet) {
      await Promise.resolve(disconnect(wallet)).catch(() => null);
    }

    setOpen(false);
    router.replace(postLogoutHref);
    router.refresh();
  }

  return (
    <>
      <button
        className={
          className ??
          "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/14 px-5 text-sm font-black text-white/72 transition hover:bg-white hover:text-[#111510]"
        }
        disabled={isLoggingOut}
        onClick={() => setOpen(true)}
        type="button"
      >
        <LogOut className="size-4" />
        {isLoggingOut ? copy.pending : copy.confirm}
      </button>

      {open ? (
        <div
          aria-labelledby="fanletter-news-logout-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#07100b]/58 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 text-[#111510] backdrop-blur-sm sm:items-center sm:px-6 sm:py-10"
          role="dialog"
        >
          <button
            aria-label={copy.cancel}
            className="absolute inset-0 cursor-default"
            disabled={isLoggingOut}
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="relative w-full max-w-md rounded-lg border border-black/10 bg-white p-5 shadow-[0_30px_90px_rgba(7,16,11,0.24)] sm:p-6">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
              {copy.eyebrow}
            </p>
            <h2
              className="mt-3 text-2xl font-black tracking-normal"
              id="fanletter-news-logout-title"
            >
              {copy.title}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-black/58 [word-break:keep-all]">
              {copy.description}
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                disabled={isLoggingOut}
                onClick={() => setOpen(false)}
                type="button"
              >
                {copy.cancel}
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-black disabled:cursor-wait disabled:bg-black/62"
                disabled={isLoggingOut}
                onClick={handleConfirm}
                type="button"
              >
                <LogOut className="size-4 text-[#44f26e]" />
                {isLoggingOut ? copy.pending : copy.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
