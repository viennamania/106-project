import type { Locale } from "@/lib/i18n";

type FanletterV2CopyLocale = "ko" | "en" | "ja";

export type FounderRole =
  | "member"
  | "founder"
  | "mentor"
  | "partner"
  | "creator";

export type LocalizedText = Record<FanletterV2CopyLocale, string>;
export type AIStarStatus = "active" | "archived" | "draft";

export type HumanFounderSlot = {
  initials: string;
  name: string;
  role: FounderRole;
};

export type SpawnedAIStar = {
  accentColor: string;
  accentSecondary: string;
  founderCount: number;
  growthPercent: number;
  id: string;
  name: string;
  portraitInitials: string;
  specialty: LocalizedText;
  starScore: number;
};

export type AIStar = {
  accentColor: string;
  accentSecondary: string;
  founderCount: number;
  founderSlots: HumanFounderSlot[];
  growthPercent: number;
  id: string;
  name: string;
  openSlots: {
    open: number;
    total: number;
  };
  portraitImageUrl?: string | null;
  portraitInitials: string;
  specialty: LocalizedText;
  spawnedStars: SpawnedAIStar[];
  starScore: number;
  universeName: string;
};

export type MemberPortfolioRole = {
  role: Exclude<FounderRole, "member">;
  starId: string;
  starName?: string;
  starStatus?: AIStarStatus | null;
  universeName?: string;
};

export type MemberPortfolio = {
  cpBalance: number;
  creatorEligibilityPercent: number;
  directInvites: number;
  isLiveData?: boolean;
  memberInitials?: string;
  memberName: string;
  primaryStarId?: string | null;
  primaryStarName?: string | null;
  primaryStarStatus?: AIStarStatus | null;
  roles: MemberPortfolioRole[];
  scoutScore: number;
  successfulInvites: number;
};

export type ScoutShareLoopData = {
  isLiveData?: boolean;
  referralCode: string;
  rewards: {
    cp: number;
    creatorProgressPercent: number;
    influenceScore: number;
  };
  selectedUniverse: string;
  shareLink: string;
  sharePlatformLinks?: readonly {
    href: string;
    label: string;
    platform: string;
  }[];
  sharePlatforms: readonly string[];
  sourceMember: string;
  starId?: string;
  starName?: string;
  targetMember: string;
};

export type CreatorUnlockCondition = {
  current: number | string;
  id: string;
  met: boolean;
  target: number | string;
};

