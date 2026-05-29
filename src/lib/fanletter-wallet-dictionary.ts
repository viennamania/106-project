import type { Dictionary, Locale } from "@/lib/i18n";

export function getFanletterWalletDictionary(
  dictionary: Dictionary,
  locale: Locale,
): Dictionary {
  if (locale === "ko") {
    return {
      ...dictionary,
      bnbPage: {
        ...dictionary.bnbPage,
        description:
          "FanLetter 스마트월렛의 BNB 잔액과 네트워크 수수료 준비 상태를 확인하세요.",
        disconnected:
          "FanLetter 지갑을 연결하면 BNB 잔액과 수수료 준비 상태를 확인할 수 있습니다.",
        title: "FanLetter BNB 관리",
      },
      common: {
        ...dictionary.common,
        connectModalTitle: "FanLetter 지갑 연결",
        connectWallet: "FanLetter 지갑 연결",
      },
      walletPage: {
        ...dictionary.walletPage,
        description:
          "FanLetter 팬 전용 콘텐츠 결제, 입금 주소, USDT 송금, 최근 입출금 내역을 관리합니다.",
        disconnected:
          "FanLetter 지갑을 연결하면 팬 전용 콘텐츠 결제, 입금, 송금, 최근 내역을 바로 관리할 수 있습니다.",
        eyebrow: "FanLetter Wallet",
        sendNote:
          "FanLetter 회원을 검색하거나 외부 지갑 주소를 입력해 BSC USDT를 전송할 수 있습니다.",
        title: "FanLetter 전체 지갑 관리",
      },
    };
  }

  return {
    ...dictionary,
    bnbPage: {
      ...dictionary.bnbPage,
      description:
        "Check BNB balance and network-fee readiness for the FanLetter smart wallet.",
      disconnected:
        "Connect your FanLetter wallet to check BNB balance and fee readiness.",
      title: "FanLetter BNB",
    },
    common: {
      ...dictionary.common,
      connectModalTitle: "Connect FanLetter wallet",
      connectWallet: "Connect FanLetter wallet",
    },
    walletPage: {
      ...dictionary.walletPage,
      description:
        "Manage FanLetter fan-only content payments, deposit address, USDT transfers, and recent wallet activity.",
      disconnected:
        "Connect your FanLetter wallet to manage fan-only content payments, deposits, transfers, and recent activity.",
      eyebrow: "FanLetter Wallet",
      sendNote:
        "Search FanLetter members or enter an external wallet address to send BSC USDT.",
      title: "FanLetter full wallet",
    },
  };
}
