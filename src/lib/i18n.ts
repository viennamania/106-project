export const supportedLocales = ["ko", "en", "ja", "zh"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "ko";
export const localeCookieName = "preferred-locale";

export const localeLabels: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "简体中文",
};

export const thirdwebLocales = {
  ko: "ko_KR",
  en: "en_US",
  ja: "ja_JP",
  zh: "zh_CN",
} as const;

export type Dictionary = {
  meta: {
    title: string;
    description: string;
  };
  common: {
    appName: string;
    headerEyebrow: string;
    headerDescription: string;
    languageLabel: string;
    connectWallet: string;
    disconnectWallet: string;
    connectModalTitle: string;
    logoutDialog: {
      title: string;
      description: string;
      cancel: string;
      confirm: string;
    };
    clientIdRequired: string;
    copyAddress: string;
    copyLink: string;
    copied: string;
    notAvailable: string;
    walletTypeAbstracted: string;
    status: {
      connected: string;
      connecting: string;
      disconnected: string;
      unknown: string;
    };
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    badges: [string, string, string];
  };
  metrics: [
    { label: string; value: string; hint: string },
    { label: string; value: string; hint: string },
    { label: string; value: string; hint: string },
  ];
  env: {
    title: string;
    description: string;
  };
  connected: {
    eyebrow: string;
    labels: {
      chain: string;
      balance: string;
      walletType: string;
      adminSigner: string;
    };
    quickActionsTitle: string;
    actions: {
      explorer: string;
      contract: string;
      dashboard: string;
    };
  };
  onboarding: {
    eyebrow: string;
    cards: [
      { title: string; description: string },
      { title: string; description: string },
      { title: string; description: string },
    ];
  };
  runway: {
    title: string;
    eyebrow: string;
    steps: [
      { title: string; description: string },
      { title: string; description: string },
      { title: string; description: string },
    ];
  };
  sponsored: {
    title: string;
    eyebrow: string;
    description: string;
    cta: string;
    completedCta: string;
    emptyNotice: string;
    connectFirst: string;
    txConfirmed: string;
    txSent: string;
    openExplorer: string;
  };
  surface: {
    title: string;
    eyebrow: string;
    points: [
      { title: string; description: string },
      { title: string; description: string },
      { title: string; description: string },
    ];
  };
  member: {
    title: string;
    eyebrow: string;
    disconnected: string;
    syncing: string;
    pending: string;
    synced: string;
    newMember: string;
    pendingValue: string;
    completedValue: string;
    celebrationTitle: string;
    celebrationDescription: string;
    incomingReferralTitle: string;
    incomingReferralDescription: string;
    incomingReferralLimitTitle: string;
    incomingReferralLimitDescription: string;
    selfReferralNotice: string;
    appliedReferralDescription: string;
    shareHint: string;
    noReferralApplied: string;
    labels: {
      awaitingPaymentSince: string;
      completionAt: string;
      destinationWallet: string;
      emailKey: string;
      lastWallet: string;
      walletCount: string;
      lastConnectedAt: string;
      paymentReceivedAt: string;
      paymentTransaction: string;
      referralCode: string;
      referredByCode: string;
      referralLink: string;
      requiredDeposit: string;
      signupStatus: string;
      updatedAt: string;
    };
    actions: {
      openProjectWallet: string;
      refreshStatus: string;
      viewReferrals: string;
    };
      errors: {
        missingEmail: string;
        insufficientBalance: string;
        projectWalletMissing: string;
        referralLimitReached: string;
        syncFailed: string;
      };
  };
  referralsPage: {
    title: string;
    eyebrow: string;
    description: string;
    shareTitle: string;
    listTitle: string;
    rootLabel: string;
    branchEmpty: string;
    depthHint: string;
    disconnected: string;
    loading: string;
    empty: string;
    memberReady: string;
    memberMissing: string;
    paymentRequired: string;
    labels: {
      currentLevel: string;
      descendants: string;
      directChildren: string;
      directReferrals: string;
      level: string;
      members: string;
      referralCode: string;
      referralLink: string;
      totalReferrals: string;
      totalNetwork: string;
      lastWallet: string;
      locale: string;
      joinedAt: string;
      lastConnectedAt: string;
    };
    actions: {
      backToRoot: string;
      backHome: string;
      completeSignup: string;
      refresh: string;
      viewChildren: string;
    };
    rewards: {
      title: string;
      description: string;
      empty: string;
      recentTitle: string;
      totalPoints: string;
      totalRewards: string;
      activeLevels: string;
      sourceMember: string;
      awardedAt: string;
    };
    errors: {
      missingEmail: string;
      loadFailed: string;
    };
  };
  signInMix: {
    title: string;
    eyebrow: string;
    methods: string[];
  };
  notices: {
    copySuccess: string;
    copyError: string;
  };
};