export const fanletterV2Mock = {
  aiStars: [
    {
      accentColor: "#8b5cf6",
      accentSecondary: "#22d3ee",
      founderCount: 88,
      founderSlots: [
        { initials: "A", name: "Member A", role: "mentor" },
        { initials: "J", name: "Jisoo", role: "founder" },
        { initials: "K", name: "Kai", role: "member" },
        { initials: "N", name: "Nari", role: "founder" },
      ],
      growthPercent: 42,
      id: "minseo",
      name: "Minseo",
      openSlots: { open: 62, total: 150 },
      portraitInitials: "MS",
      specialty: {
        en: "Golf Lifestyle Star",
        ja: "ゴルフライフスタイルスター",
        ko: "Golf Lifestyle Star",
      },
      spawnedStars: [
        {
          accentColor: "#a855f7",
          accentSecondary: "#2dd4bf",
          founderCount: 14,
          growthPercent: 9,
          id: "ria",
          name: "Ria",
          portraitInitials: "RI",
          specialty: {
            en: "Weekend Golf Rookie",
            ja: "週末ゴルフルーキー",
            ko: "Weekend Golf Rookie",
          },
          starScore: 54,
        },
      ],
      starScore: 82,
      universeName: "Minseo Universe",
    },
    {
      accentColor: "#ec4899",
      accentSecondary: "#f59e0b",
      founderCount: 76,
      founderSlots: [
        { initials: "A", name: "Member A", role: "partner" },
        { initials: "S", name: "Sena", role: "founder" },
        { initials: "M", name: "Mina", role: "member" },
        { initials: "Y", name: "Yuri", role: "mentor" },
      ],
      growthPercent: 28,
      id: "yoonseo",
      name: "Yoonseo",
      openSlots: { open: 44, total: 120 },
      portraitInitials: "YS",
      specialty: {
        en: "Fashion & Beauty Star",
        ja: "ファッション・ビューティースター",
        ko: "Fashion & Beauty Star",
      },
      spawnedStars: [
        {
          accentColor: "#f472b6",
          accentSecondary: "#fb923c",
          founderCount: 19,
          growthPercent: 12,
          id: "lumi",
          name: "Lumi",
          portraitInitials: "LU",
          specialty: {
            en: "Runway Makeup Star",
            ja: "ランウェイメイクスター",
            ko: "Runway Makeup Star",
          },
          starScore: 58,
        },
      ],
      starScore: 73,
      universeName: "Yoonseo Universe",
    },
    {
      accentColor: "#06b6d4",
      accentSecondary: "#84cc16",
      founderCount: 71,
      founderSlots: [
        { initials: "A", name: "Member A", role: "founder" },
        { initials: "D", name: "Dain", role: "member" },
        { initials: "T", name: "Tae", role: "founder" },
        { initials: "R", name: "Rin", role: "mentor" },
      ],
      growthPercent: 23,
      id: "harin",
      name: "Harin",
      openSlots: { open: 39, total: 110 },
      portraitInitials: "HR",
      specialty: {
        en: "Travel & Vlog Star",
        ja: "旅・Vlogスター",
        ko: "Travel & Vlog Star",
      },
      spawnedStars: [
        {
          accentColor: "#38bdf8",
          accentSecondary: "#a3e635",
          founderCount: 11,
          growthPercent: 7,
          id: "noa",
          name: "Noa",
          portraitInitials: "NO",
          specialty: {
            en: "City Walk Vlogger",
            ja: "シティウォークVlogger",
            ko: "City Walk Vlogger",
          },
          starScore: 51,
        },
      ],
      starScore: 71,
      universeName: "Harin Universe",
    },
    {
      accentColor: "#7c3aed",
      accentSecondary: "#f97316",
      founderCount: 42,
      founderSlots: [
        { initials: "A", name: "Member A", role: "creator" },
        { initials: "B", name: "Bora", role: "founder" },
        { initials: "E", name: "Eun", role: "member" },
        { initials: "H", name: "Hwan", role: "founder" },
      ],
      growthPercent: 12,
      id: "seoyeon",
      name: "Seoyeon",
      openSlots: { open: 98, total: 140 },
      portraitInitials: "SY",
      specialty: {
        en: "Story & Writing Star",
        ja: "ストーリー・ライティングスター",
        ko: "Story & Writing Star",
      },
      spawnedStars: [
        {
          accentColor: "#8b5cf6",
          accentSecondary: "#fb7185",
          founderCount: 8,
          growthPercent: 5,
          id: "mira",
          name: "Mira",
          portraitInitials: "MI",
          specialty: {
            en: "Micro Fiction Star",
            ja: "短編フィクションスター",
            ko: "Micro Fiction Star",
          },
          starScore: 48,
        },
      ],
      starScore: 61,
      universeName: "Seoyeon Universe",
    },
  ] satisfies AIStar[],
  creatorUnlock: {
    conditions: [
      { current: 86, id: "scoutScore", met: true, target: 80 },
      { current: 27, id: "directInvites", met: true, target: 20 },
      { current: 6800, id: "cp", met: true, target: 5000 },
      { current: "completed", id: "activityMission", met: true, target: "completed" },
    ] satisfies CreatorUnlockCondition[],
    createCostUsdt: 10,
    unlocked: true,
  },
  memberPortfolio: {
    cpBalance: 6800,
    creatorEligibilityPercent: 86,
    directInvites: 27,
    memberName: "Member A",
    roles: [
      { role: "mentor", starId: "minseo" },
      { role: "partner", starId: "yoonseo" },
      { role: "creator", starId: "seoyeon" },
      { role: "founder", starId: "harin" },
    ],
    scoutScore: 86,
    successfulInvites: 21,
  } satisfies MemberPortfolio,
  scoutShareLoop: {
    referralCode: "MINSEO-A-001",
    rewards: {
      cp: 100,
      creatorProgressPercent: 2,
      influenceScore: 5,
    },
    selectedUniverse: "Minseo Universe",
    shareLink: "https://www.net402.ai/ko/fanletter/minseo?ref=MINSEO-A-001",
    sharePlatforms: ["Kakao", "Instagram", "X", "TikTok"],
    sourceMember: "Member A",
    targetMember: "Member B",
  } satisfies ScoutShareLoopData,
} as const;

