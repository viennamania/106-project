import type { Locale } from "@/lib/i18n";

type LandingMetric = {
  hint: string;
  label: string;
  value: string;
};

type LandingCard = {
  description: string;
  title: string;
};

type LandingLiquidityStep = {
  description: string;
  title: string;
};

type LandingGenerationRow = {
  generation: string;
  people: string;
  points: string;
  remark: string;
};

export type LandingCopy = {
  cta: {
    primary: string;
    referrals: string;
    secondary: string;
  };
  engine: {
    cards: LandingCard[];
    description: string;
    eyebrow: string;
    title: string;
  };
  finalCta: {
    bullets: string[];
    description: string;
    eyebrow: string;
    note: string;
    title: string;
  };
  generations: {
    columns: {
      generation: string;
      people: string;
      points: string;
      remark: string;
    };
    description: string;
    eyebrow: string;
    insight: string;
    insightLabel: string;
    rows: LandingGenerationRow[];
    title: string;
    totals: LandingMetric[];
  };
  hero: {
    badges: string[];
    description: string;
    eyebrow: string;
    note: string;
    title: string;
  };
  meta: {
    description: string;
    title: string;
  };
  metrics: LandingMetric[];
  overview: {
    cards: LandingCard[];
    description: string;
    eyebrow: string;
    title: string;
  };
  rewards: {
    cards: LandingCard[];
    description: string;
    eyebrow: string;
    liquiditySteps: LandingLiquidityStep[];
    liquidityTitle: string;
    title: string;
  };
};

const baseGenerationRows = [
  { generation: "G1", people: "6", points: "1,200P" },
  { generation: "G2", people: "36", points: "2,880P" },
  { generation: "G3", people: "216", points: "17,280P" },
  { generation: "G4", people: "1,296", points: "103,680P" },
  { generation: "G5", people: "7,776", points: "622,080P" },
  { generation: "G6", people: "46,656", points: "3,732,480P" },
] as const;

function withGenerationRemarks(remarks: string[]): LandingGenerationRow[] {
  return baseGenerationRows.map((row, index) => ({
    ...row,
    remark: remarks[index] ?? "",
  }));
}

