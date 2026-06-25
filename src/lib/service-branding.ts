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
      return "1066FRIEND+에서 가입 완료 상태, 내 추천 코드, 하위 회원 네트워크, 포인트, 지갑 상태를 확인하는 서비스 시작 허브입니다.";
    case "ja":
      return "1066FRIEND+で会員有効化、紹介コード、下位メンバーネットワーク、ポイント、ウォレット状態を確認するサービス開始ハブです。";
    case "zh":
      return "1066FRIEND+ 服务启动中心，用于确认会员激活、推荐码、下级会员网络、积分和钱包状态。";
    case "vi":
      return "Trung tâm bắt đầu 1066FRIEND+ để kiểm tra kích hoạt thành viên, mã giới thiệu, mạng tuyến dưới, điểm và ví.";
    case "id":
      return "Hub mulai 1066FRIEND+ untuk memeriksa aktivasi anggota, kode referral, jaringan downline, poin, dan status wallet.";
    default:
      return "The 1066FRIEND+ service start hub for signup status, referral codes, downline network, points, and wallet status.";
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
      return "서비스 시작 허브";
    case "ja":
      return "サービス開始ハブ";
    case "zh":
      return "服务启动中心";
    case "vi":
      return "Trung tâm khởi động dịch vụ";
    case "id":
      return "Hub mulai layanan";
    default:
      return "Service start hub";
  }
}