const dictionaries: Record<Locale, Dictionary> = {
  ko: {
    meta: {
      title: "Pocket Smart Wallet",
      description:
        "이메일 로그인 후 10 USDT 입금 확인으로 가입을 완료하는 모바일 우선 스마트 월렛 앱.",
    },
    common: {
      appName: "Pocket Smart Wallet",
      headerEyebrow: "V0-compatible x thirdweb",
      headerDescription:
        "이메일 로그인 뒤 PROJECT_WALLET로 10 USDT를 전송하면 webhook가 회원가입을 완료합니다.",
      languageLabel: "언어",
      connectWallet: "이메일 로그인",
      disconnectWallet: "로그아웃",
      connectModalTitle: "이메일로 Pocket Smart Wallet 로그인",
      logoutDialog: {
        title: "로그아웃할까요?",
        description:
          "현재 이메일 로그인 세션이 종료됩니다. 필요하면 다시 이메일로 로그인할 수 있습니다.",
        cancel: "취소",
        confirm: "로그아웃",
      },
      clientIdRequired: "client id 필요",
      copyAddress: "주소 복사",
      copyLink: "링크 복사",
      copied: "복사됨",
      notAvailable: "없음",
      walletTypeAbstracted: "추상화된 스마트 월렛",
      status: {
        connected: "연결됨",
        connecting: "연결 중",
        disconnected: "미연결",
        unknown: "불러오는 중",
      },
    },
    hero: {
      eyebrow: "Mobile Smart Wallet",
      title:
        "이메일로 로그인하고, 10 USDT 입금이 확인되면 회원가입이 완료되는 온체인 앱.",
      description:
        "`thirdweb` 이메일 로그인 기반 BSC Smart Wallet 흐름 위에 가입 조건을 올렸습니다. 연결된 지갑에서 PROJECT_WALLET로 정확히 10 USDT를 전송하면 webhook가 결제를 확인하고, 그때 회원가입과 레퍼럴 코드 발급을 완료합니다.",
      badges: ["이메일 로그인", "10 USDT 가입 조건", "웹훅 완료 처리"],
    },
    metrics: [
      { label: "체인", value: "BSC", hint: "BNB Smart Chain" },
      { label: "가입 금액", value: "10 USDT", hint: "exact amount" },
      { label: "완료 방식", value: "Webhook", hint: "payment confirmed" },
    ],
    env: {
      title: "환경변수 설정 필요",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID`가 비어 있어 이메일 로그인 UI를 숨겼습니다. `.env.example`을 복사한 뒤 client id를 넣으면 바로 연결됩니다.",
    },
    connected: {
      eyebrow: "Active Smart Wallet",
      labels: {
        chain: "연결된 체인",
        balance: "USDT 잔액",
        walletType: "지갑 타입",
        adminSigner: "관리자 signer",
      },
      quickActionsTitle: "Quick Actions",
      actions: {
        explorer: "BscScan에서 보기",
        contract: "BSC USDT 컨트랙트",
        dashboard: "thirdweb dashboard",
      },
    },
    onboarding: {
      eyebrow: "Wallet Onboarding",
      cards: [
        {
          title: "이메일 로그인 먼저",
          description:
            "이메일 OTP만 허용해 가입 시작점을 한 가지로 고정했습니다.",
        },
        {
          title: "정확히 10 USDT 전송",
          description:
            "연결된 스마트 월렛에서 PROJECT_WALLET로 정확히 10 USDT를 보내야 가입 조건이 충족됩니다.",
        },
        {
          title: "웹훅이 가입 완료 처리",
          description:
            "thirdweb webhook가 입금을 감지하면 회원가입 완료, 레퍼럴 코드 발급, 추천인 저장이 한 번에 처리됩니다.",
        },
      ],
    },
    runway: {
      title: "Session Runway",
      eyebrow: "3-step mobile flow",
      steps: [
        {
          title: "이메일 로그인",
          description:
            "이메일 입력과 인증 코드 확인으로 스마트 월렛 세션을 시작합니다.",
        },
        {
          title: "10 USDT 전송",
          description:
            "연결된 지갑에서 PROJECT_WALLET로 정확히 10 USDT를 보냅니다.",
        },
        {
          title: "웹훅 확인 후 가입 완료",
          description:
            "웹훅이 입금을 확인하면 회원가입 완료와 레퍼럴 코드 발급이 즉시 반영됩니다.",
        },
      ],
    },
    sponsored: {
      title: "회원가입 결제",
      eyebrow: "10 usdt transfer",
      description:
        "연결된 스마트 월렛에서 {wallet} 로 정확히 {amount} USDT를 보내면 webhook가 회원가입을 완료합니다.",
      cta: "정확히 {amount} USDT 보내기",
      completedCta: "회원가입 완료",
      emptyNotice:
        "전송 결과와 webhook 확인 상태가 여기에 표시됩니다.",
      connectFirst: "먼저 이메일 로그인 하세요.",
      txConfirmed: "전송 트랜잭션이 확인되었습니다. webhook 확인을 기다리는 중입니다.",
      txSent: "전송을 보냈습니다. webhook가 도착하면 회원가입이 완료됩니다.",
      openExplorer: "Explorer 열기",
    },
    surface: {
      title: "Wallet Surface",
      eyebrow: "mobile decisions",
      points: [
        {
          title: "가입 조건을 화면 중심에 배치",
          description:
            "이메일 로그인, 결제 금액, 대상 지갑, 완료 상태를 한 화면에서 바로 확인할 수 있게 배치했습니다.",
        },
        {
          title: "결제 대기와 가입 완료를 분리",
          description:
            "결제 전에는 가입 조건을 강조하고, 완료 후에는 레퍼럴과 완료 정보를 중심으로 보여줍니다.",
        },
        {
          title: "웹훅 기반 자동 완료",
          description:
            "클라이언트 액션만 믿지 않고 webhook 확인을 완료 기준으로 삼아 가입 상태를 안정적으로 맞춥니다.",
        },
      ],
    },
    member: {
      title: "회원 레지스트리",
      eyebrow: "atlas mongodb",
      disconnected:
        "이메일 로그인 후 회원 상태가 여기에 표시됩니다.",
      syncing: "회원가입 상태를 Atlas와 webhook 기준으로 확인하는 중입니다.",
      pending:
        "아직 회원가입이 완료되지 않았습니다. 연결된 지갑에서 PROJECT_WALLET로 정확히 10 USDT를 전송해야 합니다.",
      synced: "10 USDT 입금이 확인되어 회원가입이 완료되었고 레퍼럴 코드가 발급되었습니다.",
      newMember: "회원가입이 완료되었습니다.",
      pendingValue: "결제 대기",
      completedValue: "가입 완료",
      celebrationTitle: "회원가입 완료",
      celebrationDescription:
        "10 USDT 입금이 확인되어 레퍼럴 코드가 활성화되었습니다.",
      incomingReferralTitle: "추천인 코드가 감지되었습니다.",
      incomingReferralDescription:
        "이메일 로그인 뒤 가입을 완료하면 추천인 코드 {code} 가 회원 정보에 저장됩니다.",
      incomingReferralLimitTitle: "이 추천인 코드는 마감되었습니다.",
      incomingReferralLimitDescription:
        "추천인 코드 {code} 는 이미 {count}명의 가입이 완료되어 더 이상 사용할 수 없습니다. 다른 레퍼럴 코드로 다시 접속한 뒤 회원가입을 진행하세요.",
      selfReferralNotice:
        "내 레퍼럴 링크로 접속했습니다. 본인에게는 추천 혜택이 적용되지 않습니다.",
      appliedReferralDescription:
        "가입 완료 시 추천인 코드 {code} 가 회원 정보에 저장되었습니다.",
      shareHint:
        "이 링크를 공유하면 홈페이지에서 `?ref=` 파라미터가 자동으로 적용됩니다.",
      noReferralApplied: "적용 안 됨",
      labels: {
        awaitingPaymentSince: "결제 대기 시작",
        completionAt: "가입 완료 시각",
        destinationWallet: "입금 대상 지갑",
        emailKey: "이메일 키",
        lastWallet: "결제 지갑",
        walletCount: "연결 이력 지갑 수",
        lastConnectedAt: "최근 연결",
        paymentReceivedAt: "입금 확인 시각",
        paymentTransaction: "입금 트랜잭션",
        referralCode: "내 레퍼럴 코드",
        referredByCode: "적용된 추천인 코드",
        referralLink: "레퍼럴 가입 링크",
        requiredDeposit: "가입 금액",
        signupStatus: "가입 상태",
        updatedAt: "최근 갱신",
      },
      actions: {
        openProjectWallet: "프로젝트 지갑 보기",
        refreshStatus: "가입 상태 새로고침",
        viewReferrals: "추천 가입자 보기",
      },
      errors: {
        missingEmail: "현재 연결에서 이메일 주소를 확인하지 못했습니다.",
        insufficientBalance:
          "연결된 지갑에 {amount} USDT 이상이 있어야 회원가입을 진행할 수 있습니다.",
        projectWalletMissing: "PROJECT_WALLET 이 설정되지 않았습니다.",
        referralLimitReached:
          "추천인 코드 {code} 는 이미 {count}명의 가입이 완료되어 마감되었습니다. 다른 레퍼럴 코드로 다시 가입하세요.",
        syncFailed: "회원 동기화에 실패했습니다.",
      },
    },
    referralsPage: {
      title: "레퍼럴 대시보드",
      eyebrow: "referral tracking",
      description:
        "회원가입이 완료된 뒤 내 레퍼럴 코드와 해당 코드로 가입한 회원을 확인합니다.",
      shareTitle: "내 레퍼럴 코드",
      listTitle: "내 코드로 가입한 회원",
      rootLabel: "전체 추천 트리",
      branchEmpty: "이 회원 아래에는 아직 더 가입한 회원이 없습니다.",
      depthHint: "한 화면에서 최대 {depth}단계까지 탐색할 수 있습니다.",
      disconnected:
        "이메일 로그인하고 회원가입을 완료하면 레퍼럴 대시보드를 볼 수 있습니다.",
      loading: "레퍼럴 데이터를 확인하는 중입니다.",
      empty: "아직 내 레퍼럴 코드로 가입한 회원이 없습니다.",
      memberReady: "이 이메일 회원의 레퍼럴 코드가 활성화되어 있습니다.",
      memberMissing: "회원 상태를 다시 동기화한 뒤 시도하세요.",
      paymentRequired:
        "아직 회원가입이 완료되지 않았습니다. 홈으로 돌아가 10 USDT 결제를 완료하세요.",
      labels: {
        currentLevel: "현재 단계",
        descendants: "전체 하위 추천 수",
        directChildren: "직접 하위 추천 수",
        directReferrals: "직접 추천 가입 수",
        level: "단계",
        members: "명",
        referralCode: "레퍼럴 코드",
        referralLink: "공유 링크",
        totalReferrals: "추천 가입 수",
        totalNetwork: "전체 네트워크 가입 수",
        lastWallet: "최근 지갑",
        locale: "회원 언어",
        joinedAt: "가입 시각",
        lastConnectedAt: "최근 연결",
      },
      actions: {
        backToRoot: "처음으로",
        backHome: "홈으로 돌아가기",
        completeSignup: "홈에서 가입 완료하기",
        refresh: "새로고침",
        viewChildren: "하위 보기",
      },
      rewards: {
        title: "보상 포인트",
        description:
          "하위 회원이 가입을 완료하면 상위 6단계까지 각 1포인트씩 적립됩니다.",
        empty: "아직 적립된 보상 내역이 없습니다.",
        recentTitle: "최근 지급 내역",
        totalPoints: "누적 포인트",
        totalRewards: "지급 건수",
        activeLevels: "적립 단계",
        sourceMember: "가입 회원",
        awardedAt: "지급 시각",
      },
      errors: {
        missingEmail: "현재 연결에서 이메일 주소를 확인하지 못했습니다.",
        loadFailed: "레퍼럴 데이터를 불러오지 못했습니다.",
      },
    },
    signInMix: {
      title: "가입 경로",
      eyebrow: "signup checklist",
      methods: ["이메일 로그인", "10 USDT 전송", "웹훅 확인 후 완료"],
    },
    notices: {
      copySuccess: "스마트 월렛 주소를 클립보드에 복사했습니다.",
      copyError: "주소 복사에 실패했습니다. 브라우저 권한을 확인하세요.",
    },
  },
  en: {
    meta: {
      title: "Pocket Smart Wallet",
      description:
        "A mobile-first smart wallet app that completes signup after a confirmed 10 USDT payment.",
    },
    common: {
      appName: "Pocket Smart Wallet",
      headerEyebrow: "V0-compatible x thirdweb",
      headerDescription:
        "Sign in with email, send 10 USDT to PROJECT_WALLET, and let the webhook finish signup.",
      languageLabel: "Language",
      connectWallet: "Email login",
      disconnectWallet: "Log out",
      connectModalTitle: "Sign in to Pocket Smart Wallet with email",
      logoutDialog: {
        title: "Log out?",
        description:
          "This will end the current email login session. You can sign in again with email anytime.",
        cancel: "Cancel",
        confirm: "Log out",
      },
      clientIdRequired: "client id required",
      copyAddress: "Copy address",
      copyLink: "Copy link",
      copied: "Copied",
      notAvailable: "N/A",
      walletTypeAbstracted: "Abstracted smart wallet",
      status: {
        connected: "Connected",
        connecting: "Connecting",
        disconnected: "Disconnected",
        unknown: "Loading",
      },
    },
    hero: {
      eyebrow: "Mobile Smart Wallet",
      title:
        "An onchain app where signup completes only after the connected wallet sends and confirms 10 USDT.",
      description:
        "This combines an email login flow with a payment-gated BSC Smart Wallet signup path. Once the connected wallet sends exactly 10 USDT to PROJECT_WALLET, the webhook confirms the transfer, completes signup, and unlocks the referral code.",
      badges: ["Email login", "Exact 10 USDT signup", "Webhook completion"],
    },
    metrics: [
      { label: "Chain", value: "BSC", hint: "BNB Smart Chain" },
      { label: "Signup amount", value: "10 USDT", hint: "exact amount" },
      { label: "Completion mode", value: "Webhook", hint: "payment confirmed" },
    ],
    env: {
      title: "Environment setup required",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID` is empty, so the email login UI is hidden. Copy `.env.example`, add your client id, and reload the app.",
    },
    connected: {
      eyebrow: "Active Smart Wallet",
      labels: {
        chain: "Connected chain",
        balance: "USDT balance",
        walletType: "Wallet type",
        adminSigner: "Admin signer",
      },
      quickActionsTitle: "Quick Actions",
      actions: {
        explorer: "Open in BscScan",
        contract: "BSC USDT contract",
        dashboard: "thirdweb dashboard",
      },
    },
    onboarding: {
      eyebrow: "Wallet Onboarding",
      cards: [
        {
          title: "Start with email login",
          description:
            "Keep one email OTP entry point so the signup path starts with a single wallet connection flow.",
        },
        {
          title: "Send exactly 10 USDT",
          description:
            "The connected smart wallet must send exactly 10 USDT to PROJECT_WALLET to qualify for signup.",
        },
        {
          title: "Let the webhook complete signup",
          description:
            "The webhook validates the transfer, completes signup, stores the inviter code, and creates the referral code only at completion time.",
        },
      ],
    },
    runway: {
      title: "Session Runway",
      eyebrow: "3-step mobile flow",
      steps: [
        {
          title: "Email login",
          description:
            "Start the smart wallet session with email entry and a one-time verification code.",
        },
        {
          title: "Send 10 USDT",
          description:
            "Transfer exactly 10 USDT from the connected wallet to PROJECT_WALLET.",
        },
        {
          title: "Wait for webhook confirmation",
          description:
            "Once the webhook confirms the payment, signup completes and the referral code becomes active.",
        },
      ],
    },
    sponsored: {
      title: "Signup Payment",
      eyebrow: "10 usdt transfer",
      description:
        "Send exactly {amount} USDT from the connected smart wallet to {wallet}. The webhook will complete signup after the transfer is confirmed.",
      cta: "Send exactly {amount} USDT",
      completedCta: "Signup complete",
      emptyNotice:
        "Transfer results and webhook confirmation status will appear here.",
      connectFirst: "Complete email login first.",
      txConfirmed: "The transfer was confirmed. Waiting for the webhook to complete signup.",
      txSent: "The transfer was sent. Signup will finish after the webhook arrives.",
      openExplorer: "Open explorer",
    },
    surface: {
      title: "Wallet Surface",
      eyebrow: "mobile decisions",
      points: [
        {
          title: "Put the signup requirement at the center",
          description:
            "The connected wallet, transfer amount, destination wallet, and signup state stay visible on the same screen.",
        },
        {
          title: "Separate pending and completed states",
          description:
            "Before payment, the UI stresses the 10 USDT requirement. After payment confirmation, it shifts to referral and completion details.",
        },
        {
          title: "Use webhook confirmation as the source of truth",
          description:
            "Signup completion depends on a verified transfer event instead of only client-side transaction success.",
        },
      ],
    },
    member: {
      title: "Member Registry",
      eyebrow: "atlas mongodb",
      disconnected:
        "After email login, your member status appears here.",
      syncing: "Checking signup status against Atlas and the webhook records.",
      pending:
        "Signup is still pending. The connected wallet must send exactly 10 USDT to PROJECT_WALLET.",
      synced: "The 10 USDT payment was confirmed, signup is complete, and the referral code is now active.",
      newMember: "Signup completed successfully.",
      pendingValue: "Payment pending",
      completedValue: "Signup complete",
      celebrationTitle: "Signup Complete",
      celebrationDescription:
        "The 10 USDT transfer was confirmed and your referral code is now active.",
      incomingReferralTitle: "A referral code was detected.",
      incomingReferralDescription:
        "If signup completes on this page, referral code {code} will be stored on the member record.",
      incomingReferralLimitTitle: "This referral code has reached its limit.",
      incomingReferralLimitDescription:
        "Referral code {code} already has {count} completed signups and can no longer be used. Open the homepage with a different referral code before signing up.",
      selfReferralNotice:
        "You opened your own referral link. Referral credit does not apply to your own signup.",
      appliedReferralDescription:
        "Referral code {code} was stored when signup completed.",
      shareHint:
        "Share this link to open the homepage with the `?ref=` parameter already applied.",
      noReferralApplied: "Not applied",
      labels: {
        awaitingPaymentSince: "Awaiting payment since",
        completionAt: "Signup completed at",
        destinationWallet: "Destination wallet",
        emailKey: "Email key",
        lastWallet: "Paying wallet",
        walletCount: "Connected wallets",
        lastConnectedAt: "Last connected",
        paymentReceivedAt: "Payment confirmed at",
        paymentTransaction: "Payment transaction",
        referralCode: "My referral code",
        referredByCode: "Applied referral code",
        referralLink: "Referral signup link",
        requiredDeposit: "Signup amount",
        signupStatus: "Signup status",
        updatedAt: "Updated at",
      },
      actions: {
        openProjectWallet: "Open project wallet",
        refreshStatus: "Refresh signup status",
        viewReferrals: "View referred members",
      },
      errors: {
        missingEmail: "Could not resolve the authenticated email address from the current wallet session.",
        insufficientBalance:
          "The connected wallet must hold at least {amount} USDT to continue signup.",
        projectWalletMissing: "PROJECT_WALLET is not configured.",
        referralLimitReached:
          "Referral code {code} already has {count} completed signups and is no longer available. Sign up again with a different referral code.",
        syncFailed: "Member sync failed.",
      },
    },
    referralsPage: {
      title: "Referral Dashboard",
      eyebrow: "referral tracking",
      description:
        "Review your referral code and the members who signed up with it after signup is complete.",
      shareTitle: "My referral code",
      listTitle: "Members signed up with my code",
      rootLabel: "Full referral tree",
      branchEmpty: "This member does not have deeper referrals yet.",
      depthHint: "Explore up to {depth} levels from a single screen.",
      disconnected:
        "Use email login and complete signup to review your referral dashboard.",
      loading: "Loading referral data.",
      empty: "No members have signed up with your referral code yet.",
      memberReady: "Your referral code is active for this email member.",
      memberMissing: "Sync the member record first, then try again.",
      paymentRequired:
        "Signup is not complete yet. Go back home and finish the 10 USDT payment first.",
      labels: {
        currentLevel: "Current level",
        descendants: "Total descendants",
        directChildren: "Direct children",
        directReferrals: "Direct referrals",
        level: "Level",
        members: "members",
        referralCode: "Referral code",
        referralLink: "Share link",
        totalReferrals: "Referred signups",
        totalNetwork: "Total network",
        lastWallet: "Last wallet",
        locale: "Member locale",
        joinedAt: "Joined at",
        lastConnectedAt: "Last connected",
      },
      actions: {
        backToRoot: "Back to root",
        backHome: "Back home",
        completeSignup: "Complete signup on home",
        refresh: "Refresh",
        viewChildren: "View children",
      },
      rewards: {
        title: "Reward points",
        description:
          "Each completed downline signup awards 1 point to every eligible upline member across 6 levels.",
        empty: "No reward entries have been issued yet.",
        recentTitle: "Recent rewards",
        totalPoints: "Total points",
        totalRewards: "Reward entries",
        activeLevels: "Active levels",
        sourceMember: "Signup member",
        awardedAt: "Awarded at",
      },
      errors: {
        missingEmail: "Could not resolve the authenticated email address from the current wallet session.",
        loadFailed: "Failed to load referral data.",
      },
    },
    signInMix: {
      title: "Signup Path",
      eyebrow: "signup checklist",
      methods: ["Email login", "Send 10 USDT", "Wait for webhook confirmation"],
    },
    notices: {
      copySuccess: "The smart wallet address was copied to your clipboard.",
      copyError: "Address copy failed. Check your browser permissions.",
    },
  },
  ja: {
    meta: {
      title: "Pocket Smart Wallet",
      description:
        "メールログイン後、10 USDT の入金確認で登録完了するモバイルファーストのスマートウォレットアプリ。",
    },
    common: {
      appName: "Pocket Smart Wallet",
      headerEyebrow: "V0-compatible x thirdweb",
      headerDescription:
        "メールログイン後、PROJECT_WALLET に 10 USDT を送ると webhook が登録完了を処理します。",
      languageLabel: "言語",
      connectWallet: "メールログイン",
      disconnectWallet: "ログアウト",
      connectModalTitle: "メールで Pocket Smart Wallet にログイン",
      logoutDialog: {
        title: "ログアウトしますか？",
        description:
          "現在のメールログインセッションを終了します。必要ならいつでもメールで再ログインできます。",
        cancel: "キャンセル",
        confirm: "ログアウト",
      },
      clientIdRequired: "client id が必要です",
      copyAddress: "アドレスをコピー",
      copyLink: "リンクをコピー",
      copied: "コピー済み",
      notAvailable: "なし",
      walletTypeAbstracted: "抽象化済みスマートウォレット",
      status: {
        connected: "接続済み",
        connecting: "接続中",
        disconnected: "未接続",
        unknown: "読み込み中",
      },
    },
    hero: {
      eyebrow: "Mobile Smart Wallet",
      title:
        "メールでログインし、10 USDT 入金が確認された時点で登録が完了するオンチェーンアプリ。",
      description:
        "`thirdweb` のメールログインと BSC Smart Wallet フローに、決済確認型の登録導線を組み合わせました。接続済みウォレットから PROJECT_WALLET へ正確に 10 USDT を送ると、webhook が入金を確認して会員登録とレファラルコード発行を完了します。",
      badges: ["メールログイン", "正確に 10 USDT", "webhook で登録完了"],
    },
    metrics: [
      { label: "チェーン", value: "BSC", hint: "BNB Smart Chain" },
      { label: "登録金額", value: "10 USDT", hint: "exact amount" },
      { label: "完了方式", value: "Webhook", hint: "payment confirmed" },
    ],
    env: {
      title: "環境変数の設定が必要です",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID` が空のためメールログイン UI を隠しています。`.env.example` をコピーして client id を入れるとすぐ使えます。",
    },
    connected: {
      eyebrow: "Active Smart Wallet",
      labels: {
        chain: "接続チェーン",
        balance: "USDT 残高",
        walletType: "ウォレット種別",
        adminSigner: "管理 signer",
      },
      quickActionsTitle: "Quick Actions",
      actions: {
        explorer: "BscScan で開く",
        contract: "BSC USDT コントラクト",
        dashboard: "thirdweb dashboard",
      },
    },
    onboarding: {
      eyebrow: "Wallet Onboarding",
      cards: [
        {
          title: "まずメールログイン",
          description:
            "開始フローをメール OTP のみに絞り、登録の入口を一つに固定しました。",
        },
        {
          title: "正確に 10 USDT を送金",
          description:
            "接続済みスマートウォレットから PROJECT_WALLET へ正確に 10 USDT を送る必要があります。",
        },
        {
          title: "webhook が登録完了を処理",
          description:
            "入金確認後に会員登録、紹介コード保存、レファラルコード発行をまとめて反映します。",
        },
      ],
    },
    runway: {
      title: "Session Runway",
      eyebrow: "3-step mobile flow",
      steps: [
        {
          title: "メールログイン",
          description:
            "メール入力と認証コード確認でスマートウォレットのセッションを開始します。",
        },
        {
          title: "10 USDT を送金",
          description:
            "接続済みウォレットから PROJECT_WALLET へ正確に 10 USDT を送ります。",
        },
        {
          title: "webhook 確認後に登録完了",
          description:
            "webhook が入金を確認すると、登録完了とレファラルコード有効化がすぐに反映されます。",
        },
      ],
    },
    sponsored: {
      title: "登録用決済",
      eyebrow: "10 usdt transfer",
      description:
        "接続済みスマートウォレットから {wallet} へ正確に {amount} USDT を送ると、webhook が登録完了を処理します。",
      cta: "正確に {amount} USDT を送る",
      completedCta: "登録完了",
      emptyNotice:
        "送金結果と webhook 確認状態がここに表示されます。",
      connectFirst: "先にメールログインしてください。",
      txConfirmed: "送金トランザクションが確認されました。webhook 確認を待っています。",
      txSent: "送金を送信しました。webhook が到着すると登録が完了します。",
      openExplorer: "Explorer を開く",
    },
    surface: {
      title: "Wallet Surface",
      eyebrow: "mobile decisions",
      points: [
        {
          title: "登録条件を画面中央に集約",
          description:
            "接続ウォレット、送金金額、送金先、登録状態を同じ画面で把握できるようにしています。",
        },
        {
          title: "支払い待ちと完了後を分離",
          description:
            "支払い前は 10 USDT 条件を強調し、完了後はレファラル情報と完了履歴を中心に表示します。",
        },
        {
          title: "webhook 確認を正とする",
          description:
            "クライアント側の送信成功だけでなく、検証済み transfer イベントで登録完了を確定します。",
        },
      ],
    },
    member: {
      title: "メンバーレジストリ",
      eyebrow: "atlas mongodb",
      disconnected:
        "メールログイン後、会員ステータスがここに表示されます。",
      syncing: "Atlas と webhook 記録を基準に登録状態を確認しています。",
      pending:
        "まだ登録は完了していません。接続済みウォレットから PROJECT_WALLET へ正確に 10 USDT を送る必要があります。",
      synced: "10 USDT の入金が確認され、登録完了とレファラルコード発行が完了しました。",
      newMember: "会員登録が完了しました。",
      pendingValue: "支払い待ち",
      completedValue: "登録完了",
      celebrationTitle: "登録完了",
      celebrationDescription:
        "10 USDT の入金が確認され、レファラルコードが有効になりました。",
      incomingReferralTitle: "紹介コードを検出しました。",
      incomingReferralDescription:
        "メールログイン後に登録が完了すると、紹介コード {code} が会員情報に保存されます。",
      incomingReferralLimitTitle: "この紹介コードは受付終了です。",
      incomingReferralLimitDescription:
        "紹介コード {code} はすでに {count} 人の登録完了に使われており、これ以上は利用できません。別のレファラルコードでホームを開き直してから登録してください。",
      selfReferralNotice:
        "自分のレファラルリンクを開いています。自分自身には紹介特典は適用されません。",
      appliedReferralDescription:
        "登録完了時に紹介コード {code} が保存されました。",
      shareHint:
        "このリンクを共有すると、ホームページで `?ref=` パラメータ付きの状態で開けます。",
      noReferralApplied: "未適用",
      labels: {
        awaitingPaymentSince: "支払い待ち開始",
        completionAt: "登録完了時刻",
        destinationWallet: "送金先ウォレット",
        emailKey: "メールキー",
        lastWallet: "支払いウォレット",
        walletCount: "接続履歴ウォレット数",
        lastConnectedAt: "最終接続",
        paymentReceivedAt: "入金確認時刻",
        paymentTransaction: "入金トランザクション",
        referralCode: "自分のレファラルコード",
        referredByCode: "適用された紹介コード",
        referralLink: "レファラル登録リンク",
        requiredDeposit: "登録金額",
        signupStatus: "登録状態",
        updatedAt: "最終更新",
      },
      actions: {
        openProjectWallet: "プロジェクトウォレットを見る",
        refreshStatus: "登録状態を再確認",
        viewReferrals: "紹介登録メンバーを見る",
      },
      errors: {
        missingEmail: "現在のウォレット接続からメールアドレスを取得できませんでした。",
        insufficientBalance:
          "登録を進めるには、接続中のウォレットに {amount} USDT 以上が必要です。",
        projectWalletMissing: "PROJECT_WALLET が設定されていません。",
        referralLimitReached:
          "紹介コード {code} はすでに {count} 人の登録完了に使われており受付終了です。別のレファラルコードで登録してください。",
        syncFailed: "会員同期に失敗しました。",
      },
    },
    referralsPage: {
      title: "レファラルダッシュボード",
      eyebrow: "referral tracking",
      description:
        "登録完了後に、自分のレファラルコードとそのコードで登録した会員一覧を確認します。",
      shareTitle: "自分のレファラルコード",
      listTitle: "自分のコードで登録した会員",
      rootLabel: "紹介ツリー全体",
      branchEmpty: "この会員の下位には、まだ追加の登録メンバーがいません。",
      depthHint: "1つの画面で最大 {depth} 段階までたどれます。",
      disconnected:
        "メールログインし、登録を完了するとレファラルダッシュボードを確認できます。",
      loading: "レファラルデータを読み込んでいます。",
      empty: "まだ自分のレファラルコードで登録した会員はいません。",
      memberReady: "このメール会員のレファラルコードは有効です。",
      memberMissing: "先に会員情報を同期してから再試行してください。",
      paymentRequired:
        "まだ登録が完了していません。ホームに戻って 10 USDT の支払いを完了してください。",
      labels: {
        currentLevel: "現在の段階",
        descendants: "下位ネットワーク総数",
        directChildren: "直接の下位メンバー数",
        directReferrals: "直接紹介登録数",
        level: "段階",
        members: "人",
        referralCode: "レファラルコード",
        referralLink: "共有リンク",
        totalReferrals: "紹介登録数",
        totalNetwork: "ネットワーク全体",
        lastWallet: "最新ウォレット",
        locale: "会員言語",
        joinedAt: "登録日時",
        lastConnectedAt: "最終接続",
      },
      actions: {
        backToRoot: "最初に戻る",
        backHome: "ホームへ戻る",
        completeSignup: "ホームで登録を完了する",
        refresh: "再読み込み",
        viewChildren: "下位を見る",
      },
      rewards: {
        title: "報酬ポイント",
        description:
          "下位メンバーの登録完了ごとに、上位 6 段階まで各 1 ポイントずつ積み上がります。",
        empty: "まだ付与された報酬履歴はありません。",
        recentTitle: "最近の付与履歴",
        totalPoints: "累計ポイント",
        totalRewards: "付与件数",
        activeLevels: "付与段階",
        sourceMember: "登録メンバー",
        awardedAt: "付与時刻",
      },
      errors: {
        missingEmail: "現在のウォレット接続からメールアドレスを取得できませんでした。",
        loadFailed: "レファラルデータの読み込みに失敗しました。",
      },
    },
    signInMix: {
      title: "登録フロー",
      eyebrow: "signup checklist",
      methods: ["メールログイン", "10 USDT を送る", "webhook 確認で完了"],
    },
    notices: {
      copySuccess: "スマートウォレットのアドレスをクリップボードにコピーしました。",
      copyError: "アドレスのコピーに失敗しました。ブラウザ権限を確認してください。",
    },
  },
  zh: {
    meta: {
      title: "Pocket Smart Wallet",
      description:
        "一个在邮箱登录后，通过确认 10 USDT 入账来完成注册的移动优先智能钱包应用。",
    },
    common: {
      appName: "Pocket Smart Wallet",
      headerEyebrow: "V0-compatible x thirdweb",
      headerDescription:
        "邮箱登录后，向 PROJECT_WALLET 转入 10 USDT，webhook 会完成注册。",
      languageLabel: "语言",
      connectWallet: "邮箱登录",
      disconnectWallet: "退出登录",
      connectModalTitle: "通过邮箱登录 Pocket Smart Wallet",
      logoutDialog: {
        title: "要退出登录吗？",
        description:
          "这会结束当前的邮箱登录会话。之后仍可随时通过邮箱重新登录。",
        cancel: "取消",
        confirm: "退出登录",
      },
      clientIdRequired: "需要 client id",
      copyAddress: "复制地址",
      copyLink: "复制链接",
      copied: "已复制",
      notAvailable: "无",
      walletTypeAbstracted: "抽象化智能钱包",
      status: {
        connected: "已连接",
        connecting: "连接中",
        disconnected: "未连接",
        unknown: "加载中",
      },
    },
    hero: {
      eyebrow: "Mobile Smart Wallet",
      title:
        "邮箱登录后，只有在 10 USDT 入账被确认时才完成注册的链上应用。",
      description:
        "这个版本把邮箱登录流程和基于支付确认的 BSC Smart Wallet 注册路径结合在一起。已连接的钱包必须向 PROJECT_WALLET 精确转入 10 USDT，webhook 确认到账后才会完成会员注册并生成推荐码。",
      badges: ["邮箱登录", "精确 10 USDT 注册", "Webhook 完成注册"],
    },
    metrics: [
      { label: "链", value: "BSC", hint: "BNB Smart Chain" },
      { label: "注册金额", value: "10 USDT", hint: "exact amount" },
      { label: "完成方式", value: "Webhook", hint: "payment confirmed" },
    ],
    env: {
      title: "需要环境变量配置",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID` 为空，所以当前隐藏了邮箱登录 UI。复制 `.env.example` 后填入 client id 即可使用。",
    },
    connected: {
      eyebrow: "Active Smart Wallet",
      labels: {
        chain: "当前链",
        balance: "USDT 余额",
        walletType: "钱包类型",
        adminSigner: "管理员 signer",
      },
      quickActionsTitle: "Quick Actions",
      actions: {
        explorer: "在 BscScan 打开",
        contract: "BSC USDT 合约",
        dashboard: "thirdweb dashboard",
      },
    },
    onboarding: {
      eyebrow: "Wallet Onboarding",
      cards: [
        {
          title: "先完成邮箱登录",
          description:
            "只保留邮箱 OTP 入口，让注册开始路径固定为一种连接方式。",
        },
        {
          title: "精确转入 10 USDT",
          description:
            "已连接的钱包必须向 PROJECT_WALLET 精确转入 10 USDT，才满足注册条件。",
        },
        {
          title: "等待 webhook 完成注册",
          description:
            "到账被确认后，会一次性完成会员注册、推荐人记录和推荐码生成。",
        },
      ],
    },
    runway: {
      title: "Session Runway",
      eyebrow: "3-step mobile flow",
      steps: [
        {
          title: "邮箱登录",
          description:
            "通过邮箱输入和一次性验证码开始智能钱包会话。",
        },
        {
          title: "转入 10 USDT",
          description:
            "从已连接钱包向 PROJECT_WALLET 精确转入 10 USDT。",
        },
        {
          title: "等待 webhook 确认",
          description:
            "webhook 确认到账后，立即完成注册并激活推荐码。",
        },
      ],
    },
    sponsored: {
      title: "注册支付",
      eyebrow: "10 usdt transfer",
      description:
        "从已连接智能钱包向 {wallet} 精确转入 {amount} USDT，webhook 会在交易确认后完成注册。",
      cta: "精确转入 {amount} USDT",
      completedCta: "注册已完成",
      emptyNotice:
        "转账结果和 webhook 确认状态会显示在这里。",
      connectFirst: "请先完成邮箱登录。",
      txConfirmed: "转账交易已确认，正在等待 webhook 完成注册。",
      txSent: "转账已发送，webhook 到达后会完成注册。",
      openExplorer: "打开 Explorer",
    },
    surface: {
      title: "Wallet Surface",
      eyebrow: "mobile decisions",
      points: [
        {
          title: "把注册条件放在界面中心",
          description:
            "连接钱包、转账金额、目标地址和注册状态都集中在同一屏中展示。",
        },
        {
          title: "区分待支付与已完成状态",
          description:
            "支付前突出 10 USDT 条件，支付确认后转为展示推荐信息和完成记录。",
        },
        {
          title: "以 webhook 确认为准",
          description:
            "不会只依赖前端交易成功，而是以已验证的 transfer 事件作为注册完成依据。",
        },
      ],
    },
    member: {
      title: "会员注册表",
      eyebrow: "atlas mongodb",
      disconnected:
        "邮箱登录后，会员状态会显示在这里。",
      syncing: "正在根据 Atlas 和 webhook 记录检查注册状态。",
      pending:
        "注册尚未完成。必须从当前连接的钱包向 PROJECT_WALLET 精确转入 10 USDT。",
      synced: "10 USDT 入账已确认，会员注册已完成，推荐码也已激活。",
      newMember: "会员注册已完成。",
      pendingValue: "待支付",
      completedValue: "已完成注册",
      celebrationTitle: "注册完成",
      celebrationDescription:
        "10 USDT 入账已确认，你的推荐码现在已经激活。",
      incomingReferralTitle: "检测到推荐码。",
      incomingReferralDescription:
        "邮箱登录后，如果在此页面完成注册，推荐码 {code} 会写入会员信息。",
      incomingReferralLimitTitle: "这个推荐码已满额。",
      incomingReferralLimitDescription:
        "推荐码 {code} 已经有 {count} 位会员完成注册，不能再继续使用。请换一个推荐码重新打开首页后再注册。",
      selfReferralNotice:
        "你打开的是自己的推荐链接。自己的注册不会获得推荐奖励。",
      appliedReferralDescription:
        "注册完成时已记录推荐码 {code}。",
      shareHint:
        "分享此链接后，首页会自动带上 `?ref=` 参数。",
      noReferralApplied: "未应用",
      labels: {
        awaitingPaymentSince: "开始等待支付时间",
        completionAt: "注册完成时间",
        destinationWallet: "收款钱包",
        emailKey: "邮箱键",
        lastWallet: "支付钱包",
        walletCount: "已连接钱包数",
        lastConnectedAt: "最近连接",
        paymentReceivedAt: "到账确认时间",
        paymentTransaction: "入账交易",
        referralCode: "我的推荐码",
        referredByCode: "已应用推荐码",
        referralLink: "推荐注册链接",
        requiredDeposit: "注册金额",
        signupStatus: "注册状态",
        updatedAt: "最近更新",
      },
      actions: {
        openProjectWallet: "查看项目钱包",
        refreshStatus: "刷新注册状态",
        viewReferrals: "查看推荐注册会员",
      },
      errors: {
        missingEmail: "当前钱包会话中未能解析出邮箱地址。",
        insufficientBalance:
          "要继续注册，当前连接的钱包中至少需要有 {amount} USDT。",
        projectWalletMissing: "PROJECT_WALLET 未配置。",
        referralLimitReached:
          "推荐码 {code} 已经有 {count} 位会员完成注册，现已满额。请改用其他推荐码重新注册。",
        syncFailed: "会员同步失败。",
      },
    },
    referralsPage: {
      title: "推荐仪表板",
      eyebrow: "referral tracking",
      description:
        "在注册完成后，查看我的推荐码以及使用该推荐码完成注册的会员列表。",
      shareTitle: "我的推荐码",
      listTitle: "使用我的码注册的会员",
      rootLabel: "完整推荐树",
      branchEmpty: "这位会员下面还没有更深层的推荐注册。",
      depthHint: "可在单个界面中最多查看 {depth} 层。",
      disconnected:
        "邮箱登录并完成注册后，即可查看推荐仪表板。",
      loading: "正在加载推荐数据。",
      empty: "目前还没有会员通过你的推荐码注册。",
      memberReady: "该邮箱会员的推荐码已激活。",
      memberMissing: "请先同步会员信息后再试。",
      paymentRequired:
        "注册尚未完成。请先回到首页完成 10 USDT 支付。",
      labels: {
        currentLevel: "当前层级",
        descendants: "全部下级人数",
        directChildren: "直属下级人数",
        directReferrals: "直属推荐注册数",
        level: "层级",
        members: "人",
        referralCode: "推荐码",
        referralLink: "分享链接",
        totalReferrals: "推荐注册数",
        totalNetwork: "整个网络人数",
        lastWallet: "最近钱包",
        locale: "会员语言",
        joinedAt: "注册时间",
        lastConnectedAt: "最近连接",
      },
      actions: {
        backToRoot: "返回根节点",
        backHome: "返回首页",
        completeSignup: "回首页完成注册",
        refresh: "刷新",
        viewChildren: "查看下级",
      },
      rewards: {
        title: "奖励积分",
        description:
          "下级会员完成注册后，上方 6 个层级内的每位有效推荐人都会各获得 1 积分。",
        empty: "目前还没有已发放的奖励记录。",
        recentTitle: "最近发放记录",
        totalPoints: "累计积分",
        totalRewards: "发放次数",
        activeLevels: "发放层级",
        sourceMember: "注册会员",
        awardedAt: "发放时间",
      },
      errors: {
        missingEmail: "当前钱包会话中未能解析出邮箱地址。",
        loadFailed: "加载推荐数据失败。",
      },
    },
    signInMix: {
      title: "注册路径",
      eyebrow: "signup checklist",
      methods: ["邮箱登录", "转入 10 USDT", "等待 webhook 确认"],
    },
    notices: {
      copySuccess: "智能钱包地址已复制到剪贴板。",
      copyError: "复制地址失败，请检查浏览器权限。",
    },
  },
};

export function hasLocale(locale: string): locale is Locale {
  return supportedLocales.includes(locale as Locale);
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export function matchPreferredLocale(input?: string | null): Locale {
  if (!input) {
    return defaultLocale;
  }

  const candidates = input
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  for (const candidate of candidates) {
    const matched = supportedLocales.find((locale) => {
      const normalized = locale.toLowerCase();
      return candidate === normalized || candidate.startsWith(`${normalized}-`);
    });

    if (matched) {
      return matched;
    }
  }

  return defaultLocale;
}

export function resolveLocale({
  acceptLanguage,
  requestedLocale,
}: {
  acceptLanguage?: string | null;
  requestedLocale?: string | null;
}): Locale {
  if (requestedLocale && hasLocale(requestedLocale)) {
    return requestedLocale;
  }

  return matchPreferredLocale(acceptLanguage);
}

export function replaceLocaleInPathname(pathname: string, locale: Locale) {
  const segments = pathname.split("/");

  if (segments[1] && hasLocale(segments[1])) {
    segments[1] = locale;
    return segments.join("/") || `/${locale}`;
  }

  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}
