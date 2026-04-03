import type { Locale } from "@/lib/i18n";

type LandingMetric = {
  hint: string;
  label: string;
  value: string;
};

type LandingStep = {
  description: string;
  title: string;
};

type LandingValue = {
  description: string;
  title: string;
};

type LandingFaq = {
  answer: string;
  question: string;
};

export type LandingCopy = {
  cta: {
    primary: string;
    referrals: string;
    secondary: string;
  };
  faq: LandingFaq[];
  hero: {
    badges: [string, string, string];
    description: string;
    eyebrow: string;
    note: string;
    title: string;
  };
  legal: {
    note: string;
    title: string;
  };
  mechanics: {
    bullets: [string, string, string, string];
    description: string;
    title: string;
  };
  meta: {
    description: string;
    title: string;
  };
  metrics: [LandingMetric, LandingMetric, LandingMetric, LandingMetric];
  proof: {
    bullets: [string, string, string, string];
    title: string;
  };
  sectionLabels: {
    faq: string;
    howItWorks: string;
    proof: string;
    value: string;
  };
  sectionTitles: {
    faq: string;
    finalCta: string;
    summary: string;
    value: string;
  };
  steps: [LandingStep, LandingStep, LandingStep];
  values: [LandingValue, LandingValue, LandingValue, LandingValue];
};

