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
      previousPage: string;
      nextPage: string;
    };
    errors: {
      missingEmail: string;
      loadFailed: string;
    };
  };
  activateNetworkPage: {
    title: string;
    eyebrow: string;
    description: string;
    disconnected: string;
    loading: string;
    empty: string;
    memberMissing: string;
    paymentRequired: string;
    searchPlaceholder: string;
    selectionHint: string;
    leaderboardDescription: string;
    treeDescription: string;
    labels: {
      currentMember: string;
      descendants: string;
      directChildren: string;
      directMembers: string;
      joinedAt: string;
      lastConnectedAt: string;
      level: string;
      lifetimePoints: string;
      locale: string;
      membershipCard: string;
      memberStatus: string;
      pointTier: string;
      referralCode: string;
      searchResults: string;
      spendablePoints: string;
      tier: string;
      totalLifetimePoints: string;
      totalMembers: string;
      totalSpendablePoints: string;
      walletAddress: string;
    };
    actions: {
      backToActivate: string;
      openManagement: string;
      refresh: string;
    };
    notifications: {
      title: string;
      empty: string;
      loadMore: string;
      loadingMore: string;
      markAllRead: string;
      unreadCount: string;
      preferenceDirect: string;
      preferenceNetworkMembers: string;
      preferenceLevel: string;
      messages: {
        directMemberCompletedTitle: string;
        directMemberCompletedBody: string;
        networkMemberCompletedTitle: string;
        networkMemberCompletedBody: string;
        networkLevelCompletedTitle: string;
        networkLevelCompletedBody: string;
      };
    };
    errors: {
      loadFailed: string;
      missingEmail: string;
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
  bnbPage: {
    title: string;
    eyebrow: string;
    description: string;
    disconnected: string;
    loading: string;
    labels: {
      availableBalance: string;
      dailyChange: string;
      dailyRange: string;
      destination: string;
      lastUpdated: string;
      marketPair: string;
      marketSource: string;
      sendableAmount: string;
      spotPrice: string;
      valuation: string;
      walletAddress: string;
    };
    actions: {
      openBithumbTrade: string;
      refresh: string;
      sendAll: string;
    };
    placeholders: {
      destination: string;
    };
    errors: {
      insufficientBalance: string;
      invalidAddress: string;
      loadFailed: string;
      marketFailed: string;
      selfTransfer: string;
    };
    notices: {
      bithumbRecommendation: string;
      destinationWarning: string;
      exchangeHint: string;
      priceHint: string;
      sendHint: string;
      txConfirmed: string;
      txSent: string;
    };
  };
  rewardsPage: {
    title: string;
    eyebrow: string;
    description: string;
    disconnected: string;
    loading: string;
    paymentRequired: string;
    emptyHistory: string;
    emptyRedemptions: string;
    previewNote: string;
    labels: {
      spendablePoints: string;
      lifetimePoints: string;
      currentTier: string;
      membershipCard: string;
      nextTier: string;
      pointTier: string;
      pointsToNextTier: string;
      progress: string;
      rewardCatalog: string;
      rewardCost: string;
      earnHistory: string;
      redemptionHistory: string;
      maxTier: string;
    };
    actions: {
      backHome: string;
      completeSignup: string;
      openReferrals: string;
      refresh: string;
      redeem: string;
      redeeming: string;
    };
    errors: {
      missingEmail: string;
      loadFailed: string;
      catalogFailed: string;
      redemptionsFailed: string;
      redeemFailed: string;
    };
    notices: {
      redeemSuccess: string;
    };
    tiers: {
      basic: string;
      silver: string;
      gold: string;
      vip: string;
    };
    rewardTypes: {
      tierUpgrade: string;
      nftClaim: string;
      discountCoupon: string;
    };
    redemptionStatus: {
      pending: string;
      queued: string;
      completed: string;
      failed: string;
      cancelled: string;
    };
    history: {
      earn: string;
      adjustment: string;
      referralReward: string;
      adminAdjustment: string;
      levelReward: string;
      other: string;
      typeLabel: string;
      sourceLabel: string;
      detailsLabel: string;
      dateLabel: string;
      pointsLabel: string;
      previousPage: string;
      nextPage: string;
    };
    catalog: {
      previewNote: string;
      previewBadge: string;
      eligible: string;
      needMorePoints: string;
      empty: string;
      silverCard: {
        title: string;
        description: string;
      };
      goldCard: {
        title: string;
        description: string;
      };
      vipPass: {
        title: string;
        description: string;
      };
      serviceCredit: {
        title: string;
        description: string;
      };
    };
    silverClaim: {
      title: string;
      description: string;
      quoteNote: string;
      labels: {
        rewardValue: string;
        estimatedBnb: string;
        claimedBnb: string;
        estimatedKrw: string;
        usdtKrw: string;
        bnbKrw: string;
        destinationWallet: string;
        silverCardStatus: string;
        claimStatus: string;
        quotedAt: string;
      };
      actions: {
        open: string;
        claim: string;
        claiming: string;
        backToRewards: string;
        openTransaction: string;
      };
      statuses: {
        available: string;
        silverCardCompleted: string;
        silverCardRequired: string;
        pending: string;
        completed: string;
        failed: string;
      };
      messages: {
        requiresSignup: string;
        requiresSilverCard: string;
        missingWallet: string;
        alreadyClaimed: string;
        pending: string;
        failed: string;
        completed: string;
      };
      notices: {
        claimSuccess: string;
      };
      errors: {
        loadFailed: string;
        claimFailed: string;
      };
    };
  };
  playPage: {
    title: string;
    eyebrow: string;
    description: string;
    badge: string;
    disconnected: string;
    loading: string;
    requiresSignup: string;
    hero: {
      title: string;
      description: string;
      sideTitle: string;
      teamHint: string;
    };
    currency: {
      valueSingle: string;
      valuePlural: string;
      signedValueSingle: string;
      signedValuePlural: string;
      separateNotice: string;
    };
    labels: {
      activityPoints: string;
      todayPoints: string;
      streak: string;
      streakValue: string;
      teamBonus: string;
      dailyMissions: string;
      tapChallenge: string;
      tapProgress: string;
      history: string;
      dateKey: string;
      bestTap: string;
      bestTapValue: string;
    };
    actions: {
      backHome: string;
      completeSignup: string;
      checkIn: string;
      checkingIn: string;
      checkedIn: string;
      startTap: string;
      startingTap: string;
      tapMore: string;
      claimTapReward: string;
      finishingTap: string;
    };
    missions: {
      check_in: {
        title: string;
        description: string;
      };
      tap_challenge: {
        title: string;
        description: string;
      };
      team_bonus: {
        title: string;
        description: string;
      };
    };
    tap: {
      title: string;
      idleLabel: string;
      liveLabel: string;
      idleDescription: string;
      targetLabel: string;
      progressLabel: string;
      timerLabel: string;
      timerIdle: string;
      rewardLabel: string;
      remainingLabel: string;
      remainingValue: string;
    };
    history: {
      title: string;
      empty: string;
      checkIn: string;
      tapChallenge: string;
      teamBonus: string;
      teamBonusFallback: string;
    };
    notices: {
      checkInSuccess: string;
      tapStarted: string;
      tapSuccess: string;
      tapMissed: string;
      tapExpired: string;
    };
    errors: {
      missingEmail: string;
      loadFailed: string;
      checkInFailed: string;
      tapFailed: string;
      dailyLimitReached: string;
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
        previousPage: "이전 페이지",
        nextPage: "다음 페이지",
      },
      errors: {
        missingEmail: "현재 연결에서 이메일 주소를 확인하지 못했습니다.",
        loadFailed: "레퍼럴 데이터를 불러오지 못했습니다.",
      },
    },
    activateNetworkPage: {
      title: "내 코드 가입 회원 관리",
      eyebrow: "network control",
      description:
        "내 코드로 가입한 완료 회원의 조직도, 누적 포인트, 사용 가능 포인트, 포인트 등급, 카드 보유 상태를 한 화면에서 관리합니다.",
      disconnected:
        "이메일 로그인 후 내 코드 가입 회원 관리 페이지를 이용할 수 있습니다.",
      loading: "조직도 데이터를 불러오는 중입니다.",
      empty: "표시할 회원이 없습니다.",
      memberMissing: "회원 조직도 데이터를 찾을 수 없습니다.",
      paymentRequired:
        "회원가입 완료 후에만 내 코드 가입 회원 관리 페이지를 확인할 수 있습니다.",
      searchPlaceholder: "이메일, 레퍼럴 코드, 지갑 주소로 검색",
      selectionHint:
        "좌측 목록이나 하단 조직도에서 회원을 선택하면 누적 포인트, 포인트 등급, 카드 상태를 바로 확인할 수 있습니다.",
      leaderboardDescription:
        "포인트 순으로 정렬된 회원 목록입니다. 포인트 등급과 카드 보유 상태를 빠르게 확인할 수 있습니다.",
      treeDescription:
        "조직도를 단계별로 탐색하면서 각 회원의 포인트, 포인트 등급, 카드 상태를 함께 확인합니다.",
      labels: {
        currentMember: "선택 회원",
        descendants: "전체 하위",
        directChildren: "직접 하위",
        directMembers: "직접 가입 회원",
        joinedAt: "가입 완료 시각",
        lastConnectedAt: "최근 연결",
        level: "단계",
        lifetimePoints: "누적 포인트",
        locale: "회원 언어",
        membershipCard: "멤버 카드",
        memberStatus: "회원 상태",
        pointTier: "포인트 등급",
        referralCode: "레퍼럴 코드",
        searchResults: "회원 목록",
        spendablePoints: "사용 가능 포인트",
        tier: "회원 등급",
        totalLifetimePoints: "전체 누적 포인트",
        totalMembers: "전체 회원 수",
        totalSpendablePoints: "전체 사용 가능 포인트",
        walletAddress: "지갑 주소",
      },
      actions: {
        backToActivate: "활성화 화면으로",
        openManagement: "상세 관리",
        refresh: "새로고침",
      },
      notifications: {
        title: "알림 센터",
        empty: "아직 확인할 알림이 없습니다.",
        loadMore: "알림 더 보기",
        loadingMore: "알림 불러오는 중...",
        markAllRead: "모두 읽음",
        unreadCount: "{count}개의 읽지 않은 알림",
        preferenceDirect: "새 회원 활성화 알림",
        preferenceNetworkMembers: "하위 네트워크 활성화 알림",
        preferenceLevel: "단계 달성 알림",
        messages: {
          directMemberCompletedTitle: "새 회원 활성화 완료",
          directMemberCompletedBody:
            "{email} 님이 회원 활성화를 완료했습니다.",
          networkMemberCompletedTitle: "하위 네트워크 활성화 완료",
          networkMemberCompletedBody:
            "{email} 님이 내 네트워크 단계 {level}에서 회원 활성화를 완료했습니다.",
          networkLevelCompletedTitle: "단계 달성",
          networkLevelCompletedBody:
            "단계 {level}이 {count}/{target}명으로 가득 찼습니다.",
        },
      },
      errors: {
        loadFailed: "조직도 관리 데이터를 불러오지 못했습니다.",
        missingEmail: "현재 연결에서 이메일 주소를 확인하지 못했습니다.",
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
    bnbPage: {
      title: "BNB 관리",
      eyebrow: "live valuation",
      description:
        "내 스마트 월렛의 BNB 잔고와 빗썸 BNB/KRW 시세를 기준으로 실시간 평가금액을 확인합니다.",
      disconnected: "이메일 로그인 후 BNB 관리 페이지를 이용할 수 있습니다.",
      loading: "BNB 잔고를 불러오는 중입니다.",
      labels: {
        availableBalance: "보유 BNB",
        dailyChange: "24시간 변동",
        dailyRange: "24시간 범위",
        destination: "외부 지갑 주소",
        lastUpdated: "시세 갱신 시각",
        marketPair: "마켓",
        marketSource: "시세 출처",
        sendableAmount: "전체 출금 가능 수량",
        spotPrice: "BNB/KRW 실시간 시세",
        valuation: "원화 평가금액",
        walletAddress: "내 지갑 주소",
      },
      actions: {
        openBithumbTrade: "빗썸 거래 화면으로 이동",
        refresh: "시세 새로고침",
        sendAll: "전체 출금하기",
      },
      placeholders: {
        destination: "출금받을 외부 BNB 지갑 주소",
      },
      errors: {
        insufficientBalance: "출금할 BNB 잔고가 부족합니다.",
        invalidAddress: "유효한 BNB 지갑 주소를 입력하세요.",
        loadFailed: "BNB 잔고를 불러오지 못했습니다.",
        marketFailed: "빗썸 시세를 불러오지 못했습니다.",
        selfTransfer: "현재 연결된 내 지갑 주소로는 출금할 수 없습니다.",
      },
      notices: {
        bithumbRecommendation:
          "가능하면 본인 빗썸 BNB 입금 주소를 다시 확인한 뒤 사용하세요. 잘못된 주소로 보내는 실수를 줄일 수 있습니다.",
        destinationWarning:
          "외부 지갑 주소를 잘못 입력하면 자산이 영구적으로 분실될 수 있습니다. 출금 전에 주소를 반드시 다시 확인하세요.",
        exchangeHint:
          "BNB 보유 잔고를 확인한 뒤 빗썸 BNB/KRW 거래 화면으로 바로 이동해 실거래를 이어갈 수 있습니다.",
        priceHint:
          "빗썸 공개 BNB/KRW 체결 시세와 현재 지갑 잔고를 5초 단위로 다시 불러와 원화 평가금액을 반영합니다.",
        sendHint:
          "연결된 스마트 월렛의 BNB 잔고 전액을 외부 지갑으로 한 번에 출금합니다.",
        txConfirmed:
          "BNB 전체 출금이 확인되었습니다. 최신 잔고를 다시 반영합니다.",
        txSent:
          "BNB 전체 출금 요청을 보냈습니다. 온체인 반영 후 잔고가 다시 갱신됩니다.",
      },
    },
    rewardsPage: {
      title: "포인트 리워드",
      eyebrow: "points utility",
      description:
        "추천으로 쌓인 포인트를 확인하고, 다음 등급까지의 진행도를 보고, 교환 예정 리워드를 한눈에 확인합니다.",
      disconnected: "이메일 로그인 후 포인트 리워드 페이지를 확인할 수 있습니다.",
      loading: "포인트 데이터를 불러오는 중입니다.",
      paymentRequired:
        "아직 회원가입이 완료되지 않았습니다. 활성화 화면에서 가입을 먼저 완료하세요.",
      emptyHistory: "아직 적립된 포인트 이력이 없습니다.",
      emptyRedemptions: "아직 사용 또는 교환 이력이 없습니다.",
      previewNote:
        "조건을 충족한 리워드는 이 화면에서 바로 교환할 수 있으며, 처리 상태와 포인트 잔액이 즉시 반영됩니다.",
      labels: {
        spendablePoints: "사용 가능 포인트",
        lifetimePoints: "누적 적립 포인트",
        currentTier: "현재 등급",
        membershipCard: "보유 멤버 카드",
        nextTier: "다음 등급",
        pointTier: "현재 포인트 등급",
        pointsToNextTier: "{points}P 남음",
        progress: "등급 진행도",
        rewardCatalog: "리워드 카탈로그",
        rewardCost: "필요 포인트",
        earnHistory: "적립 이력",
        redemptionHistory: "사용 이력",
        maxTier: "최고 등급",
      },
      actions: {
        backHome: "홈으로 돌아가기",
        completeSignup: "활성화 화면으로 이동",
        openReferrals: "레퍼럴 보기",
        refresh: "새로고침",
        redeem: "리워드 교환",
        redeeming: "처리 중...",
      },
      errors: {
        missingEmail: "현재 연결에서 이메일 주소를 확인하지 못했습니다.",
        loadFailed: "포인트 데이터를 불러오지 못했습니다.",
        catalogFailed: "리워드 카탈로그를 불러오지 못했습니다.",
        redemptionsFailed: "포인트 사용 이력을 불러오지 못했습니다.",
        redeemFailed: "리워드 교환을 처리하지 못했습니다.",
      },
      notices: {
        redeemSuccess:
          "리워드 교환 요청이 반영되었습니다. 포인트 잔액과 사용 이력을 갱신했습니다.",
      },
      tiers: {
        basic: "Basic",
        silver: "Silver",
        gold: "Gold",
        vip: "VIP",
      },
      rewardTypes: {
        tierUpgrade: "등급 리워드",
        nftClaim: "NFT 패스",
        discountCoupon: "서비스 크레딧",
      },
      redemptionStatus: {
        pending: "대기",
        queued: "처리중",
        completed: "완료",
        failed: "실패",
        cancelled: "취소",
      },
      history: {
        earn: "적립",
        adjustment: "조정",
        referralReward: "추천 보상",
        adminAdjustment: "운영 조정",
        levelReward: "G{level} 보상",
        other: "기타",
        typeLabel: "유형",
        sourceLabel: "출처",
        detailsLabel: "상세",
        dateLabel: "적립 시각",
        pointsLabel: "포인트",
        previousPage: "이전 페이지",
        nextPage: "다음 페이지",
      },
      catalog: {
        previewNote:
          "사용 가능한 리워드는 여기서 바로 교환됩니다. 한 번 교환한 항목은 계정 기준으로 잠기고, 상태는 사용 이력에서 계속 추적됩니다.",
        previewBadge: "live",
        eligible: "도달 가능",
        needMorePoints: "{points}P 더 필요",
        empty: "표시할 리워드 항목이 없습니다.",
        silverCard: {
          title: "Silver 멤버 카드",
          description:
            "1,000P 도달 시 받을 수 있는 첫 등급 카드입니다. 등급 혜택과 온체인 멤버십의 시작점입니다.",
        },
        goldCard: {
          title: "Gold 멤버 카드",
          description:
            "5,000P 이상 회원을 위한 상위 등급 카드입니다. 더 높은 신뢰와 우선 혜택에 연결됩니다.",
        },
        vipPass: {
          title: "VIP 패스 NFT",
          description:
            "10,000P 이상에서 열리는 한정 패스입니다. 이벤트, 특별 드롭, 전용 권한용 리워드로 사용됩니다.",
        },
        serviceCredit: {
          title: "서비스 크레딧",
          description:
            "20,000P 이상에서 교환 가능한 사용형 크레딧입니다. 추후 결제 할인이나 서비스 이용권으로 연결됩니다.",
        },
      },
      silverClaim: {
        title: "Silver BNB 클레임",
        description:
          "Silver 멤버 카드 완료 회원에게 1회성으로 10 USD 상당의 BNB를 지급합니다.",
        quoteNote:
          "지급 수량은 Bithumb USDT/KRW 와 BNB/KRW 시세를 기준으로 지금 다시 계산됩니다.",
        labels: {
          rewardValue: "기준 보상",
          estimatedBnb: "예상 지급 BNB",
          claimedBnb: "지급 완료 BNB",
          estimatedKrw: "원화 환산",
          usdtKrw: "Bithumb USDT/KRW",
          bnbKrw: "Bithumb BNB/KRW",
          destinationWallet: "지급 대상 지갑",
          silverCardStatus: "Silver 카드 상태",
          claimStatus: "클레임 상태",
          quotedAt: "시세 기준 시각",
        },
        actions: {
          open: "BNB 클레임 보기",
          claim: "클레임 신청",
          claiming: "신청 처리 중...",
          backToRewards: "리워드로 돌아가기",
          openTransaction: "거래 보기",
        },
        statuses: {
          available: "클레임 가능",
          silverCardCompleted: "Silver 카드 완료",
          silverCardRequired: "Silver 카드 필요",
          pending: "처리 중",
          completed: "클레임 완료",
          failed: "재신청 가능",
        },
        messages: {
          requiresSignup:
            "회원가입 완료 후 Silver 카드 클레임을 진행할 수 있습니다.",
          requiresSilverCard:
            "먼저 Silver 멤버 카드를 완료해야 이 BNB 클레임을 신청할 수 있습니다.",
          missingWallet:
            "지급받을 회원 지갑 주소를 확인하지 못했습니다. 다시 로그인한 뒤 새로고침하세요.",
          alreadyClaimed: "이 Silver BNB 클레임은 이미 완료되었습니다.",
          pending: "현재 클레임 전송을 처리 중입니다. 잠시 후 다시 확인하세요.",
          failed: "이전 클레임이 실패했습니다. 내용을 확인한 뒤 다시 신청할 수 있습니다.",
          completed: "Silver BNB 클레임이 완료되었습니다.",
        },
        notices: {
          claimSuccess:
            "Silver BNB 클레임이 완료되었습니다. 최신 상태를 다시 반영했습니다.",
        },
        errors: {
          loadFailed: "Silver BNB 클레임 정보를 불러오지 못했습니다.",
          claimFailed: "Silver BNB 클레임을 처리하지 못했습니다.",
        },
      },
    },
    playPage: {
      title: "데일리 플레이",
      eyebrow: "activity loop",
      description:
        "출석, 탭 챌린지, 팀 보너스로 플레이 코인을 매일 쌓아가는 모바일 우선 플레이 허브입니다.",
      badge: "daily play",
      disconnected:
        "이메일 로그인 후 데일리 플레이에 참여할 수 있습니다.",
      loading: "데일리 플레이 데이터를 불러오는 중입니다.",
      requiresSignup:
        "회원가입 완료 후에만 데일리 플레이와 플레이 코인 적립을 이용할 수 있습니다.",
      hero: {
        title: "매일 참여할수록 플레이 코인이 쌓이는 데일리 플레이",
        description:
          "오늘 출석하고, 30초 탭 챌린지에 도전하고, 팀 활동 보너스까지 한 번에 챙기세요. 내가 움직일수록 쌓이고, 내 네트워크가 함께 움직일수록 더 커집니다.",
        sideTitle: "오늘의 미션 3개",
        teamHint:
          "내 하위 회원이 활동하면 G1, G2 상위 네트워크에도 플레이 코인이 적립됩니다.",
      },
      currency: {
        valueSingle: "{count}코인",
        valuePlural: "{count}코인",
        signedValueSingle: "+{count}코인",
        signedValuePlural: "+{count}코인",
        separateNotice: "리워드 포인트와 별도 적립",
      },
      labels: {
        activityPoints: "플레이 코인",
        todayPoints: "오늘 모은 코인",
        streak: "연속 출석",
        streakValue: "{days}일",
        teamBonus: "오늘 팀 보너스",
        dailyMissions: "오늘의 미션",
        tapChallenge: "탭 챌린지",
        tapProgress: "탭 진행도",
        history: "최근 적립",
        dateKey: "오늘 기준일",
        bestTap: "오늘 최고 탭",
        bestTapValue: "{count} taps",
      },
      actions: {
        backHome: "홈으로 돌아가기",
        completeSignup: "활성화 화면으로 이동",
        checkIn: "오늘 출석하기",
        checkingIn: "출석 처리 중...",
        checkedIn: "오늘 출석 완료",
        startTap: "30초 탭 챌린지 시작",
        startingTap: "챌린지 준비 중...",
        tapMore: "조금만 더 탭하기",
        claimTapReward: "1코인 받기",
        finishingTap: "결과 정리 중...",
      },
      missions: {
        check_in: {
          title: "오늘 출석",
          description: "하루 한 번 출석하면 즉시 플레이 코인을 적립합니다.",
        },
        tap_challenge: {
          title: "100탭 챌린지",
          description: "30초 안에 100회를 터치하면 1코인을 적립합니다.",
        },
        team_bonus: {
          title: "팀 활동 보너스",
          description: "하위 네트워크 활동이 있으면 오늘 보너스가 쌓입니다.",
        },
      },
      tap: {
        title: "30초 탭 챌린지",
        idleLabel: "ready",
        liveLabel: "live",
        idleDescription: "시작 버튼을 누르면 30초 동안 탭이 집계됩니다.",
        targetLabel: "목표 {target} taps",
        progressLabel: "{current} / {target}",
        timerLabel: "{seconds}s 남음",
        timerIdle: "대기 중",
        rewardLabel: "성공 보상",
        remainingLabel: "오늘 남은 보상",
        remainingValue: "{count}회",
      },
      history: {
        title: "최근 플레이 코인 적립",
        empty: "아직 플레이 코인 적립 내역이 없습니다.",
        checkIn: "오늘 출석 보상",
        tapChallenge: "탭 챌린지 성공",
        teamBonus: "팀 보너스 · {email} · G{level}",
        teamBonusFallback: "팀 활동 보너스",
      },
      notices: {
        checkInSuccess: "오늘 출석이 완료되어 {coins}이 적립되었습니다.",
        tapStarted: "탭 챌린지가 시작되었습니다. 30초 안에 100회를 채워보세요.",
        tapSuccess: "탭 챌린지 성공으로 {coins}이 적립되었습니다.",
        tapMissed: "이번에는 목표에 닿지 못했습니다. 다시 도전해보세요.",
        tapExpired: "챌린지 시간이 종료되었습니다. 결과를 정리했습니다.",
      },
      errors: {
        missingEmail: "현재 연결에서 이메일 주소를 확인하지 못했습니다.",
        loadFailed: "데일리 플레이 데이터를 불러오지 못했습니다.",
        checkInFailed: "오늘 출석을 처리하지 못했습니다.",
        tapFailed: "탭 챌린지를 처리하지 못했습니다.",
        dailyLimitReached: "오늘 받을 수 있는 탭 보상 횟수를 모두 사용했습니다.",
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
        previousPage: "Previous page",
        nextPage: "Next page",
      },
      errors: {
        missingEmail: "Could not resolve the authenticated email address from the current wallet session.",
        loadFailed: "Failed to load referral data.",
      },
    },
    activateNetworkPage: {
      title: "Referral Member Management",
      eyebrow: "network control",
      description:
        "Manage the completed members who joined with your code, including network structure, lifetime points, spendable points, point tier, and member card status.",
      disconnected:
        "Sign in with email to manage the members who joined with your code.",
      loading: "Loading referral network data.",
      empty: "There are no members to display.",
      memberMissing: "Referral network data could not be found.",
      paymentRequired:
        "This page becomes available after your signup is completed.",
      searchPlaceholder: "Search by email, referral code, or wallet address",
      selectionHint:
        "Pick a member from the list or network map to review points, point tier, card status, and network depth instantly.",
      leaderboardDescription:
        "Members sorted by points so you can review point tier and card status quickly.",
      treeDescription:
        "Explore the network by level while checking each member's points, point tier, and card status.",
      labels: {
        currentMember: "Selected member",
        descendants: "Descendants",
        directChildren: "Direct children",
        directMembers: "Direct signups",
        joinedAt: "Joined at",
        lastConnectedAt: "Last connected",
        level: "Level",
        lifetimePoints: "Lifetime points",
        locale: "Member locale",
        membershipCard: "Member card",
        memberStatus: "Member status",
        pointTier: "Point tier",
        referralCode: "Referral code",
        searchResults: "Member list",
        spendablePoints: "Spendable points",
        tier: "Tier",
        totalLifetimePoints: "Total lifetime points",
        totalMembers: "Total members",
        totalSpendablePoints: "Total spendable points",
        walletAddress: "Wallet address",
      },
      actions: {
        backToActivate: "Back to activation",
        openManagement: "Open management",
        refresh: "Refresh",
      },
      notifications: {
        title: "Notification center",
        empty: "There are no alerts to review yet.",
        loadMore: "Load more alerts",
        loadingMore: "Loading more alerts...",
        markAllRead: "Mark all read",
        unreadCount: "{count} unread alerts",
        preferenceDirect: "New member activation alerts",
        preferenceNetworkMembers: "Downline activation alerts",
        preferenceLevel: "Level milestone alerts",
        messages: {
          directMemberCompletedTitle: "New member activated",
          directMemberCompletedBody:
            "{email} completed member activation.",
          networkMemberCompletedTitle: "Downline member activated",
          networkMemberCompletedBody:
            "{email} completed activation in level {level} of your network.",
          networkLevelCompletedTitle: "Level milestone reached",
          networkLevelCompletedBody:
            "Level {level} is now full at {count}/{target} members.",
        },
      },
      errors: {
        loadFailed: "Failed to load referral management data.",
        missingEmail:
          "Unable to read the email address from the current wallet session.",
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
    bnbPage: {
      title: "BNB Valuation",
      eyebrow: "live valuation",
      description:
        "Track the BNB balance in your smart wallet alongside the live BNB/KRW price from Bithumb and the estimated KRW value.",
      disconnected: "Sign in with email to use the BNB valuation page.",
      loading: "Loading BNB balance.",
      labels: {
        availableBalance: "Available balance",
        dailyChange: "24h change",
        dailyRange: "24h range",
        destination: "External wallet address",
        lastUpdated: "Price updated",
        marketPair: "Market",
        marketSource: "Price source",
        sendableAmount: "Sendable amount",
        spotPrice: "Live BNB/KRW",
        valuation: "Estimated KRW value",
        walletAddress: "Wallet address",
      },
      actions: {
        openBithumbTrade: "Open Bithumb trade",
        refresh: "Refresh price",
        sendAll: "Withdraw full balance",
      },
      placeholders: {
        destination: "External BNB wallet address",
      },
      errors: {
        insufficientBalance: "There is not enough BNB available to withdraw.",
        invalidAddress: "Enter a valid BNB wallet address.",
        loadFailed: "Failed to load BNB balance.",
        marketFailed: "Failed to load the Bithumb BNB/KRW price.",
        selfTransfer: "You cannot withdraw to the currently connected wallet address.",
      },
      notices: {
        bithumbRecommendation:
          "If possible, use your own verified Bithumb BNB deposit address to reduce the risk of copying the wrong address.",
        destinationWarning:
          "A wrong external wallet address can cause permanent asset loss. Verify the destination carefully before sending.",
        exchangeHint:
          "Review your BNB balance, then jump straight into the official Bithumb BNB/KRW trading screen.",
        priceHint:
          "The wallet balance and Bithumb public BNB/KRW spot price are refreshed every five seconds for a live KRW estimate.",
        sendHint:
          "Send the entire BNB balance from the connected smart wallet to one external address in a single transaction.",
        txConfirmed:
          "The full BNB withdrawal was confirmed. Reloading the latest balance now.",
        txSent:
          "The full BNB withdrawal was submitted. The balance will refresh after it lands onchain.",
      },
    },
    rewardsPage: {
      title: "Points Rewards",
      eyebrow: "points utility",
      description:
        "Review your referral points, track the next tier target, and see the reward catalog that those points unlock.",
      disconnected: "Sign in with email to view your points rewards.",
      loading: "Loading points data.",
      paymentRequired:
        "Your signup is not complete yet. Finish the activation flow first.",
      emptyHistory: "No point earnings have been recorded yet.",
      emptyRedemptions: "There are no redemption events yet.",
      previewNote:
        "Eligible rewards can now be redeemed directly from this page, with status and point balance updating immediately.",
      labels: {
        spendablePoints: "Spendable points",
        lifetimePoints: "Lifetime points",
        currentTier: "Current tier",
        membershipCard: "Member card",
        nextTier: "Next tier",
        pointTier: "Current point tier",
        pointsToNextTier: "{points}P left",
        progress: "Tier progress",
        rewardCatalog: "Reward catalog",
        rewardCost: "Required points",
        earnHistory: "Earning history",
        redemptionHistory: "Redemption history",
        maxTier: "Top tier",
      },
      actions: {
        backHome: "Back home",
        completeSignup: "Open activation",
        openReferrals: "Open referrals",
        refresh: "Refresh",
        redeem: "Redeem reward",
        redeeming: "Processing...",
      },
      errors: {
        missingEmail:
          "Could not resolve the authenticated email address from the current wallet session.",
        loadFailed: "Failed to load points data.",
        catalogFailed: "Failed to load the reward catalog.",
        redemptionsFailed: "Failed to load reward redemption history.",
        redeemFailed: "Failed to redeem the selected reward.",
      },
      notices: {
        redeemSuccess:
          "The redemption request was applied. Points balance and history are up to date.",
      },
      tiers: {
        basic: "Basic",
        silver: "Silver",
        gold: "Gold",
        vip: "VIP",
      },
      rewardTypes: {
        tierUpgrade: "Tier reward",
        nftClaim: "NFT pass",
        discountCoupon: "Service credit",
      },
      redemptionStatus: {
        pending: "Pending",
        queued: "Queued",
        completed: "Completed",
        failed: "Failed",
        cancelled: "Cancelled",
      },
      history: {
        earn: "Earn",
        adjustment: "Adjustment",
        referralReward: "Referral reward",
        adminAdjustment: "Admin adjustment",
        levelReward: "Level G{level} reward",
        other: "Other",
        typeLabel: "Type",
        sourceLabel: "Source",
        detailsLabel: "Details",
        dateLabel: "Date",
        pointsLabel: "Points",
        previousPage: "Previous page",
        nextPage: "Next page",
      },
      catalog: {
        previewNote:
          "Available rewards can be claimed here directly. Once a reward is redeemed, it stays locked to the current member account and remains visible in redemption history.",
        previewBadge: "live",
        eligible: "Eligible",
        needMorePoints: "{points}P more needed",
        empty: "No reward catalog items are available.",
        silverCard: {
          title: "Silver Member Card",
          description:
            "Your first loyalty tier at 1,000P. It marks the beginning of visible member benefits and onchain identity.",
        },
        goldCard: {
          title: "Gold Member Card",
          description:
            "A higher status card unlocked at 5,000P for members with stronger network contribution.",
        },
        vipPass: {
          title: "VIP Pass NFT",
          description:
            "A limited reward unlocked at 10,000P for premium events, special drops, and gated access.",
        },
        serviceCredit: {
          title: "Service Credit",
          description:
            "A 20,000P milestone reward intended for future discounts, credits, or paid feature usage.",
        },
      },
      silverClaim: {
        title: "Silver BNB Claim",
        description:
          "Members with a completed Silver member card can claim a one-time BNB payout equal to 10 USD.",
        quoteNote:
          "The payout amount is recalculated from the current Bithumb USDT/KRW and BNB/KRW market prices.",
        labels: {
          rewardValue: "Reward baseline",
          estimatedBnb: "Estimated BNB payout",
          claimedBnb: "BNB paid",
          estimatedKrw: "Estimated KRW value",
          usdtKrw: "Bithumb USDT/KRW",
          bnbKrw: "Bithumb BNB/KRW",
          destinationWallet: "Destination wallet",
          silverCardStatus: "Silver card status",
          claimStatus: "Claim status",
          quotedAt: "Quoted at",
        },
        actions: {
          open: "Open BNB claim",
          claim: "Submit claim",
          claiming: "Submitting...",
          backToRewards: "Back to rewards",
          openTransaction: "View transaction",
        },
        statuses: {
          available: "Claim available",
          silverCardCompleted: "Silver card completed",
          silverCardRequired: "Silver card required",
          pending: "In progress",
          completed: "Claim completed",
          failed: "Retry available",
        },
        messages: {
          requiresSignup:
            "Finish signup before requesting the Silver BNB claim.",
          requiresSilverCard:
            "Complete the Silver member card first to unlock this BNB claim.",
          missingWallet:
            "No eligible member wallet address is available yet. Sign in again and refresh.",
          alreadyClaimed: "This Silver BNB claim has already been completed.",
          pending:
            "The Silver BNB claim transfer is still being processed. Check again shortly.",
          failed:
            "The previous Silver BNB claim attempt failed. Review the details and try again.",
          completed: "The Silver BNB claim is complete.",
        },
        notices: {
          claimSuccess:
            "The Silver BNB claim is complete and the latest status has been refreshed.",
        },
        errors: {
          loadFailed: "Failed to load the Silver BNB claim.",
          claimFailed: "Failed to process the Silver BNB claim.",
        },
      },
    },
    playPage: {
      title: "Daily Play",
      eyebrow: "activity loop",
      description:
        "A mobile-first play hub for collecting play coins through daily check-ins, tap challenges, and team bonuses.",
      badge: "daily play",
      disconnected: "Sign in with email to open Daily Play.",
      loading: "Loading Daily Play data.",
      requiresSignup:
        "Finish signup before joining Daily Play and earning play coins.",
      hero: {
        title: "A mobile loop that gives members a reason to come back every day",
        description:
          "Check in, clear a 30-second tap challenge, and collect team bonuses from one compact screen. The more you play, the more play coins stack up for you and your network.",
        sideTitle: "3 missions today",
        teamHint:
          "When your downline stays active, G1 and G2 uplines also collect play coins.",
      },
      currency: {
        valueSingle: "{count} coin",
        valuePlural: "{count} coins",
        signedValueSingle: "+{count} coin",
        signedValuePlural: "+{count} coins",
        separateNotice: "Tracked separately from reward points",
      },
      labels: {
        activityPoints: "Play coins",
        todayPoints: "Coins earned today",
        streak: "Check-in streak",
        streakValue: "{days} days",
        teamBonus: "Team bonus today",
        dailyMissions: "Daily missions",
        tapChallenge: "Tap challenge",
        tapProgress: "Tap progress",
        history: "Recent rewards",
        dateKey: "Today key",
        bestTap: "Best taps today",
        bestTapValue: "{count} taps",
      },
      actions: {
        backHome: "Back home",
        completeSignup: "Go to activate",
        checkIn: "Check in today",
        checkingIn: "Checking in...",
        checkedIn: "Checked in today",
        startTap: "Start 30s tap challenge",
        startingTap: "Preparing challenge...",
        tapMore: "Tap a little more",
        claimTapReward: "Claim 1 coin",
        finishingTap: "Finishing...",
      },
      missions: {
        check_in: {
          title: "Daily check-in",
          description: "Check in once per day for an instant play coin boost.",
        },
        tap_challenge: {
          title: "100 tap challenge",
          description: "Reach 100 taps in 30 seconds to earn 1 coin.",
        },
        team_bonus: {
          title: "Team bonus",
          description: "Downline activity can unlock extra play coins for today.",
        },
      },
      tap: {
        title: "30-second tap challenge",
        idleLabel: "ready",
        liveLabel: "live",
        idleDescription: "Press start to open a 30-second tap window.",
        targetLabel: "Target {target} taps",
        progressLabel: "{current} / {target}",
        timerLabel: "{seconds}s left",
        timerIdle: "Standby",
        rewardLabel: "Reward",
        remainingLabel: "Remaining today",
        remainingValue: "{count} left",
      },
      history: {
        title: "Recent play coin rewards",
        empty: "No play coin history yet.",
        checkIn: "Daily check-in reward",
        tapChallenge: "Tap challenge success",
        teamBonus: "Team bonus · {email} · G{level}",
        teamBonusFallback: "Team activity bonus",
      },
      notices: {
        checkInSuccess: "Daily check-in completed. {coins} was added.",
        tapStarted: "Tap challenge started. Try to reach 100 taps in 30 seconds.",
        tapSuccess: "Tap challenge complete. {coins} was added.",
        tapMissed: "You missed the target this round. Try again.",
        tapExpired: "The challenge timer ended and your result was saved.",
      },
      errors: {
        missingEmail: "The connected session did not return an email address.",
        loadFailed: "Failed to load Daily Play data.",
        checkInFailed: "Failed to complete the daily check-in.",
        tapFailed: "Failed to process the tap challenge.",
        dailyLimitReached: "You already used all tap rewards for today.",
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
        previousPage: "前のページ",
        nextPage: "次のページ",
      },
      errors: {
        missingEmail: "現在のウォレット接続からメールアドレスを取得できませんでした。",
        loadFailed: "レファラルデータの読み込みに失敗しました。",
      },
    },
    activateNetworkPage: {
      title: "紹介会員管理",
      eyebrow: "network control",
      description:
        "自分のコードで登録した完了会員の組織図、累計ポイント、利用可能ポイント、ポイント等級、カード保有状態をまとめて管理します。",
      disconnected:
        "紹介会員管理ページを利用するにはメールログインしてください。",
      loading: "組織図データを読み込んでいます。",
      empty: "表示できる会員がありません。",
      memberMissing: "組織データが見つかりませんでした。",
      paymentRequired:
        "登録完了後にのみ紹介会員管理ページを確認できます。",
      searchPlaceholder: "メール、紹介コード、ウォレットで検索",
      selectionHint:
        "左の一覧または下の組織図から会員を選ぶと、ポイント、ポイント等級、カード状態をすぐ確認できます。",
      leaderboardDescription:
        "ポイント順に並んだ会員一覧です。ポイント等級とカード保有状態を素早く確認できます。",
      treeDescription:
        "組織図を段階ごとに辿りながら、各会員のポイント、ポイント等級、カード状態を確認します。",
      labels: {
        currentMember: "選択中の会員",
        descendants: "全下位",
        directChildren: "直接下位",
        directMembers: "直接登録会員",
        joinedAt: "登録完了日時",
        lastConnectedAt: "最終接続",
        level: "段階",
        lifetimePoints: "累計ポイント",
        locale: "会員言語",
        membershipCard: "メンバーカード",
        memberStatus: "会員状態",
        pointTier: "ポイント等級",
        referralCode: "紹介コード",
        searchResults: "会員一覧",
        spendablePoints: "利用可能ポイント",
        tier: "等級",
        totalLifetimePoints: "全体累計ポイント",
        totalMembers: "全体会員数",
        totalSpendablePoints: "全体利用可能ポイント",
        walletAddress: "ウォレットアドレス",
      },
      actions: {
        backToActivate: "アクティベーションへ戻る",
        openManagement: "詳細管理",
        refresh: "更新",
      },
      notifications: {
        title: "通知センター",
        empty: "確認できる通知はまだありません。",
        loadMore: "通知をさらに表示",
        loadingMore: "通知を読み込み中...",
        markAllRead: "すべて既読",
        unreadCount: "未読 {count} 件",
        preferenceDirect: "新規会員の有効化通知",
        preferenceNetworkMembers: "下位ネットワークの有効化通知",
        preferenceLevel: "段階達成通知",
        messages: {
          directMemberCompletedTitle: "新規会員の有効化完了",
          directMemberCompletedBody:
            "{email} さんの会員有効化が完了しました。",
          networkMemberCompletedTitle: "下位ネットワークの有効化完了",
          networkMemberCompletedBody:
            "{email} さんがあなたのネットワークの段階 {level} で会員有効化を完了しました。",
          networkLevelCompletedTitle: "段階達成",
          networkLevelCompletedBody:
            "段階 {level} が {count}/{target} 人で満員になりました。",
        },
      },
      errors: {
        loadFailed: "組織管理データを読み込めませんでした。",
        missingEmail:
          "現在のウォレット接続からメールアドレスを取得できませんでした。",
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
    bnbPage: {
      title: "BNB 評価",
      eyebrow: "live valuation",
      description:
        "スマートウォレット内の BNB 残高と Bithumb の BNB/KRW レートを合わせて、現在の評価額をリアルタイムで確認します。",
      disconnected:
        "BNB 評価ページを利用するにはメールログインしてください。",
      loading: "BNB 残高を読み込んでいます。",
      labels: {
        availableBalance: "保有 BNB",
        dailyChange: "24時間変動",
        dailyRange: "24時間レンジ",
        destination: "外部ウォレットアドレス",
        lastUpdated: "更新時刻",
        marketPair: "マーケット",
        marketSource: "価格ソース",
        sendableAmount: "全額出金可能数量",
        spotPrice: "BNB/KRW リアルタイム価格",
        valuation: "推定 KRW 評価額",
        walletAddress: "ウォレットアドレス",
      },
      actions: {
        openBithumbTrade: "Bithumb 取引画面を開く",
        refresh: "価格を更新",
        sendAll: "全額出金する",
      },
      placeholders: {
        destination: "出金先の外部 BNB ウォレットアドレス",
      },
      errors: {
        insufficientBalance: "出金できる BNB 残高が不足しています。",
        invalidAddress: "有効な BNB ウォレットアドレスを入力してください。",
        loadFailed: "BNB 残高を読み込めませんでした。",
        marketFailed: "Bithumb の BNB/KRW 価格を取得できませんでした。",
        selfTransfer:
          "現在接続中の自分のウォレットアドレスには出金できません。",
      },
      notices: {
        bithumbRecommendation:
          "できるだけ自分の Bithumb BNB 入金アドレスを再確認してから使ってください。誤ったアドレスへの送信を減らせます。",
        destinationWarning:
          "外部ウォレットアドレスを誤入力すると資産を永久に失う可能性があります。送信前に必ず再確認してください。",
        exchangeHint:
          "保有 BNB を確認した後、そのまま Bithumb の BNB/KRW 取引画面へ移動できます。",
        priceHint:
          "ウォレット残高と Bithumb 公開 BNB/KRW 価格を 5 秒ごとに再取得し、現在の KRW 評価額を反映します。",
        sendHint:
          "接続中のスマートウォレットにある BNB 残高全額を、外部ウォレットへ一度に出金します。",
        txConfirmed:
          "BNB 全額出金が確認されました。最新残高を再反映します。",
        txSent:
          "BNB 全額出金リクエストを送信しました。オンチェーン反映後に残高が更新されます。",
      },
    },
    rewardsPage: {
      title: "ポイントリワード",
      eyebrow: "points utility",
      description:
        "紹介で積み上がったポイント、次の等級までの進行度、到達可能なリワードをまとめて確認します。",
      disconnected:
        "ポイントリワードを確認するにはメールログインしてください。",
      loading: "ポイントデータを読み込んでいます。",
      paymentRequired:
        "まだ会員登録が完了していません。先にアクティベーションを完了してください。",
      emptyHistory: "まだポイント積立履歴はありません。",
      emptyRedemptions: "まだ使用または交換履歴はありません。",
      previewNote:
        "条件を満たしたリワードはこの画面から直接交換でき、処理状態とポイント残高がすぐに反映されます。",
      labels: {
        spendablePoints: "利用可能ポイント",
        lifetimePoints: "累計ポイント",
        currentTier: "現在の等級",
        membershipCard: "保有メンバーカード",
        nextTier: "次の等級",
        pointTier: "現在のポイント等級",
        pointsToNextTier: "あと {points}P",
        progress: "等級進行度",
        rewardCatalog: "リワードカタログ",
        rewardCost: "必要ポイント",
        earnHistory: "積立履歴",
        redemptionHistory: "使用履歴",
        maxTier: "最高等級",
      },
      actions: {
        backHome: "ホームへ戻る",
        completeSignup: "アクティベーションへ",
        openReferrals: "レファラルを見る",
        refresh: "更新",
        redeem: "リワード交換",
        redeeming: "処理中...",
      },
      errors: {
        missingEmail:
          "現在のウォレット接続からメールアドレスを取得できませんでした。",
        loadFailed: "ポイントデータを読み込めませんでした。",
        catalogFailed: "リワードカタログを読み込めませんでした。",
        redemptionsFailed: "リワード使用履歴を読み込めませんでした。",
        redeemFailed: "リワード交換を処理できませんでした。",
      },
      notices: {
        redeemSuccess:
          "リワード交換リクエストが反映されました。ポイント残高と使用履歴を更新しました。",
      },
      tiers: {
        basic: "Basic",
        silver: "Silver",
        gold: "Gold",
        vip: "VIP",
      },
      rewardTypes: {
        tierUpgrade: "等級リワード",
        nftClaim: "NFT パス",
        discountCoupon: "サービスクレジット",
      },
      redemptionStatus: {
        pending: "待機",
        queued: "処理中",
        completed: "完了",
        failed: "失敗",
        cancelled: "取消",
      },
      history: {
        earn: "積立",
        adjustment: "調整",
        referralReward: "紹介報酬",
        adminAdjustment: "運営調整",
        levelReward: "G{level} 報酬",
        other: "その他",
        typeLabel: "区分",
        sourceLabel: "発生元",
        detailsLabel: "詳細",
        dateLabel: "積立日時",
        pointsLabel: "ポイント",
        previousPage: "前のページ",
        nextPage: "次のページ",
      },
      catalog: {
        previewNote:
          "利用可能なリワードはここで直接交換されます。一度交換した項目は会員アカウントに紐づき、使用履歴で継続して追跡できます。",
        previewBadge: "live",
        eligible: "到達可能",
        needMorePoints: "あと {points}P 必要",
        empty: "表示できるリワード項目がありません。",
        silverCard: {
          title: "Silver メンバーカード",
          description:
            "1,000P で到達する最初の等級カードです。会員特典とオンチェーン会員証明の出発点です。",
        },
        goldCard: {
          title: "Gold メンバーカード",
          description:
            "5,000P で開放される上位等級カードです。より高い信頼と優先特典につながります。",
        },
        vipPass: {
          title: "VIP パス NFT",
          description:
            "10,000P で開く限定パスです。イベント、特別ドロップ、専用アクセス向けのリワードです。",
        },
        serviceCredit: {
          title: "サービスクレジット",
          description:
            "20,000P 到達時に目指せる使用型クレジットです。将来の割引や有料機能利用に接続されます。",
        },
      },
      silverClaim: {
        title: "Silver BNB クレーム",
        description:
          "Silver メンバーカードを完了した会員は、10 USD 相当の BNB を一度だけクレームできます。",
        quoteNote:
          "支給数量は Bithumb の USDT/KRW と BNB/KRW の現在価格を基準に再計算されます。",
        labels: {
          rewardValue: "基準報酬",
          estimatedBnb: "推定 BNB 支給量",
          claimedBnb: "支給済み BNB",
          estimatedKrw: "KRW 換算額",
          usdtKrw: "Bithumb USDT/KRW",
          bnbKrw: "Bithumb BNB/KRW",
          destinationWallet: "受取ウォレット",
          silverCardStatus: "Silver カード状態",
          claimStatus: "クレーム状態",
          quotedAt: "価格基準時刻",
        },
        actions: {
          open: "BNB クレームを見る",
          claim: "クレーム申請",
          claiming: "申請処理中...",
          backToRewards: "リワードへ戻る",
          openTransaction: "取引を見る",
        },
        statuses: {
          available: "クレーム可能",
          silverCardCompleted: "Silver カード完了",
          silverCardRequired: "Silver カードが必要",
          pending: "処理中",
          completed: "クレーム完了",
          failed: "再申請可能",
        },
        messages: {
          requiresSignup:
            "Silver BNB クレームを申請するには先に登録を完了してください。",
          requiresSilverCard:
            "この BNB クレームを利用するには、先に Silver メンバーカードを完了してください。",
          missingWallet:
            "受取先の会員ウォレットアドレスを確認できません。再ログインして更新してください。",
          alreadyClaimed: "この Silver BNB クレームはすでに完了しています。",
          pending:
            "Silver BNB クレームの送金を処理中です。しばらくしてから再確認してください。",
          failed:
            "前回の Silver BNB クレームは失敗しました。内容を確認して再申請できます。",
          completed: "Silver BNB クレームが完了しました。",
        },
        notices: {
          claimSuccess:
            "Silver BNB クレームが完了し、最新状態を再反映しました。",
        },
        errors: {
          loadFailed: "Silver BNB クレーム情報を読み込めませんでした。",
          claimFailed: "Silver BNB クレームを処理できませんでした。",
        },
      },
    },
    playPage: {
      title: "デイリープレイ",
      eyebrow: "activity loop",
      description:
        "毎日の出席、タップチャレンジ、チームボーナスでプレイコインを集めるモバイル優先のプレイハブです。",
      badge: "daily play",
      disconnected: "メールログイン後にデイリープレイへ参加できます。",
      loading: "デイリープレイのデータを読み込み中です。",
      requiresSignup:
        "会員登録完了後にのみ、デイリープレイとプレイコインの獲得を利用できます。",
      hero: {
        title: "毎日戻ってきたくなるモバイルプレイループ",
        description:
          "出席、30秒タップチャレンジ、チームボーナスを 1 画面で素早く確認してすぐ参加できます。参加するほどプレイコインが増え、ネットワークが動くほどさらに広がります。",
        sideTitle: "今日のミッション 3つ",
        teamHint:
          "下位メンバーが活動すると、G1 と G2 の上位ネットワークにもプレイコインが入ります。",
      },
      currency: {
        valueSingle: "{count}コイン",
        valuePlural: "{count}コイン",
        signedValueSingle: "+{count}コイン",
        signedValuePlural: "+{count}コイン",
        separateNotice: "リワードポイントとは別で積み立て",
      },
      labels: {
        activityPoints: "プレイコイン",
        todayPoints: "今日の獲得コイン",
        streak: "連続出席",
        streakValue: "{days}日",
        teamBonus: "今日のチームボーナス",
        dailyMissions: "今日のミッション",
        tapChallenge: "タップチャレンジ",
        tapProgress: "タップ進行度",
        history: "最近の獲得",
        dateKey: "本日基準日",
        bestTap: "今日の最高タップ",
        bestTapValue: "{count} taps",
      },
      actions: {
        backHome: "ホームへ戻る",
        completeSignup: "有効化画面へ移動",
        checkIn: "今日の出席",
        checkingIn: "出席処理中...",
        checkedIn: "今日の出席完了",
        startTap: "30秒タップチャレンジ開始",
        startingTap: "準備中...",
        tapMore: "もう少しタップ",
        claimTapReward: "1コイン受け取る",
        finishingTap: "結果を整理中...",
      },
      missions: {
        check_in: {
          title: "今日の出席",
          description: "1日1回の出席でプレイコインを即時に獲得します。",
        },
        tap_challenge: {
          title: "100タップチャレンジ",
          description: "30秒以内に100回タップすると 1コインを獲得できます。",
        },
        team_bonus: {
          title: "チームボーナス",
          description: "下位ネットワークの活動があると今日のボーナスが増えます。",
        },
      },
      tap: {
        title: "30秒タップチャレンジ",
        idleLabel: "ready",
        liveLabel: "live",
        idleDescription: "開始を押すと 30 秒間のタップ集計が始まります。",
        targetLabel: "目標 {target} taps",
        progressLabel: "{current} / {target}",
        timerLabel: "残り {seconds}s",
        timerIdle: "待機中",
        rewardLabel: "成功報酬",
        remainingLabel: "今日の残り",
        remainingValue: "{count}回",
      },
      history: {
        title: "最近のプレイコイン獲得",
        empty: "まだプレイコインの履歴がありません。",
        checkIn: "今日の出席報酬",
        tapChallenge: "タップチャレンジ成功",
        teamBonus: "チームボーナス · {email} · G{level}",
        teamBonusFallback: "チーム活動ボーナス",
      },
      notices: {
        checkInSuccess: "今日の出席が完了し、{coins}が積み立てられました。",
        tapStarted:
          "タップチャレンジが始まりました。30秒以内に100回を目指してください。",
        tapSuccess: "タップチャレンジ成功で {coins}が積み立てられました。",
        tapMissed: "今回は目標に届きませんでした。もう一度挑戦してください。",
        tapExpired: "チャレンジ時間が終了し、結果を保存しました。",
      },
      errors: {
        missingEmail: "現在の接続からメールアドレスを取得できませんでした。",
        loadFailed: "デイリープレイのデータを読み込めませんでした。",
        checkInFailed: "今日の出席を処理できませんでした。",
        tapFailed: "タップチャレンジを処理できませんでした。",
        dailyLimitReached: "今日受け取れるタップ報酬をすべて使い切りました。",
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
        previousPage: "上一页",
        nextPage: "下一页",
      },
      errors: {
        missingEmail: "当前钱包会话中未能解析出邮箱地址。",
        loadFailed: "加载推荐数据失败。",
      },
    },
    activateNetworkPage: {
      title: "我的推荐会员管理",
      eyebrow: "network control",
      description:
        "集中管理通过你的代码完成注册的会员组织图，并查看每位会员的累计积分、可用积分、积分等级和卡片持有状态。",
      disconnected: "请先通过邮箱登录后再使用推荐会员管理页面。",
      loading: "正在加载组织图数据。",
      empty: "暂无可显示的会员。",
      memberMissing: "找不到推荐网络数据。",
      paymentRequired: "只有在你的注册完成后才能查看此管理页面。",
      searchPlaceholder: "通过邮箱、推荐码或钱包地址搜索",
      selectionHint:
        "从左侧列表或下方组织图中选择会员，即可立即查看积分、积分等级、卡片状态和层级结构。",
      leaderboardDescription:
        "按积分排序的会员列表，方便快速查看积分等级和卡片状态。",
      treeDescription:
        "按层级浏览组织图，同时查看每位会员的积分、积分等级和卡片状态。",
      labels: {
        currentMember: "当前选中会员",
        descendants: "全部下级",
        directChildren: "直属下级",
        directMembers: "直属注册会员",
        joinedAt: "完成注册时间",
        lastConnectedAt: "最近连接",
        level: "层级",
        lifetimePoints: "累计积分",
        locale: "会员语言",
        membershipCard: "会员卡",
        memberStatus: "会员状态",
        pointTier: "积分等级",
        referralCode: "推荐码",
        searchResults: "会员列表",
        spendablePoints: "可用积分",
        tier: "会员等级",
        totalLifetimePoints: "全网累计积分",
        totalMembers: "全网会员数",
        totalSpendablePoints: "全网可用积分",
        walletAddress: "钱包地址",
      },
      actions: {
        backToActivate: "返回激活页",
        openManagement: "详细管理",
        refresh: "刷新",
      },
      notifications: {
        title: "通知中心",
        empty: "暂时没有需要查看的通知。",
        loadMore: "查看更多通知",
        loadingMore: "正在加载更多通知...",
        markAllRead: "全部标为已读",
        unreadCount: "未读通知 {count} 条",
        preferenceDirect: "新会员激活提醒",
        preferenceNetworkMembers: "下级网络激活提醒",
        preferenceLevel: "层级达成提醒",
        messages: {
          directMemberCompletedTitle: "新会员已完成激活",
          directMemberCompletedBody:
            "{email} 已完成会员激活。",
          networkMemberCompletedTitle: "下级网络成员已完成激活",
          networkMemberCompletedBody:
            "{email} 已在你的网络第 {level} 层完成会员激活。",
          networkLevelCompletedTitle: "层级已达成",
          networkLevelCompletedBody:
            "第 {level} 层已达到 {count}/{target} 名会员。",
        },
      },
      errors: {
        loadFailed: "无法加载组织管理数据。",
        missingEmail: "无法从当前钱包会话读取邮箱地址。",
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
    bnbPage: {
      title: "BNB 估值",
      eyebrow: "live valuation",
      description:
        "查看你当前智能钱包中的 BNB 余额，结合 Bithumb 的 BNB/KRW 实时价格，显示当前韩元估值。",
      disconnected: "请先通过邮箱登录后再使用 BNB 估值页面。",
      loading: "正在加载 BNB 余额。",
      labels: {
        availableBalance: "持有 BNB",
        dailyChange: "24小时变化",
        dailyRange: "24小时区间",
        destination: "外部钱包地址",
        lastUpdated: "价格更新时间",
        marketPair: "市场",
        marketSource: "价格来源",
        sendableAmount: "可全额提取数量",
        spotPrice: "BNB/KRW 实时价格",
        valuation: "韩元估值",
        walletAddress: "钱包地址",
      },
      actions: {
        openBithumbTrade: "打开 Bithumb 交易页",
        refresh: "刷新价格",
        sendAll: "全部提取",
      },
      placeholders: {
        destination: "接收提取的外部 BNB 钱包地址",
      },
      errors: {
        insufficientBalance: "可提取的 BNB 余额不足。",
        invalidAddress: "请输入有效的 BNB 钱包地址。",
        loadFailed: "无法加载 BNB 余额。",
        marketFailed: "无法加载 Bithumb BNB/KRW 价格。",
        selfTransfer: "不能提取到当前已连接的钱包地址。",
      },
      notices: {
        bithumbRecommendation:
          "如无特殊需求，建议优先使用你本人已确认的 Bithumb BNB 充值地址，降低复制错误地址的风险。",
        destinationWarning:
          "如果外部钱包地址输入错误，资产可能会永久丢失。转出前请务必再次核对地址。",
        exchangeHint:
          "确认你的 BNB 持仓后，可以直接跳转到 Bithumb 的 BNB/KRW 官方交易页面继续操作。",
        priceHint:
          "钱包余额与 Bithumb 公开 BNB/KRW 价格会每 5 秒刷新一次，用于实时显示韩元估值。",
        sendHint:
          "将当前已连接智能钱包中的全部 BNB 一次性提取到一个外部地址。",
        txConfirmed:
          "BNB 全额提取已确认，正在刷新最新余额。",
        txSent:
          "BNB 全额提取请求已发送，链上确认后会自动刷新余额。",
      },
    },
    rewardsPage: {
      title: "积分奖励",
      eyebrow: "points utility",
      description:
        "查看推荐积分、距离下一等级还差多少，以及这些积分后续可以解锁的奖励目标。",
      disconnected: "请先通过邮箱登录后再查看积分奖励页面。",
      loading: "正在加载积分数据。",
      paymentRequired: "你的会员注册尚未完成，请先完成激活流程。",
      emptyHistory: "暂无积分累积记录。",
      emptyRedemptions: "暂无使用或兑换记录。",
      previewNote:
        "满足条件的奖励现在可以直接在此页面兑换，状态和积分余额会立即刷新。",
      labels: {
        spendablePoints: "可用积分",
        lifetimePoints: "累计积分",
        currentTier: "当前等级",
        membershipCard: "已持有会员卡",
        nextTier: "下一等级",
        pointTier: "当前积分等级",
        pointsToNextTier: "还差 {points}P",
        progress: "等级进度",
        rewardCatalog: "奖励目录",
        rewardCost: "所需积分",
        earnHistory: "积分记录",
        redemptionHistory: "兑换记录",
        maxTier: "最高等级",
      },
      actions: {
        backHome: "返回首页",
        completeSignup: "前往激活",
        openReferrals: "查看推荐网络",
        refresh: "刷新",
        redeem: "兑换奖励",
        redeeming: "处理中...",
      },
      errors: {
        missingEmail: "无法从当前钱包会话读取邮箱地址。",
        loadFailed: "无法加载积分数据。",
        catalogFailed: "无法加载奖励目录。",
        redemptionsFailed: "无法加载积分使用记录。",
        redeemFailed: "无法处理当前奖励兑换。",
      },
      notices: {
        redeemSuccess: "兑换请求已记录，积分余额与兑换记录已同步更新。",
      },
      tiers: {
        basic: "Basic",
        silver: "Silver",
        gold: "Gold",
        vip: "VIP",
      },
      rewardTypes: {
        tierUpgrade: "等级奖励",
        nftClaim: "NFT 通行证",
        discountCoupon: "服务额度",
      },
      redemptionStatus: {
        pending: "待处理",
        queued: "排队中",
        completed: "已完成",
        failed: "失败",
        cancelled: "已取消",
      },
      history: {
        earn: "积累",
        adjustment: "调整",
        referralReward: "推荐奖励",
        adminAdjustment: "运营调整",
        levelReward: "G{level} 奖励",
        other: "其他",
        typeLabel: "类型",
        sourceLabel: "来源",
        detailsLabel: "详情",
        dateLabel: "时间",
        pointsLabel: "积分",
        previousPage: "上一页",
        nextPage: "下一页",
      },
      catalog: {
        previewNote:
          "可用奖励现在可以直接在这里兑换。每个已兑换项目都会锁定到当前会员账号，并持续显示在兑换记录中。",
        previewBadge: "live",
        eligible: "已达标",
        needMorePoints: "还需 {points}P",
        empty: "暂无可显示的奖励项目。",
        silverCard: {
          title: "Silver 会员卡",
          description:
            "达到 1,000P 后可获得的首个等级卡，用于展示可见会员权益与链上身份。",
        },
        goldCard: {
          title: "Gold 会员卡",
          description:
            "达到 5,000P 后解锁的更高等级卡，面向贡献更高的会员。",
        },
        vipPass: {
          title: "VIP Pass NFT",
          description:
            "达到 10,000P 后可解锁的限定通行证，可用于活动、专属掉落和受限访问。",
        },
        serviceCredit: {
          title: "服务额度",
          description:
            "20,000P 里程碑对应的可用型额度，后续可连接折扣、抵扣或付费功能使用。",
        },
      },
      silverClaim: {
        title: "Silver BNB 领取",
        description:
          "已完成 Silver 会员卡的会员可一次性领取价值 10 USD 的 BNB。",
        quoteNote:
          "发放数量会根据 Bithumb 的 USDT/KRW 与 BNB/KRW 实时价格重新计算。",
        labels: {
          rewardValue: "奖励基准",
          estimatedBnb: "预计发放 BNB",
          claimedBnb: "已发放 BNB",
          estimatedKrw: "韩元估值",
          usdtKrw: "Bithumb USDT/KRW",
          bnbKrw: "Bithumb BNB/KRW",
          destinationWallet: "接收钱包",
          silverCardStatus: "Silver 卡状态",
          claimStatus: "领取状态",
          quotedAt: "报价时间",
        },
        actions: {
          open: "查看 BNB 领取",
          claim: "提交领取",
          claiming: "提交中...",
          backToRewards: "返回奖励",
          openTransaction: "查看交易",
        },
        statuses: {
          available: "可领取",
          silverCardCompleted: "Silver 卡已完成",
          silverCardRequired: "需要 Silver 卡",
          pending: "处理中",
          completed: "领取完成",
          failed: "可重新申请",
        },
        messages: {
          requiresSignup: "请先完成注册，再申请 Silver BNB 领取。",
          requiresSilverCard:
            "请先完成 Silver 会员卡，才能解锁此 BNB 领取。",
          missingWallet:
            "暂时无法确认可接收奖励的钱包地址。请重新登录后刷新。",
          alreadyClaimed: "该 Silver BNB 领取已经完成。",
          pending: "Silver BNB 转账仍在处理中，请稍后再查看。",
          failed: "上一次 Silver BNB 领取失败。确认详情后可重新申请。",
          completed: "Silver BNB 领取已完成。",
        },
        notices: {
          claimSuccess: "Silver BNB 领取已完成，页面已刷新为最新状态。",
        },
        errors: {
          loadFailed: "无法加载 Silver BNB 领取信息。",
          claimFailed: "无法处理 Silver BNB 领取。",
        },
      },
    },
    playPage: {
      title: "每日玩法",
      eyebrow: "activity loop",
      description:
        "一个面向移动端的每日玩法中心，可通过签到、点击挑战和团队奖励积累玩法币。",
      badge: "daily play",
      disconnected: "邮箱登录后即可参与每日玩法。",
      loading: "正在加载每日玩法数据。",
      requiresSignup:
        "只有完成注册后，才能参与每日玩法并获得玩法币。",
      hero: {
        title: "让会员每天都愿意回来的移动端玩法循环",
        description:
          "把签到、30秒点击挑战和团队奖励整合到一个紧凑页面里，打开后即可参与。你越活跃，玩法币累积得越快；你的网络越活跃，增长也会越明显。",
        sideTitle: "今日 3 个任务",
        teamHint:
          "当你的下级网络保持活跃时，G1 与 G2 上级也会获得玩法币。",
      },
      currency: {
        valueSingle: "{count}币",
        valuePlural: "{count}币",
        signedValueSingle: "+{count}币",
        signedValuePlural: "+{count}币",
        separateNotice: "与奖励积分分开累计",
      },
      labels: {
        activityPoints: "玩法币",
        todayPoints: "今日获得币",
        streak: "连续签到",
        streakValue: "{days}天",
        teamBonus: "今日团队奖励",
        dailyMissions: "今日任务",
        tapChallenge: "点击挑战",
        tapProgress: "点击进度",
        history: "最近奖励",
        dateKey: "今日日期键",
        bestTap: "今日最高点击",
        bestTapValue: "{count} taps",
      },
      actions: {
        backHome: "返回首页",
        completeSignup: "前往激活页面",
        checkIn: "今日签到",
        checkingIn: "签到处理中...",
        checkedIn: "今日已签到",
        startTap: "开始 30 秒点击挑战",
        startingTap: "正在准备挑战...",
        tapMore: "再点几下",
        claimTapReward: "领取 1币",
        finishingTap: "正在整理结果...",
      },
      missions: {
        check_in: {
          title: "今日签到",
          description: "每天签到一次即可立即获得玩法币。",
        },
        tap_challenge: {
          title: "100 次点击挑战",
          description: "在 30 秒内完成 100 次点击即可获得 1币。",
        },
        team_bonus: {
          title: "团队奖励",
          description: "下级网络活跃后，今天还能追加团队奖励。",
        },
      },
      tap: {
        title: "30 秒点击挑战",
        idleLabel: "ready",
        liveLabel: "live",
        idleDescription: "点击开始后，会开启 30 秒计数窗口。",
        targetLabel: "目标 {target} taps",
        progressLabel: "{current} / {target}",
        timerLabel: "剩余 {seconds}s",
        timerIdle: "待机中",
        rewardLabel: "成功奖励",
        remainingLabel: "今日剩余",
        remainingValue: "{count}次",
      },
      history: {
        title: "最近玩法币记录",
        empty: "暂无玩法币记录。",
        checkIn: "今日签到奖励",
        tapChallenge: "点击挑战成功",
        teamBonus: "团队奖励 · {email} · G{level}",
        teamBonusFallback: "团队活动奖励",
      },
      notices: {
        checkInSuccess: "今日签到完成，已发放 {coins}。",
        tapStarted: "点击挑战已开始，请在 30 秒内完成 100 次点击。",
        tapSuccess: "点击挑战成功，已发放 {coins}。",
        tapMissed: "这次没有达到目标，稍后再试一次。",
        tapExpired: "挑战时间结束，结果已保存。",
      },
      errors: {
        missingEmail: "当前连接中未能读取到邮箱地址。",
        loadFailed: "无法加载每日玩法数据。",
        checkInFailed: "无法处理今日签到。",
        tapFailed: "无法处理点击挑战。",
        dailyLimitReached: "今天可领取的点击奖励次数已经用完。",
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
        previousPage: "Trang trước",
        nextPage: "Trang sau",
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
        previousPage: "Halaman sebelumnya",
        nextPage: "Halaman berikutnya",
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
