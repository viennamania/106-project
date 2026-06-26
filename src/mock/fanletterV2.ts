import type { Locale } from "@/lib/i18n";
import type { FanletterFounderUniverseRole } from "@/lib/fanletter-founder-universe";

type FanletterV2CopyLocale = "ko" | "en" | "ja";

export type FounderRole = "member" | FanletterFounderUniverseRole;

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
  createdByMemberName?: string;
  createdByUnlock?: boolean;
  founderCount: number;
  growthPercent: number;
  id: string;
  launchCostUsdt?: number;
  name: string;
  portraitInitials: string;
  sourceUniverseName?: string;
  spawnedFromStarId?: string;
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
  parentStar?: SpawnedAIStar | null;
  specialty: LocalizedText;
  spawnedStars: SpawnedAIStar[];
  starScore: number;
  universeName: string;
};

export type MemberPortfolioRole = {
  portraitImageUrl?: string | null;
  portraitInitials?: string | null;
  role: Exclude<FounderRole, "member">;
  starId: string;
  starName?: string;
  starStatus?: AIStarStatus | null;
  universeName?: string;
};

export type MemberOwnedAIStar = {
  createdByUnlock?: boolean;
  id: string;
  launchCostUsdt?: number;
  name: string;
  portraitImageUrl?: string | null;
  portraitInitials?: string | null;
  sourceUniverseName?: string | null;
  spawnedFromStarId?: string | null;
  status?: AIStarStatus | null;
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
  ownedStars: MemberOwnedAIStar[];
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
  id:
    | "activityMission"
    | "agentRankAuditReady"
    | "agentRankEventQuality"
    | "cp"
    | "directInvites"
    | "founderContributionScore"
    | "scoutScore"
    | string;
  met: boolean;
  target: number | string;
};