const landingCopy: Record<Locale, LandingCopy> = {
  ko: {
    cta: {
      primary: "활성화 플로우 열기",
      referrals: "레퍼럴 대시보드",
      secondary: "작동 방식 보기",
    },
    faq: [
      {
        question: "등록 완료는 언제 반영되나요?",
        answer:
          "연결된 지갑에서 PROJECT_WALLET로 정확히 10 USDT를 전송하고, 서버가 해당 전송을 webhook 또는 저장된 온체인 결제 기록으로 검증하면 완료 상태로 전환됩니다.",
      },
      {
        question: "추천 코드는 언제 적용되나요?",
        answer:
          "랜딩이나 활성화 링크에 포함된 추천 코드는 가입 완료 시점에만 회원 정보에 저장됩니다. 한도에 도달한 코드는 적용되지 않습니다.",
      },
      {
        question: "무엇이 보장되고 무엇이 보장되지 않나요?",
        answer:
          "이 앱은 지갑 연결, 결제 검증, 회원 상태 반영, 레퍼럴 추적을 자동화합니다. 수익이나 출금 가능성 자체를 보장하지는 않으며, 운영 정책과 지역 제한을 따라야 합니다.",
      },
      {
        question: "왜 홈페이지와 활성화 화면을 분리했나요?",
        answer:
          "설명용 랜딩은 빠르게 읽히고 공유되도록 정적으로 유지하고, 지갑 상태와 결제 검증이 필요한 실제 가입 플로우는 별도 활성화 경로로 분리했습니다.",
      },
    ],
    hero: {
      badges: ["Email Smart Wallet", "Exact 10 USDT", "Webhook Verified"],
      description:
        "이 랜딩은 Gamma 슬라이드형 세일즈 페이지를 앱 고유의 Next.js 엔트리로 재구성한 버전입니다. 설명, 검증, 가입 흐름을 한 제품 안에서 명확히 분리합니다.",
      eyebrow: "Onchain Activation Landing",
      note:
        "과장된 수익 약속 대신, 실제 가입 경로와 상태 반영 방식을 먼저 보여줍니다.",
      title:
        "10 USDT 활성화 규칙과 이메일 스마트 월렛 가입 플로우를 하나의 제품 랜딩으로 정리했습니다.",
    },
    legal: {
      note:
        "이 페이지는 서비스 작동 방식과 가입 절차를 설명합니다. 운영 주체, 지역 제한, 수수료, 출금 정책, 위험 고지는 별도 문서로 함께 제공되어야 합니다.",
      title: "운영 및 고지",
    },
    mechanics: {
      bullets: [
        "랜딩의 `?ref=` 값은 활성화 CTA에 그대로 전달됩니다.",
        "추천 코드 검증은 정적 랜딩이 아니라 활성화 경로에서 수행합니다.",
        "회원 상태 반영은 클라이언트 성공 알림이 아니라 서버 검증 결과를 기준으로 합니다.",
        "등록 완료 후에만 레퍼럴 코드와 대시보드가 열립니다.",
      ],
      description:
        "마케팅과 제품 실행을 섞지 않기 위해, 설명 페이지는 정적으로 유지하고 가입 검증은 `/{lang}/activate`에서 처리합니다.",
      title: "레퍼럴과 활성화 분리 방식",
    },
    meta: {
      title: "1066.my Activation Landing",
      description:
        "10 USDT 활성화, 이메일 스마트 월렛 로그인, webhook 기반 상태 반영을 설명하는 다국어 Next.js 랜딩.",
    },
    metrics: [
      { hint: "Locale-aware pages", label: "라우팅", value: "/{lang}" },
      { hint: "Activation rule", label: "가입 금액", value: "10 USDT" },
      { hint: "Email OTP", label: "월렛 진입", value: "Email Login" },
      { hint: "Server verified", label: "완료 기준", value: "Webhook" },
    ],
    proof: {
      bullets: [
        "PROJECT_WALLET 주소를 랜딩에서 바로 공개할 수 있습니다.",
        "입금 확인 시점과 트랜잭션 해시를 회원 레코드에 남깁니다.",
        "결제 대기 상태는 내부 재조정 API와 워커로 복구할 수 있습니다.",
        "레퍼럴 코드는 가입 완료 이후에만 생성됩니다.",
      ],
      title: "신뢰와 검증 포인트",
    },
    sectionLabels: {
      faq: "FAQ",
      howItWorks: "How It Works",
      proof: "Verification",
      value: "Why This Build",
    },
    sectionTitles: {
      faq: "활성화 전에 확인할 질문",
      finalCta: "설명과 실행을 분리한 구조로 전환할 준비가 되었나요?",
      summary: "운영 요약",
      value: "왜 이렇게 다시 만들었는가",
    },
    steps: [
      {
        title: "1. 이메일로 스마트 월렛 세션 시작",
        description:
          "사용자는 별도 시드 문구 없이 이메일 OTP만으로 월렛 세션을 시작합니다.",
      },
      {
        title: "2. 정확히 10 USDT 전송",
        description:
          "연결된 월렛이 PROJECT_WALLET로 정확한 금액을 보내야 가입 조건이 충족됩니다.",
      },
      {
        title: "3. 서버가 완료 상태 반영",
        description:
          "webhook 또는 저장된 결제 이벤트와 대조해 회원 상태를 `completed`로 바꾸고 레퍼럴 코드를 활성화합니다.",
      },
    ],
    values: [
      {
        title: "정적 랜딩",
        description:
          "홈은 설명과 공유에 집중하고, 지갑 상태 때문에 느려지지 않도록 SSG 경로로 유지합니다.",
      },
      {
        title: "분리된 활성화 경로",
        description:
          "지갑 연결, 결제 버튼, 회원 동기화는 `activate` 경로에만 두어 제품 책임을 분리합니다.",
      },
      {
        title: "레퍼럴 전달 유지",
        description:
          "랜딩은 추천 코드를 잃지 않고 활성화 화면으로 넘기지만, 서버 검증 전에는 확정하지 않습니다.",
      },
      {
        title: "과장 없는 카피",
        description:
          "자동화와 운영 구조를 설명하되, 보장형 수익 표현과 과도한 선점 문구는 제거합니다.",
      },
    ],
  },
  en: {
    cta: {
      primary: "Open activation flow",
      referrals: "Referral dashboard",
      secondary: "See how it works",
    },
    faq: [
      {
        question: "When does signup become complete?",
        answer:
          "Only after the connected wallet sends exactly 10 USDT to PROJECT_WALLET and the backend verifies the transfer through webhook data or stored payment events.",
      },
      {
        question: "When is a referral code applied?",
        answer:
          "A referral code coming from the landing URL is persisted only when signup completes. Codes that have reached their limit are rejected during activation.",
      },
      {
        question: "What is automated here and what is not?",
        answer:
          "Wallet login, payment verification, member state transitions, and referral tracking are automated. Profit, availability, and payout outcomes are not guaranteed by this page.",
      },
      {
        question: "Why split landing and activation?",
        answer:
          "The landing is designed for speed, shareability, and explanation. The activation route is where dynamic wallet state and backend validation belong.",
      },
    ],
    hero: {
      badges: ["Email Smart Wallet", "Exact 10 USDT", "Webhook Verified"],
      description:
        "This is the app-owned replacement for the Gamma sales page. It keeps the offer simple, but explains the actual activation mechanics in product terms.",
      eyebrow: "Onchain Activation Landing",
      note:
        "The page emphasizes verification, not guaranteed return language.",
      title:
        "A first-party landing for email wallet onboarding, 10 USDT activation, and webhook-confirmed member state.",
    },
    legal: {
      note:
        "This page explains activation and member-state flow. Operator details, regional restrictions, fees, withdrawal rules, and risk disclosures should be published alongside it.",
      title: "Operator and risk note",
    },
    mechanics: {
      bullets: [
        "The landing keeps `?ref=` intact when sending users to activation.",
        "Referral validation happens in the activation route, not on the static homepage.",
        "Member completion depends on backend verification, not only client transaction success.",
        "Referral codes and dashboards unlock only after signup is complete.",
      ],
      description:
        "Marketing and product execution stay separate: the landing is static, while activation lives under `/{lang}/activate`.",
      title: "How referral handoff works",
    },
    meta: {
      title: "1066.my Activation Landing",
      description:
        "A multilingual Next.js landing for email smart-wallet signup, exact 10 USDT activation, and webhook-based member completion.",
    },
    metrics: [
      { hint: "Locale-aware pages", label: "Routing", value: "/{lang}" },
      { hint: "Activation rule", label: "Amount", value: "10 USDT" },
      { hint: "Email OTP", label: "Wallet entry", value: "Email Login" },
      { hint: "Server verified", label: "Completion", value: "Webhook" },
    ],
    proof: {
      bullets: [
        "The landing can expose the public project wallet address directly.",
        "Confirmed timestamps and transaction hashes are persisted on the member record.",
        "Pending payments can be recovered through internal reconciliation routes and workers.",
        "Referral codes are generated only after a verified completed signup.",
      ],
      title: "Proof and transparency",
    },
    sectionLabels: {
      faq: "FAQ",
      howItWorks: "How It Works",
      proof: "Verification",
      value: "Why This Build",
    },
    sectionTitles: {
      faq: "Questions before activation",
      finalCta: "Ready to separate explanation from execution?",
      summary: "Operational summary",
      value: "Why this build",
    },
    steps: [
      {
        title: "1. Start with email login",
        description:
          "Users enter through a single smart-wallet path powered by email OTP.",
      },
      {
        title: "2. Send exactly 10 USDT",
        description:
          "The connected wallet must transfer the exact activation amount to PROJECT_WALLET.",
      },
      {
        title: "3. Let the backend finalize signup",
        description:
          "Webhook data or stored payment events are checked before the member status becomes completed and the referral code activates.",
      },
    ],
    values: [
      {
        title: "Static landing",
        description:
          "The homepage stays fast and cacheable because it does not depend on wallet state or member queries.",
      },
      {
        title: "Dedicated activation route",
        description:
          "Wallet connection, payment controls, and member sync live only in the activation path.",
      },
      {
        title: "Referral-safe handoff",
        description:
          "The landing preserves referral attribution without forcing request-time rendering.",
      },
      {
        title: "Defensible messaging",
        description:
          "The copy explains onboarding and verification instead of leaning on guaranteed-return claims.",
      },
    ],
  },
  ja: {
    cta: {
      primary: "アクティベーションを開く",
      referrals: "レファラルダッシュボード",
      secondary: "仕組みを見る",
    },
    faq: [
      {
        question: "登録完了はいつ反映されますか？",
        answer:
          "接続中ウォレットから PROJECT_WALLET へ正確に 10 USDT を送り、バックエンドが webhook または保存済み決済イベントでその送金を検証した後に完了になります。",
      },
      {
        question: "紹介コードはいつ適用されますか？",
        answer:
          "ランディング URL の紹介コードは、登録が完了した時点でのみ会員情報に保存されます。上限に達したコードはアクティベーション時に拒否されます。",
      },
      {
        question: "何が自動化され、何が保証されませんか？",
        answer:
          "メールログイン、決済検証、会員状態反映、レファラル追跡は自動化されます。利益や出金可能性そのものをこのページが保証するわけではありません。",
      },
      {
        question: "なぜホームとアクティベーションを分けるのですか？",
        answer:
          "説明用ランディングは高速で共有しやすく保ち、ウォレット状態や検証が必要な実処理は専用のアクティベーション経路に分離するためです。",
      },
    ],
    hero: {
      badges: ["Email Smart Wallet", "Exact 10 USDT", "Webhook Verified"],
      description:
        "Gamma の営業用ページを、アプリ内で所有できる Next.js ランディングに置き換える構成です。オファーはシンプルに保ちつつ、仕組みはプロダクトの言葉で説明します。",
      eyebrow: "Onchain Activation Landing",
      note:
        "誇張した収益表現ではなく、検証と登録フローを前面に出します。",
      title:
        "メールウォレット導線、10 USDT アクティベーション、webhook 完了処理を自前のランディングに再構成します。",
    },
    legal: {
      note:
        "このページは登録フローの説明用です。運営主体、地域制限、手数料、出金条件、リスク開示は別ドキュメントとして併設すべきです。",
      title: "運営とリスクの注記",
    },
    mechanics: {
      bullets: [
        "ランディングの `?ref=` はそのままアクティベーション CTA に引き継ぎます。",
        "紹介コードの検証は静的ホームではなくアクティベーション経路で実行します。",
        "登録完了はクライアント表示ではなくサーバー検証結果を基準にします。",
        "レファラルコードとダッシュボードは登録完了後にのみ開放します。",
      ],
      description:
        "マーケティングと実処理を分けるため、ランディングは静的、登録実行は `/{lang}/activate` に置きます。",
      title: "紹介コード引き継ぎの仕組み",
    },
    meta: {
      title: "1066.my Activation Landing",
      description:
        "メールスマートウォレット、正確な 10 USDT 入金、webhook ベースの会員完了を説明する多言語 Next.js ランディング。",
    },
    metrics: [
      { hint: "Locale-aware pages", label: "ルーティング", value: "/{lang}" },
      { hint: "Activation rule", label: "登録金額", value: "10 USDT" },
      { hint: "Email OTP", label: "入口", value: "Email Login" },
      { hint: "Server verified", label: "完了基準", value: "Webhook" },
    ],
    proof: {
      bullets: [
        "公開可能な PROJECT_WALLET アドレスをランディングに表示できます。",
        "確認時刻とトランザクションハッシュを会員レコードに保存します。",
        "支払い待ちは内部の再調整ルートとワーカーで回復できます。",
        "レファラルコードは検証済み登録完了後にのみ生成されます。",
      ],
      title: "検証と透明性",
    },
    sectionLabels: {
      faq: "FAQ",
      howItWorks: "How It Works",
      proof: "Verification",
      value: "Why This Build",
    },
    sectionTitles: {
      faq: "アクティベーション前によくある質問",
      finalCta: "説明ページと実行フローを分離した構成に切り替えますか？",
      summary: "運用サマリー",
      value: "この構成に作り直す理由",
    },
    steps: [
      {
        title: "1. メールログインで開始",
        description:
          "利用者はメール OTP ベースの単一導線からスマートウォレットを開始します。",
      },
      {
        title: "2. 正確に 10 USDT を送金",
        description:
          "接続中ウォレットが PROJECT_WALLET に正確なアクティベーション額を送る必要があります。",
      },
      {
        title: "3. バックエンドが登録完了を確定",
        description:
          "webhook または保存済み決済イベントで検証した後に `completed` へ遷移し、レファラルコードが有効化されます。",
      },
    ],
    values: [
      {
        title: "静的ランディング",
        description:
          "ホームはウォレット状態や会員クエリに依存せず、高速に配信できます。",
      },
      {
        title: "専用アクティベーション経路",
        description:
          "ウォレット接続、決済 UI、会員同期は `activate` 経路だけに閉じ込めます。",
      },
      {
        title: "紹介コード保持",
        description:
          "ランディングは紹介コードを失わずに引き継ぎつつ、リクエスト時レンダリングを避けます。",
      },
      {
        title: "過剰表現の削減",
        description:
          "保証的な収益表現を避け、登録と検証の仕組みを説明するコピーに寄せます。",
      },
    ],
  },
  zh: {
    cta: {
      primary: "打开激活流程",
      referrals: "推荐仪表板",
      secondary: "查看流程说明",
    },
    faq: [
      {
        question: "注册何时会完成？",
        answer:
          "只有当已连接钱包向 PROJECT_WALLET 精确转入 10 USDT，且后端通过 webhook 或已保存的支付事件验证该转账后，状态才会变为完成。",
      },
      {
        question: "推荐码什么时候会生效？",
        answer:
          "落地页 URL 中的推荐码只会在注册真正完成时写入会员记录。达到上限的推荐码会在激活阶段被拒绝。",
      },
      {
        question: "哪些是自动化的，哪些不是保证？",
        answer:
          "邮箱登录、支付验证、会员状态切换、推荐追踪是自动化的。但本页并不保证收益、可用性或提现结果。",
      },
      {
        question: "为什么把首页和激活页分开？",
        answer:
          "这样首页可以保持更快、更适合分享，而需要钱包状态和后端验证的逻辑则留在专门的激活路径中。",
      },
    ],
    hero: {
      badges: ["Email Smart Wallet", "Exact 10 USDT", "Webhook Verified"],
      description:
        "这是把 Gamma 销售页替换为应用自有 Next.js 落地页的版本。保留简单的入口，但用产品化语言解释真实激活机制。",
      eyebrow: "Onchain Activation Landing",
      note:
        "页面强调验证和流程，而不是保证式收益表述。",
      title:
        "把邮箱钱包登录、10 USDT 激活规则和 webhook 完成逻辑，整理成应用自有的多语言落地页。",
    },
    legal: {
      note:
        "本页用于说明激活与会员状态流程。运营主体、地区限制、费用、提现规则和风险披露应配套公开。",
      title: "运营与风险说明",
    },
    mechanics: {
      bullets: [
        "落地页中的 `?ref=` 会原样带入激活 CTA。",
        "推荐码验证发生在激活路径，而不是静态首页。",
        "会员完成状态以服务端验证结果为准，而不是只看前端交易成功。",
        "只有注册完成后才会解锁推荐码和推荐仪表板。",
      ],
      description:
        "为了把营销和产品执行分开，落地页保持静态，而激活逻辑放在 `/{lang}/activate`。",
      title: "推荐码传递方式",
    },
    meta: {
      title: "1066.my Activation Landing",
      description:
        "一个介绍邮箱智能钱包、精确 10 USDT 激活和 webhook 驱动会员完成的多语言 Next.js 落地页。",
    },
    metrics: [
      { hint: "Locale-aware pages", label: "路由", value: "/{lang}" },
      { hint: "Activation rule", label: "注册金额", value: "10 USDT" },
      { hint: "Email OTP", label: "钱包入口", value: "Email Login" },
      { hint: "Server verified", label: "完成依据", value: "Webhook" },
    ],
    proof: {
      bullets: [
        "可直接在落地页展示公开的 PROJECT_WALLET 地址。",
        "确认时间与交易哈希会写入会员记录。",
        "待支付记录可以通过内部重对账接口和 worker 恢复。",
        "推荐码只会在验证通过的注册完成后生成。",
      ],
      title: "验证与透明度",
    },
    sectionLabels: {
      faq: "FAQ",
      howItWorks: "How It Works",
      proof: "Verification",
      value: "Why This Build",
    },
    sectionTitles: {
      faq: "激活前常见问题",
      finalCta: "准备好把说明页和执行流程分开了吗？",
      summary: "运营摘要",
      value: "为什么这样重建",
    },
    steps: [
      {
        title: "1. 先通过邮箱登录",
        description:
          "用户通过邮箱 OTP 作为唯一入口开始智能钱包会话。",
      },
      {
        title: "2. 精确转入 10 USDT",
        description:
          "已连接钱包必须向 PROJECT_WALLET 转入精确的激活金额。",
      },
      {
        title: "3. 由后端确认完成注册",
        description:
          "只有在 webhook 或已保存支付事件验证通过后，会员状态才会切换为 `completed` 并激活推荐码。",
      },
    ],
    values: [
      {
        title: "静态落地页",
        description:
          "首页不依赖钱包状态或会员查询，因此更快也更适合缓存。",
      },
      {
        title: "独立激活路径",
        description:
          "钱包连接、支付控件和会员同步只放在 `activate` 路径中。",
      },
      {
        title: "保留推荐归因",
        description:
          "落地页可以保留推荐码传递，又不需要把首页变成请求时渲染。",
      },
      {
        title: "更可辩护的文案",
        description:
          "文案聚焦于注册和验证流程，而不是使用保证收益式表达。",
      },
    ],
  },
};

export function getLandingCopy(locale: Locale) {
  return landingCopy[locale];
}
