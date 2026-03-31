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
        "thirdweb와 v0 호환 구조로 만든 모바일 우선 스마트 월렛 스타터.",
    },
    common: {
      appName: "Pocket Smart Wallet",
      headerEyebrow: "V0-compatible x thirdweb",
      headerDescription:
        "모바일 우선 Smart Account 온보딩과 가스 스폰서 데모를 한 화면에 묶었습니다.",
      languageLabel: "언어",
      connectWallet: "지갑 연결",
      connectModalTitle: "Pocket Smart Wallet 시작",
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
      title: "이메일이나 패스키로 바로 들어오고, Smart Wallet으로 바로 전환되는 온체인 앱.",
      description:
        "`v0`가 다루기 좋은 컴포넌트 구조와 `thirdweb` Smart Wallet 연결 흐름을 결합했습니다. 모바일에서 긴 입력을 줄이고, BSC Smart Wallet 위에서 USDT 잔액만 빠르게 확인할 수 있게 정리했습니다.",
      badges: ["엄지손가락 중심 UX", "ERC-4337 스마트 월렛", "가스 스폰서 데모"],
    },
    metrics: [
      { label: "체인", value: "BSC", hint: "BNB Smart Chain" },
      { label: "표시 토큰", value: "USDT", hint: "BSC only" },
      { label: "가스 정책", value: "sponsorGas", hint: "always true" },
    ],
    env: {
      title: "환경변수 설정 필요",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID`가 비어 있어 Connect UI를 숨겼습니다. `.env.example`을 복사한 뒤 client id를 넣으면 바로 연결됩니다.",
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
          title: "지갑 없는 유저도 바로 진입",
          description:
            "Email, Google, Apple, Passkey, Guest를 같은 진입점에서 받아 모바일 입력량을 줄였습니다.",
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
          title: "로그인 방식 선택",
          description:
            "이메일, 소셜, 패스키, 게스트 계정을 인라인으로 노출해 첫 진입 마찰을 낮춥니다.",
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
    signInMix: {
      title: "Sign-in Mix",
      eyebrow: "auth channels",
      methods: ["이메일", "Google", "Apple", "패스키", "게스트"],
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
        "A mobile-first smart wallet starter built with thirdweb and a v0-compatible structure.",
    },
    common: {
      appName: "Pocket Smart Wallet",
      headerEyebrow: "V0-compatible x thirdweb",
      headerDescription:
        "Mobile-first smart account onboarding and a gas sponsorship demo in one surface.",
      languageLabel: "Language",
      connectWallet: "Connect wallet",
      connectModalTitle: "Start Pocket Smart Wallet",
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
        "An onchain app that lets users enter with email or passkeys and land directly in a smart wallet flow.",
      description:
        "This combines a `v0`-friendly component structure with the `thirdweb` smart wallet connection flow. It trims mobile input friction and keeps the wallet view focused on BSC USDT balances only.",
      badges: ["Thumb-first flow", "ERC-4337 smart account", "Sponsored gas demo"],
    },
    metrics: [
      { label: "Chain", value: "BSC", hint: "BNB Smart Chain" },
      { label: "Visible token", value: "USDT", hint: "BSC only" },
      { label: "Gas policy", value: "sponsorGas", hint: "always true" },
    ],
    env: {
      title: "Environment setup required",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID` is empty, so the connect UI is hidden. Copy `.env.example`, add your client id, and reload the app.",
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
          title: "Enter even without a wallet",
          description:
            "Email, Google, Apple, Passkey, and Guest are presented in one entry point to reduce mobile typing.",
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
          title: "Pick a sign-in method",
          description:
            "Expose email, social, passkey, and guest access inline to lower first-entry friction.",
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
    signInMix: {
      title: "Sign-in Mix",
      eyebrow: "auth channels",
      methods: ["Email", "Google", "Apple", "Passkey", "Guest"],
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
        "thirdweb と v0 互換構成で作ったモバイルファーストのスマートウォレットスターター。",
    },
    common: {
      appName: "Pocket Smart Wallet",
      headerEyebrow: "V0-compatible x thirdweb",
      headerDescription:
        "モバイル優先の Smart Account オンボーディングとガススポンサーのデモを 1 画面にまとめています。",
      languageLabel: "言語",
      connectWallet: "ウォレット接続",
      connectModalTitle: "Pocket Smart Wallet を始める",
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
        "メールやパスキーですぐ入り、そのまま Smart Wallet フローに移れるオンチェーンアプリ。",
      description:
        "`v0` が扱いやすいコンポーネント構成と `thirdweb` Smart Wallet 接続フローを組み合わせました。モバイル入力の負担を減らし、BSC USDT 残高だけを素早く確認できるように絞っています。",
      badges: ["親指中心フロー", "ERC-4337 スマートアカウント", "ガススポンサー実演"],
    },
    metrics: [
      { label: "チェーン", value: "BSC", hint: "BNB Smart Chain" },
      { label: "表示トークン", value: "USDT", hint: "BSC only" },
      { label: "ガスポリシー", value: "sponsorGas", hint: "always true" },
    ],
    env: {
      title: "環境変数の設定が必要です",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID` が空のため Connect UI を隠しています。`.env.example` をコピーして client id を入れるとすぐ接続できます。",
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
          title: "ウォレットなしでもすぐ開始",
          description:
            "Email, Google, Apple, Passkey, Guest を同じ入口にまとめ、モバイルでの入力量を減らしました。",
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
          title: "サインイン方法を選ぶ",
          description:
            "メール、ソーシャル、パスキー、ゲストをインラインで見せて初回導線の摩擦を下げます。",
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
    signInMix: {
      title: "Sign-in Mix",
      eyebrow: "auth channels",
      methods: ["メール", "Google", "Apple", "パスキー", "ゲスト"],
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
        "基于 thirdweb 和 v0 兼容结构构建的移动优先智能钱包启动项目。",
    },
    common: {
      appName: "Pocket Smart Wallet",
      headerEyebrow: "V0-compatible x thirdweb",
      headerDescription:
        "把移动优先的 Smart Account 引导和 gas sponsorship 演示放进同一个界面。",
      languageLabel: "语言",
      connectWallet: "连接钱包",
      connectModalTitle: "开始使用 Pocket Smart Wallet",
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
        "用户可以用邮箱或通行密钥直接进入，并立即切换到 Smart Wallet 流程的链上应用。",
      description:
        "这个版本把 `v0` 友好的组件结构和 `thirdweb` Smart Wallet 连接流程结合在一起。它减少移动端输入负担，并让钱包界面只聚焦 BSC USDT 余额。",
      badges: ["拇指优先流程", "ERC-4337 智能账户", "Gas 赞助演示"],
    },
    metrics: [
      { label: "链", value: "BSC", hint: "BNB Smart Chain" },
      { label: "展示代币", value: "USDT", hint: "BSC only" },
      { label: "Gas 策略", value: "sponsorGas", hint: "always true" },
    ],
    env: {
      title: "需要环境变量配置",
      description:
        "`NEXT_PUBLIC_THIRDWEB_CLIENT_ID` 为空，所以当前隐藏了 Connect UI。复制 `.env.example` 后填入 client id 即可连接。",
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
          title: "没有钱包也能立即进入",
          description:
            "把 Email、Google、Apple、Passkey、Guest 放在同一个入口，减少移动端输入步骤。",
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
          title: "选择登录方式",
          description:
            "把邮箱、社交账号、通行密钥和访客入口直接放在页面上，降低首次进入的摩擦。",
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
    signInMix: {
      title: "Sign-in Mix",
      eyebrow: "auth channels",
      methods: ["邮箱", "Google", "Apple", "通行密钥", "访客"],
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
