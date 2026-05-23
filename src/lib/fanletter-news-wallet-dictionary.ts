import type { Dictionary, Locale } from "@/lib/i18n";

export function getFanletterNewsWalletDictionary(
  dictionary: Dictionary,
  locale: Locale,
): Dictionary {
  if (locale === "ko") {
    return {
      ...dictionary,
      bnbPage: {
        ...dictionary.bnbPage,
        description:
          "FanLetter News 결제 지갑의 BNB 잔액과 네트워크 수수료 준비 상태를 확인하세요.",
        title: "FanLetter News BNB 관리",
      },
      common: {
        ...dictionary.common,
        connectModalTitle: "FanLetter News 지갑 연결",
        connectWallet: "뉴스 지갑 연결",
      },
      walletPage: {
        ...dictionary.walletPage,
        description:
          "FanLetter News 결제와 원본 브이로그 열람에 쓰는 스마트월렛의 USDT 잔액, 입금 주소, 송금, 최근 내역을 관리합니다.",
        disconnected:
          "뉴스 결제 지갑을 연결하면 FanLetter News 안에서 USDT 입금, 송금, 원본 브이로그 결제 내역을 바로 관리할 수 있습니다.",
        eyebrow: "FanLetter News Wallet",
        title: "FanLetter News 전체 지갑 관리",
      },
    };
  }

  return {
    ...dictionary,
    bnbPage: {
      ...dictionary.bnbPage,
      description:
        "Check BNB balance and network-fee readiness for the FanLetter News payment wallet.",
      title: "FanLetter News BNB",
    },
    common: {
      ...dictionary.common,
      connectModalTitle: "Connect FanLetter News wallet",
      connectWallet: "Connect news wallet",
    },
    walletPage: {
      ...dictionary.walletPage,
      description:
        "Manage the USDT balance, deposit address, transfers, and recent activity of the smart wallet used for FanLetter News payments and source vlog access.",
      disconnected:
        "Connect your news payment wallet to manage USDT deposits, transfers, and source vlog payment history inside FanLetter News.",
      eyebrow: "FanLetter News Wallet",
      title: "FanLetter News full wallet",
    },
  };
}
