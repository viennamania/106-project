import type { Locale } from "@/lib/i18n";

export type ContentCopy = {
  actions: {
    backHome: string;
    browseFeed: string;
    connectWallet: string;
    copiedLink: string;
    copyLink: string;
    createPost: string;
    liked: string;
    like: string;
    disconnect: string;
    generateAiCover: string;
    generatingAiCover: string;
    managePosts: string;
    nextPage: string;
    openFeed: string;
    openStudio: string;
    previousPage: string;
    publish: string;
    refresh: string;
    removeImage: string;
    runAutomation: string;
    runningAutomation: string;
    saveAutomation: string;
    saveProfile: string;
    saveDraft: string;
    share: string;
    sharing: string;
    showLess: string;
    showMore: string;
    uploadImage: string;
    uploadContentImages: string;
    uploadingImage: string;
    viewDetail: string;
  };
  entry: {
    creatorDescription: string;
    creatorTitle: string;
    description: string;
    title: string;
    viewerDescription: string;
    viewerTitle: string;
  };
  fields: {
    avatarImage: string;
    automationAllowedDomains: string;
    automationMaxPostsPerDay: string;
    automationMinIntervalMinutes: string;
    automationPersonaName: string;
    automationPersonaPrompt: string;
    automationPublishScoreThreshold: string;
    automationTopics: string;
    body: string;
    contentImages: string;
    coverImage: string;
    displayName: string;
    heroImage: string;
    intro: string;
    payoutWalletAddress: string;
    searchPosts: string;
    summary: string;
    title: string;
  };
  hints: {
    avatarImage: string;
    automationAllowedDomains: string;
    automationMaxPostsPerDay: string;
    automationMinIntervalMinutes: string;
    automationPersonaName: string;
    automationPersonaPrompt: string;
    automationPublishScoreThreshold: string;
    automationTopics: string;
    body: string;
    contentImages: string;
    coverImage: string;
    displayName: string;
    heroImage: string;
    intro: string;
    payoutWalletAddress: string;
    searchPosts: string;
    summary: string;
    title: string;
  };
  labels: {
    allLevels: string;
    automation: string;
    automationAutoPublish: string;
    automationBetaOnly: string;
    automationDisabled: string;
    automationEnabled: string;
    automationJobs: string;
    automationRestricted: string;
    allPosts: string;
    archived: string;
    author: string;
    creators: string;
    creatorProfile: string;
    creatorSettings: string;
    draft: string;
    extendedLevels: string;
    feedEmpty: string;
    featured: string;
    free: string;
    imageGallery: string;
    level: string;
    nearbyLevels: string;
    networkAccess: string;
    posts: string;
    published: string;
    quickActions: string;
    recentPosts: string;
    references: string;
    studioHome: string;
    studioNotice: string;
  };
  messages: {
    automationLoadFailed: string;
    automationRunSuccess: string;
    automationSaved: string;
    connectRequired: string;
    detailLoadingDescription: string;
    detailLoadingTitle: string;
    detailLoadFailed: string;
    feedLoadFailed: string;
    imageGenerated: string;
    likeHint: string;
    memberMissing: string;
    noFilteredFeed: string;
    paymentRequired: string;
    postsLoading: string;
    previewLocked: string;
    profileSaved: string;
    publishSuccess: string;
    saveDraftSuccess: string;
    searchPlaceholder: string;
    shareFailed: string;
    studioLoadFailed: string;
    noMatchingPosts: string;
    uploadFailed: string;
    uploadSuccess: string;
  };
  meta: {
    detailDescription: string;
    detailTitle: string;
    feedDescription: string;
    feedTitle: string;
    studioDescription: string;
    studioTitle: string;
  };
  page: {
    detailDescription: string;
    detailEyebrow: string;
    feedDescription: string;
    feedEyebrow: string;
    feedTitle: string;
    newDescription: string;
    postsDescription: string;
    profileDescription: string;
    studioDescription: string;
    studioEyebrow: string;
    studioTitle: string;
  };
};

