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
    connectModalTitle: string;
    clientIdRequired: string;
    copyAddress: string;
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
    synced: string;
    newMember: string;
    incomingReferralTitle: string;
    incomingReferralDescription: string;
    appliedReferralDescription: string;
    shareHint: string;
    noReferralApplied: string;
    labels: {
      emailKey: string;
      lastWallet: string;
      walletCount: string;
      registeredAt: string;
      updatedAt: string;
      lastConnectedAt: string;
      referralCode: string;
      referredByCode: string;
      referralLink: string;
    };
    actions: {
      syncNow: string;
      viewReferrals: string;
    };
    errors: {
      missingEmail: string;
      syncFailed: string;
    };
  };
  referralsPage: {
    title: string;
    eyebrow: string;
    description: string;
    shareTitle: string;
    listTitle: string;
    disconnected: string;
    loading: string;
    empty: string;
    memberReady: string;
    memberMissing: string;
    labels: {
      referralCode: string;
      referralLink: string;
      totalReferrals: string;
      lastWallet: string;
      locale: string;
      joinedAt: string;
      lastConnectedAt: string;
    };
    actions: {
      backHome: string;
      refresh: string;
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
        "이메일 기반 온보딩에 맞춘 모바일 우선 스마트 월렛 스타터.",
    },
    common: {
      appName: "Pocket Smart Wallet",
      headerEyebrow: "V0-compatible x thirdweb",
      headerDescription:
        "이메일 전용 Smart Account 온보딩과 가스 스폰서 데모를 한 화면에 묶었습니다.",
      languageLabel: "언어",
      connectWallet: "지갑 연결",
      connectModalTitle: "이메일로 Pocket Smart Wallet 시작",
      clientIdRequired: "client id 필요",
      copyAddress: "주소 복사",
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
      title: "이메일만으로 바로 들어오고, Smart Wallet으로 바로 전환되는 온체인 앱.",
      description:
        "`v0`가 다루기 좋은 컴포넌트 구조와 `thirdweb` 이메일 기반 Smart Wallet 연결 흐름을 결합했습니다. 이메일 인증만으로 바로 진입한 뒤, BSC Smart Wallet 위에서 USDT 잔액만 빠르게 확인할 수 있게 정리했습니다.",
      badges: ["이메일 전용 진입", "ERC-4337 스마트 월렛", "가스 스폰서 데모"],
    },
    metrics: [
      { label: "체인", value: "BSC", hint: "BNB Smart Chain" },
      { label: "표시 토큰", value: "USDT", hint: "BSC only" },
      { label: "가스 정책", value: "sponsorGas", hint: "always true" },
    ],
    env: {
      title: "환경변수 설정 필요",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID`가 비어 있어 이메일 연결 UI를 숨겼습니다. `.env.example`을 복사한 뒤 client id를 넣으면 바로 연결됩니다.",
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
          title: "이메일만으로 바로 시작",
          description:
            "이메일 OTP 진입점만 남겨 첫 진입 흐름을 가장 짧고 명확하게 만들었습니다.",
        },
        {
          title: "연결 즉시 Smart Account 추상화",
          description:
            "BSC 기준 Smart Wallet 플로우를 기본값으로 잡고 sponsorGas=true 정책을 고정했습니다.",
        },
        {
          title: "USDT 중심 지갑 뷰",
          description:
            "연결 후 native token 대신 BSC USDT 잔액만 노출해 필요한 정보만 보이도록 줄였습니다.",
        },
      ],
    },
    runway: {
      title: "Session Runway",
      eyebrow: "3-step mobile flow",
      steps: [
        {
          title: "이메일 인증",
          description:
            "이메일 입력과 인증 코드 확인만으로 첫 단계를 끝내도록 만들어 진입 판단 비용을 줄였습니다.",
        },
        {
          title: "Smart Wallet 활성화",
          description:
            "연결된 지갑을 BSC Smart Wallet 흐름으로 전환하고 sponsorGas=true 설정을 유지합니다.",
        },
        {
          title: "USDT만 확인",
          description:
            "잔액, explorer, 토큰 컨트랙트 링크를 USDT 기준으로 제한해 모바일 화면에서 정보 밀도를 낮췄습니다.",
        },
      ],
    },
    sponsored: {
      title: "Sponsored Demo",
      eyebrow: "transaction test",
      description:
        "연결되면 자기 주소로 `0 BNB` self-transaction을 보내 BSC Smart Wallet과 paymaster 연결을 테스트합니다.",
      cta: "Sponsored Self Ping 보내기",
      emptyNotice:
        "트랜잭션 결과가 여기에 표시됩니다. paymaster 설정이 없는 경우 오류 메시지가 그대로 노출됩니다.",
      connectFirst: "먼저 스마트 월렛을 연결하세요.",
      txConfirmed: "트랜잭션이 확인되었습니다.",
      txSent: "트랜잭션이 전송되었습니다. explorer에서 추적할 수 있습니다.",
      openExplorer: "Explorer 열기",
    },
    surface: {
      title: "Wallet Surface",
      eyebrow: "mobile decisions",
      points: [
        {
          title: "헤더는 한 손 조작 기준",
          description:
            "상단에 연결 상태와 ConnectButton만 남겨 핵심 동작을 손가락이 닿는 범위에 유지했습니다.",
        },
        {
          title: "연결 전과 후를 분리",
          description:
            "비연결 상태는 온보딩 중심, 연결 후에는 BSC USDT 잔액과 계정 액션 중심으로 화면 목적이 바뀝니다.",
        },
        {
          title: "v0 추가 작업 대응",
          description:
            "`components.json`, alias, Tailwind 구조를 정리해 이후 v0 Add to Codebase 흐름으로 이어가기 쉽게 맞췄습니다.",
        },
      ],
    },
    member: {
      title: "회원 레지스트리",
      eyebrow: "atlas mongodb",
      disconnected:
        "이메일 지갑을 연결하면 이메일 주소를 키로 회원 정보를 MongoDB Atlas에 자동 등록하고 레퍼럴 코드도 함께 발급합니다.",
      syncing: "회원 정보를 Atlas에 동기화하는 중입니다.",
      synced: "회원 정보와 레퍼럴 코드가 MongoDB Atlas에 등록되어 관리 중입니다.",
      newMember: "새 회원으로 등록되었습니다.",
      incomingReferralTitle: "추천인 코드가 감지되었습니다.",
      incomingReferralDescription:
        "이 페이지에서 이메일 회원가입을 완료하면 추천인 코드 {code} 가 회원 정보에 함께 저장됩니다.",
      appliedReferralDescription:
        "가입 시 추천인 코드 {code} 가 함께 저장되었습니다.",
      shareHint:
        "이 링크를 공유하면 홈페이지에서 `?ref=` 파라미터가 자동으로 적용됩니다.",
      noReferralApplied: "적용 안 됨",
      labels: {
        emailKey: "이메일 키",
        lastWallet: "마지막 지갑",
        walletCount: "등록 지갑 수",
        registeredAt: "최초 등록",
        updatedAt: "최근 갱신",
        lastConnectedAt: "최근 연결",
        referralCode: "내 레퍼럴 코드",
        referredByCode: "적용된 추천인 코드",
        referralLink: "레퍼럴 가입 링크",
      },
      actions: {
        syncNow: "지금 다시 동기화",
        viewReferrals: "추천 가입자 보기",
      },
      errors: {
        missingEmail: "현재 연결에서 이메일 주소를 확인하지 못했습니다.",
        syncFailed: "회원 동기화에 실패했습니다.",
      },
    },
    referralsPage: {
      title: "레퍼럴 대시보드",
      eyebrow: "referral tracking",
      description:
        "내 레퍼럴 코드와 해당 코드로 가입한 회원 목록을 확인합니다.",
      shareTitle: "내 레퍼럴 코드",
      listTitle: "내 코드로 가입한 회원",
      disconnected:
        "이메일 지갑을 연결하면 내 레퍼럴 코드와 추천 가입 회원을 확인할 수 있습니다.",
      loading: "레퍼럴 데이터를 불러오는 중입니다.",
      empty: "아직 내 레퍼럴 코드로 가입한 회원이 없습니다.",
      memberReady: "이 이메일 회원의 레퍼럴 코드가 활성화되어 있습니다.",
      memberMissing: "회원 정보를 먼저 동기화한 뒤 다시 시도하세요.",
      labels: {
        referralCode: "레퍼럴 코드",
        referralLink: "공유 링크",
        totalReferrals: "추천 가입 수",
        lastWallet: "최근 지갑",
        locale: "회원 언어",
        joinedAt: "가입 시각",
        lastConnectedAt: "최근 연결",
      },
      actions: {
        backHome: "홈으로 돌아가기",
        refresh: "새로고침",
      },
      errors: {
        missingEmail: "현재 연결에서 이메일 주소를 확인하지 못했습니다.",
        loadFailed: "레퍼럴 데이터를 불러오지 못했습니다.",
      },
    },
    signInMix: {
      title: "이메일 전용 접근",
      eyebrow: "single auth channel",
      methods: ["이메일"],
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
        "A mobile-first smart wallet starter built for email-only onboarding.",
    },
    common: {
      appName: "Pocket Smart Wallet",
      headerEyebrow: "V0-compatible x thirdweb",
      headerDescription:
        "Email-only smart account onboarding and a gas sponsorship demo in one surface.",
      languageLabel: "Language",
      connectWallet: "Connect wallet",
      connectModalTitle: "Start Pocket Smart Wallet with email",
      clientIdRequired: "client id required",
      copyAddress: "Copy address",
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
        "An onchain app that lets users enter with email only and land directly in a smart wallet flow.",
      description:
        "This combines a `v0`-friendly component structure with the `thirdweb` email-first smart wallet connection flow. It removes auth choice overload and keeps the wallet view focused on BSC USDT balances only.",
      badges: ["Email-only sign-in", "ERC-4337 smart account", "Sponsored gas demo"],
    },
    metrics: [
      { label: "Chain", value: "BSC", hint: "BNB Smart Chain" },
      { label: "Visible token", value: "USDT", hint: "BSC only" },
      { label: "Gas policy", value: "sponsorGas", hint: "always true" },
    ],
    env: {
      title: "Environment setup required",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID` is empty, so the email connect UI is hidden. Copy `.env.example`, add your client id, and reload the app.",
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
          title: "Start with email only",
          description:
            "Keep one email OTP entry point so the first interaction stays simple and focused.",
        },
        {
          title: "Abstract the account right after connect",
          description:
            "The default path starts on BSC smart wallet flow and keeps `sponsorGas=true` fixed.",
        },
        {
          title: "USDT-focused wallet view",
          description:
            "After connect, the UI shows BSC USDT balance instead of native token noise so the important data stays front and center.",
        },
      ],
    },
    runway: {
      title: "Session Runway",
      eyebrow: "3-step mobile flow",
      steps: [
        {
          title: "Verify email",
          description:
            "Keep the first step focused on entering an email and confirming the one-time code.",
        },
        {
          title: "Activate the smart wallet",
          description:
            "Move the connected account into the BSC smart wallet flow while keeping `sponsorGas=true` enabled.",
        },
        {
          title: "See only USDT",
          description:
            "Limit the mobile surface to balances, explorer links, and token contract links centered on USDT.",
        },
      ],
    },
    sponsored: {
      title: "Sponsored Demo",
      eyebrow: "transaction test",
      description:
        "Once connected, send a `0 BNB` self-transaction to test BSC smart wallet and paymaster wiring.",
      cta: "Send Sponsored Self Ping",
      emptyNotice:
        "Transaction results will appear here. If paymaster setup is missing, the raw error will be shown.",
      connectFirst: "Connect your smart wallet first.",
      txConfirmed: "Transaction confirmed.",
      txSent: "Transaction sent. You can track it in the explorer.",
      openExplorer: "Open explorer",
    },
    surface: {
      title: "Wallet Surface",
      eyebrow: "mobile decisions",
      points: [
        {
          title: "Header tuned for one-hand usage",
          description:
            "Only connection state and the primary wallet action stay in the header so the core action remains within thumb reach.",
        },
        {
          title: "Different mode before and after connect",
          description:
            "The disconnected state focuses on onboarding, while the connected state shifts to BSC USDT balance and account actions.",
        },
        {
          title: "Ready for more v0 work",
          description:
            "`components.json`, aliasing, and Tailwind structure are aligned so future v0 Add to Codebase work can continue cleanly.",
        },
      ],
    },
    member: {
      title: "Member Registry",
      eyebrow: "atlas mongodb",
      disconnected:
        "Connect the email wallet to automatically register the member in MongoDB Atlas using the email address as the key and issue a referral code.",
      syncing: "Syncing the member record to Atlas.",
      synced: "The member record and referral code are registered and managed in MongoDB Atlas.",
      newMember: "This account was registered as a new member.",
      incomingReferralTitle: "A referral code was detected.",
      incomingReferralDescription:
        "If the user completes email signup on this page, referral code {code} will be stored on the member record.",
      appliedReferralDescription:
        "Referral code {code} was stored on this signup.",
      shareHint:
        "Share this link to open the homepage with the `?ref=` parameter already applied.",
      noReferralApplied: "Not applied",
      labels: {
        emailKey: "Email key",
        lastWallet: "Last wallet",
        walletCount: "Registered wallets",
        registeredAt: "Created at",
        updatedAt: "Updated at",
        lastConnectedAt: "Last connected",
        referralCode: "My referral code",
        referredByCode: "Applied referral code",
        referralLink: "Referral signup link",
      },
      actions: {
        syncNow: "Sync again now",
        viewReferrals: "View referred members",
      },
      errors: {
        missingEmail: "Could not resolve the authenticated email address from the current wallet session.",
        syncFailed: "Member sync failed.",
      },
    },
    referralsPage: {
      title: "Referral Dashboard",
      eyebrow: "referral tracking",
      description:
        "Review your referral code and the members who signed up with it.",
      shareTitle: "My referral code",
      listTitle: "Members signed up with my code",
      disconnected:
        "Connect the email wallet to review your referral code and referred members.",
      loading: "Loading referral data.",
      empty: "No members have signed up with your referral code yet.",
      memberReady: "Your referral code is active for this email member.",
      memberMissing: "Sync the member record first, then try again.",
      labels: {
        referralCode: "Referral code",
        referralLink: "Share link",
        totalReferrals: "Referred signups",
        lastWallet: "Last wallet",
        locale: "Member locale",
        joinedAt: "Joined at",
        lastConnectedAt: "Last connected",
      },
      actions: {
        backHome: "Back home",
        refresh: "Refresh",
      },
      errors: {
        missingEmail: "Could not resolve the authenticated email address from the current wallet session.",
        loadFailed: "Failed to load referral data.",
      },
    },
    signInMix: {
      title: "Email-only Access",
      eyebrow: "single auth channel",
      methods: ["Email"],
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
        "メール限定オンボーディング向けに整えたモバイルファーストのスマートウォレットスターター。",
    },
    common: {
      appName: "Pocket Smart Wallet",
      headerEyebrow: "V0-compatible x thirdweb",
      headerDescription:
        "メール限定の Smart Account オンボーディングとガススポンサーのデモを 1 画面にまとめています。",
      languageLabel: "言語",
      connectWallet: "ウォレット接続",
      connectModalTitle: "メールで Pocket Smart Wallet を始める",
      clientIdRequired: "client id が必要です",
      copyAddress: "アドレスをコピー",
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
        "メールだけですぐ入り、そのまま Smart Wallet フローに移れるオンチェーンアプリ。",
      description:
        "`v0` が扱いやすいコンポーネント構成と `thirdweb` のメール中心 Smart Wallet 接続フローを組み合わせました。認証方法の迷いをなくし、BSC USDT 残高だけを素早く確認できるように絞っています。",
      badges: ["メール限定サインイン", "ERC-4337 スマートアカウント", "ガススポンサー実演"],
    },
    metrics: [
      { label: "チェーン", value: "BSC", hint: "BNB Smart Chain" },
      { label: "表示トークン", value: "USDT", hint: "BSC only" },
      { label: "ガスポリシー", value: "sponsorGas", hint: "always true" },
    ],
    env: {
      title: "環境変数の設定が必要です",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID` が空のためメール接続 UI を隠しています。`.env.example` をコピーして client id を入れるとすぐ接続できます。",
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
          title: "メールだけですぐ開始",
          description:
            "メール OTP 専用の導線に絞り、最初の操作をできるだけ短く明快にしました。",
        },
        {
          title: "接続直後に Smart Account 化",
          description:
            "BSC 基準の Smart Wallet フローを既定にし、`sponsorGas=true` を固定しています。",
        },
        {
          title: "USDT 中心のウォレットビュー",
          description:
            "接続後は native token ではなく BSC USDT 残高だけを表示し、必要な情報だけに絞っています。",
        },
      ],
    },
    runway: {
      title: "Session Runway",
      eyebrow: "3-step mobile flow",
      steps: [
        {
          title: "メール認証",
          description:
            "メール入力と認証コード確認だけで最初のステップを完了できるようにしています。",
        },
        {
          title: "Smart Wallet を有効化",
          description:
            "接続済みアカウントを BSC Smart Wallet フローへ切り替え、`sponsorGas=true` を維持します。",
        },
        {
          title: "USDT だけ確認",
          description:
            "残高、explorer、トークンコントラクトのリンクを USDT 基準に絞り、モバイルの情報密度を下げました。",
        },
      ],
    },
    sponsored: {
      title: "Sponsored Demo",
      eyebrow: "transaction test",
      description:
        "接続後、自分のアドレス宛に `0 BNB` の self-transaction を送り、BSC Smart Wallet と paymaster 接続を確認します。",
      cta: "Sponsored Self Ping を送信",
      emptyNotice:
        "トランザクション結果がここに表示されます。paymaster 設定がない場合はエラーメッセージをそのまま表示します。",
      connectFirst: "先にスマートウォレットを接続してください。",
      txConfirmed: "トランザクションが確認されました。",
      txSent: "トランザクションを送信しました。explorer で追跡できます。",
      openExplorer: "Explorer を開く",
    },
    surface: {
      title: "Wallet Surface",
      eyebrow: "mobile decisions",
      points: [
        {
          title: "ヘッダーは片手操作前提",
          description:
            "上部には接続状態と ConnectButton だけを残し、主要アクションを親指の届く範囲に置いています。",
        },
        {
          title: "接続前後で目的を分離",
          description:
            "未接続ではオンボーディング中心、接続後は BSC USDT 残高とアカウント操作中心に画面の役割が切り替わります。",
        },
        {
          title: "v0 の追加作業にも対応",
          description:
            "`components.json`、alias、Tailwind 構成を整え、今後の v0 Add to Codebase フローへ自然につなげられるようにしました。",
        },
      ],
    },
    member: {
      title: "メンバーレジストリ",
      eyebrow: "atlas mongodb",
      disconnected:
        "メールウォレットを接続すると、メールアドレスをキーとして MongoDB Atlas に会員情報を自動登録し、レファラルコードも発行します。",
      syncing: "会員情報を Atlas に同期しています。",
      synced: "会員情報とレファラルコードは MongoDB Atlas に登録され、管理されています。",
      newMember: "このアカウントは新規会員として登録されました。",
      incomingReferralTitle: "紹介コードを検出しました。",
      incomingReferralDescription:
        "このページでメール登録を完了すると、紹介コード {code} が会員情報に保存されます。",
      appliedReferralDescription:
        "登録時に紹介コード {code} が保存されました。",
      shareHint:
        "このリンクを共有すると、ホームページで `?ref=` パラメータ付きの状態で開けます。",
      noReferralApplied: "未適用",
      labels: {
        emailKey: "メールキー",
        lastWallet: "最新ウォレット",
        walletCount: "登録ウォレット数",
        registeredAt: "初回登録",
        updatedAt: "最終更新",
        lastConnectedAt: "最終接続",
        referralCode: "自分のレファラルコード",
        referredByCode: "適用された紹介コード",
        referralLink: "レファラル登録リンク",
      },
      actions: {
        syncNow: "今すぐ再同期",
        viewReferrals: "紹介登録メンバーを見る",
      },
      errors: {
        missingEmail: "現在のウォレット接続からメールアドレスを取得できませんでした。",
        syncFailed: "会員同期に失敗しました。",
      },
    },
    referralsPage: {
      title: "レファラルダッシュボード",
      eyebrow: "referral tracking",
      description:
        "自分のレファラルコードと、そのコードで登録した会員一覧を確認します。",
      shareTitle: "自分のレファラルコード",
      listTitle: "自分のコードで登録した会員",
      disconnected:
        "メールウォレットを接続すると、自分のレファラルコードと紹介登録メンバーを確認できます。",
      loading: "レファラルデータを読み込んでいます。",
      empty: "まだ自分のレファラルコードで登録した会員はいません。",
      memberReady: "このメール会員のレファラルコードは有効です。",
      memberMissing: "先に会員情報を同期してから再試行してください。",
      labels: {
        referralCode: "レファラルコード",
        referralLink: "共有リンク",
        totalReferrals: "紹介登録数",
        lastWallet: "最新ウォレット",
        locale: "会員言語",
        joinedAt: "登録日時",
        lastConnectedAt: "最終接続",
      },
      actions: {
        backHome: "ホームへ戻る",
        refresh: "再読み込み",
      },
      errors: {
        missingEmail: "現在のウォレット接続からメールアドレスを取得できませんでした。",
        loadFailed: "レファラルデータの読み込みに失敗しました。",
      },
    },
    signInMix: {
      title: "メール専用アクセス",
      eyebrow: "single auth channel",
      methods: ["メール"],
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
        "围绕邮箱专用引导整理的移动优先智能钱包启动项目。",
    },
    common: {
      appName: "Pocket Smart Wallet",
      headerEyebrow: "V0-compatible x thirdweb",
      headerDescription:
        "把邮箱专用 Smart Account 引导和 gas sponsorship 演示放进同一个界面。",
      languageLabel: "语言",
      connectWallet: "连接钱包",
      connectModalTitle: "通过邮箱开始使用 Pocket Smart Wallet",
      clientIdRequired: "需要 client id",
      copyAddress: "复制地址",
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
        "用户只用邮箱就能直接进入，并立即切换到 Smart Wallet 流程的链上应用。",
      description:
        "这个版本把 `v0` 友好的组件结构和 `thirdweb` 邮箱优先 Smart Wallet 连接流程结合在一起。它去掉了多种认证方式的选择负担，并让钱包界面只聚焦 BSC USDT 余额。",
      badges: ["邮箱专用登录", "ERC-4337 智能账户", "Gas 赞助演示"],
    },
    metrics: [
      { label: "链", value: "BSC", hint: "BNB Smart Chain" },
      { label: "展示代币", value: "USDT", hint: "BSC only" },
      { label: "Gas 策略", value: "sponsorGas", hint: "always true" },
    ],
    env: {
      title: "需要环境变量配置",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID` 为空，所以当前隐藏了邮箱连接 UI。复制 `.env.example` 后填入 client id 即可连接。",
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
          title: "只用邮箱立即开始",
          description:
            "只保留邮箱 OTP 入口，让第一次进入的流程尽量短而清晰。",
        },
        {
          title: "连接后立即抽象成 Smart Account",
          description:
            "默认走 BSC Smart Wallet 流程，并固定启用 `sponsorGas=true`。",
        },
        {
          title: "以 USDT 为中心的钱包视图",
          description:
            "连接后不展示 native token，只展示 BSC USDT 余额，让核心信息更集中。",
        },
      ],
    },
    runway: {
      title: "Session Runway",
      eyebrow: "3-step mobile flow",
      steps: [
        {
          title: "邮箱验证",
          description:
            "让第一步只围绕邮箱输入和验证码确认展开，减少进入前的判断成本。",
        },
        {
          title: "启用 Smart Wallet",
          description:
            "把已连接账户切换到 BSC Smart Wallet 流程，同时保持 `sponsorGas=true`。",
        },
        {
          title: "只查看 USDT",
          description:
            "把余额、explorer 链接和代币合约链接都限制在 USDT 相关信息上，降低移动端的信息密度。",
        },
      ],
    },
    sponsored: {
      title: "Sponsored Demo",
      eyebrow: "transaction test",
      description:
        "连接后向自己的地址发送一笔 `0 BNB` self-transaction，用来验证 BSC Smart Wallet 和 paymaster 的连通性。",
      cta: "发送 Sponsored Self Ping",
      emptyNotice:
        "交易结果会显示在这里。如果没有配置 paymaster，这里会直接显示原始错误信息。",
      connectFirst: "请先连接智能钱包。",
      txConfirmed: "交易已确认。",
      txSent: "交易已发送，可以在 explorer 中追踪。",
      openExplorer: "打开 Explorer",
    },
    surface: {
      title: "Wallet Surface",
      eyebrow: "mobile decisions",
      points: [
        {
          title: "头部按单手操作设计",
          description:
            "顶部只保留连接状态和 ConnectButton，把关键操作保持在拇指容易触达的位置。",
        },
        {
          title: "连接前后信息分层",
          description:
            "未连接时以引导为主，连接后则切换为 BSC USDT 余额和账户操作视图。",
        },
        {
          title: "方便继续用 v0 扩展",
          description:
            "已经整理好 `components.json`、alias 和 Tailwind 结构，后续可以继续走 v0 Add to Codebase 流程。",
        },
      ],
    },
    member: {
      title: "会员注册表",
      eyebrow: "atlas mongodb",
      disconnected:
        "连接邮箱钱包后，会自动把邮箱地址作为键写入 MongoDB Atlas 会员记录，并生成专属推荐码。",
      syncing: "正在把会员记录同步到 Atlas。",
      synced: "会员记录和推荐码已经写入 MongoDB Atlas 并可持续管理。",
      newMember: "该账户已作为新会员注册。",
      incomingReferralTitle: "检测到推荐码。",
      incomingReferralDescription:
        "如果用户在此页面完成邮箱注册，推荐码 {code} 会一起写入会员信息。",
      appliedReferralDescription:
        "本次注册已记录推荐码 {code}。",
      shareHint:
        "分享此链接后，首页会自动带上 `?ref=` 参数。",
      noReferralApplied: "未应用",
      labels: {
        emailKey: "邮箱键",
        lastWallet: "最近钱包",
        walletCount: "已登记钱包数",
        registeredAt: "首次登记",
        updatedAt: "最近更新",
        lastConnectedAt: "最近连接",
        referralCode: "我的推荐码",
        referredByCode: "已应用推荐码",
        referralLink: "推荐注册链接",
      },
      actions: {
        syncNow: "立即重新同步",
        viewReferrals: "查看推荐注册会员",
      },
      errors: {
        missingEmail: "当前钱包会话中未能解析出邮箱地址。",
        syncFailed: "会员同步失败。",
      },
    },
    referralsPage: {
      title: "推荐仪表板",
      eyebrow: "referral tracking",
      description:
        "查看我的推荐码，以及使用该推荐码注册的会员列表。",
      shareTitle: "我的推荐码",
      listTitle: "使用我的码注册的会员",
      disconnected:
        "连接邮箱钱包后，即可查看我的推荐码和推荐注册会员。",
      loading: "正在加载推荐数据。",
      empty: "目前还没有会员通过你的推荐码注册。",
      memberReady: "该邮箱会员的推荐码已激活。",
      memberMissing: "请先同步会员信息后再试。",
      labels: {
        referralCode: "推荐码",
        referralLink: "分享链接",
        totalReferrals: "推荐注册数",
        lastWallet: "最近钱包",
        locale: "会员语言",
        joinedAt: "注册时间",
        lastConnectedAt: "最近连接",
      },
      actions: {
        backHome: "返回首页",
        refresh: "刷新",
      },
      errors: {
        missingEmail: "当前钱包会话中未能解析出邮箱地址。",
        loadFailed: "加载推荐数据失败。",
      },
    },
    signInMix: {
      title: "邮箱专用入口",
      eyebrow: "single auth channel",
      methods: ["邮箱"],
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
