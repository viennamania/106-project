import type { Locale } from "@/lib/i18n";

export const SERVICE_BRAND_NAME = "1066FRIEND+";

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
