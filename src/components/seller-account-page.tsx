"use client";

import {
  ArrowRight,
  Check,
  Coins,
  Copy,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n";

type Workspace = { workspaceId: string; workspaceKey: string };

const STORAGE_KEY = "fanletter_seller_lookbook";
const FIELD =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#44f26e]";

function readWorkspace(): Workspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Workspace>;
    return parsed.workspaceId && parsed.workspaceKey
      ? { workspaceId: parsed.workspaceId, workspaceKey: parsed.workspaceKey }
      : null;
  } catch {
    return null;
  }
}

export function SellerAccountPage({ locale }: { locale: Locale }) {
  const en = locale === "en";

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [lookbookCount, setLookbookCount] = useState<number | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [restoreCode, setRestoreCode] = useState("");
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    const existing = readWorkspace();
    setWorkspace(existing);
    setLoaded(true);
    if (!existing) return;

    void (async () => {
      try {
        const res = await fetch(
          `/api/seller/workspace?workspaceId=${encodeURIComponent(
            existing.workspaceId,
          )}&workspaceKey=${encodeURIComponent(existing.workspaceKey)}`,
        );
        const data = (await res.json().catch(() => null)) as
          | { workspace?: { creditBalance?: number; email?: string } }
          | null;
        if (res.ok && data?.workspace) {
          setCreditBalance(data.workspace.creditBalance ?? null);
          if (data.workspace.email) setEmail(data.workspace.email);
        }
      } catch {
        // best-effort
      }
      try {
        const res = await fetch(
          `/api/seller/lookbook/history?workspaceId=${encodeURIComponent(
            existing.workspaceId,
          )}&workspaceKey=${encodeURIComponent(existing.workspaceKey)}`,
        );
        const data = (await res.json().catch(() => null)) as
          | { generations?: unknown[] }
          | null;
        if (res.ok && Array.isArray(data?.generations)) {
          setLookbookCount(data.generations.length);
        }
      } catch {
        // best-effort
      }
    })();
  }, []);

  const saveEmail = useCallback(async () => {
    if (!workspace || !email.trim()) return;
    setEmailBusy(true);
    setEmailSaved(false);
    try {
      const res = await fetch("/api/seller/workspace", {
        body: JSON.stringify({
          email: email.trim(),
          workspaceId: workspace.workspaceId,
          workspaceKey: workspace.workspaceKey,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (res.ok) {
        setEmailSaved(true);
        window.setTimeout(() => setEmailSaved(false), 2000);
      }
    } catch {
      // best-effort
    } finally {
      setEmailBusy(false);
    }
  }, [email, workspace]);

  const recoveryCode = workspace
    ? `${workspace.workspaceId}:${workspace.workspaceKey}`
    : "";

  const copyRecovery = useCallback(async () => {
    if (!recoveryCode) return;
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable
    }
  }, [recoveryCode]);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setWorkspace(null);
    setCreditBalance(null);
    setLookbookCount(null);
    setEmail("");
  }, []);

  const restore = useCallback(async () => {
    setRestoreError(null);
    const code = restoreCode.trim();
    const sep = code.indexOf(":");
    if (sep <= 0) {
      setRestoreError(en ? "Invalid recovery code." : "복구 코드가 올바르지 않습니다.");
      return;
    }
    const workspaceId = code.slice(0, sep).trim();
    const workspaceKey = code.slice(sep + 1).trim();
    if (!workspaceId || !workspaceKey) {
      setRestoreError(en ? "Invalid recovery code." : "복구 코드가 올바르지 않습니다.");
      return;
    }
    setRestoreBusy(true);
    try {
      const res = await fetch(
        `/api/seller/workspace?workspaceId=${encodeURIComponent(
          workspaceId,
        )}&workspaceKey=${encodeURIComponent(workspaceKey)}`,
      );
      if (!res.ok) {
        setRestoreError(
          en ? "Account not found. Check the code." : "계정을 찾을 수 없어요. 코드를 확인해 주세요.",
        );
        return;
      }
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ workspaceId, workspaceKey }),
      );
      window.location.reload();
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : "로그인 실패");
    } finally {
      setRestoreBusy(false);
    }
  }, [en, restoreCode]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6">
        <div className="mb-1.5 flex items-center gap-2 text-[#16702e]">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider">
            Account
          </span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          {en ? "My account" : "마이페이지"}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
          {workspace
            ? en
              ? "Your seller workspace — credits, email, and recovery."
              : "내 셀러 워크스페이스 — 크레딧·이메일·복구 정보."
            : en
              ? "You're browsing as a guest. Start free in the studio or sign in."
              : "지금은 비회원(게스트)입니다. 스튜디오에서 무료로 시작하거나 로그인하세요."}
        </p>
      </header>

      {!loaded ? null : workspace ? (
        <div className="space-y-4">
          {/* Member status */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-700">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e]/15 px-3 py-1 text-xs font-extrabold text-[#16702e]">
                <Check className="h-3.5 w-3.5" />
                {en ? "Member" : "회원"}
              </span>
              <span className="inline-flex items-center gap-1.5 text-neutral-600">
                <Coins className="h-4 w-4 text-[#16702e]" />
                {en ? "Credits" : "크레딧"}{" "}
                {creditBalance === null ? "…" : creditBalance.toLocaleString()}
              </span>
            </div>
            <a
              className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-black"
              href={`/${locale}/lookbook`}
            >
              {en ? "Open studio" : "스튜디오로 가기"}
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Email */}
          <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-neutral-700">
              <Mail className="h-3.5 w-3.5" />
              {en ? "Email (for receipts)" : "이메일 (영수증·식별용)"}
            </span>
            <div className="flex gap-2">
              <input
                className={FIELD}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
              <button
                className="shrink-0 rounded-xl bg-[#16702e] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#0f5722] disabled:opacity-50"
                disabled={emailBusy || !email.trim()}
                onClick={saveEmail}
                type="button"
              >
                {emailSaved
                  ? en
                    ? "Saved"
                    : "저장됨"
                  : en
                    ? "Save"
                    : "저장"}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-black/10 bg-white/80 p-5 text-center shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
              <div className="text-2xl font-black text-neutral-900">
                {creditBalance === null ? "…" : creditBalance.toLocaleString()}
              </div>
              <div className="mt-0.5 text-xs text-neutral-500">
                {en ? "Credits" : "크레딧 잔액"}
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/80 p-5 text-center shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
              <div className="text-2xl font-black text-neutral-900">
                {lookbookCount === null ? "…" : lookbookCount.toLocaleString()}
              </div>
              <div className="mt-0.5 text-xs text-neutral-500">
                {en ? "Lookbooks" : "내 룩북"}
              </div>
            </div>
          </div>

          {/* Recovery */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <KeyRound className="h-3.5 w-3.5" />
              {en ? "Recovery code" : "복구 코드"}
            </span>
            <p className="mb-2.5 text-[11px] leading-relaxed text-amber-700">
              {en
                ? "Save this to sign in on another device. Anyone with it can access your workspace — keep it private."
                : "다른 기기에서 로그인하려면 이 코드를 저장하세요. 코드를 가진 사람은 워크스페이스에 접근할 수 있으니 안전하게 보관하세요."}
            </p>
            <div className="flex gap-2">
              <input
                className={`${FIELD} font-mono text-[11px]`}
                readOnly
                value={recoveryCode}
              />
              <button
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800"
                onClick={copyRecovery}
                type="button"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? (en ? "Copied" : "복사됨") : en ? "Copy" : "복사"}
              </button>
            </div>
          </div>

          <button
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-rose-600"
            onClick={logout}
            type="button"
          >
            <LogOut className="h-3.5 w-3.5" />
            {en ? "Log out of this device" : "이 기기에서 로그아웃"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <a
            className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)] transition hover:border-[#44f26e]"
            href={`/${locale}/lookbook`}
          >
            <div>
              <p className="text-sm font-extrabold text-neutral-900">
                {en ? "Start free" : "무료로 시작하기"}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {en
                  ? "8 free trial credits, no sign-up."
                  : "무료 체험 크레딧 8개, 가입 없이 바로."}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#16702e]" />
          </a>

          <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-neutral-700">
              <LogIn className="h-3.5 w-3.5" />
              {en ? "Sign in with a recovery code" : "복구 코드로 로그인"}
            </span>
            <p className="mb-2.5 text-[11px] leading-relaxed text-neutral-400">
              {en
                ? "Paste the recovery code from your account page."
                : "마이페이지에서 복사한 복구 코드를 붙여넣으세요."}
            </p>
            <textarea
              className={`${FIELD} h-16 resize-none font-mono text-[11px]`}
              onChange={(e) => setRestoreCode(e.target.value)}
              placeholder={en ? "workspace-id:key" : "워크스페이스ID:키"}
              value={restoreCode}
            />
            {restoreError ? (
              <p className="mt-2 text-xs font-semibold text-rose-600">
                {restoreError}
              </p>
            ) : null}
            <button
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-black disabled:opacity-50"
              disabled={restoreBusy || !restoreCode.trim()}
              onClick={restore}
              type="button"
            >
              <LogIn className="h-4 w-4" />
              {restoreBusy ? (en ? "Signing in…" : "로그인 중…") : en ? "Sign in" : "로그인"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