const englishCopy: ContentCopy = {
  actions: {
    backHome: "Back home",
    browseFeed: "Browse feed",
    connectWallet: "Sign in with email",
    copiedLink: "Link copied",
    copyLink: "Copy link",
    createPost: "Create post",
    liked: "Liked",
    like: "Like",
    disconnect: "Disconnect",
    generateAiCover: "Generate AI cover",
    generatingAiCover: "Generating cover...",
    managePosts: "Manage posts",
    nextPage: "Next page",
    openFeed: "Go to feed",
    openStudio: "Go to studio",
    previousPage: "Previous page",
    publish: "Publish now",
    refresh: "Refresh",
    removeImage: "Remove image",
    runAutomation: "Generate draft now",
    runningAutomation: "Generating draft...",
    saveAutomation: "Save automation",
    saveProfile: "Save profile",
    saveDraft: "Save as draft",
    share: "Share",
    sharing: "Sharing...",
    showLess: "Show less",
    showMore: "Show more",
    uploadImage: "Upload image",
    uploadContentImages: "Upload content images",
    uploadingImage: "Uploading...",
    viewDetail: "View detail",
  },
  entry: {
    creatorDescription:
      "Create, automate, and manage posts for your downstream network.",
    creatorTitle: "Studio area",
    description:
      "Feed is for consuming upstream content. Studio is for creating and managing your own content.",
    title: "Choose your content area",
    viewerDescription:
      "Read and browse content published by your upstream network.",
    viewerTitle: "Feed area",
  },
  fields: {
    avatarImage: "Avatar image",
    automationAllowedDomains: "Allowed domains",
    automationMaxPostsPerDay: "Daily post limit",
    automationMinIntervalMinutes: "Minimum interval (minutes)",
    automationPersonaName: "Automation persona name",
    automationPersonaPrompt: "Automation persona prompt",
    automationPublishScoreThreshold: "Auto publish score",
    automationTopics: "Automation topics",
    body: "Content body",
    contentImages: "Content images",
    coverImage: "Cover image",
    displayName: "Display name",
    heroImage: "Hero image",
    intro: "Channel intro",
    payoutWalletAddress: "Payout wallet",
    searchPosts: "Search posts",
    summary: "Summary",
    title: "Title",
  },
  hints: {
    avatarImage:
      "Square PNG, JPG, or WEBP up to 4MB. It appears on the content detail header as your creator avatar.",
    automationAllowedDomains: "Comma-separated domains. Leave empty to let web search choose public sources broadly.",
    automationMaxPostsPerDay: "Keep this low while testing.",
    automationMinIntervalMinutes: "Minimum time between successful automated posts.",
    automationPersonaName: "Used as the visible AI editor persona for this creator.",
    automationPersonaPrompt: "Rules for tone, audience, and what the AI editor should avoid.",
    automationPublishScoreThreshold: "Only applies when auto publish is enabled.",
    automationTopics: "Comma-separated topics the AI editor should focus on.",
    body: "Write the main text your network members will read. You can add a cover image below for the feed card and detail header.",
    contentImages:
      "Optional gallery shown in the content detail page. Upload up to 10 PNG, JPG, or WEBP images.",
    coverImage: "Optional thumbnail for the feed card and detail header. PNG, JPG, or WEBP up to 4MB.",
    displayName: "This name appears across the network feed and content detail pages.",
    heroImage: "PNG, JPG, or WEBP up to 4MB. It appears in your creator profile area.",
    intro: "Explain what people in your network should expect from your channel.",
    payoutWalletAddress: "Optional for now. This will be used when paid USDT unlocks are added.",
    searchPosts: "Search by title, summary, or body.",
    summary: "Short preview shown in the network feed card. If left blank, the first part of the body will be used automatically.",
    title: "Keep it specific and easy to scan.",
  },
  labels: {
    allLevels: "All levels",
    automation: "Content automation",
    automationAutoPublish: "Auto publish when score is high enough",
    automationBetaOnly: "Beta test",
    automationDisabled: "Disabled",
    automationEnabled: "Enabled",
    automationJobs: "Recent automation jobs",
    automationRestricted: "Automation is currently limited to test creators.",
    allPosts: "All posts",
    archived: "Archived",
    author: "Author",
    creators: "Creators",
    creatorProfile: "Creator profile",
    creatorSettings: "Creator settings",
    draft: "Draft",
    extendedLevels: "Level 3-6",
    feedEmpty: "No free content from your upstream network yet.",
    featured: "Featured",
    free: "Free",
    imageGallery: "Image gallery",
    level: "Level",
    nearbyLevels: "Level 1-2",
    networkAccess: "Network access",
    posts: "Posts",
    published: "Published",
    quickActions: "Quick actions",
    recentPosts: "Recent posts",
    references: "Sources",
    studioHome: "Studio home",
    studioNotice:
      "This release supports free posts with cover images for your network feed.",
  },
  messages: {
    automationLoadFailed: "Failed to load content automation settings.",
    automationRunSuccess: "Automation draft run started successfully.",
    automationSaved: "Content automation settings saved.",
    connectRequired:
      "Sign in with the same member email you use for your referral network.",
    detailLoadingDescription:
      "Checking member access and loading the full content experience.",
    detailLoadingTitle: "Preparing content",
    detailLoadFailed: "Failed to load the content detail.",
    feedLoadFailed: "Failed to load the network feed.",
    imageGenerated: "AI cover generated. You can publish or save it now.",
    likeHint: "Double-tap the cover to leave a like.",
    memberMissing: "Member not found.",
    noFilteredFeed: "No posts match this network range yet.",
    paymentRequired: "Completed signup is required to use network content.",
    postsLoading: "Loading your posts, counts, and filters now.",
    previewLocked:
      "Unlock the full story after completing signup on the activation screen.",
    profileSaved: "Creator profile saved.",
    publishSuccess: "Free post published to your network feed.",
    saveDraftSuccess: "Draft saved.",
    searchPlaceholder: "Search your posts",
    shareFailed: "Sharing is not available right now.",
    studioLoadFailed: "Failed to load the creator studio.",
    noMatchingPosts: "No posts match this filter yet.",
    uploadFailed: "Failed to upload image.",
    uploadSuccess: "Image uploaded. Save your profile to publish it.",
  },
  meta: {
    detailDescription: "Read content shared inside your upstream network.",
    detailTitle: "Network Content",
    feedDescription:
      "Consume free content published by creators in your upstream referral network.",
    feedTitle: "Network Feed",
    studioDescription:
      "Create and manage free posts for your downstream network.",
    studioTitle: "Creator Studio",
  },
  page: {
    detailDescription:
      "Only members inside the matching network branch can open this content.",
    detailEyebrow: "network content",
    feedDescription:
      "This area is only for reading content from creators in your upstream 6-level network.",
    feedEyebrow: "feed area",
    feedTitle: "Network Feed",
    newDescription:
      "Write and publish a free post for your downstream network.",
    postsDescription:
      "Search, filter, and paginate through the posts you have already created.",
    profileDescription:
      "Update your creator identity and automation settings for this channel.",
    studioDescription:
      "This area is only for creating, automating, and managing posts for your downstream network.",
    studioEyebrow: "studio area",
    studioTitle: "Creator Studio",
  },
};

