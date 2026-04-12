export const supportedLocales = ["ko", "en", "ja", "zh", "vi", "id"] as const;

export type Locale = (typeof supportedLocales)[number];
type BuiltInLocale = "ko" | "en" | "ja" | "zh";

export const defaultLocale: Locale = "ko";
export const localeCookieName = "preferred-locale";

export const localeLabels: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "简体中文",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
};

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
    loginDialog: {
      close: string;
      codeDescription: string;
      codePlaceholder: string;
      emailDescription: string;
      emailPlaceholder: string;
      signupGuideDescription: string;
      signupGuideTitle: string;
      invalidCode: string;
      invalidEmail: string;
      resendCode: string;
      sendCode: string;
      sendingCode: string;
      changeEmail: string;
      verifyCode: string;
      verifying: string;
    };
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
    autoPlacementDescription: string;
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
      placementReferralCode: string;
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
    firstLevelLimitHint: string;
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
      perSignup: string;
      points: string;
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
  walletPage: {
    title: string;
    eyebrow: string;
    description: string;
    disconnected: string;
    loading: string;
    emptyHistory: string;
    searchEmpty: string;
    receiveNote: string;
    sendNote: string;
    historyDescription: string;
    labels: {
      availableBalance: string;
      memberAccount: string;
      walletAddress: string;
      network: string;
      asset: string;
      memberStatus: string;
      referralCode: string;
      updatedAt: string;
      receive: string;
      send: string;
      history: string;
      recipient: string;
      amount: string;
      inbound: string;
      outbound: string;
    };
    actions: {
      refresh: string;
      openExplorer: string;
      showQr: string;
      send: string;
    };
    placeholders: {
      searchMember: string;
      amount: string;
    };
    errors: {
      loadFailed: string;
      missingEmail: string;
      invalidAmount: string;
      insufficientBalance: string;
      selectRecipient: string;
      selfTransfer: string;
      searchFailed: string;
    };
    notices: {
      txSent: string;
      txConfirmed: string;
      qrUnavailable: string;
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

const dictionaries: Record<BuiltInLocale, Dictionary> = {
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
      loginDialog: {
        close: "닫기",
        codeDescription: "{email} 로 받은 6자리 인증 코드를 입력하세요.",
        codePlaceholder: "6자리 코드",
        emailDescription:
          "이메일 주소를 입력하면 6자리 인증 코드를 보내드립니다.",
        emailPlaceholder: "이메일 주소",
        signupGuideDescription:
          "메일로 전송되는 인증코드 확인 후 10USDT가 전송되어야 완료됩니다.",
        signupGuideTitle: "회원 가입 방법",
        invalidCode: "6자리 인증 코드를 입력하세요.",
        invalidEmail: "올바른 이메일 주소를 입력하세요.",
        resendCode: "코드 다시 보내기",
        sendCode: "인증 코드 보내기",
        sendingCode: "코드 보내는 중...",
        changeEmail: "이메일 변경",
        verifyCode: "이메일 로그인",
        verifying: "로그인 중...",
      },
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
          title: "입금 확인 후 자동 완료",
          description:
            "입금이 확인되면 회원가입 완료, 추천인 저장, 레퍼럴 코드 발급이 한 번에 반영되며 지연 시 자동으로 재확인합니다.",
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
          title: "입금 확인 후 자동 완료",
          description:
            "결제 기록이 확인되면 회원가입과 레퍼럴 코드 활성화가 자동 반영되며, 지연 시 시스템이 다시 확인합니다.",
        },
      ],
    },
    sponsored: {
      title: "회원가입 결제",
      eyebrow: "10 usdt transfer",
      description:
        "연결된 스마트 월렛에서 {wallet} 로 정확히 {amount} USDT를 보내면 시스템이 입금 기록을 확인해 회원가입을 완료합니다. 반영이 지연되면 자동으로 다시 확인합니다.",
      cta: "정확히 {amount} USDT 보내기",
      completedCta: "회원가입 완료",
      emptyNotice:
        "전송 결과와 회원 상태 자동 반영 진행 상황이 여기에 표시됩니다.",
      connectFirst: "먼저 이메일 로그인 하세요.",
      txConfirmed:
        "전송 트랜잭션이 확인되었습니다. 회원 상태를 자동 반영하는 중이며, 지연되면 시스템이 다시 확인합니다.",
      txSent:
        "전송을 보냈습니다. 입금이 확인되면 회원가입이 자동으로 완료됩니다.",
      openExplorer: "거래 보기",
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
          title: "검증 기반 자동 완료",
          description:
            "클라이언트의 전송 성공만 믿지 않고, 검증된 입금 기록과 재확인 흐름으로 가입 상태를 안정적으로 맞춥니다.",
        },
      ],
    },
    member: {
      title: "회원 레지스트리",
      eyebrow: "가입 상태",
      disconnected:
        "이메일 로그인 후 회원 상태가 여기에 표시됩니다.",
      syncing:
        "회원가입 상태를 확인하는 중입니다. 결제 기록이 반영되면 자동으로 완료 처리됩니다.",
      pending:
        "아직 회원가입이 완료되지 않았습니다. 연결된 지갑에서 정확히 10 USDT를 보내면 입금 확인 후 자동으로 완료되며, 반영이 지연되면 시스템이 다시 확인합니다.",
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
      incomingReferralLimitTitle: "이 추천인 코드는 직접 가입이 마감되었습니다.",
      incomingReferralLimitDescription:
        "추천인 코드 {code} 는 직접 {limit}명이 모두 가입 진행 중이거나 완료되었습니다. 그래도 이 링크로 회원가입을 계속하면 시스템이 {code} 네트워크 하부의 빈 슬롯을 자동으로 찾아 연결합니다.",
      selfReferralNotice:
        "내 레퍼럴 링크로 접속했습니다. 본인에게는 추천 혜택이 적용되지 않습니다.",
      appliedReferralDescription:
        "이 가입에는 추천인 코드 {code} 가 적용되어 있습니다.",
      autoPlacementDescription:
        "직접 추천 슬롯이 가득 차 있어, 현재 자동 배정 규칙에 따라 네트워크 코드 {code} 아래의 빈 슬롯에 배정되었습니다.",
      shareHint:
        "이 링크를 공유하면 추천 코드가 포함된 가입 화면으로 바로 열립니다.",
      noReferralApplied: "적용 안 됨",
      labels: {
        awaitingPaymentSince: "결제 대기 시작",
        completionAt: "가입 완료 시각",
        destinationWallet: "입금 대상 지갑",
        emailKey: "이메일 키",
        lastWallet: "사용 지갑",
        walletCount: "연결 이력 지갑 수",
        lastConnectedAt: "최근 연결",
        paymentReceivedAt: "입금 확인 시각",
        paymentTransaction: "거래 기록",
        placementReferralCode: "배치된 네트워크 코드",
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
          "추천인 코드 {code} 는 이미 {count}명의 가입이 진행 중이거나 완료되어 마감되었습니다. 다른 레퍼럴 코드로 다시 가입하세요.",
        syncFailed: "회원 상태를 확인하지 못했습니다. 잠시 후 다시 시도하세요.",
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
      firstLevelLimitHint: "1단계는 최대 {limit}명까지 등록할 수 있습니다.",
      disconnected:
        "이메일 로그인하고 회원가입을 완료하면 레퍼럴 대시보드를 볼 수 있습니다.",
      loading: "레퍼럴 데이터를 확인하는 중입니다.",
      empty: "아직 내 레퍼럴 코드로 가입한 회원이 없습니다.",
      memberReady: "이 이메일 회원의 레퍼럴 코드가 활성화되어 있습니다.",
      memberMissing: "회원 상태를 다시 동기화한 뒤 시도하세요.",
      paymentRequired:
        "아직 회원가입이 완료되지 않았습니다. 활성화 화면으로 이동해 10 USDT 결제를 완료하세요.",
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
        completeSignup: "활성화 화면에서 가입 완료하기",
        refresh: "새로고침",
        viewChildren: "하위 보기",
      },
      rewards: {
        title: "보상 포인트",
        description:
          "하위 회원 1명 가입 완료당 상위 G1은 200포인트, G2부터 G6까지는 각 80포인트씩 적립됩니다.",
        empty: "아직 적립된 보상 내역이 없습니다.",
        recentTitle: "최근 지급 내역",
        perSignup: "보상 기준",
        points: "포인트",
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
    walletPage: {
      title: "테더 관리",
      eyebrow: "wallet service",
      description:
        "내 스마트 월렛의 BSC USDT 잔고를 확인하고, 입금 주소를 공유하고, 회원에게 USDT를 전송하고, 입출금 내역을 최신순으로 확인합니다.",
      disconnected: "이메일 로그인 후 지갑 서비스를 이용할 수 있습니다.",
      loading: "지갑 데이터를 불러오는 중입니다.",
      emptyHistory: "아직 표시할 USDT 입출금 내역이 없습니다.",
      searchEmpty: "검색된 회원이 없습니다.",
      receiveNote:
        "BSC(BEP20) USDT만 이 주소로 입금하세요. 다른 네트워크 자산은 복구되지 않을 수 있습니다.",
      sendNote:
        "받을 회원을 검색한 뒤 BSC USDT를 바로 전송할 수 있습니다.",
      historyDescription:
        "내 지갑의 BSC USDT 입출금 내역을 최신순으로 표시합니다.",
      labels: {
        availableBalance: "사용 가능 잔고",
        memberAccount: "연결된 회원",
        walletAddress: "지갑 주소",
        network: "네트워크",
        asset: "자산",
        memberStatus: "회원 상태",
        referralCode: "레퍼럴 코드",
        updatedAt: "최근 갱신",
        receive: "받기",
        send: "보내기",
        history: "입출금 내역",
        recipient: "받는 회원",
        amount: "보낼 금액",
        inbound: "입금",
        outbound: "출금",
      },
      actions: {
        refresh: "새로고침",
        openExplorer: "BscScan 보기",
        showQr: "QR 보기",
        send: "USDT 보내기",
      },
      placeholders: {
        searchMember: "이메일, 레퍼럴 코드, 지갑 주소로 회원 검색",
        amount: "0.0",
      },
      errors: {
        loadFailed: "지갑 데이터를 불러오지 못했습니다.",
        missingEmail: "현재 연결에서 이메일 주소를 확인하지 못했습니다.",
        invalidAmount: "보낼 금액을 올바르게 입력하세요.",
        insufficientBalance: "USDT 잔고가 부족합니다.",
        selectRecipient: "받을 회원을 먼저 선택하세요.",
        selfTransfer: "자기 지갑으로는 전송할 수 없습니다.",
        searchFailed: "회원 검색에 실패했습니다.",
      },
      notices: {
        txSent:
          "전송이 제출되었습니다. 블록 반영 후 내역이 자동으로 갱신됩니다.",
        txConfirmed:
          "전송이 확인되었습니다. 잔고와 내역을 다시 불러오는 중입니다.",
        qrUnavailable: "QR 코드를 생성하지 못했습니다.",
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
      loginDialog: {
        close: "Close",
        codeDescription: "Enter the 6-digit verification code sent to {email}.",
        codePlaceholder: "6-digit code",
        emailDescription:
          "Enter your email address and we will send you a 6-digit verification code.",
        emailPlaceholder: "Email address",
        signupGuideDescription:
          "Your registration will be complete once you verify the authentication code sent via email and transfer 10 USDT.",
        signupGuideTitle: "How to Sign Up",
        invalidCode: "Enter the 6-digit verification code.",
        invalidEmail: "Enter a valid email address.",
        resendCode: "Resend code",
        sendCode: "Send verification code",
        sendingCode: "Sending code...",
        changeEmail: "Change email",
        verifyCode: "Email login",
        verifying: "Signing in...",
      },
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
          title: "Auto-complete after payment verification",
          description:
            "Once the payment is verified, signup completion, inviter storage, and referral code issuance are applied together, and delayed updates are rechecked automatically.",
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
          title: "Auto-complete after payment verification",
          description:
            "Once the payment record is verified, signup and referral code activation are applied automatically, and delayed updates are checked again in the background.",
        },
      ],
    },
    sponsored: {
      title: "Signup Payment",
      eyebrow: "10 usdt transfer",
      description:
        "Send exactly {amount} USDT from the connected smart wallet to {wallet}. The system verifies the payment record and completes signup automatically. If processing is delayed, it will retry in the background.",
      cta: "Send exactly {amount} USDT",
      completedCta: "Signup complete",
      emptyNotice:
        "Transfer results and automatic signup verification status will appear here.",
      connectFirst: "Complete email login first.",
      txConfirmed:
        "The transfer was confirmed. Signup status is being updated automatically, and the system will retry if it is delayed.",
      txSent:
        "The transfer was sent. Signup will complete automatically after the payment is verified.",
      openExplorer: "View transaction",
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
          title: "Use verified payment completion",
          description:
            "Signup completion depends on verified payment records and retry checks instead of only client-side transaction success.",
        },
      ],
    },
    member: {
      title: "Member Registry",
      eyebrow: "signup status",
      disconnected:
        "After email login, your member status appears here.",
      syncing:
        "Checking signup status. Once the payment record is verified, signup will complete automatically.",
      pending:
        "Signup is still pending. Send exactly 10 USDT from the connected wallet. After the payment is verified, signup will complete automatically, and delayed updates will be rechecked.",
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
      incomingReferralLimitTitle:
        "This referral code has reached its direct signup limit.",
      incomingReferralLimitDescription:
        "Referral code {code} already has all {limit} direct signups in progress or completed. You can still continue signup from this link, and the system will automatically place you into the next open slot under the {code} network.",
      selfReferralNotice:
        "You opened your own referral link. Referral credit does not apply to your own signup.",
      appliedReferralDescription:
        "Referral code {code} is applied to this signup.",
      autoPlacementDescription:
        "The direct referral slots were already full, so this signup was assigned to an open slot under network code {code} by the current auto-placement rules.",
      shareHint:
        "Share this link to open signup with your referral code already included.",
      noReferralApplied: "Not applied",
      labels: {
        awaitingPaymentSince: "Awaiting payment since",
        completionAt: "Signup completed at",
        destinationWallet: "Destination wallet",
        emailKey: "Email key",
        lastWallet: "Wallet used",
        walletCount: "Connected wallets",
        lastConnectedAt: "Last connected",
        paymentReceivedAt: "Payment confirmed at",
        paymentTransaction: "Transaction record",
        placementReferralCode: "Assigned network code",
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
          "Referral code {code} already has {count} signups in progress or completed and is no longer available. Sign up again with a different referral code.",
        syncFailed: "We couldn't check your signup status. Try again in a moment.",
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
      firstLevelLimitHint: "Level 1 can have up to {limit} members.",
      disconnected:
        "Use email login and complete signup to review your referral dashboard.",
      loading: "Loading referral data.",
      empty: "No members have signed up with your referral code yet.",
      memberReady: "Your referral code is active for this email member.",
      memberMissing: "Sync the member record first, then try again.",
      paymentRequired:
        "Signup is not complete yet. Open the activation flow and finish the 10 USDT payment first.",
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
        completeSignup: "Complete signup on activation",
        refresh: "Refresh",
        viewChildren: "View children",
      },
      rewards: {
        title: "Reward points",
        description:
          "Each completed downline signup awards 200 points to the first eligible upline level and 80 points to each eligible upline member across levels 2 through 6.",
        empty: "No reward entries have been issued yet.",
        recentTitle: "Recent rewards",
        perSignup: "Reward rules",
        points: "Points",
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
    walletPage: {
      title: "USDT Wallet",
      eyebrow: "wallet service",
      description:
        "Check your BSC USDT balance, share your receive address, send USDT to members, and review the latest transfer history in one compact screen.",
      disconnected: "Sign in with email to use the wallet service.",
      loading: "Loading wallet data.",
      emptyHistory: "There are no USDT transfers to show yet.",
      searchEmpty: "No matching members were found.",
      receiveNote:
        "Only send BSC (BEP20) USDT to this address. Assets from other networks may not be recoverable.",
      sendNote:
        "Search for a member recipient, then send BSC USDT directly from this wallet.",
      historyDescription:
        "Recent inbound and outbound BSC USDT transfers for your wallet are shown newest first.",
      labels: {
        availableBalance: "Available balance",
        memberAccount: "Connected member",
        walletAddress: "Wallet address",
        network: "Network",
        asset: "Asset",
        memberStatus: "Member status",
        referralCode: "Referral code",
        updatedAt: "Last updated",
        receive: "Receive",
        send: "Send",
        history: "Transfer history",
        recipient: "Recipient member",
        amount: "Amount",
        inbound: "Inbound",
        outbound: "Outbound",
      },
      actions: {
        refresh: "Refresh",
        openExplorer: "Open in BscScan",
        showQr: "Show QR",
        send: "Send USDT",
      },
      placeholders: {
        searchMember: "Search by email, referral code, or wallet address",
        amount: "0.0",
      },
      errors: {
        loadFailed: "Failed to load wallet data.",
        missingEmail:
          "Unable to read the email address from the current wallet session.",
        invalidAmount: "Enter a valid amount to send.",
        insufficientBalance: "Your USDT balance is too low.",
        selectRecipient: "Select a recipient member first.",
        selfTransfer: "You cannot send to your own wallet.",
        searchFailed: "Failed to search members.",
      },
      notices: {
        txSent:
          "The transfer was submitted. History will refresh automatically after it lands onchain.",
        txConfirmed:
          "The transfer was confirmed. Reloading balance and history now.",
        qrUnavailable: "Unable to generate a QR code right now.",
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
      loginDialog: {
        close: "閉じる",
        codeDescription:
          "{email} に届いた 6 桁の認証コードを入力してください。",
        codePlaceholder: "6桁のコード",
        emailDescription:
          "メールアドレスを入力すると、6 桁の認証コードを送信します。",
        emailPlaceholder: "メールアドレス",
        signupGuideDescription:
          "メールで届く認証コードを確認し、10 USDT を送金すると登録が完了します。",
        signupGuideTitle: "登録方法",
        invalidCode: "6 桁の認証コードを入力してください。",
        invalidEmail: "有効なメールアドレスを入力してください。",
        resendCode: "コードを再送",
        sendCode: "認証コードを送る",
        sendingCode: "コード送信中...",
        changeEmail: "メールを変更",
        verifyCode: "メールログイン",
        verifying: "ログイン中...",
      },
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
          title: "入金確認後に自動完了",
          description:
            "入金が確認されると、会員登録、紹介コード保存、レファラルコード発行がまとめて反映され、遅延時は自動で再確認します。",
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
          title: "入金確認後に自動完了",
          description:
            "決済記録が確認されると、登録完了とレファラルコード有効化が自動反映され、遅延時はシステムが再確認します。",
        },
      ],
    },
    sponsored: {
      title: "登録用決済",
      eyebrow: "10 usdt transfer",
      description:
        "接続済みスマートウォレットから {wallet} へ正確に {amount} USDT を送ると、システムが入金記録を確認して登録を自動完了します。遅延時は再確認されます。",
      cta: "正確に {amount} USDT を送る",
      completedCta: "登録完了",
      emptyNotice:
        "送金結果と登録反映状況がここに表示されます。",
      connectFirst: "先にメールログインしてください。",
      txConfirmed:
        "送金トランザクションが確認されました。登録状態を自動反映しており、遅延時はシステムが再確認します。",
      txSent:
        "送金を送信しました。入金確認後、登録は自動で完了します。",
      openExplorer: "取引を見る",
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
      eyebrow: "登録状態",
      disconnected:
        "メールログイン後、会員ステータスがここに表示されます。",
      syncing:
        "登録状態を確認しています。決済記録が確認されると自動で登録完了に反映されます。",
      pending:
        "まだ登録は完了していません。接続済みウォレットから正確に 10 USDT を送ると、入金確認後に自動で登録完了となり、遅延時はシステムが再確認します。",
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
      incomingReferralLimitTitle:
        "この紹介コードの直接登録枠は埋まっています。",
      incomingReferralLimitDescription:
        "紹介コード {code} は直接 {limit} 人がすでに登録中または登録完了です。それでもこのリンクから登録を続けると、システムが {code} ネットワーク配下の空きスロットを自動で探して接続します。",
      selfReferralNotice:
        "自分のレファラルリンクを開いています。自分自身には紹介特典は適用されません。",
      appliedReferralDescription:
        "この登録には紹介コード {code} が適用されています。",
      autoPlacementDescription:
        "直接紹介枠が埋まっていたため、現在の自動配置ルールに従ってネットワークコード {code} の空きスロットへ配置されました。",
      shareHint:
        "このリンクを共有すると、あなたの紹介コードが入った登録画面をそのまま開けます。",
      noReferralApplied: "未適用",
      labels: {
        awaitingPaymentSince: "支払い待ち開始",
        completionAt: "登録完了時刻",
        destinationWallet: "送金先ウォレット",
        emailKey: "メールキー",
        lastWallet: "利用ウォレット",
        walletCount: "接続履歴ウォレット数",
        lastConnectedAt: "最終接続",
        paymentReceivedAt: "入金確認時刻",
        paymentTransaction: "取引記録",
        placementReferralCode: "配置先ネットワークコード",
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
          "紹介コード {code} はすでに {count} 人が登録中または登録完了の状態で受付終了です。別のレファラルコードで登録してください。",
        syncFailed: "会員状態を確認できませんでした。少し待ってからもう一度お試しください。",
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
      firstLevelLimitHint: "1段階目は最大 {limit} 人まで登録できます。",
      disconnected:
        "メールログインし、登録を完了するとレファラルダッシュボードを確認できます。",
      loading: "レファラルデータを読み込んでいます。",
      empty: "まだ自分のレファラルコードで登録した会員はいません。",
      memberReady: "このメール会員のレファラルコードは有効です。",
      memberMissing: "先に会員情報を同期してから再試行してください。",
      paymentRequired:
        "まだ登録が完了していません。アクティベーション画面へ移動して 10 USDT の支払いを完了してください。",
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
        completeSignup: "アクティベーション画面で登録を完了する",
        refresh: "再読み込み",
        viewChildren: "下位を見る",
      },
      rewards: {
        title: "報酬ポイント",
        description:
          "下位メンバー 1 人の登録完了ごとに、上位 G1 には 200 ポイント、G2 から G6 までは各 80 ポイントずつ積み上がります。",
        empty: "まだ付与された報酬履歴はありません。",
        recentTitle: "最近の付与履歴",
        perSignup: "報酬基準",
        points: "ポイント",
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
    walletPage: {
      title: "USDT ウォレット",
      eyebrow: "wallet service",
      description:
        "自分の BSC USDT 残高、受取アドレス共有、会員宛の送金、最新の入出金履歴を 1 画面で確認します。",
      disconnected:
        "ウォレットサービスを利用するにはメールログインしてください。",
      loading: "ウォレットデータを読み込んでいます。",
      emptyHistory: "表示できる USDT の入出金履歴はまだありません。",
      searchEmpty: "一致する会員が見つかりませんでした。",
      receiveNote:
        "このアドレスには BSC(BEP20) USDT のみを送ってください。他ネットワークの資産は復旧できない場合があります。",
      sendNote:
        "送金先の会員を検索して、このウォレットから BSC USDT を送れます。",
      historyDescription:
        "ウォレットの BSC USDT 入出金履歴を新しい順に表示します。",
      labels: {
        availableBalance: "利用可能残高",
        memberAccount: "接続中の会員",
        walletAddress: "ウォレットアドレス",
        network: "ネットワーク",
        asset: "資産",
        memberStatus: "会員状態",
        referralCode: "レファラルコード",
        updatedAt: "最終更新",
        receive: "受け取る",
        send: "送る",
        history: "入出金履歴",
        recipient: "送金先会員",
        amount: "送金額",
        inbound: "入金",
        outbound: "出金",
      },
      actions: {
        refresh: "更新",
        openExplorer: "BscScan で見る",
        showQr: "QR を表示",
        send: "USDT を送る",
      },
      placeholders: {
        searchMember: "メール、紹介コード、ウォレットで会員検索",
        amount: "0.0",
      },
      errors: {
        loadFailed: "ウォレットデータを読み込めませんでした。",
        missingEmail:
          "現在のウォレット接続からメールアドレスを取得できませんでした。",
        invalidAmount: "正しい送金額を入力してください。",
        insufficientBalance: "USDT 残高が不足しています。",
        selectRecipient: "先に送金先会員を選択してください。",
        selfTransfer: "自分のウォレットには送金できません。",
        searchFailed: "会員検索に失敗しました。",
      },
      notices: {
        txSent:
          "送金が送信されました。オンチェーン反映後に履歴が自動更新されます。",
        txConfirmed:
          "送金が確認されました。残高と履歴を再読み込みしています。",
        qrUnavailable: "現在 QR コードを生成できません。",
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
      loginDialog: {
        close: "关闭",
        codeDescription: "请输入发送到 {email} 的 6 位验证码。",
        codePlaceholder: "6位验证码",
        emailDescription:
          "输入你的邮箱地址后，我们会发送一组 6 位验证码。",
        emailPlaceholder: "邮箱地址",
        signupGuideDescription:
          "确认邮箱收到的验证码后，再转入 10 USDT，即可完成注册。",
        signupGuideTitle: "注册方式",
        invalidCode: "请输入 6 位验证码。",
        invalidEmail: "请输入有效的邮箱地址。",
        resendCode: "重新发送验证码",
        sendCode: "发送验证码",
        sendingCode: "正在发送验证码...",
        changeEmail: "更换邮箱",
        verifyCode: "邮箱登录",
        verifying: "登录中...",
      },
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
          title: "入账确认后自动完成",
          description:
            "确认到账后，会一次性完成会员注册、推荐人记录和推荐码生成；如果同步延迟，系统会自动复查。",
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
          title: "入账确认后自动完成",
          description:
            "支付记录确认后，会自动完成注册并激活推荐码；如果延迟，系统会自动再次检查。",
        },
      ],
    },
    sponsored: {
      title: "注册支付",
      eyebrow: "10 usdt transfer",
      description:
        "从已连接智能钱包向 {wallet} 精确转入 {amount} USDT 后，系统会校验入账记录并自动完成注册。如处理延迟，后台也会继续复查。",
      cta: "精确转入 {amount} USDT",
      completedCta: "注册已完成",
      emptyNotice:
        "转账结果和注册自动处理状态会显示在这里。",
      connectFirst: "请先完成邮箱登录。",
      txConfirmed:
        "转账交易已确认，系统正在自动更新注册状态；若延迟，会继续重新检查。",
      txSent:
        "转账已发送。入账确认后，注册会自动完成。",
      openExplorer: "查看交易",
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
          title: "以验证结果自动完成",
          description:
            "不会只依赖前端交易成功，而是结合已验证的 transfer 事件与复查流程来稳定完成注册。",
        },
      ],
    },
    member: {
      title: "会员注册表",
      eyebrow: "注册状态",
      disconnected:
        "邮箱登录后，会员状态会显示在这里。",
      syncing:
        "正在检查注册状态。支付记录确认后会自动完成注册。",
      pending:
        "注册尚未完成。从当前连接的钱包精确转入 10 USDT 后，确认到账即可自动完成注册；如反映延迟，系统会继续复查。",
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
      incomingReferralLimitTitle: "这个推荐码的直推名额已满。",
      incomingReferralLimitDescription:
        "推荐码 {code} 的直推 {limit} 个名额都已在进行中或已完成。你仍然可以继续通过这个链接注册，系统会自动在 {code} 网络下方寻找可用空位并完成挂接。",
      selfReferralNotice:
        "你打开的是自己的推荐链接。自己的注册不会获得推荐奖励。",
      appliedReferralDescription:
        "此注册已应用推荐码 {code}。",
      autoPlacementDescription:
        "由于直属推荐位已满，系统已按当前自动分配规则将其放入网络代码 {code} 下的空槽位。",
      shareHint:
        "分享此链接后，会直接打开已带上你的推荐码的注册页面。",
      noReferralApplied: "未应用",
      labels: {
        awaitingPaymentSince: "开始等待支付时间",
        completionAt: "注册完成时间",
        destinationWallet: "收款钱包",
        emailKey: "邮箱键",
        lastWallet: "使用钱包",
        walletCount: "已连接钱包数",
        lastConnectedAt: "最近连接",
        paymentReceivedAt: "到账确认时间",
        paymentTransaction: "交易记录",
        placementReferralCode: "分配到的网络代码",
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
          "推荐码 {code} 已经有 {count} 位会员正在注册或已完成注册，现已满额。请改用其他推荐码重新注册。",
        syncFailed: "暂时无法确认会员状态，请稍后再试。",
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
      firstLevelLimitHint: "第 1 层最多可注册 {limit} 人。",
      disconnected:
        "邮箱登录并完成注册后，即可查看推荐仪表板。",
      loading: "正在加载推荐数据。",
      empty: "目前还没有会员通过你的推荐码注册。",
      memberReady: "该邮箱会员的推荐码已激活。",
      memberMissing: "请先同步会员信息后再试。",
      paymentRequired:
        "注册尚未完成。请先进入激活流程完成 10 USDT 支付。",
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
        completeSignup: "前往激活流程完成注册",
        refresh: "刷新",
        viewChildren: "查看下级",
      },
      rewards: {
        title: "奖励积分",
        description:
          "每完成 1 名下级会员注册，G1 上级可获得 200 积分，G2 到 G6 各层有效上级各获得 80 积分。",
        empty: "目前还没有已发放的奖励记录。",
        recentTitle: "最近发放记录",
        perSignup: "奖励规则",
        points: "积分",
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
    walletPage: {
      title: "USDT 钱包",
      eyebrow: "wallet service",
      description:
        "在一个紧凑页面中查看你的 BSC USDT 余额、分享收款地址、向会员转账，并按最新顺序查看收支记录。",
      disconnected: "请先通过邮箱登录后再使用钱包服务。",
      loading: "正在加载钱包数据。",
      emptyHistory: "暂无可显示的 USDT 收支记录。",
      searchEmpty: "没有找到匹配的会员。",
      receiveNote:
        "此地址仅支持接收 BSC(BEP20) USDT。其他网络资产可能无法找回。",
      sendNote:
        "搜索收款会员后，可直接从当前钱包发送 BSC USDT。",
      historyDescription:
        "按最新顺序显示你的钱包 BSC USDT 收入与支出记录。",
      labels: {
        availableBalance: "可用余额",
        memberAccount: "当前会员",
        walletAddress: "钱包地址",
        network: "网络",
        asset: "资产",
        memberStatus: "会员状态",
        referralCode: "推荐码",
        updatedAt: "最近更新",
        receive: "收款",
        send: "转账",
        history: "收支记录",
        recipient: "收款会员",
        amount: "金额",
        inbound: "收入",
        outbound: "支出",
      },
      actions: {
        refresh: "刷新",
        openExplorer: "在 BscScan 打开",
        showQr: "查看二维码",
        send: "发送 USDT",
      },
      placeholders: {
        searchMember: "通过邮箱、推荐码或钱包地址搜索会员",
        amount: "0.0",
      },
      errors: {
        loadFailed: "无法加载钱包数据。",
        missingEmail: "无法从当前钱包会话读取邮箱地址。",
        invalidAmount: "请输入正确的转账金额。",
        insufficientBalance: "USDT 余额不足。",
        selectRecipient: "请先选择收款会员。",
        selfTransfer: "不能转给自己的钱包。",
        searchFailed: "会员搜索失败。",
      },
      notices: {
        txSent: "转账已提交。链上确认后，记录会自动刷新。",
        txConfirmed: "转账已确认。正在重新加载余额和记录。",
        qrUnavailable: "暂时无法生成二维码。",
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

function createVietnameseDictionary(base: Dictionary): Dictionary {
  return {
    ...base,
    meta: {
      title: "Pocket Smart Wallet",
      description:
        "Ứng dụng smart wallet ưu tiên di động, hoàn tất đăng ký sau khi xác nhận nạp 10 USDT bằng đăng nhập email.",
    },
    common: {
      ...base.common,
      headerDescription:
        "Đăng nhập bằng email, gửi 10 USDT đến PROJECT_WALLET, webhook sẽ hoàn tất đăng ký.",
      languageLabel: "Ngôn ngữ",
      connectWallet: "Đăng nhập email",
      disconnectWallet: "Đăng xuất",
      connectModalTitle: "Đăng nhập Pocket Smart Wallet bằng email",
      loginDialog: {
        ...base.common.loginDialog,
        close: "Đóng",
        codeDescription:
          "Nhập mã xác minh 6 chữ số được gửi đến {email}.",
        codePlaceholder: "Mã 6 chữ số",
        emailDescription:
          "Nhập địa chỉ email, chúng tôi sẽ gửi mã xác minh 6 chữ số.",
        emailPlaceholder: "Địa chỉ email",
        signupGuideDescription:
          "Đăng ký sẽ hoàn tất sau khi bạn xác minh mã gửi qua email và chuyển 10 USDT.",
        signupGuideTitle: "Cách đăng ký",
        invalidCode: "Nhập mã xác minh 6 chữ số.",
        invalidEmail: "Nhập địa chỉ email hợp lệ.",
        resendCode: "Gửi lại mã",
        sendCode: "Gửi mã xác minh",
        sendingCode: "Đang gửi mã...",
        changeEmail: "Đổi email",
        verifyCode: "Đăng nhập email",
        verifying: "Đang đăng nhập...",
      },
      logoutDialog: {
        ...base.common.logoutDialog,
        title: "Đăng xuất?",
        description:
          "Phiên đăng nhập email hiện tại sẽ kết thúc. Bạn có thể đăng nhập lại bằng email bất cứ lúc nào.",
        cancel: "Hủy",
        confirm: "Đăng xuất",
      },
      clientIdRequired: "cần client id",
      copyAddress: "Sao chép địa chỉ",
      copyLink: "Sao chép liên kết",
      copied: "Đã sao chép",
      notAvailable: "Không có",
      walletTypeAbstracted: "Smart wallet trừu tượng",
      status: {
        connected: "Đã kết nối",
        connecting: "Đang kết nối",
        disconnected: "Chưa kết nối",
        unknown: "Đang tải",
      },
    },
    hero: {
      eyebrow: "Mobile Smart Wallet",
      title:
        "Ứng dụng onchain hoàn tất đăng ký sau khi đăng nhập email và xác nhận chuyển đủ 10 USDT.",
      description:
        "Phiên bản này kết hợp luồng đăng nhập email với quy trình đăng ký BSC Smart Wallet dựa trên xác nhận thanh toán. Ví đã kết nối phải gửi chính xác 10 USDT đến PROJECT_WALLET, sau đó webhook xác nhận giao dịch và kích hoạt mã giới thiệu.",
      badges: [
        "Đăng nhập email",
        "Đăng ký chính xác 10 USDT",
        "Webhook hoàn tất",
      ],
    },
    metrics: [
      { label: "Chuỗi", value: "BSC", hint: "BNB Smart Chain" },
      { label: "Số tiền đăng ký", value: "10 USDT", hint: "exact amount" },
      { label: "Cách hoàn tất", value: "Webhook", hint: "payment confirmed" },
    ],
    env: {
      title: "Cần cấu hình biến môi trường",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID` đang trống nên giao diện đăng nhập email bị ẩn. Hãy sao chép `.env.example`, thêm client id rồi tải lại.",
    },
    connected: {
      eyebrow: "Active Smart Wallet",
      labels: {
        chain: "Chuỗi đã kết nối",
        balance: "Số dư USDT",
        walletType: "Loại ví",
        adminSigner: "Admin signer",
      },
      quickActionsTitle: "Thao tác nhanh",
      actions: {
        explorer: "Mở trên BscScan",
        contract: "Hợp đồng BSC USDT",
        dashboard: "Bảng điều khiển thirdweb",
      },
    },
    onboarding: {
      eyebrow: "Wallet Onboarding",
      cards: [
        {
          title: "Bắt đầu bằng đăng nhập email",
          description:
            "Giữ một điểm vào OTP email duy nhất để quy trình đăng ký bắt đầu từ cùng một luồng kết nối ví.",
        },
        {
          title: "Gửi chính xác 10 USDT",
          description:
            "Smart wallet đã kết nối phải gửi đúng 10 USDT đến PROJECT_WALLET thì mới đủ điều kiện đăng ký.",
        },
        {
          title: "Tự động hoàn tất sau khi xác minh thanh toán",
          description:
            "Khi thanh toán được xác minh, trạng thái đăng ký, lưu người giới thiệu và cấp mã referral sẽ được áp dụng cùng lúc; nếu chậm, hệ thống sẽ tự kiểm tra lại.",
        },
      ],
    },
    runway: {
      title: "Session Runway",
      eyebrow: "3-step mobile flow",
      steps: [
        {
          title: "Đăng nhập email",
          description:
            "Bắt đầu phiên smart wallet bằng email và mã xác minh dùng một lần.",
        },
        {
          title: "Gửi 10 USDT",
          description:
            "Chuyển đúng 10 USDT từ ví đã kết nối đến PROJECT_WALLET.",
        },
        {
          title: "Tự động hoàn tất sau khi xác minh thanh toán",
          description:
            "Khi bản ghi thanh toán được xác minh, đăng ký và mã referral sẽ được kích hoạt tự động; nếu chậm, hệ thống sẽ kiểm tra lại trong nền.",
        },
      ],
    },
    sponsored: {
      title: "Thanh toán đăng ký",
      eyebrow: "10 usdt transfer",
      description:
        "Gửi chính xác {amount} USDT từ smart wallet đã kết nối đến {wallet}. Hệ thống sẽ xác minh giao dịch và hoàn tất đăng ký tự động. Nếu xử lý chậm, hệ thống sẽ tiếp tục thử lại.",
      cta: "Gửi chính xác {amount} USDT",
      completedCta: "Đăng ký hoàn tất",
      emptyNotice:
        "Kết quả giao dịch và trạng thái xác minh đăng ký tự động sẽ hiển thị ở đây.",
      connectFirst: "Hãy đăng nhập email trước.",
      txConfirmed:
        "Giao dịch đã được xác nhận. Trạng thái đăng ký đang được cập nhật tự động; nếu chậm, hệ thống sẽ thử lại.",
      txSent:
        "Giao dịch đã được gửi. Đăng ký sẽ hoàn tất tự động sau khi thanh toán được xác minh.",
      openExplorer: "Xem giao dịch",
    },
    surface: {
      title: "Wallet Surface",
      eyebrow: "mobile decisions",
      points: [
        {
          title: "Đưa điều kiện đăng ký vào trung tâm màn hình",
          description:
            "Ví đã kết nối, số tiền chuyển, địa chỉ nhận và trạng thái đăng ký luôn hiển thị cùng một màn hình.",
        },
        {
          title: "Tách trạng thái chờ và đã hoàn tất",
          description:
            "Trước khi thanh toán, giao diện nhấn mạnh yêu cầu 10 USDT. Sau khi xác nhận thanh toán, trọng tâm chuyển sang thông tin referral và hoàn tất.",
        },
        {
          title: "Hoàn tất bằng thanh toán đã xác minh",
          description:
            "Đăng ký chỉ hoàn tất khi có bản ghi thanh toán đã được xác minh và các lần kiểm tra lại, thay vì chỉ dựa vào trạng thái gửi giao dịch từ client.",
        },
      ],
    },
    member: {
      title: "Sổ đăng ký thành viên",
      eyebrow: "trạng thái đăng ký",
      disconnected: "Sau khi đăng nhập email, trạng thái thành viên sẽ xuất hiện ở đây.",
      syncing:
        "Đang kiểm tra trạng thái đăng ký. Khi bản ghi thanh toán được xác minh, đăng ký sẽ hoàn tất tự động.",
      pending:
        "Đăng ký vẫn đang chờ xử lý. Hãy gửi chính xác 10 USDT từ ví đã kết nối. Sau khi thanh toán được xác minh, đăng ký sẽ hoàn tất tự động và hệ thống sẽ kiểm tra lại nếu bị chậm.",
      synced:
        "Thanh toán 10 USDT đã được xác nhận, đăng ký đã hoàn tất và mã referral hiện đã hoạt động.",
      newMember: "Đăng ký thành công.",
      pendingValue: "Đang chờ thanh toán",
      completedValue: "Đăng ký hoàn tất",
      celebrationTitle: "Đăng ký hoàn tất",
      celebrationDescription:
        "Chuyển khoản 10 USDT đã được xác nhận và mã referral của bạn đã hoạt động.",
      incomingReferralTitle: "Đã phát hiện mã giới thiệu.",
      incomingReferralDescription:
        "Nếu đăng ký hoàn tất trên trang này, mã giới thiệu {code} sẽ được lưu vào hồ sơ thành viên.",
      incomingReferralLimitTitle:
        "Mã giới thiệu này đã kín suất đăng ký trực tiếp.",
      incomingReferralLimitDescription:
        "Mã giới thiệu {code} đã có đủ {limit} lượt đăng ký trực tiếp đang xử lý hoặc đã hoàn tất. Bạn vẫn có thể tiếp tục đăng ký từ liên kết này và hệ thống sẽ tự động tìm vị trí trống tiếp theo trong mạng {code}.",
      selfReferralNotice:
        "Bạn đang mở liên kết referral của chính mình. Tài khoản của bạn sẽ không nhận credit giới thiệu cho đăng ký này.",
      appliedReferralDescription:
        "Mã giới thiệu {code} đang được áp dụng cho lần đăng ký này.",
      autoPlacementDescription:
        "Các vị trí giới thiệu trực tiếp đã đầy, vì vậy hệ thống đã tự gán vào một ô trống dưới mã mạng {code} theo quy tắc auto-placement hiện tại.",
      shareHint:
        "Chia sẻ liên kết này để mở trang đăng ký với mã referral của bạn đã được gắn sẵn.",
      noReferralApplied: "Chưa áp dụng",
      labels: {
        awaitingPaymentSince: "Chờ thanh toán từ",
        completionAt: "Hoàn tất đăng ký lúc",
        destinationWallet: "Ví nhận",
        emailKey: "Khóa email",
        lastWallet: "Ví đã dùng",
        walletCount: "Số ví đã kết nối",
        lastConnectedAt: "Kết nối gần nhất",
        paymentReceivedAt: "Xác nhận thanh toán lúc",
        paymentTransaction: "Giao dịch",
        placementReferralCode: "Mã mạng được gán",
        referralCode: "Mã referral của tôi",
        referredByCode: "Mã giới thiệu đã áp dụng",
        referralLink: "Liên kết referral",
        requiredDeposit: "Số tiền đăng ký",
        signupStatus: "Trạng thái đăng ký",
        updatedAt: "Cập nhật gần nhất",
      },
      actions: {
        openProjectWallet: "Xem ví dự án",
        refreshStatus: "Làm mới trạng thái",
        viewReferrals: "Xem thành viên giới thiệu",
      },
      errors: {
        missingEmail:
          "Không thể đọc địa chỉ email từ phiên kết nối hiện tại.",
        insufficientBalance:
          "Để tiếp tục đăng ký, ví đã kết nối phải có ít nhất {amount} USDT.",
        projectWalletMissing: "PROJECT_WALLET chưa được cấu hình.",
        referralLimitReached:
          "Mã giới thiệu {code} đã có {count} lượt đăng ký đang xử lý hoặc đã hoàn tất và hiện đã đầy. Hãy dùng mã referral khác để đăng ký.",
        syncFailed:
          "Không thể xác nhận trạng thái thành viên lúc này. Vui lòng thử lại sau.",
      },
    },
    referralsPage: {
      title: "Bảng điều khiển referral",
      eyebrow: "referral tracking",
      description:
        "Sau khi đăng ký hoàn tất, bạn có thể xem mã referral của mình và danh sách thành viên đã đăng ký bằng mã đó.",
      shareTitle: "Mã referral của tôi",
      listTitle: "Thành viên đăng ký bằng mã của tôi",
      rootLabel: "Toàn bộ cây giới thiệu",
      branchEmpty:
        "Dưới thành viên này hiện chưa có thêm lượt đăng ký giới thiệu nào.",
      depthHint: "Bạn có thể xem tối đa {depth} tầng trên một màn hình.",
      firstLevelLimitHint: "Tầng 1 có thể đăng ký tối đa {limit} người.",
      disconnected:
        "Hãy đăng nhập email và hoàn tất đăng ký để xem bảng referral.",
      loading: "Đang tải dữ liệu referral.",
      empty: "Hiện chưa có thành viên nào đăng ký bằng mã referral của bạn.",
      memberReady: "Mã referral của thành viên email này đã hoạt động.",
      memberMissing: "Hãy đồng bộ lại trạng thái thành viên rồi thử lại.",
      paymentRequired:
        "Đăng ký vẫn chưa hoàn tất. Hãy vào màn hình kích hoạt để hoàn tất thanh toán 10 USDT.",
      labels: {
        currentLevel: "Tầng hiện tại",
        descendants: "Tổng tuyến dưới",
        directChildren: "Tuyến dưới trực tiếp",
        directReferrals: "Đăng ký giới thiệu trực tiếp",
        level: "Tầng",
        members: "người",
        referralCode: "Mã referral",
        referralLink: "Liên kết chia sẻ",
        totalReferrals: "Số đăng ký giới thiệu",
        totalNetwork: "Toàn mạng lưới",
        lastWallet: "Ví gần nhất",
        locale: "Ngôn ngữ thành viên",
        joinedAt: "Thời điểm tham gia",
        lastConnectedAt: "Kết nối gần nhất",
      },
      actions: {
        backToRoot: "Về gốc",
        backHome: "Về trang chủ",
        completeSignup: "Hoàn tất đăng ký ở màn hình kích hoạt",
        refresh: "Làm mới",
        viewChildren: "Xem tuyến dưới",
      },
      rewards: {
        title: "Điểm thưởng",
        description:
          "Mỗi khi 1 thành viên tuyến dưới hoàn tất đăng ký, tầng G1 phía trên nhận 200 điểm, còn mỗi tầng hợp lệ từ G2 đến G6 nhận 80 điểm.",
        empty: "Hiện chưa có lịch sử thưởng nào được ghi nhận.",
        recentTitle: "Lịch sử chi trả gần đây",
        perSignup: "Quy tắc thưởng",
        points: "Điểm",
        totalPoints: "Tổng điểm tích lũy",
        totalRewards: "Số lần chi trả",
        activeLevels: "Số tầng có thưởng",
        sourceMember: "Thành viên đăng ký",
        awardedAt: "Thời điểm chi trả",
      },
      errors: {
        missingEmail:
          "Không thể đọc địa chỉ email từ phiên kết nối hiện tại.",
        loadFailed: "Không thể tải dữ liệu referral.",
      },
    },
    signInMix: {
      title: "Luồng đăng ký",
      eyebrow: "signup checklist",
      methods: [
        "Đăng nhập email",
        "Chuyển 10 USDT",
        "Hoàn tất sau khi webhook xác nhận",
      ],
    },
    notices: {
      copySuccess: "Đã sao chép địa chỉ smart wallet vào clipboard.",
      copyError:
        "Không thể sao chép địa chỉ. Hãy kiểm tra quyền của trình duyệt.",
    },
  };
}

function createIndonesianDictionary(base: Dictionary): Dictionary {
  return {
    ...base,
    meta: {
      title: "Pocket Smart Wallet",
      description:
        "Aplikasi smart wallet mobile-first yang menyelesaikan pendaftaran setelah deposit 10 USDT terverifikasi melalui login email.",
    },
    common: {
      ...base.common,
      headerDescription:
        "Masuk dengan email, kirim 10 USDT ke PROJECT_WALLET, lalu webhook akan menyelesaikan pendaftaran.",
      languageLabel: "Bahasa",
      connectWallet: "Login email",
      disconnectWallet: "Keluar",
      connectModalTitle: "Masuk ke Pocket Smart Wallet dengan email",
      loginDialog: {
        ...base.common.loginDialog,
        close: "Tutup",
        codeDescription:
          "Masukkan kode verifikasi 6 digit yang dikirim ke {email}.",
        codePlaceholder: "Kode 6 digit",
        emailDescription:
          "Masukkan alamat email Anda dan kami akan mengirimkan kode verifikasi 6 digit.",
        emailPlaceholder: "Alamat email",
        signupGuideDescription:
          "Pendaftaran Anda selesai setelah memverifikasi kode email dan mentransfer 10 USDT.",
        signupGuideTitle: "Cara mendaftar",
        invalidCode: "Masukkan kode verifikasi 6 digit.",
        invalidEmail: "Masukkan alamat email yang valid.",
        resendCode: "Kirim ulang kode",
        sendCode: "Kirim kode verifikasi",
        sendingCode: "Mengirim kode...",
        changeEmail: "Ganti email",
        verifyCode: "Login email",
        verifying: "Sedang masuk...",
      },
      logoutDialog: {
        ...base.common.logoutDialog,
        title: "Keluar?",
        description:
          "Sesi login email saat ini akan berakhir. Anda bisa login kembali kapan saja dengan email.",
        cancel: "Batal",
        confirm: "Keluar",
      },
      clientIdRequired: "perlu client id",
      copyAddress: "Salin alamat",
      copyLink: "Salin tautan",
      copied: "Tersalin",
      notAvailable: "Tidak ada",
      walletTypeAbstracted: "Smart wallet abstrak",
      status: {
        connected: "Terhubung",
        connecting: "Sedang terhubung",
        disconnected: "Belum terhubung",
        unknown: "Memuat",
      },
    },
    hero: {
      eyebrow: "Mobile Smart Wallet",
      title:
        "Aplikasi onchain yang menyelesaikan pendaftaran setelah login email dan transfer 10 USDT terkonfirmasi.",
      description:
        "Versi ini menggabungkan alur login email dengan proses pendaftaran BSC Smart Wallet berbasis verifikasi pembayaran. Wallet yang terhubung harus mengirim tepat 10 USDT ke PROJECT_WALLET, lalu webhook mengonfirmasi transfer dan mengaktifkan kode referral.",
      badges: [
        "Login email",
        "Pendaftaran tepat 10 USDT",
        "Selesai lewat webhook",
      ],
    },
    metrics: [
      { label: "Chain", value: "BSC", hint: "BNB Smart Chain" },
      { label: "Biaya pendaftaran", value: "10 USDT", hint: "exact amount" },
      { label: "Metode selesai", value: "Webhook", hint: "payment confirmed" },
    ],
    env: {
      title: "Perlu pengaturan environment",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID` kosong sehingga UI login email disembunyikan. Salin `.env.example`, isi client id, lalu muat ulang.",
    },
    connected: {
      eyebrow: "Active Smart Wallet",
      labels: {
        chain: "Chain terhubung",
        balance: "Saldo USDT",
        walletType: "Tipe wallet",
        adminSigner: "Admin signer",
      },
      quickActionsTitle: "Aksi cepat",
      actions: {
        explorer: "Buka di BscScan",
        contract: "Kontrak BSC USDT",
        dashboard: "Dashboard thirdweb",
      },
    },
    onboarding: {
      eyebrow: "Wallet Onboarding",
      cards: [
        {
          title: "Mulai dari login email",
          description:
            "Gunakan satu pintu masuk OTP email agar alur pendaftaran selalu dimulai dari koneksi wallet yang sama.",
        },
        {
          title: "Kirim tepat 10 USDT",
          description:
            "Smart wallet yang terhubung harus mengirim tepat 10 USDT ke PROJECT_WALLET agar memenuhi syarat pendaftaran.",
        },
        {
          title: "Selesai otomatis setelah pembayaran terverifikasi",
          description:
            "Setelah pembayaran terverifikasi, status pendaftaran, penyimpanan inviter, dan penerbitan kode referral diterapkan sekaligus; jika terlambat, sistem akan memeriksa ulang otomatis.",
        },
      ],
    },
    runway: {
      title: "Session Runway",
      eyebrow: "3-step mobile flow",
      steps: [
        {
          title: "Login email",
          description:
            "Mulai sesi smart wallet dengan email dan kode verifikasi satu kali.",
        },
        {
          title: "Kirim 10 USDT",
          description:
            "Transfer tepat 10 USDT dari wallet yang terhubung ke PROJECT_WALLET.",
        },
        {
          title: "Selesai otomatis setelah pembayaran terverifikasi",
          description:
            "Saat catatan pembayaran terverifikasi, pendaftaran dan aktivasi kode referral diproses otomatis; jika terlambat, sistem akan memeriksa lagi di background.",
        },
      ],
    },
    sponsored: {
      title: "Pembayaran pendaftaran",
      eyebrow: "10 usdt transfer",
      description:
        "Kirim tepat {amount} USDT dari smart wallet yang terhubung ke {wallet}. Sistem akan memverifikasi transaksi dan menyelesaikan pendaftaran otomatis. Jika proses terlambat, sistem akan mencoba lagi di background.",
      cta: "Kirim tepat {amount} USDT",
      completedCta: "Pendaftaran selesai",
      emptyNotice:
        "Hasil transfer dan status verifikasi pendaftaran otomatis akan tampil di sini.",
      connectFirst: "Selesaikan login email terlebih dahulu.",
      txConfirmed:
        "Transfer sudah terkonfirmasi. Status pendaftaran sedang diperbarui otomatis; jika terlambat, sistem akan mencoba lagi.",
      txSent:
        "Transfer sudah dikirim. Pendaftaran akan selesai otomatis setelah pembayaran terverifikasi.",
      openExplorer: "Lihat transaksi",
    },
    surface: {
      title: "Wallet Surface",
      eyebrow: "mobile decisions",
      points: [
        {
          title: "Letakkan syarat pendaftaran di pusat layar",
          description:
            "Wallet terhubung, jumlah transfer, wallet tujuan, dan status pendaftaran tetap terlihat di layar yang sama.",
        },
        {
          title: "Pisahkan status pending dan selesai",
          description:
            "Sebelum pembayaran, UI menekankan syarat 10 USDT. Setelah pembayaran dikonfirmasi, fokus berpindah ke detail referral dan status selesai.",
        },
        {
          title: "Selesaikan dengan pembayaran terverifikasi",
          description:
            "Pendaftaran tidak hanya bergantung pada sukses transaksi di client, tetapi juga pada catatan pembayaran yang terverifikasi dan proses retry.",
        },
      ],
    },
    member: {
      title: "Registri anggota",
      eyebrow: "status pendaftaran",
      disconnected:
        "Setelah login email, status anggota Anda akan muncul di sini.",
      syncing:
        "Sedang memeriksa status pendaftaran. Setelah catatan pembayaran terverifikasi, pendaftaran akan selesai otomatis.",
      pending:
        "Pendaftaran masih pending. Kirim tepat 10 USDT dari wallet yang terhubung. Setelah pembayaran diverifikasi, pendaftaran akan selesai otomatis dan sistem akan memeriksa ulang jika terlambat.",
      synced:
        "Pembayaran 10 USDT telah dikonfirmasi, pendaftaran selesai, dan kode referral Anda sekarang aktif.",
      newMember: "Pendaftaran berhasil diselesaikan.",
      pendingValue: "Menunggu pembayaran",
      completedValue: "Pendaftaran selesai",
      celebrationTitle: "Pendaftaran selesai",
      celebrationDescription:
        "Transfer 10 USDT telah dikonfirmasi dan kode referral Anda sekarang aktif.",
      incomingReferralTitle: "Kode referral terdeteksi.",
      incomingReferralDescription:
        "Jika pendaftaran selesai di halaman ini, kode referral {code} akan disimpan pada data anggota.",
      incomingReferralLimitTitle:
        "Kode referral ini sudah penuh untuk pendaftaran langsung.",
      incomingReferralLimitDescription:
        "Kode referral {code} sudah memiliki {limit} pendaftaran langsung yang sedang berjalan atau sudah selesai. Anda tetap bisa lanjut mendaftar dari tautan ini, dan sistem akan otomatis mencari slot kosong berikutnya di bawah jaringan {code}.",
      selfReferralNotice:
        "Anda membuka tautan referral sendiri. Kredit referral tidak berlaku untuk pendaftaran Anda sendiri.",
      appliedReferralDescription:
        "Kode referral {code} diterapkan pada pendaftaran ini.",
      autoPlacementDescription:
        "Slot referral langsung sudah penuh, jadi sistem menempatkannya ke slot kosong di bawah kode jaringan {code} sesuai aturan auto-placement saat ini.",
      shareHint:
        "Bagikan tautan ini untuk membuka halaman pendaftaran dengan kode referral Anda yang sudah terpasang.",
      noReferralApplied: "Belum diterapkan",
      labels: {
        awaitingPaymentSince: "Menunggu pembayaran sejak",
        completionAt: "Pendaftaran selesai pada",
        destinationWallet: "Wallet tujuan",
        emailKey: "Kunci email",
        lastWallet: "Wallet yang digunakan",
        walletCount: "Jumlah wallet terhubung",
        lastConnectedAt: "Terakhir terhubung",
        paymentReceivedAt: "Pembayaran dikonfirmasi pada",
        paymentTransaction: "Transaksi",
        placementReferralCode: "Kode jaringan penempatan",
        referralCode: "Kode referral saya",
        referredByCode: "Kode referral yang diterapkan",
        referralLink: "Tautan referral",
        requiredDeposit: "Biaya pendaftaran",
        signupStatus: "Status pendaftaran",
        updatedAt: "Pembaruan terakhir",
      },
      actions: {
        openProjectWallet: "Lihat wallet proyek",
        refreshStatus: "Muat ulang status",
        viewReferrals: "Lihat anggota referral",
      },
      errors: {
        missingEmail:
          "Alamat email tidak dapat dibaca dari sesi wallet saat ini.",
        insufficientBalance:
          "Untuk melanjutkan pendaftaran, wallet yang terhubung harus memiliki setidaknya {amount} USDT.",
        projectWalletMissing: "PROJECT_WALLET belum dikonfigurasi.",
        referralLimitReached:
          "Kode referral {code} sudah memiliki {count} pendaftaran yang sedang berjalan atau sudah selesai dan sekarang penuh. Gunakan kode referral lain untuk mendaftar.",
        syncFailed:
          "Status anggota tidak dapat dikonfirmasi saat ini. Silakan coba lagi nanti.",
      },
    },
    referralsPage: {
      title: "Dashboard referral",
      eyebrow: "referral tracking",
      description:
        "Setelah pendaftaran selesai, lihat kode referral Anda dan daftar anggota yang mendaftar dengan kode tersebut.",
      shareTitle: "Kode referral saya",
      listTitle: "Anggota yang mendaftar dengan kode saya",
      rootLabel: "Pohon referral lengkap",
      branchEmpty:
        "Belum ada pendaftaran referral yang lebih dalam di bawah anggota ini.",
      depthHint: "Anda dapat menelusuri hingga {depth} level dalam satu layar.",
      firstLevelLimitHint:
        "Level 1 dapat menampung hingga {limit} anggota.",
      disconnected:
        "Login email dan selesaikan pendaftaran untuk melihat dashboard referral.",
      loading: "Memuat data referral.",
      empty: "Belum ada anggota yang mendaftar dengan kode referral Anda.",
      memberReady: "Kode referral anggota email ini sudah aktif.",
      memberMissing: "Sinkronkan ulang status anggota lalu coba lagi.",
      paymentRequired:
        "Pendaftaran belum selesai. Buka layar aktivasi untuk menyelesaikan pembayaran 10 USDT.",
      labels: {
        currentLevel: "Level saat ini",
        descendants: "Total jaringan bawah",
        directChildren: "Bawahan langsung",
        directReferrals: "Referral langsung",
        level: "Level",
        members: "anggota",
        referralCode: "Kode referral",
        referralLink: "Tautan bagikan",
        totalReferrals: "Jumlah referral",
        totalNetwork: "Total jaringan",
        lastWallet: "Wallet terbaru",
        locale: "Bahasa anggota",
        joinedAt: "Waktu bergabung",
        lastConnectedAt: "Terakhir terhubung",
      },
      actions: {
        backToRoot: "Kembali ke root",
        backHome: "Kembali ke beranda",
        completeSignup: "Selesaikan pendaftaran di layar aktivasi",
        refresh: "Segarkan",
        viewChildren: "Lihat bawahan",
      },
      rewards: {
        title: "Poin hadiah",
        description:
          "Setiap 1 anggota bawah menyelesaikan pendaftaran, upline G1 menerima 200 poin, sedangkan tiap level upline yang valid dari G2 hingga G6 menerima 80 poin.",
        empty: "Belum ada riwayat hadiah yang tercatat.",
        recentTitle: "Riwayat pembayaran terbaru",
        perSignup: "Aturan hadiah",
        points: "Poin",
        totalPoints: "Total poin",
        totalRewards: "Jumlah pembayaran",
        activeLevels: "Level aktif",
        sourceMember: "Anggota yang mendaftar",
        awardedAt: "Waktu pembayaran",
      },
      errors: {
        missingEmail:
          "Alamat email tidak dapat dibaca dari sesi wallet saat ini.",
        loadFailed: "Gagal memuat data referral.",
      },
    },
    signInMix: {
      title: "Alur pendaftaran",
      eyebrow: "signup checklist",
      methods: [
        "Login email",
        "Transfer 10 USDT",
        "Selesai setelah webhook terkonfirmasi",
      ],
    },
    notices: {
      copySuccess: "Alamat smart wallet telah disalin ke clipboard.",
      copyError:
        "Gagal menyalin alamat. Periksa izin browser Anda.",
    },
  };
}

const localeDictionaries: Record<Locale, Dictionary> = {
  ...dictionaries,
  vi: createVietnameseDictionary(dictionaries.en),
  id: createIndonesianDictionary(dictionaries.en),
};

export function hasLocale(locale: string): locale is Locale {
  return supportedLocales.includes(locale as Locale);
}

export function getDictionary(locale: Locale) {
  return localeDictionaries[locale];
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
