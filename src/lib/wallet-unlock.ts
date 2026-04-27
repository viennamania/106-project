import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral, setPathSearchParams } from "@/lib/landing-branding";

export const WALLET_UNLOCK_PIN_LENGTH = 6;
export const WALLET_UNLOCK_SESSION_MS = 15 * 60 * 1000;

export function isValidWalletPin(pin: string) {
  return new RegExp(`^\\d{${WALLET_UNLOCK_PIN_LENGTH}}$`, "u").test(pin);
}

export function normalizeWalletUnlockReturnTo(
  value: string | string[] | null | undefined,
  locale: Locale,
) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    !candidate ||
    !candidate.startsWith(`/${locale}/`) ||
    candidate.startsWith("//") ||
    candidate.startsWith(`/${locale}/wallet/unlock`)
  ) {
    return `/${locale}/activate/assets`;
  }

  return candidate;
}

export function buildWalletUnlockHref({
  locale,
  referralCode,
  returnTo,
}: {
  locale: Locale;
  referralCode?: string | null;
  returnTo?: string | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(`/${locale}/wallet/unlock`, referralCode ?? null),
    {
      returnTo: returnTo ?? `/${locale}/activate/assets`,
    },
  );
}

export function getWalletUnlockCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      back: "돌아가기",
      checkFailed: "지갑 잠금 상태를 확인하지 못했습니다.",
      confirmTitle: "PIN 다시 입력",
      confirmSubtitle: "같은 숫자 6자리를 한 번 더 입력하세요",
      connect: "이메일로 지갑 연결",
      delete: "삭제",
      locked:
        "PIN 오류가 여러 번 발생했습니다. 잠시 후 다시 시도하세요.",
      mismatch: "PIN이 일치하지 않습니다. 처음부터 다시 입력하세요.",
      preparing: "지갑 세션 확인 중",
      resetAction: "PIN을 잊으셨나요?",
      resetDescription:
        "이메일 지갑을 다시 인증한 뒤 새 PIN을 설정합니다.",
      resetStarted:
        "이메일 인증을 다시 완료하면 새 PIN을 설정할 수 있습니다.",
      resetTitle: "지갑 PIN 재설정",
      setupTitle: "지갑 PIN 설정",
      setupSubtitle: "처음 사용할 PIN 숫자 6자리를 입력하세요",
      submitFailed: "지갑 잠금 해제에 실패했습니다.",
      unlockAction: "지갑 잠금 해제",
      unlockRequired: "지갑 잠금 해제가 필요합니다.",
      unlockSubtitle: "지갑에 접근하려면 PIN을 입력하세요",
      unlockTitle: "지갑 잠금 해제",
      verifying: "확인 중",
    };
  }

  return {
    back: "Back",
    checkFailed: "Could not check wallet lock state.",
    confirmTitle: "Enter PIN again",
    confirmSubtitle: "Enter the same 6-digit PIN once more",
    connect: "Connect wallet with email",
    delete: "Delete",
    locked: "Too many wrong PIN attempts. Try again shortly.",
    mismatch: "The PINs do not match. Start again.",
    preparing: "Checking wallet session",
    resetAction: "Forgot PIN?",
    resetDescription:
      "Sign in with your email wallet again, then set a new PIN.",
    resetStarted:
      "After email verification, you can set a new wallet PIN.",
    resetTitle: "Reset wallet PIN",
    setupTitle: "Set wallet PIN",
    setupSubtitle: "Enter the 6-digit PIN you want to use",
    submitFailed: "Wallet unlock failed.",
    unlockAction: "Unlock wallet",
    unlockRequired: "Wallet unlock is required.",
    unlockSubtitle: "Enter your PIN to access the wallet",
    unlockTitle: "Unlock wallet",
    verifying: "Verifying",
  };
}