const koreanCopy: ContentCopy = {
  actions: {
    backHome: "홈으로 돌아가기",
    browseFeed: "피드 보기",
    connectWallet: "이메일로 로그인",
    copiedLink: "링크 복사됨",
    copyLink: "링크 복사",
    createPost: "콘텐츠 만들기",
    liked: "좋아요 완료",
    like: "좋아요",
    disconnect: "연결 해제",
    generateAiCover: "AI 커버 생성",
    generatingAiCover: "커버 생성 중...",
    managePosts: "콘텐츠 관리",
    nextPage: "다음 페이지",
    openFeed: "피드로 이동",
    openStudio: "스튜디오로 이동",
    previousPage: "이전 페이지",
    publish: "바로 게시하기",
    refresh: "새로고침",
    removeImage: "이미지 제거",
    runAutomation: "초안 생성 실행",
    runningAutomation: "초안 생성 중...",
    saveAutomation: "자동화 저장",
    saveProfile: "프로필 저장",
    saveDraft: "임시 저장",
    share: "공유하기",
    sharing: "공유 준비 중...",
    showLess: "접기",
    showMore: "더 보기",
    uploadImage: "이미지 업로드",
    uploadContentImages: "콘텐츠 이미지 업로드",
    uploadingImage: "업로드 중...",
    viewDetail: "상세 보기",
  },
  entry: {
    creatorDescription:
      "내 하위 네트워크용 콘텐츠를 만들고 자동화하며 관리합니다.",
    creatorTitle: "스튜디오 영역",
    description:
      "피드는 상위 네트워크 콘텐츠를 보는 영역이고, 스튜디오는 내 콘텐츠를 만드는 영역입니다.",
    title: "콘텐츠 영역 선택",
    viewerDescription:
      "상위 네트워크가 발행한 콘텐츠를 읽고 탐색합니다.",
    viewerTitle: "피드 영역",
  },
  fields: {
    avatarImage: "아바타 이미지",
    automationAllowedDomains: "허용 도메인",
    automationMaxPostsPerDay: "하루 최대 발행 수",
    automationMinIntervalMinutes: "최소 간격(분)",
    automationPersonaName: "자동화 페르소나 이름",
    automationPersonaPrompt: "자동화 페르소나 프롬프트",
    automationPublishScoreThreshold: "자동 게시 점수 기준",
    automationTopics: "자동화 주제",
    body: "본문",
    contentImages: "콘텐츠 이미지",
    coverImage: "커버 이미지",
    displayName: "표시 이름",
    heroImage: "히어로 이미지",
    intro: "채널 소개",
    payoutWalletAddress: "정산 지갑",
    searchPosts: "콘텐츠 검색",
    summary: "요약",
    title: "제목",
  },
  hints: {
    avatarImage:
      "정사각형 PNG, JPG, WEBP 형식 4MB 이하 이미지를 업로드하세요. 콘텐츠 상세 상단의 크리에이터 아바타로 표시됩니다.",
    automationAllowedDomains: "쉼표로 구분해서 입력하세요. 비워두면 공개 웹 소스를 넓게 탐색합니다.",
    automationMaxPostsPerDay: "테스트 단계에서는 낮게 유지하는 편이 좋습니다.",
    automationMinIntervalMinutes: "자동 생성이 성공한 뒤 다음 자동 생성까지 최소 간격입니다.",
    automationPersonaName: "이 크리에이터를 대신 운영하는 AI 에디터 이름입니다.",
    automationPersonaPrompt: "톤, 금지 표현, 대상 독자, 다뤄야 할 방식 등을 적어주세요.",
    automationPublishScoreThreshold: "자동 게시를 켰을 때만 적용됩니다.",
    automationTopics: "쉼표로 구분해서 AI 에디터가 집중할 주제를 입력하세요.",
    body: "네트워크 회원이 읽게 될 본문을 작성하세요. 커버 이미지는 아래에서 함께 올릴 수 있습니다.",
    contentImages:
      "상세 페이지에서 스와이프로 보여줄 이미지입니다. PNG, JPG, WEBP 형식 최대 10장까지 업로드할 수 있습니다.",
    coverImage: "피드 카드와 상세 상단에 노출될 썸네일입니다. PNG, JPG, WEBP 형식 4MB 이하를 업로드할 수 있습니다.",
    displayName: "이 이름은 네트워크 피드와 콘텐츠 상세에 작성자 이름으로 표시됩니다.",
    heroImage: "PNG, JPG, WEBP 형식 4MB 이하 이미지를 업로드할 수 있습니다.",
    intro: "내 하위 네트워크가 이 채널에서 무엇을 기대하면 되는지 적어주세요.",
    payoutWalletAddress:
      "지금은 선택 사항입니다. 이후 USDT 유료 잠금해제 정산 지갑으로 사용됩니다.",
    searchPosts: "제목, 요약, 본문으로 검색합니다.",
    summary: "네트워크 피드 카드에 보여줄 짧은 미리보기 문구입니다. 비워두면 본문 앞부분이 자동으로 사용됩니다.",
    title: "한눈에 이해되게 짧고 구체적으로 적는 편이 좋습니다.",
  },
  labels: {
    allLevels: "전체 단계",
    automation: "콘텐츠 자동화",
    automationAutoPublish: "점수가 충분하면 자동 게시",
    automationBetaOnly: "베타 테스트",
    automationDisabled: "비활성",
    automationEnabled: "활성",
    automationJobs: "최근 자동화 작업",
    automationRestricted: "콘텐츠 자동화는 현재 테스트 크리에이터에게만 열려 있습니다.",
    allPosts: "전체",
    archived: "보관됨",
    author: "작성자",
    creators: "크리에이터",
    creatorProfile: "크리에이터 프로필",
    creatorSettings: "크리에이터 설정",
    draft: "임시저장",
    extendedLevels: "3~6단계",
    feedEmpty: "현재 내 상위 네트워크에서 공개된 무료 콘텐츠가 없습니다.",
    featured: "추천 콘텐츠",
    free: "무료",
    imageGallery: "이미지 갤러리",
    level: "레벨",
    nearbyLevels: "1~2단계",
    networkAccess: "네트워크 접근",
    posts: "콘텐츠",
    published: "게시됨",
    quickActions: "바로가기",
    recentPosts: "최근 콘텐츠",
    references: "참고 출처",
    studioHome: "스튜디오 홈",
    studioNotice:
      "현재 버전은 네트워크 피드용 무료 콘텐츠와 커버 이미지 업로드를 지원합니다.",
  },
  messages: {
    automationLoadFailed: "콘텐츠 자동화 설정을 불러오지 못했습니다.",
    automationRunSuccess: "자동 초안 생성을 실행했습니다.",
    automationSaved: "콘텐츠 자동화 설정을 저장했습니다.",
    connectRequired:
      "레퍼럴 네트워크에 사용하는 같은 회원 이메일로 로그인해야 합니다.",
    detailLoadingDescription:
      "회원 상태와 열람 권한을 확인한 뒤 전체 콘텐츠를 불러오고 있습니다.",
    detailLoadingTitle: "콘텐츠 준비 중",
    detailLoadFailed: "콘텐츠 상세를 불러오지 못했습니다.",
    feedLoadFailed: "네트워크 피드를 불러오지 못했습니다.",
    imageGenerated: "AI 커버를 생성했습니다. 이제 게시하거나 저장할 수 있습니다.",
    likeHint: "커버 이미지를 두 번 터치하면 좋아요 연출이 실행됩니다.",
    memberMissing: "회원을 찾을 수 없습니다.",
    noFilteredFeed: "선택한 단계 범위에 해당하는 콘텐츠가 아직 없습니다.",
    paymentRequired: "완료 회원만 네트워크 콘텐츠를 사용할 수 있습니다.",
    postsLoading: "콘텐츠 목록과 상태, 필터를 불러오는 중입니다.",
    previewLocked:
      "활성화 화면에서 가입을 완료하면 이 콘텐츠 전체를 열람할 수 있습니다.",
    profileSaved: "크리에이터 프로필을 저장했습니다.",
    publishSuccess: "무료 콘텐츠를 네트워크 피드에 게시했습니다.",
    saveDraftSuccess: "임시 저장했습니다.",
    searchPlaceholder: "내 콘텐츠 검색",
    shareFailed: "지금은 공유 기능을 사용할 수 없습니다.",
    studioLoadFailed: "크리에이터 스튜디오를 불러오지 못했습니다.",
    noMatchingPosts: "선택한 상태의 콘텐츠가 아직 없습니다.",
    uploadFailed: "이미지 업로드에 실패했습니다.",
    uploadSuccess: "이미지를 업로드했습니다. 프로필 저장 후 반영됩니다.",
  },
  meta: {
    detailDescription: "상위 네트워크 안에서 공유된 콘텐츠를 확인하세요.",
    detailTitle: "네트워크 콘텐츠",
    feedDescription:
      "상위 6단계 네트워크의 크리에이터가 발행한 무료 콘텐츠를 소비하는 영역입니다.",
    feedTitle: "네트워크 피드",
    studioDescription:
      "하위 네트워크에 노출할 콘텐츠를 만들고 관리하는 영역입니다.",
    studioTitle: "크리에이터 스튜디오",
  },
  page: {
    detailDescription:
      "이 콘텐츠는 해당 네트워크 브랜치 안의 회원만 열람할 수 있습니다.",
    detailEyebrow: "network content",
    feedDescription:
      "이 영역은 내 상위 6단계 네트워크 크리에이터의 콘텐츠를 읽는 전용 공간입니다.",
    feedEyebrow: "feed area",
    feedTitle: "네트워크 피드",
    newDescription:
      "내 하위 네트워크에 공개할 무료 콘텐츠를 작성하고 게시해보세요.",
    postsDescription:
      "이미 만든 콘텐츠를 검색하고 상태별로 나눠서 관리할 수 있습니다.",
    profileDescription:
      "이 채널의 크리에이터 정보와 자동화 설정을 관리합니다.",
    studioDescription:
      "이 영역은 내 하위 네트워크용 콘텐츠를 만들고 자동화하고 관리하는 전용 공간입니다.",
    studioEyebrow: "studio area",
    studioTitle: "크리에이터 스튜디오",
  },
};

const copies: Record<Locale, ContentCopy> = {
  en: englishCopy,
  id: englishCopy,
  ja: englishCopy,
  ko: koreanCopy,
  vi: englishCopy,
  zh: englishCopy,
};

export function getContentCopy(locale: Locale) {
  return copies[locale];
}