const landingCopy: Record<Locale, LandingCopy> = {
  ko: {
    cta: {
      primary: "1066friend+ 시작하기",
      referrals: "레퍼럴 대시보드",
      secondary: "수익 구조 보기",
    },
    engine: {
      eyebrow: "6x Auto-Matching & Spillover",
      title: "잠자는 동안에도 확장되는 6배수 자동 매칭 구조",
      description:
        "1066friend+는 개인의 영업력만으로 돌아가는 구조가 아닙니다. 비어 있는 자리까지 자동으로 채우는 엔진을 통해 직접 추천과 시스템 흐름이 함께 작동하도록 설계했습니다.",
      cards: [
        {
          title: "6배수 확장 알고리즘",
          description:
            "직접 초대한 6명을 기반으로 6명이 다시 6명을 확장하는 지수형 네트워크 흐름을 만듭니다.",
        },
        {
          title: "랜덤 자동 매칭 시스템",
          description:
            "직접 추천이 잠시 멈춰도 상위 시스템의 스필오버가 빈자리를 메워 네트워크를 계속 움직입니다.",
        },
        {
          title: "심리적 세이프티 넷",
          description:
            "직접 추천이 없어도 수익 세대가 형성될 수 있다는 로직으로, 모든 참여자에게 지속 경로를 제공합니다.",
        },
      ],
    },
    finalCta: {
      eyebrow: "Final Vision",
      title: "1066friend+ 엔진을 열고 당신의 글로벌 수익 허브를 시작하세요",
      description:
        "단순 참여자가 아니라, 당신만의 추천 코드로 독립적인 수익 구조를 운영하는 1차 주체가 되는 것이 이 프로젝트의 핵심입니다. 지금 바로 활성화 플로우를 열고 네트워크를 자산으로 바꾸세요.",
      bullets: [
        "1,000P(약 10달러)로 빠르게 진입하고, 누구나 접근 가능한 글로벌 구조에 합류합니다.",
        "가입 즉시 나만의 추천 코드를 기반으로 독립 네트워크의 1차 주체가 됩니다.",
        "마이페이지에서 포인트를 실시간으로 확인하고 1,000P부터 유동화 경로를 시작할 수 있습니다.",
      ],
      note:
        "가입 실행은 정확히 10 USDT를 전송하는 활성화 플로우를 통해 이어집니다.",
    },
    generations: {
      columns: {
        generation: "세대",
        people: "인원 수",
        points: "합산 포인트",
        remark: "비고",
      },
      description:
        "1066의 핵심은 자동 매칭 관계가 6세대까지 누적되는 지수형 포인트 엔진입니다. 구조가 깊어질수록 패시브 흐름이 더 큰 규모로 쌓입니다.",
      eyebrow: "6-Generation Accumulation",
      insight:
        "6세대 구조가 완성되면 총 56,186명의 글로벌 파트너가 당신의 수익 엔진을 움직입니다. 누계 포인트는 약 4,479,600P이며, 구조는 더 큰 규모의 흐름으로 축적됩니다.",
      insightLabel: "Insight",
      rows: withGenerationRemarks([
        "직접 네트워크의 시작점",
        "오토 매칭 활성화 구간",
        "네트워크 성장 가속",
        "대규모 안정 수익 구간",
        "글로벌 네트워크 심화",
        "최종 구조 완성",
      ]),
      title: "6세대 지수 누적 수익 구조",
      totals: [
        {
          label: "누적 포인트",
          value: "약 4,479,600P",
          hint: "6세대 완성 시점 기준",
        },
        {
          label: "현금 환산",
          value: "$44,796",
          hint: "",
        },
        {
          label: "글로벌 파트너",
          value: "56,186",
          hint: "최종 네트워크 규모",
        },
      ],
    },
    hero: {
      badges: ["1,000P Entry", "6x Auto-Matching", "Instant Cash Flow"],
      description:
        "단순 네트워킹이 아니라, 글로벌 오토 매칭 알고리즘을 통해 당신의 소셜 영향력을 정교한 수익 엔진으로 전환하는 구조입니다. 1066friend+는 관계를 디지털 자산으로 바꾸는 새로운 진입점입니다.",
      eyebrow: "Monetize Your Global Network",
      note:
        "1,000P(약 10달러)로 시작해 6세대 확장, 실시간 유동화, 프리미엄 실물 교환까지 연결되는 구조를 한 페이지에 정리했습니다.",
      title:
        "글로벌 네트워크를 즉시 현금흐름으로 전환하는 1066friend+",
    },
    meta: {
      title: "1066friend+ | Global Profit Engine",
      description:
        "1,000P 진입, 6배수 자동 매칭, 6세대 누적 포인트 구조를 소개하는 1066friend+ 랜딩 페이지.",
    },
    metrics: [
      {
        label: "참여 시작",
        value: "1,000P",
        hint: "약 10달러 수준의 진입",
      },
      {
        label: "확장 구조",
        value: "6 x 6",
        hint: "6세대 지수 확장 엔진",
      },
      {
        label: "완성 네트워크",
        value: "56,186",
        hint: "최종 글로벌 파트너 수",
      },
      {
        label: "최대 환산",
        value: "$44,796",
        hint: "6세대 완성 시 예시 가치",
      },
    ],
    overview: {
      eyebrow: "Project Overview",
      title: "1066 Relationship Point Digital Profit Engine이란?",
      description:
        "1066은 낮은 진입 장벽으로 시작해 개인 네트워크를 글로벌 비즈니스 자산으로 연결하는 디지털 수익 엔진입니다. 참여를 넘어 수익 허브의 중심이 되는 경험을 지향합니다.",
      cards: [
        {
          title: "진입 장벽의 혁신",
          description:
            "단 1,000P(약 10달러)의 소액 참여 비용으로 글로벌 비즈니스 생태계에 즉시 진입할 수 있는 개방형 구조입니다.",
        },
        {
          title: "비즈니스 주권 확보",
          description:
            "독점 추천 코드로 가입하는 순간, 당신은 자신의 네트워크를 운영하는 1차 주체가 되어 독립적인 수익 구조를 가동합니다.",
        },
        {
          title: "글로벌 네트워크의 자산화",
          description:
            "보이지 않던 소셜 자본을 디지털 포인트와 실물 보상으로 전환해 세계와 연결되는 자산 구조로 확장합니다.",
        },
      ],
    },
    rewards: {
      cards: [
        {
          title: "최신 iPhone 교환",
          description:
            "150,000P에 도달하면 디지털 비즈니스의 핵심 도구인 최신 iPhone으로 즉시 교환할 수 있습니다.",
        },
        {
          title: "전기 오토바이 교환",
          description:
            "300,000P에서 친환경 전기 오토바이로 바꾸며 축적된 포인트를 고가치 실물 자산으로 체감할 수 있습니다.",
        },
      ],
      description:
        "1066friend+는 적립 포인트를 단순 숫자로 두지 않습니다. 즉시 교환 가능한 프리미엄 보상과 언제든 꺼낼 수 있는 유동화 경로를 함께 제공합니다.",
      eyebrow: "Premium Rewards & Liquidity",
      liquiditySteps: [
        {
          title: "1. 포인트 확인",
          description:
            "마이페이지에서 누적 포인트를 실시간으로 확인합니다.",
        },
        {
          title: "2. 바우처 발행",
          description:
            "1,000P부터 즉시 바우처로 전환합니다.",
        },
        {
          title: "3. 코인 스왑",
          description:
            "발행한 바우처를 디지털 코인으로 실시간 스왑합니다.",
        },
        {
          title: "4. 24/7 현금화",
          description:
            "거래소를 통해 현지 통화로 언제든 출금합니다.",
        },
      ],
      liquidityTitle: "실시간 유동화 프로세스",
      title: "프리미엄 실물 보상과 즉시 유동화",
    },
  },
  en: {
    cta: {
      primary: "Launch 1066friend+",
      referrals: "Referral dashboard",
      secondary: "View profit structure",
    },
    engine: {
      eyebrow: "6x Auto-Matching & Spillover",
      title: "A 6x auto-matching engine designed to expand while you sleep",
      description:
        "1066friend+ does not depend only on personal marketing skill. It combines direct network growth with an automated matching engine that fills open positions and keeps momentum moving through the structure.",
      cards: [
        {
          title: "6x expansion algorithm",
          description:
            "Start from the 6 partners you invite directly, then let each layer grow outward by 6 to build exponential network scale.",
        },
        {
          title: "Random auto-matching system",
          description:
            "Even when direct referral activity slows down, spillover from the upper structure can fill open spaces automatically.",
        },
        {
          title: "Psychological safety net",
          description:
            "The logic is built to form income generations even without constant direct referral activity, creating a steadier path for participants.",
        },
      ],
    },
    finalCta: {
      eyebrow: "Final Vision",
      title: "Start 1066friend+ and position yourself as the center of a global profit hub",
      description:
        "The project is framed around turning each participant into the primary subject of an independent network. Open the activation flow now and convert social influence into a scalable digital asset structure.",
      bullets: [
        "Enter the ecosystem with 1,000P, approximately $10, in an open-access structure.",
        "Use your exclusive referral code to secure your own network identity from the moment you join.",
        "Track real-time points and begin liquidity actions from 1,000P on your personal dashboard.",
      ],
      note:
        "Signup continues through the exact 10 USDT activation flow used by the product.",
    },
    generations: {
      columns: {
        generation: "Generation",
        people: "Number of people",
        points: "Total points",
        remark: "Remarks",
      },
      description:
        "The core model is a 6-generation exponential point engine. As auto-matched relationships stack across each generation, the flow scales into a much larger passive income structure.",
      eyebrow: "6-Generation Accumulation",
      insight:
        "Once all 6 generations are complete, a network of 56,186 global partners powers your profit engine. Total accumulated points reach approximately 4,479,600P as the structure compounds.",
      insightLabel: "Insight",
      rows: withGenerationRemarks([
        "Foundation of the direct network",
        "Auto-matching activation zone",
        "Acceleration of network growth",
        "Large-scale stable profit entry",
        "Deepening global network reach",
        "Final structure completion",
      ]),
      title: "6-generation exponential accumulation structure",
      totals: [
        {
          label: "Total accumulated points",
          value: "Approx. 4,479,600P",
          hint: "At full 6-generation completion",
        },
        {
          label: "Cash equivalent",
          value: "$44,796",
          hint: "",
        },
        {
          label: "Global network size",
          value: "56,186",
          hint: "Partners in the completed structure",
        },
      ],
    },
    hero: {
      badges: ["1,000P Entry", "6x Auto-Matching", "Instant Cash Flow"],
      description:
        "More than networking, this is framed as a digital profit engine that turns social influence into liquid, global network value. 1066friend+ is built around auto-matching, exponential structure growth, and real-time point monetization.",
      eyebrow: "Monetize your global connections",
      note:
        "The entire flow is summarized in one landing: 1,000P entry, six-generation scaling, premium rewards, and an instant cash-out pathway.",
      title:
        "Monetize your global connections with 1066friend+.",
    },
    meta: {
      title: "1066friend+ | Global Profit Engine",
      description:
        "A homepage for the 1066friend+ digital profit engine with 1,000P entry, 6x auto-matching, and a 6-generation accumulation model.",
    },
    metrics: [
      {
        label: "Entry",
        value: "1,000P",
        hint: "Approx. $10 to get started",
      },
      {
        label: "Expansion",
        value: "6 x 6",
        hint: "Six-generation exponential engine",
      },
      {
        label: "Network",
        value: "56,186",
        hint: "Partners at full structure",
      },
      {
        label: "Cash value",
        value: "$44,796",
        hint: "Illustrated final equivalent",
      },
    ],
    overview: {
      eyebrow: "Project Overview",
      title: "What is the 1066 Relationship Point Digital Profit Engine?",
      description:
        "1066 is presented as a digital profit engine that gives participants a low-barrier path into a sovereign global business network. The emphasis is on becoming a profit hub, not just a user inside a system.",
      cards: [
        {
          title: "Innovation in entry barriers",
          description:
            "Join the ecosystem with a small 1,000P participation fee, approximately $10, in a structure positioned as open to anyone.",
        },
        {
          title: "Securing business sovereignty",
          description:
            "The moment you join through your exclusive referral code, the network is framed around you as the primary subject of an independent profit structure.",
        },
        {
          title: "Global network assetization",
          description:
            "Invisible social capital is repositioned as a digital asset that can connect your personal network to a larger global market.",
        },
      ],
    },
    rewards: {
      cards: [
        {
          title: "Latest iPhone exchange",
          description:
            "At 150,000P, accumulated points can be exchanged for a latest-generation iPhone positioned as an essential business tool.",
        },
        {
          title: "Eco-friendly electric motorcycle",
          description:
            "At 300,000P, the reward path expands into a higher-value physical asset through an electric motorcycle exchange.",
        },
      ],
      description:
        "The system is framed around both aspiration and liquidity. Points are positioned not only as an internal balance, but as a path to premium assets and rapid exit options.",
      eyebrow: "Premium Rewards & Liquidity",
      liquiditySteps: [
        {
          title: "1. Check points",
          description:
            "Track real-time accumulation through your My Page dashboard.",
        },
        {
          title: "2. Issue voucher",
          description:
            "Convert points into vouchers instantly starting from 1,000P.",
        },
        {
          title: "3. Coin swap",
          description:
            "Swap those vouchers into digital coins in real time.",
        },
        {
          title: "4. Cash out 24/7",
          description:
            "Withdraw into local currency through exchanges at any time.",
        },
      ],
      liquidityTitle: "Real-time liquidity process",
      title: "Premium rewards and instant physical asset exchange",
    },
  },
  ja: {
    cta: {
      primary: "1066friend+ を始める",
      referrals: "レファラルダッシュボード",
      secondary: "収益構造を見る",
    },
    engine: {
      eyebrow: "6x Auto-Matching & Spillover",
      title: "眠っている間も拡張する 6 倍自動マッチング構造",
      description:
        "1066friend+ は個人の営業力だけに依存しません。直接紹介と自動マッチングが同時に動くことで、空席を埋めながらネットワーク全体の勢いを保つ構造です。",
      cards: [
        {
          title: "6 倍拡張アルゴリズム",
          description:
            "あなたが直接招待した 6 人を起点に、それぞれがさらに 6 人へ広がる指数型ネットワークを形成します。",
        },
        {
          title: "ランダム自動マッチング",
          description:
            "直接紹介が一時的に止まっても、上位構造からのスピルオーバーが空席を自動で埋めます。",
        },
        {
          title: "心理的セーフティネット",
          description:
            "継続的な直接紹介がなくても収益世代が形成され得るロジックで、参加者に安定した導線を与えます。",
        },
      ],
    },
    finalCta: {
      eyebrow: "Final Vision",
      title: "1066friend+ を起動し、あなた自身をグローバル収益ハブの中心に置く",
      description:
        "このプロジェクトは、各参加者が独立したネットワークの一次主体になることを前提に設計されています。今すぐアクティベーションを開き、ソーシャル影響力を拡張可能なデジタル資産構造へ変えてください。",
      bullets: [
        "約 10 ドル相当の 1,000P から、誰でも参加できるオープン構造に入れます。",
        "専用紹介コードで参加した瞬間から、自分自身のネットワーク主体性を確保します。",
        "マイページでポイントを追跡し、1,000P から流動化アクションを始められます。",
      ],
      note:
        "実際の登録は、プロダクトが使う正確な 10 USDT アクティベーションフローにつながります。",
    },
    generations: {
      columns: {
        generation: "世代",
        people: "人数",
        points: "合算ポイント",
        remark: "備考",
      },
      description:
        "中核となるのは 6 世代にわたる指数型ポイントエンジンです。自動マッチングされた関係が積み上がるほど、より大きなパッシブフローへ拡張されます。",
      eyebrow: "6-Generation Accumulation",
      insight:
        "6 世代構造が完成すると、56,186 人のグローバルパートナーがあなたの収益エンジンを動かします。累積ポイントは約 4,479,600P に達します。",
      insightLabel: "Insight",
      rows: withGenerationRemarks([
        "直接ネットワークの基盤",
        "自動マッチング活性区間",
        "ネットワーク成長の加速",
        "大規模安定収益への入口",
        "グローバルネットワークの深化",
        "最終構造の完成",
      ]),
      title: "6 世代指数累積収益構造",
      totals: [
        {
          label: "累積ポイント",
          value: "約 4,479,600P",
          hint: "6 世代完成時点",
        },
        {
          label: "現金換算",
          value: "$44,796",
          hint: "",
        },
        {
          label: "グローバル規模",
          value: "56,186",
          hint: "完成ネットワーク人数",
        },
      ],
    },
    hero: {
      badges: ["1,000P Entry", "6x Auto-Matching", "Instant Cash Flow"],
      description:
        "単なるネットワーキングではなく、ソーシャル影響力を流動性のあるグローバル価値へ変えるデジタル収益エンジンとして構成されています。1066friend+ は自動マッチング、指数拡張、リアルタイム換金導線を前面に出します。",
      eyebrow: "Monetize Your Global Network",
      note:
        "1,000P エントリー、6 世代拡張、プレミアム報酬、即時キャッシュアウト導線までを 1 ページに集約しました。",
      title:
        "1066friend+ はあなたのグローバルネットワークを即時キャッシュフローへ変える",
    },
    meta: {
      title: "1066friend+ | Global Profit Engine",
      description:
        "1,000P 参加、6 倍自動マッチング、6 世代累積モデルを紹介する 1066friend+ ランディングページ。",
    },
    metrics: [
      {
        label: "参加開始",
        value: "1,000P",
        hint: "約 10 ドルから開始",
      },
      {
        label: "拡張構造",
        value: "6 x 6",
        hint: "6 世代指数エンジン",
      },
      {
        label: "ネットワーク",
        value: "56,186",
        hint: "完成時の総パートナー数",
      },
      {
        label: "最大換算",
        value: "$44,796",
        hint: "最終イメージ価値",
      },
    ],
    overview: {
      eyebrow: "Project Overview",
      title: "1066 Relationship Point Digital Profit Engine とは？",
      description:
        "1066 は低い参入障壁から始まり、個人ネットワークをグローバルビジネス資産へ接続するデジタル収益エンジンとして提示されています。単なる参加者ではなく、収益ハブの中心になることがテーマです。",
      cards: [
        {
          title: "参入障壁の革新",
          description:
            "約 10 ドル相当の 1,000P という小さな参加コストで、誰でも入れるオープンな生態系として構成されています。",
        },
        {
          title: "ビジネス主権の確保",
          description:
            "専用紹介コードで登録した瞬間から、独立した収益構造の一次主体として自分のネットワークを動かす設計です。",
        },
        {
          title: "グローバルネットワークの資産化",
          description:
            "見えにくいソーシャル資本を、より広いグローバル市場につながるデジタル資産へ再定義します。",
        },
      ],
    },
    rewards: {
      cards: [
        {
          title: "最新 iPhone 交換",
          description:
            "150,000P で、デジタルビジネスの必須ツールとして位置付けられる最新 iPhone へ交換できます。",
        },
        {
          title: "電動バイク交換",
          description:
            "300,000P では、より高価値な実物報酬として電動バイク交換の導線が用意されます。",
        },
      ],
      description:
        "このシステムは憧れと流動性を同時に打ち出します。ポイントは内部残高に留まらず、プレミアム資産や即時退出の経路として設計されています。",
      eyebrow: "Premium Rewards & Liquidity",
      liquiditySteps: [
        {
          title: "1. ポイント確認",
          description:
            "マイページで累積ポイントをリアルタイムに追跡します。",
        },
        {
          title: "2. バウチャー発行",
          description:
            "1,000P から即時にバウチャーへ転換します。",
        },
        {
          title: "3. コインスワップ",
          description:
            "発行したバウチャーをリアルタイムでデジタルコインへ交換します。",
        },
        {
          title: "4. 24/7 現金化",
          description:
            "取引所を通じていつでも現地通貨へ出金します。",
        },
      ],
      liquidityTitle: "リアルタイム流動化プロセス",
      title: "プレミアム報酬と即時の実物資産交換",
    },
  },
  zh: {
    cta: {
      primary: "启动 1066friend+",
      referrals: "推荐仪表板",
      secondary: "查看收益结构",
    },
    engine: {
      eyebrow: "6x Auto-Matching & Spillover",
      title: "会在你休息时继续扩张的 6 倍自动匹配结构",
      description:
        "1066friend+ 并不只依赖个人推广能力。它把直接推荐和自动匹配结合起来，用系统机制填补空位并推动整体结构继续扩张。",
      cards: [
        {
          title: "6 倍扩张算法",
          description:
            "从你直接邀请的 6 位伙伴开始，让每一层继续按 6 倍向外扩展，形成指数型网络。",
        },
        {
          title: "随机自动匹配系统",
          description:
            "即使直接推荐暂时放缓，上层结构的 spillover 也会自动填补空位，保持网络继续成长。",
        },
        {
          title: "心理安全网",
          description:
            "即使没有持续性的直接推荐，系统逻辑也试图形成收益代际，为参与者保留更稳定的前进路径。",
        },
      ],
    },
    finalCta: {
      eyebrow: "Final Vision",
      title: "启动 1066friend+，把自己放在全球收益枢纽的中心",
      description:
        "这个项目的叙事核心，是让每位参与者都成为独立网络的第一主体。现在就打开激活流程，把你的社交影响力转化为可扩展的数字资产结构。",
      bullets: [
        "以 1,000P、约 10 美元的门槛进入一个开放式全球结构。",
        "从加入那一刻起，通过专属推荐码建立属于你自己的网络身份。",
        "在个人面板中实时追踪积分，并从 1,000P 开始进入流动化路径。",
      ],
      note:
        "实际注册会继续进入产品使用的精确 10 USDT 激活流程。",
    },
    generations: {
      columns: {
        generation: "代数",
        people: "人数",
        points: "合计积分",
        remark: "备注",
      },
      description:
        "核心模型是一个覆盖 6 代的指数型积分引擎。随着自动匹配关系跨代累积，整体流量会扩展成更大的被动收益结构。",
      eyebrow: "6-Generation Accumulation",
      insight:
        "当 6 代结构全部完成时，共有 56,186 位全球伙伴共同驱动你的收益引擎。总积分约为 4,479,600P，网络流量会继续累积。",
      insightLabel: "Insight",
      rows: withGenerationRemarks([
        "直接网络的起始基础",
        "自动匹配启动区",
        "网络增长加速",
        "进入大规模稳定收益",
        "全球网络进一步深化",
        "最终结构完成",
      ]),
      title: "6 代指数累积收益结构",
      totals: [
        {
          label: "累计积分",
          value: "约 4,479,600P",
          hint: "以 6 代完成为基准",
        },
        {
          label: "现金等值",
          value: "$44,796",
          hint: "",
        },
        {
          label: "全球网络规模",
          value: "56,186",
          hint: "完成结构后的伙伴数",
        },
      ],
    },
    hero: {
      badges: ["1,000P Entry", "6x Auto-Matching", "Instant Cash Flow"],
      description:
        "这不仅是一个社交网络概念，而是被包装为把社交影响力转化为可流动全球价值的数字收益引擎。1066friend+ 的核心卖点是自动匹配、指数扩张和实时积分变现路径。",
      eyebrow: "Monetize Your Global Network",
      note:
        "这一页集中展示 1,000P 入场、六代扩张、实物奖励以及即时现金化流程。",
      title:
        "1066friend+ 将你的全球网络转化为即时现金流",
    },
    meta: {
      title: "1066friend+ | Global Profit Engine",
      description:
        "介绍 1,000P 入场、6 倍自动匹配和 6 代累积模型的 1066friend+ 首页。",
    },
    metrics: [
      {
        label: "入场门槛",
        value: "1,000P",
        hint: "约 10 美元起步",
      },
      {
        label: "扩张结构",
        value: "6 x 6",
        hint: "6 代指数引擎",
      },
      {
        label: "网络规模",
        value: "56,186",
        hint: "结构完成后的伙伴总数",
      },
      {
        label: "现金价值",
        value: "$44,796",
        hint: "示意性的最终等值",
      },
    ],
    overview: {
      eyebrow: "Project Overview",
      title: "什么是 1066 Relationship Point Digital Profit Engine？",
      description:
        "1066 被定位为一个数字收益引擎，以较低门槛切入，并把个人关系网络连接为全球商业资产。重点不是成为系统中的普通参与者，而是成为收益中心。",
      cards: [
        {
          title: "进入门槛的创新",
          description:
            "只需 1,000P、约 10 美元即可加入，被描述为任何人都能进入的开放结构。",
        },
        {
          title: "掌握业务主权",
          description:
            "通过专属推荐码加入的瞬间，你就被定义为独立收益结构中的第一主体。",
        },
        {
          title: "全球网络资产化",
          description:
            "把原本不可见的社交资本重新包装成可连接更大全球市场的数字资产。",
        },
      ],
    },
    rewards: {
      cards: [
        {
          title: "兑换最新 iPhone",
          description:
            "达到 150,000P 后，可兑换最新款 iPhone，作为数字业务的重要工具。",
        },
        {
          title: "兑换环保电动摩托车",
          description:
            "达到 300,000P 后，积分可进一步转换为更高价值的电动摩托车等奖励。",
        },
      ],
      description:
        "这个系统同时强调愿景和流动性。积分不仅是内部数字，也被描述成通往高价值实物奖励和快速退出通道的凭证。",
      eyebrow: "Premium Rewards & Liquidity",
      liquiditySteps: [
        {
          title: "1. 查看积分",
          description:
            "在个人页面实时查看积分累积情况。",
        },
        {
          title: "2. 发行代金券",
          description:
            "从 1,000P 起即可即时转成代金券。",
        },
        {
          title: "3. 兑换数字币",
          description:
            "把代金券实时换成数字货币。",
        },
        {
          title: "4. 24/7 提现",
          description:
            "通过交易所随时兑换为本地货币并提现。",
        },
      ],
      liquidityTitle: "实时流动化流程",
      title: "高端奖励与即时实物资产兑换",
    },
  },
};

export function getLandingCopy(locale: Locale) {
  return landingCopy[locale];
}