export type FanletterV2Copy = {
  creatorPath: {
    body: string;
    steps: Array<{
      body: string;
      title: string;
    }>;
    title: string;
  };
  creatorUnlock: {
    activityMission: string;
    body: string;
    cp: string;
    directInvites: string;
    mockPaymentNotice: string;
    scoutScore: string;
    title: string;
    unlockedLabel: string;
  };
  founderClub: {
    body: string;
    eyebrow: string;
    title: string;
  };
  growthLoop: {
    steps: string[];
    title: string;
  };
  labels: {
    aiStarBadge: string;
    aiStarDiscovery: string;
    cpBalance: string;
    creatorEligibility: string;
    directInvites: string;
    founderClub: string;
    founderCount: string;
    growth: string;
    influenceScore: string;
    memberPortfolio: string;
    openSlots: string;
    referralCode: string;
    scoutScore: string;
    scoutShareLoop: string;
    spawnedStars: string;
    starScore: string;
    successfulInvites: string;
  };
  memberPortfolio: {
    activeHint: string;
    body: string;
    draftHint: string;
    emptyRoles: string;
    liveDataLabel: string;
    manageStarCta: string;
    setupStarCta: string;
    title: string;
  };
  roles: Record<FounderRole, string>;
  scoutShareLoop: {
    body: string;
    liveDataLabel: string;
    memberBBecomesFounder: string;
    rewardsTitle: string;
    selectUniverse: string;
    shareToSns: string;
    title: string;
  };
  topGrowingStars: {
    body: string;
    title: string;
  };
  universePreview: {
    body: string;
    emptySlot: string;
    founderSlots: string;
    title: string;
  };
};