export type CreatorUnlockData = {
  conditions: CreatorUnlockCondition[];
  createCostUsdt: number;
  isLiveData?: boolean;
  launchPreview?: {
    newStarName: string;
    ownerName: string;
    sourceUniverseName: string;
    status: "mock_ready" | "locked";
  };
  unlocked: boolean;
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
        { initials: "SR", name: "Sora", role: "genesis_founder" },
        { initials: "MJ", name: "Minjun", role: "producer" },
      ],
      growthPercent: 42,
      id: "minseo",
      name: "Minseo",
      openSlots: { open: 62, total: 150 },
      portraitInitials: "MS",
      specialty: {
        en: "Golf Lifestyle Star",
        ja: "ゴルフライフスタイルスター",
        ko: "골프 라이프스타일 스타",
      },
      spawnedStars: [
        {
          accentColor: "#a855f7",
          accentSecondary: "#2dd4bf",
          createdByMemberName: "Member A",
          createdByUnlock: true,
          founderCount: 14,
          growthPercent: 9,
          id: "ria",
          launchCostUsdt: 10,
          name: "Ria",
          portraitInitials: "RI",
          sourceUniverseName: "Minseo Universe",
          spawnedFromStarId: "minseo",
          specialty: {
            en: "Weekend Golf Rookie",
            ja: "週末ゴルフルーキー",
            ko: "주말 골프 루키",
          },
          starScore: 54,
        },
        {
          accentColor: "#7c3aed",
          accentSecondary: "#f59e0b",
          createdByMemberName: "Jisoo",
          createdByUnlock: true,
          founderCount: 18,
          growthPercent: 11,
          id: "narin",
          launchCostUsdt: 10,
          name: "Narin",
          portraitInitials: "NR",
          sourceUniverseName: "Minseo Universe",
          spawnedFromStarId: "minseo",
          specialty: {
            en: "Golf Cafe Vlogger",
            ja: "ゴルフカフェVlogger",
            ko: "골프 카페 브이로그 스타",
          },
          starScore: 57,
        },
        {
          accentColor: "#22c55e",
          accentSecondary: "#60a5fa",
          createdByMemberName: "Sora",
          founderCount: 9,
          growthPercent: 6,
          id: "arin",
          name: "Arin",
          portraitInitials: "AR",
          sourceUniverseName: "Minseo Universe",
          spawnedFromStarId: "minseo",
          specialty: {
            en: "Healthy Routine Star",
            ja: "ヘルシールーティンスター",
            ko: "헬시 루틴 스타",
          },
          starScore: 49,
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
        { initials: "HB", name: "Haru B", role: "genesis_founder" },
        { initials: "LE", name: "Leo", role: "producer" },
      ],
      growthPercent: 28,
      id: "yoonseo",
      name: "Yoonseo",
      openSlots: { open: 44, total: 120 },
      portraitInitials: "YS",
      specialty: {
        en: "Fashion & Beauty Star",
        ja: "ファッション・ビューティースター",
        ko: "패션·뷰티 스타",
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
            ko: "런웨이 메이크업 스타",
          },
          starScore: 58,
        },
        {
          accentColor: "#db2777",
          accentSecondary: "#fbbf24",
          createdByMemberName: "Sena",
          founderCount: 16,
          growthPercent: 10,
          id: "mellie",
          name: "Mellie",
          portraitInitials: "ME",
          sourceUniverseName: "Yoonseo Universe",
          spawnedFromStarId: "yoonseo",
          specialty: {
            en: "Daily Styling Star",
            ja: "デイリースタイリングスター",
            ko: "데일리 스타일링 스타",
          },
          starScore: 56,
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
        { initials: "JW", name: "Juwon", role: "genesis_founder" },
        { initials: "EL", name: "Ella", role: "partner" },
      ],
      growthPercent: 23,
      id: "harin",
      name: "Harin",
      openSlots: { open: 39, total: 110 },
      portraitInitials: "HR",
      specialty: {
        en: "Travel & Vlog Star",
        ja: "旅・Vlogスター",
        ko: "여행·브이로그 스타",
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
            ko: "도시 산책 브이로그 스타",
          },
          starScore: 51,
        },
        {
          accentColor: "#0891b2",
          accentSecondary: "#bef264",
          createdByMemberName: "Rin",
          founderCount: 13,
          growthPercent: 8,
          id: "sola",
          name: "Sola",
          portraitInitials: "SO",
          sourceUniverseName: "Harin Universe",
          spawnedFromStarId: "harin",
          specialty: {
            en: "Local Food Vlogger",
            ja: "ローカルフードVlogger",
            ko: "로컬 푸드 브이로그 스타",
          },
          starScore: 53,
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
        { initials: "SY", name: "Seyoung", role: "mentor" },
        { initials: "IK", name: "Ian K", role: "partner" },
      ],
      growthPercent: 12,
      id: "seoyeon",
      name: "Seoyeon",
      openSlots: { open: 98, total: 140 },
      portraitInitials: "SY",
      specialty: {
        en: "Story & Writing Star",
        ja: "ストーリー・ライティングスター",
        ko: "스토리·글쓰기 스타",
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
            ko: "마이크로 픽션 스타",
          },
          starScore: 48,
        },
        {
          accentColor: "#7c3aed",
          accentSecondary: "#38bdf8",
          createdByMemberName: "Bora",
          founderCount: 10,
          growthPercent: 7,
          id: "lena",
          name: "Lena",
          portraitInitials: "LE",
          sourceUniverseName: "Seoyeon Universe",
          spawnedFromStarId: "seoyeon",
          specialty: {
            en: "Romance Diary Star",
            ja: "ロマンス日記スター",
            ko: "로맨스 다이어리 스타",
          },
          starScore: 50,
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
      { current: 564, id: "founderContributionScore", met: true, target: 500 },
      { current: 100, id: "agentRankAuditReady", met: true, target: 80 },
      { current: 100, id: "agentRankEventQuality", met: true, target: 80 },
      { current: "completed", id: "activityMission", met: true, target: "completed" },
    ],
    createCostUsdt: 10,
    launchPreview: {
      newStarName: "Ria",
      ownerName: "Member A",
      sourceUniverseName: "Minseo Universe",
      status: "mock_ready",
    },
    unlocked: true,
  } satisfies CreatorUnlockData,
  memberPortfolio: {
    cpBalance: 6800,
    creatorEligibilityPercent: 86,
    directInvites: 27,
    memberName: "Member A",
    ownedStars: [
      {
        createdByUnlock: true,
        id: "seoyeon",
        launchCostUsdt: 10,
        name: "Seoyeon",
        sourceUniverseName: "Minseo Universe",
        spawnedFromStarId: "minseo",
        status: "active",
        universeName: "Seoyeon Universe",
      },
      {
        createdByUnlock: true,
        id: "ria",
        launchCostUsdt: 10,
        name: "Ria",
        sourceUniverseName: "Minseo Universe",
        spawnedFromStarId: "minseo",
        status: "draft",
        universeName: "Ria Universe",
      },
    ],
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
  actions: {
    copied: string;
    copyLink: string;
    createAiStar: string;
    createMockReferral: string;
    joinAsFounder: string;
    openDiscovery: string;
    shareLink: string;
    viewUniverse: string;
  };
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
    agentRankAuditReady: string;
    agentRankEventQuality: string;
    body: string;
    cp: string;
    createAiStarCta: string;
    creatorSocialConnected: string;
    directInvites: string;
    founderContributionScore: string;
    launchPreviewBody: string;
    launchPreviewTitle: string;
    liveDataLabel: string;
    lockedLabel: string;
    mockPaymentNotice: string;
    mockReadyLabel: string;
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
    creatorProgress: string;
    cpBalance: string;
    directInvites: string;
    createdByUnlock: string;
    founderClub: string;
    founderCount: string;
    growth: string;
    humanMember: string;
    influenceScore: string;
    memberPortfolio: string;
    openSlots: string;
    ownedAiStars: string;
    referralCode: string;
    scoutShareLoop: string;
    selectedAiStar: string;
    sourceUniverse: string;
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
    emptyOwnedStars: string;
    ownedStarsBody: string;
    ownedStarsTitle: string;
    setupStarCta: string;
    title: string;
  };
  roles: Record<FounderRole, string>;
  scoutShareLoop: {
    body: string;
    liveDataLabel: string;
    memberBecomesFounderTemplate: string;
    memberJoinsTemplate: string;
    memberBBecomesFounder: string;
    rewardsTitle: string;
    selectUniverse: string;
    selectUniverseTemplate: string;
    shareToSns: string;
    title: string;
  };
  starDetail: {
    founderSlotsBody: string;
    founderSlotsTitle: string;
    heroBody: string;
    heroEyebrow: string;
    inboundRefBody: string;
    inboundRefTitle: string;
    mockNotice: string;
    referralBody: string;
    referralReady: string;
    referralTitle: string;
    rewardsTitle: string;
    spawnedBody: string;
    spawnedTitle: string;
    universeTitle: string;
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
    actions: {
      copied: "Copied",
      copyLink: "Copy link",
      createAiStar: "Create new AI Star",
      createMockReferral: "Create mock referral code",
      joinAsFounder: "Join as Founder",
      openDiscovery: "Back to Discovery",
      shareLink: "Share link",
      viewUniverse: "View Star Universe",
    },
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
      agentRankAuditReady: "AgentRank Audit-ready >= 80%",
      agentRankEventQuality: "Event Quality >= 80",
      body:
        "Creator status is unlocked when scout, invitation, CP, Founder Contribution, AgentRank audit quality, and activity requirements are met.",
      cp: "CP >= 5,000",
      createAiStarCta: "Create new AI Star",
      creatorSocialConnected: "AI Star TikTok channel connected",
      directInvites: "Direct Invites >= 20",
      founderContributionScore: "Founder Contribution Score >= 500",
      launchPreviewBody:
        "The member can launch another AI Star from the source Star Universe. This version keeps the 10 USDT step as a mock activation.",
      launchPreviewTitle: "Mock AI Star launch",
      liveDataLabel: "Live unlock status",
      lockedLabel: "Locked",
      mockPaymentNotice:
        "Creator launch is previewed at 10 USDT. Checkout opens in a later release.",
      mockReadyLabel: "Mock ready",
      scoutScore: "Invite Score >= 80",
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
      creatorProgress: "Creator Progress",
      cpBalance: "CP Balance",
      createdByUnlock: "Created by unlock",
      directInvites: "Direct Invites",
      founderClub: "Founder Club",
      founderCount: "Founder Count",
      growth: "Growth",
      humanMember: "Human Member",
      influenceScore: "Influence Score",
      memberPortfolio: "Member Portfolio",
      openSlots: "Open Slots",
      ownedAiStars: "Owned AI Stars",
      referralCode: "Referral Code",
      scoutShareLoop: "Scout Share Loop",
      selectedAiStar: "Selected AI Star",
      sourceUniverse: "Source Star Universe",
      spawnedStars: "Spawned Stars",
      starScore: "Star Score",
      successfulInvites: "Successful Invites",
    },
    memberPortfolio: {
      activeHint:
        "Your Founder Club AI Star is active. Manage content and growth from the studio.",
      body:
        "Creator/Owner means the AI Stars this member operates. Founder Network means participation roles inside each AI Star Universe.",
      draftHint:
        "A Founder Club AI Star has been prepared for this account. Complete the character profile to activate it.",
      emptyRoles:
        "No AI Star roles are connected to this member yet.",
      liveDataLabel: "Live member data",
      manageStarCta: "Manage my AI Star",
      emptyOwnedStars:
        "No AI Stars have been created by this member yet.",
      ownedStarsBody:
        "These AI Stars can be managed from the studio. Their source AI Star Universe is kept for reputation attribution.",
      ownedStarsTitle: "AI Stars this member operates",
      setupStarCta: "Set up my AI Star",
      title: "Member AI Star Portfolio",
    },
    roles: {
      creator: "CREATOR",
      founder: "FOUNDER",
      genesis_founder: "GENESIS FOUNDER",
      legend: "LEGEND",
      member: "MEMBER",
      mentor: "MENTOR",
      partner: "PARTNER",
      producer: "PRODUCER",
    },
    scoutShareLoop: {
      body:
        "Member A scouts Minseo Universe, creates a referral code, shares it on SNS, and earns growth credit when Member B joins.",
      liveDataLabel: "Live referral link",
      memberBecomesFounderTemplate: "{member} becomes Founder in {universe}",
      memberJoinsTemplate: "{member} joins",
      memberBBecomesFounder: "Member B becomes Founder in Minseo Universe",
      rewardsTitle: "Member A earns",
      selectUniverse: "selects Minseo Universe",
      selectUniverseTemplate: "selects {universe}",
      shareToSns: "shares to SNS",
      title: "Invite & Grow Flow",
    },
    starDetail: {
      founderSlotsBody:
        "Human members use neutral gray avatars and role badges. They never reuse AI Star portraits.",
      founderSlotsTitle: "Human Founder slots",
      heroBody:
        "This Star Universe page connects AI Star discovery to Founder join, mock referral creation, SNS sharing, and Creator progress.",
      heroEyebrow: "Star Universe",
      inboundRefBody:
        "This visitor entered through a Founder referral. In the live flow, the join event will attach to this Star Universe.",
      inboundRefTitle: "Referral detected",
      mockNotice:
        "Mock only: no real payment or permanent referral mutation runs from this screen.",
      referralBody:
        "Create a mock code, share the SNS link, and preview the reward that Member A earns when Member B joins.",
      referralReady: "Mock referral ready",
      referralTitle: "Founder referral builder",
      rewardsTitle: "Mock reward preview",
      spawnedBody:
        "Spawned Stars are displayed as separate AI Star cards with their own purple AI STAR treatment.",
      spawnedTitle: "Spawned AI Stars",
      universeTitle: "Founder Network",
    },
    topGrowingStars: {
      body:
        "The discovery surface ranks AI Stars by Star Score, growth speed, founder count, and open Founder slots.",
      title: "Top Growing AI Stars",
    },
    universePreview: {
      body:
        "Each Star Universe separates the center AI Star, human Founder roles, and spawned Stars into one growth map.",
      emptySlot: "Open Founder slot",
      founderSlots: "Human Founder Slots",
      title: "Founder Network Preview",
    },
  },
  ja: {
    actions: {
      copied: "Copied",
      copyLink: "Copy link",
      createAiStar: "新しいAI Starを作成",
      createMockReferral: "Mock referral codeを作成",
      joinAsFounder: "Founderとして参加",
      openDiscovery: "Discoveryへ戻る",
      shareLink: "Share link",
      viewUniverse: "Star Universeを見る",
    },
    creatorPath: {
      body:
        "最初のバージョンではアンロック状態だけを表示します。実決済を接続するまでは新しいAI Star作成はモックです。",
      steps: [
        {
          body: "既存のStar Universeに新しいFounderを招待します。",
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
      agentRankAuditReady: "AgentRank Audit-ready 80%以上",
      agentRankEventQuality: "Event Quality 80以上",
      body:
        "Scout、招待、CP、Founder Contribution、AgentRank監査品質、活動ミッションの条件を満たすとCreatorステータスが開きます。",
      cp: "CP 5,000以上",
      createAiStarCta: "新しいAI Starを作成",
      creatorSocialConnected: "AI Star TikTokチャンネル接続済み",
      directInvites: "直接招待 20人以上",
      founderContributionScore: "Founder Contribution Score 500以上",
      launchPreviewBody:
        "メンバーは元のStar Universeから別のAI Starをローンチできます。このバージョンでは10 USDTステップをモック有効化として扱います。",
      launchPreviewTitle: "Mock AI Star launch",
      liveDataLabel: "Live unlock status",
      lockedLabel: "Locked",
      mockPaymentNotice:
        "Creatorローンチは10 USDTのプレビューとして表示します。Checkoutは今後のリリースで開きます。",
      mockReadyLabel: "Mock ready",
      scoutScore: "Invite Score >= 80",
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
      creatorProgress: "Creator Progress",
      cpBalance: "CP Balance",
      createdByUnlock: "Created by unlock",
      directInvites: "Direct Invites",
      founderClub: "Founder Club",
      founderCount: "Founder Count",
      growth: "Growth",
      humanMember: "Human Member",
      influenceScore: "Influence Score",
      memberPortfolio: "Member Portfolio",
      openSlots: "Open Slots",
      ownedAiStars: "Owned AI Stars",
      referralCode: "Referral Code",
      scoutShareLoop: "Scout Share Loop",
      selectedAiStar: "Selected AI Star",
      sourceUniverse: "Source Star Universe",
      spawnedStars: "Spawned Stars",
      starScore: "Star Score",
      successfulInvites: "Successful Invites",
    },
    memberPortfolio: {
      activeHint:
        "Founder ClubのAI Starは有効です。Studioでコンテンツと成長を管理できます。",
      body:
        "Creator/Ownerはこのメンバーが運営するAI Star、Founder Networkは各AI Star Universe内の参加ロールです。",
      draftHint:
        "このアカウント用のFounder Club AI Starが用意されています。Character profileを完成させると有効化できます。",
      emptyRoles:
        "このMemberに接続されたAI Star roleはまだありません。",
      liveDataLabel: "Live member data",
      manageStarCta: "自分のAI Starを管理",
      emptyOwnedStars:
        "このメンバーが作成したAI Starはまだありません。",
      ownedStarsBody:
        "これらのAI StarはStudioで管理できます。元になったAI Star Universeは評価帰属のため記録されます。",
      ownedStarsTitle: "このメンバーが運営するAI Star",
      setupStarCta: "自分のAI Starを設定",
      title: "Member AI Star Portfolio",
    },
    roles: {
      creator: "CREATOR",
      founder: "FOUNDER",
      genesis_founder: "GENESIS FOUNDER",
      legend: "LEGEND",
      member: "MEMBER",
      mentor: "MENTOR",
      partner: "PARTNER",
      producer: "PRODUCER",
    },
    scoutShareLoop: {
      body:
        "Member AがMinseo Universeを選び、紹介コードを作成し、SNSで共有します。Member Bが参加すると成長クレジットを獲得します。",
      liveDataLabel: "Live referral link",
      memberBecomesFounderTemplate: "{member} becomes Founder in {universe}",
      memberJoinsTemplate: "{member} joins",
      memberBBecomesFounder: "Member B becomes Founder in Minseo Universe",
      rewardsTitle: "Member A earns",
      selectUniverse: "selects Minseo Universe",
      selectUniverseTemplate: "selects {universe}",
      shareToSns: "shares to SNS",
      title: "Invite & Grow Flow",
    },
    starDetail: {
      founderSlotsBody:
        "Human memberはニュートラルなグレーアバターとrole badgeで表示します。AI Starのportraitは再利用しません。",
      founderSlotsTitle: "Human Founder slots",
      heroBody:
        "このStar UniverseページではAI Star Discovery、Founder参加、mock referral作成、SNS共有、Creator progressを接続します。",
      heroEyebrow: "Star Universe",
      inboundRefBody:
        "このvisitorはFounder referral経由で流入しました。Live flowでは参加イベントがこのStar Universeに紐づきます。",
      inboundRefTitle: "Referral detected",
      mockNotice:
        "Mock only: この画面から実決済や永続的なreferral変更は実行しません。",
      referralBody:
        "Mock codeを作成し、SNS linkを共有し、Member B参加時にMember Aが得るrewardをプレビューします。",
      referralReady: "Mock referral ready",
      referralTitle: "Founder referral builder",
      rewardsTitle: "Mock reward preview",
      spawnedBody:
        "Spawned Starは独立したAI Star cardとして、紫のAI STAR表示で区別します。",
      spawnedTitle: "Spawned AI Stars",
      universeTitle: "Founder Network",
    },
    topGrowingStars: {
      body:
        "Discovery画面ではStar Score、成長率、Founder数、空きFounder枠でAI Starを並べます。",
      title: "Top Growing AI Stars",
    },
    universePreview: {
      body:
        "各Star Universeで中心のAI Star、Human Founderの役割、Spawned Starを1つの成長マップとして分けて表示します。",
      emptySlot: "Open Founder slot",
      founderSlots: "Human Founder Slots",
      title: "Founder Network Preview",
    },
  },
  ko: {
    actions: {
      copied: "복사됨",
      copyLink: "링크 복사",
      createAiStar: "새 AI 스타 만들기",
      createMockReferral: "추천 코드 미리 만들기",
      joinAsFounder: "파운더로 참여하기",
      openDiscovery: "AI 스타 발견으로 돌아가기",
      shareLink: "공유 링크",
      viewUniverse: "스타 유니버스 보기",
    },
    creatorPath: {
      body:
        "첫 버전에서는 권한 상태만 보여줍니다. 실제 결제 플로우를 연결하기 전까지 새 AI 스타 생성은 미리보기 액션입니다.",
      steps: [
        {
          body: "기존 스타 유니버스에 새 파운더를 초대하고 성장 신호를 만듭니다.",
          title: "친구 초대 성장",
        },
        {
          body: "추천 코드로 가입이 발생하면 CP와 영향력 점수를 얻습니다.",
          title: "파운더 영향력",
        },
        {
          body: "크리에이터 권한을 활성화한 뒤 10 USDT 미리보기 조건으로 새 AI 스타를 시작합니다.",
          title: "크리에이터 출시",
        },
      ],
      title: "크리에이터 성장 경로",
    },
    creatorUnlock: {
      activityMission: "활동 미션 완료",
      agentRankAuditReady: "AgentRank 감사 준비 80% 이상",
      agentRankEventQuality: "이벤트 품질 80점 이상",
      body:
        "친구 초대 점수, 직접 초대, CP, 파운더 기여 점수, AgentRank 감사 품질, 활동 미션 조건을 만족하면 크리에이터 권한이 열립니다.",
      cp: "CP 5,000 이상",
      createAiStarCta: "새 AI 스타 만들기",
      creatorSocialConnected: "AI 스타 TikTok 채널 연결",
      directInvites: "직접 초대 20명 이상",
      founderContributionScore: "파운더 기여 점수 500 이상",
      launchPreviewBody:
        "멤버는 성장시킨 원천 스타 유니버스에서 또 다른 AI 스타를 시작할 수 있습니다. 이번 버전에서는 10 USDT 단계를 미리보기 활성화로만 표시합니다.",
      launchPreviewTitle: "새 AI 스타 출시 미리보기",
      liveDataLabel: "실시간 권한 상태",
      lockedLabel: "잠금",
      mockPaymentNotice:
        "크리에이터 출시는 10 USDT 조건 미리보기로만 표시됩니다. 결제 화면은 이후 릴리스에서 연결됩니다.",
      mockReadyLabel: "미리보기 준비",
      scoutScore: "초대 점수 80 이상",
      title: "크리에이터 권한 활성화",
      unlockedLabel: "크리에이터 권한 활성화",
    },
    founderClub: {
      body:
        "FanLetter는 AI 캐릭터 콘텐츠 플랫폼을 넘어 AI 스타 발견, 파운더, 친구 초대, 크리에이터 성장 플랫폼으로 진화합니다.",
      eyebrow: "파운더 클럽 2.0",
      title: "AI 스타를 발견하고, 파운더가 되고, 크리에이터로 성장하세요",
    },
    growthLoop: {
      steps: [
        "AI 스타 발견",
        "파운더로 참여",
        "추천 코드 생성",
        "SNS 공유 링크 발행",
        "신규 회원 가입",
        "CP + 영향력 점수 획득",
        "크리에이터 권한 활성화",
        "새 AI 스타 출시",
      ],
      title: "파운더 클럽 2.0 성장 루프",
    },
    labels: {
      aiStarBadge: "AI 스타",
      aiStarDiscovery: "AI 스타 발견",
      creatorProgress: "크리에이터 진행률",
      cpBalance: "CP 잔액",
      createdByUnlock: "권한 활성화로 생성",
      directInvites: "직접 초대",
      founderClub: "파운더 클럽",
      founderCount: "파운더 수",
      growth: "성장률",
      humanMember: "일반 멤버",
      influenceScore: "영향력 점수",
      memberPortfolio: "멤버 포트폴리오",
      openSlots: "잔여 슬롯",
      ownedAiStars: "내가 만든 AI 스타",
      referralCode: "추천 코드",
      scoutShareLoop: "친구 초대 공유 루프",
      selectedAiStar: "선택된 AI 스타",
      sourceUniverse: "원천 스타 유니버스",
      spawnedStars: "파생 AI 스타",
      starScore: "스타 점수",
      successfulInvites: "성공 초대",
    },
    memberPortfolio: {
      activeHint:
        "파운더 클럽 AI 스타가 활성화되어 있습니다. 스튜디오에서 콘텐츠와 성장을 관리할 수 있습니다.",
      body:
        "Creator/Owner는 이 멤버가 운영하는 AI 스타이고, 파운더 네트워크는 각 AI 스타 유니버스 안에서 가진 참여 역할입니다.",
      draftHint:
        "이 계정에 파운더 클럽 AI 스타가 준비되어 있습니다. 캐릭터 프로필을 완성하면 활성화할 수 있습니다.",
      emptyRoles:
        "아직 이 멤버에 연결된 AI 스타 역할이 없습니다.",
      liveDataLabel: "실시간 멤버 데이터",
      manageStarCta: "내 AI 스타 관리하기",
      emptyOwnedStars:
        "아직 이 멤버가 만든 AI 스타가 없습니다.",
      ownedStarsBody:
        "이 AI 스타들은 스튜디오에서 운영할 수 있습니다. 생성 출처 AI 스타 유니버스는 평판 귀속을 위해 남습니다.",
      ownedStarsTitle: "이 멤버가 운영하는 AI 스타",
      setupStarCta: "내 AI 스타 설정하기",
      title: "멤버 AI 스타 포트폴리오",
    },
    roles: {
      creator: "크리에이터",
      founder: "파운더",
      genesis_founder: "제네시스 파운더",
      legend: "레전드",
      member: "멤버",
      mentor: "멘토",
      partner: "파트너",
      producer: "프로듀서",
    },
    scoutShareLoop: {
      body:
        "회원 A가 민서 유니버스를 선택하고 추천 코드를 만든 뒤 SNS에 공유합니다. 회원 B가 가입하면 성장 보상이 쌓입니다.",
      liveDataLabel: "실시간 추천 링크",
      memberBecomesFounderTemplate: "{member}가 {universe}의 파운더가 됨",
      memberJoinsTemplate: "{member} 가입",
      memberBBecomesFounder: "회원 B가 민서 유니버스의 파운더가 됨",
      rewardsTitle: "회원 A 보상",
      selectUniverse: "민서 유니버스 선택",
      selectUniverseTemplate: "{universe} 선택",
      shareToSns: "SNS에 공유",
      title: "초대와 성장 흐름",
    },
    starDetail: {
      founderSlotsBody:
        "일반 멤버는 중립적인 회색 아바타와 역할 배지로 표시합니다. AI 스타 초상 이미지를 일반 멤버에 재사용하지 않습니다.",
      founderSlotsTitle: "일반 파운더 슬롯",
      heroBody:
        "이 스타 유니버스 페이지는 AI 스타 발견에서 파운더 참여, 추천 코드 미리 생성, SNS 공유, 크리에이터 진행률까지 이어지는 전환 흐름입니다.",
      heroEyebrow: "스타 유니버스",
      inboundRefBody:
        "이 방문자는 파운더 추천 링크로 들어왔습니다. 실제 가입 플로우에서는 이 스타 유니버스에 가입 이벤트가 귀속됩니다.",
      inboundRefTitle: "추천 링크 감지",
      mockNotice:
        "미리보기 전용: 이 화면에서는 실결제나 영구 추천 구조 변경을 실행하지 않습니다.",
      referralBody:
        "추천 코드를 미리 만들고 SNS 링크를 공유한 뒤, 회원 B가 가입했을 때 회원 A가 얻는 보상을 보여줍니다.",
      referralReady: "추천 코드 준비 완료",
      referralTitle: "파운더 추천 코드 생성",
      rewardsTitle: "보상 미리보기",
      spawnedBody:
        "파생 스타는 별도 AI 스타 카드로 표시해 중심 AI 스타와 같은 보라색 AI 스타 체계를 유지합니다.",
      spawnedTitle: "파생 AI 스타",
      universeTitle: "파운더 네트워크",
    },
    topGrowingStars: {
      body:
        "발견 화면은 스타 점수, 성장률, 파운더 수, 남은 파운더 슬롯을 기준으로 AI 스타를 보여줍니다.",
      title: "빠르게 성장 중인 AI 스타",
    },
    universePreview: {
      body:
        "각 스타 유니버스에서 중심 AI 스타, 일반 파운더 역할, 파생 스타를 하나의 성장 지도로 구분해 보여줍니다.",
      emptySlot: "열린 파운더 슬롯",
      founderSlots: "일반 파운더 슬롯",
      title: "파운더 네트워크 미리보기",
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

export function getFanletterV2MockStar(starId: string | null | undefined) {
  return (
    fanletterV2Mock.aiStars.find((star) => star.id === starId) ?? null
  );
}
