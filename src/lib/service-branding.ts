import type { Locale } from "@/lib/i18n";
import type { Metadata } from "next";

export const SERVICE_BRAND_NAME = "1066FRIEND+";

export function buildServiceMetadata({
  description,
  path,
  title,
}: {
  description: string;
  path?: string;
  title: string;
}): Metadata {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.net402.ai";
  const url = path ? new URL(path, appUrl).toString() : appUrl;

  return {
    applicationName: SERVICE_BRAND_NAME,
    description,
    title,
    openGraph: {
      description,
      siteName: SERVICE_BRAND_NAME,
      title,
      type: "website",
      url,
    },
    twitter: {
      card: "summary",
      description,
      title,
    },
  };
}

export function getServiceActivateMetaDescription(locale: Locale) {
  switch (locale) {
    case "ko":
      return "1066FRIEND+에서 내 추천 코드, 포인트, 지갑, 하위 회원 네트워크를 확인하고 다음 행동을 시작합니다.";
    case "ja":
      return "1066FRIEND+で紹介コード、ポイント、ウォレット、下位メンバーネットワークを確認し、次の行動を始めます。";
    case "zh":
      return "在 1066FRIEND+ 查看推荐码、积分、钱包和下级会员网络，并开始下一步行动。";
    case "vi":
      return "Xem mã giới thiệu, điểm, ví và mạng tuyến dưới trong 1066FRIEND+, rồi bắt đầu hành động tiếp theo.";
    case "id":
      return "Lihat kode referral, poin, wallet, dan jaringan downline di 1066FRIEND+, lalu mulai langkah berikutnya.";
    default:
      return "View your referral code, points, wallet, and downline network in 1066FRIEND+, then start the next action.";
  }
}

export function getServiceConnectModalTitle(locale: Locale) {
  switch (locale) {
    case "ko":
      return "이메일로 1066FRIEND+ 로그인";
    case "ja":
      return "メールで 1066FRIEND+ にログイン";
    case "zh":
      return "使用邮箱登录 1066FRIEND+";
    case "vi":
      return "Đăng nhập 1066FRIEND+ bằng email";
    case "id":
      return "Masuk ke 1066FRIEND+ dengan email";
    default:
      return "Sign in to 1066FRIEND+ with email";
  }
}

export function getServiceHubLabel(locale: Locale) {
  switch (locale) {
    case "ko":
      return "1066FRIEND+ 홈";
    case "ja":
      return "1066FRIEND+ ホーム";
    case "zh":
      return "1066FRIEND+ 首页";
    case "vi":
      return "Trang chủ 1066FRIEND+";
    case "id":
      return "Beranda 1066FRIEND+";
    default:
      return "1066FRIEND+ Home";
  }
}