const fanletterV2CopyByLocale: Record<FanletterV2CopyLocale, FanletterV2Copy> = {
  en: {
    creatorPath: {
      body:
        "The first version shows the unlock state only. Creating a new AI Star is a mock action until the real payment flow is added.",
      steps: [
        {
          body: "Scout and invite new Founders into existing AI Star universes.",
          title: "Scout growth",
        },
        {
          body: "Earn CP and Influence Score when members join through your referral code.",
          title: "Founder influence",
        },
        {
          body: "Unlock Creator status, then launch a new AI Star with a 10 USDT mock entry.",
          title: "Creator launch",
        },
      ],
      title: "Creator Path",
    },
    creatorUnlock: {
      activityMission: "Activity mission completed",
      body: "Creator status is unlocked when the scout, invitation, CP, and activity requirements are met.",
      cp: "CP >= 5,000",
      directInvites: "Direct Invites >= 20",
      mockPaymentNotice:
        "Creator launch is previewed at 10 USDT. Checkout opens in a later release.",
      scoutScore: "Scout Score >= 80",
      title: "Creator Unlock",
      unlockedLabel: "Creator Unlock",
    },
    founderClub: {
      body:
        "FanLetter is evolving from an AI character content platform into an AI Star Discovery, Founder, Scout, and Creator growth platform.",
      eyebrow: "Founder Club 2.0",
      title: "Discover AI Stars, become a Founder, and grow into a Creator.",
    },
    growthLoop: {
      steps: [
        "AI Star Discovery",
        "Join as Founder",
        "Create referral code",
        "Share SNS link",
        "New member joins",
        "Earn CP + Influence Score",
        "Unlock Creator",
        "Launch new AI Star",
      ],
      title: "Founder Club 2.0 Growth Loop",
    },
    labels: {
      aiStarBadge: "AI STAR",
      aiStarDiscovery: "AI Star Discovery",
      cpBalance: "CP Balance",
      creatorEligibility: "Creator Eligibility",
      directInvites: "Direct Invites",
      founderClub: "Founder Club",
      founderCount: "Founder Count",
      growth: "Growth",
      influenceScore: "Influence Score",
      memberPortfolio: "Member Portfolio",
      openSlots: "Open Slots",
      referralCode: "Referral Code",
      scoutScore: "Scout Score",
      scoutShareLoop: "Scout Share Loop",
      spawnedStars: "Spawned Stars",
      starScore: "Star Score",
      successfulInvites: "Successful Invites",
    },
    memberPortfolio: {
      activeHint:
        "Your Founder Club AI Star is active. Manage content and growth from the studio.",
      body:
        "A single human member can hold a different role in each AI Star universe.",
      draftHint:
        "A Founder Club AI Star has been prepared for this account. Complete the character profile to activate it.",
      emptyRoles:
        "No AI Star roles are connected to this member yet.",
      liveDataLabel: "Live member data",
      manageStarCta: "Manage my AI Star",
      setupStarCta: "Set up my AI Star",
      title: "Member Founder Portfolio",
    },
    roles: {
      creator: "CREATOR",
      founder: "FOUNDER",
      member: "MEMBER",
      mentor: "MENTOR",
      partner: "PARTNER",
    },
    scoutShareLoop: {
      body:
        "Member A scouts Minseo Universe, creates a referral code, shares it on SNS, and earns growth credit when Member B joins.",
      liveDataLabel: "Live referral link",
      memberBBecomesFounder: "Member B becomes Founder in Minseo Universe",
      rewardsTitle: "Member A earns",
      selectUniverse: "selects Minseo Universe",
      shareToSns: "shares to SNS",
      title: "Invite & Grow Flow",
    },
    topGrowingStars: {
      body:
        "The discovery surface ranks AI Stars by Star Score, growth speed, founder count, and open Founder slots.",
      title: "Top Growing AI Stars",
    },
    universePreview: {
      body:
        "Each Universe separates the center AI Star, human Founder roles, and spawned Stars into one growth map.",
      emptySlot: "Open Founder slot",
      founderSlots: "Human Founder Slots",
      title: "Founder Universe Preview",
    },
  },
  ja: {
    creatorPath: {
      body:
        "最初のバージョンではアンロック状態だけを表示します。実決済を接続するまでは新しいAI Star作成はモックです。",
      steps: [
        {
          body: "既存のAI Star Universeに新しいFounderを招待します。",
          title: "Scout成長",
        },
        {
          body: "紹介コード経由の参加でCPとInfluence Scoreを獲得します。",
          title: "Founder影響力",
        },
        {
          body: "Creatorをアンロックし、10 USDTのモック条件で新しいAI Starをローンチします。",
          title: "Creatorローンチ",
        },
      ],
      title: "Creator Path",
    },
    creatorUnlock: {
      activityMission: "Activity mission completed",
      body:
        "Scout、招待、CP、活動ミッションの条件を満たすとCreatorステータスが開きます。",
      cp: "CP >= 5,000",
      directInvites: "Direct Invites >= 20",
      mockPaymentNotice:
        "Creatorローンチは10 USDTのプレビューとして表示します。Checkoutは今後のリリースで開きます。",
      scoutScore: "Scout Score >= 80",
      title: "Creator Unlock",
      unlockedLabel: "Creator Unlock",
    },
    founderClub: {
      body:
        "FanLetterはAIキャラクターコンテンツだけでなく、AI Star Discovery、Founder、Scout、Creator成長プラットフォームへ進化します。",
      eyebrow: "Founder Club 2.0",
      title: "AI Starを発見し、Founderになり、Creatorへ成長しましょう。",
    },
    growthLoop: {
      steps: [
        "AI Star Discovery",
        "Join as Founder",
        "Create referral code",
        "Share SNS link",
        "New member joins",
        "Earn CP + Influence Score",
        "Unlock Creator",
        "Launch new AI Star",
      ],
      title: "Founder Club 2.0 Growth Loop",
    },
    labels: {
      aiStarBadge: "AI STAR",
      aiStarDiscovery: "AI Star Discovery",
      cpBalance: "CP Balance",
      creatorEligibility: "Creator Eligibility",
      directInvites: "Direct Invites",
      founderClub: "Founder Club",
      founderCount: "Founder Count",
      growth: "Growth",
      influenceScore: "Influence Score",
      memberPortfolio: "Member Portfolio",
      openSlots: "Open Slots",
      referralCode: "Referral Code",
      scoutScore: "Scout Score",
      scoutShareLoop: "Scout Share Loop",
      spawnedStars: "Spawned Stars",
      starScore: "Star Score",
      successfulInvites: "Successful Invites",
    },
    memberPortfolio: {
      activeHint:
        "Founder ClubのAI Starは有効です。Studioでコンテンツと成長を管理できます。",
      body: "1人のHuman MemberがAI Starごとに異なる役割を持てます。",
      draftHint:
        "このアカウント用のFounder Club AI Starが用意されています。Character profileを完成させると有効化できます。",
      emptyRoles:
        "このMemberに接続されたAI Star roleはまだありません。",
      liveDataLabel: "Live member data",
      manageStarCta: "自分のAI Starを管理",
      setupStarCta: "自分のAI Starを設定",
      title: "Member Founder Portfolio",
    },
    roles: {
      creator: "CREATOR",
      founder: "FOUNDER",
      member: "MEMBER",
      mentor: "MENTOR",
      partner: "PARTNER",
    },
    scoutShareLoop: {
      body:
        "Member AがMinseo Universeを選び、紹介コードを作成し、SNSで共有します。Member Bが参加すると成長クレジットを獲得します。",
      liveDataLabel: "Live referral link",
      memberBBecomesFounder: "Member B becomes Founder in Minseo Universe",
      rewardsTitle: "Member A earns",
      selectUniverse: "selects Minseo Universe",
      shareToSns: "shares to SNS",
      title: "Invite & Grow Flow",
    },
    topGrowingStars: {
      body:
        "Discovery画面ではStar Score、成長率、Founder数、空きFounder枠でAI Starを並べます。",
      title: "Top Growing AI Stars",
    },
    universePreview: {
      body:
        "各Universeで中心のAI Star、Human Founderの役割、Spawned Starを1つの成長マップとして分けて表示します。",
      emptySlot: "Open Founder slot",
      founderSlots: "Human Founder Slots",
      title: "Founder Universe Preview",
    },
  },
  ko: {
    creatorPath: {
      body:
        "첫 버전에서는 unlock 상태만 보여줍니다. 실제 결제 플로우를 연결하기 전까지 새 AI Star 생성은 mock 액션입니다.",
      steps: [
        {
          body: "기존 AI Star Universe에 새 Founder를 초대하고 성장 신호를 만듭니다.",
          title: "Scout 성장",
        },
        {
          body: "추천 코드로 가입이 발생하면 CP와 Influence Score를 얻습니다.",
          title: "Founder 영향력",
        },
        {
          body: "Creator를 unlock한 뒤 10 USDT mock 조건으로 새 AI Star를 launch합니다.",
          title: "Creator launch",
        },
      ],
      title: "Creator Path",
    },
    creatorUnlock: {
      activityMission: "Activity mission completed",
      body:
        "Scout Score, Direct Invites, CP, Activity mission 조건을 만족하면 Creator 권한이 열립니다.",
      cp: "CP >= 5,000",
      directInvites: "Direct Invites >= 20",
      mockPaymentNotice:
        "Creator launch는 10 USDT eligibility preview로 표시됩니다. Checkout은 이후 릴리스에서 열립니다.",
      scoutScore: "Scout Score >= 80",
      title: "Creator Unlock",
      unlockedLabel: "Creator Unlock",
    },
    founderClub: {
      body:
        "FanLetter는 AI 캐릭터 콘텐츠 플랫폼을 넘어 AI Star Discovery, Founder, Scout, Creator 성장 플랫폼으로 진화합니다.",
      eyebrow: "Founder Club 2.0",
      title: "AI 스타를 발견하고, Founder가 되고, Creator로 성장하세요",
    },
    growthLoop: {
      steps: [
        "AI Star Discovery",
        "Join as Founder",
        "Create referral code",
        "Share SNS link",
        "New member joins",
        "Earn CP + Influence Score",
        "Unlock Creator",
        "Launch new AI Star",
      ],
      title: "Founder Club 2.0 Growth Loop",
    },
    labels: {
      aiStarBadge: "AI STAR",
      aiStarDiscovery: "AI Star Discovery",
      cpBalance: "CP Balance",
      creatorEligibility: "Creator Eligibility",
      directInvites: "Direct Invites",
      founderClub: "Founder Club",
      founderCount: "Founder Count",
      growth: "Growth",
      influenceScore: "Influence Score",
      memberPortfolio: "Member Portfolio",
      openSlots: "Open Slots",
      referralCode: "Referral Code",
      scoutScore: "Scout Score",
      scoutShareLoop: "Scout Share Loop",
      spawnedStars: "Spawned Stars",
      starScore: "Star Score",
      successfulInvites: "Successful Invites",
    },
    memberPortfolio: {
      activeHint:
        "Founder Club AI Star가 활성화되어 있습니다. Studio에서 콘텐츠와 성장을 관리할 수 있습니다.",
      body: "한 명의 human member가 AI Star마다 서로 다른 역할을 가질 수 있습니다.",
      draftHint:
        "이 계정에 Founder Club AI Star가 준비되어 있습니다. Character profile을 완성하면 활성화할 수 있습니다.",
      emptyRoles:
        "아직 이 member에 연결된 AI Star role이 없습니다.",
      liveDataLabel: "Live member data",
      manageStarCta: "내 AI Star 관리하기",
      setupStarCta: "내 AI Star 설정하기",
      title: "Member Founder Portfolio",
    },
    roles: {
      creator: "CREATOR",
      founder: "FOUNDER",
      member: "MEMBER",
      mentor: "MENTOR",
      partner: "PARTNER",
    },
    scoutShareLoop: {
      body:
        "Member A가 Minseo Universe를 선택하고 referral code를 만든 뒤 SNS에 공유합니다. Member B가 가입하면 성장 보상이 쌓입니다.",
      liveDataLabel: "Live referral link",
      memberBBecomesFounder: "Member B becomes Founder in Minseo Universe",
      rewardsTitle: "Member A earns",
      selectUniverse: "selects Minseo Universe",
      shareToSns: "shares to SNS",
      title: "Invite & Grow Flow",
    },
    topGrowingStars: {
      body:
        "Discovery 화면은 Star Score, 성장률, Founder count, open Founder slots를 기준으로 AI Stars를 보여줍니다.",
      title: "Top Growing AI Stars",
    },
    universePreview: {
      body:
        "각 Universe에서 중심 AI Star, human Founder 역할, Spawned Star를 하나의 성장 맵으로 구분해 보여줍니다.",
      emptySlot: "Open Founder slot",
      founderSlots: "Human Founder Slots",
      title: "Founder Universe Preview",
    },
  },
};

export function getFanletterV2Copy(locale: Locale) {
  if (locale === "ko" || locale === "ja") {
    return fanletterV2CopyByLocale[locale];
  }

  return fanletterV2CopyByLocale.en;
}

export function getFanletterV2LocalizedText(
  value: LocalizedText,
  locale: Locale,
) {
  if (locale === "ko" || locale === "ja") {
    return value[locale];
  }

  return value.en;
}
