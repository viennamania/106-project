import type { Locale } from "@/lib/i18n";

export type ContentCopy = {
  actions: {
    backHome: string;
    connectWallet: string;
    createPost: string;
    disconnect: string;
    openFeed: string;
    openStudio: string;
    publish: string;
    refresh: string;
    removeImage: string;
    saveProfile: string;
    saveDraft: string;
    uploadImage: string;
    uploadingImage: string;
    viewDetail: string;
  };
  fields: {
    body: string;
    displayName: string;
    heroImage: string;
    intro: string;
    payoutWalletAddress: string;
    summary: string;
    title: string;
  };
  hints: {
    body: string;
    displayName: string;
    heroImage: string;
    intro: string;
    payoutWalletAddress: string;
    summary: string;
    title: string;
  };
  labels: {
    author: string;
    creatorProfile: string;
    draft: string;
    feedEmpty: string;
    free: string;
    level: string;
    networkAccess: string;
    posts: string;
    published: string;
    recentPosts: string;
    studioNotice: string;
  };
  messages: {
    connectRequired: string;
    detailLoadFailed: string;
    feedLoadFailed: string;
    memberMissing: string;
    paymentRequired: string;
    profileSaved: string;
    publishSuccess: string;
    saveDraftSuccess: string;
    studioLoadFailed: string;
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
    studioDescription: string;
    studioEyebrow: string;
    studioTitle: string;
  };
};

const englishCopy: ContentCopy = {
  actions: {
    backHome: "Back home",
    connectWallet: "Sign in with email",
    createPost: "Create post",
    disconnect: "Disconnect",
    openFeed: "Open network feed",
    openStudio: "Open creator studio",
    publish: "Publish now",
    refresh: "Refresh",
    removeImage: "Remove image",
    saveProfile: "Save profile",
    saveDraft: "Save as draft",
    uploadImage: "Upload image",
    uploadingImage: "Uploading...",
    viewDetail: "View detail",
  },
  fields: {
    body: "Content body",
    displayName: "Display name",
    heroImage: "Hero image",
    intro: "Channel intro",
    payoutWalletAddress: "Payout wallet",
    summary: "Summary",
    title: "Title",
  },
  hints: {
    body: "This first slice supports rich text as plain text. Media and paid unlocks come next.",
    displayName: "This name appears across the network feed and content detail pages.",
    heroImage: "PNG, JPG, or WEBP up to 4MB. It appears in your creator profile area.",
    intro: "Explain what people in your network should expect from your channel.",
    payoutWalletAddress: "Optional for now. This will be used when paid USDT unlocks are added.",
    summary: "Short preview shown in the network feed card.",
    title: "Keep it specific and easy to scan.",
  },
  labels: {
    author: "Author",
    creatorProfile: "Creator profile",
    draft: "Draft",
    feedEmpty: "No free content from your upstream network yet.",
    free: "Free",
    level: "Level",
    networkAccess: "Network access",
    posts: "Posts",
    published: "Published",
    recentPosts: "Recent posts",
    studioNotice:
      "This first release only supports free posts for your upstream network feed.",
  },
  messages: {
    connectRequired:
      "Sign in with the same member email you use for your referral network.",
    detailLoadFailed: "Failed to load the content detail.",
    feedLoadFailed: "Failed to load the network feed.",
    memberMissing: "Member not found.",
    paymentRequired: "Completed signup is required to use network content.",
    profileSaved: "Creator profile saved.",
    publishSuccess: "Free post published to your network feed.",
    saveDraftSuccess: "Draft saved.",
    studioLoadFailed: "Failed to load the creator studio.",
    uploadFailed: "Failed to upload image.",
    uploadSuccess: "Image uploaded. Save your profile to publish it.",
  },
  meta: {
    detailDescription: "Read content shared inside your upstream network.",
    detailTitle: "Network Content",
    feedDescription:
      "Browse free content published by creators in your upstream referral network.",
    feedTitle: "Network Feed",
    studioDescription:
      "Set up your creator profile and publish free posts to your downstream network.",
    studioTitle: "Creator Studio",
  },
  page: {
    detailDescription:
      "Only members inside the matching network branch can open this content.",
    detailEyebrow: "network content",
    feedDescription:
      "This feed is built from creators in your upstream 6-level network.",
    feedEyebrow: "network content",
    feedTitle: "Network Feed",
    studioDescription:
      "Create your profile and publish free posts that your downstream network can discover.",
    studioEyebrow: "creator tools",
    studioTitle: "Creator Studio",
  },
};

const koreanCopy: ContentCopy = {
  actions: {
    backHome: "홈으로 돌아가기",
    connectWallet: "이메일로 로그인",
    createPost: "콘텐츠 만들기",
    disconnect: "연결 해제",
    openFeed: "네트워크 피드 열기",
    openStudio: "크리에이터 스튜디오 열기",
    publish: "바로 게시하기",
    refresh: "새로고침",
    removeImage: "이미지 제거",
    saveProfile: "프로필 저장",
    saveDraft: "임시 저장",
    uploadImage: "이미지 업로드",
    uploadingImage: "업로드 중...",
    viewDetail: "상세 보기",
  },
  fields: {
    body: "본문",
    displayName: "표시 이름",
    heroImage: "히어로 이미지",
    intro: "채널 소개",
    payoutWalletAddress: "정산 지갑",
    summary: "요약",
    title: "제목",
  },
  hints: {
    body: "현재 1차 버전은 텍스트 기반 무료 콘텐츠만 지원합니다. 미디어/유료 잠금은 다음 단계에서 붙입니다.",
    displayName: "이 이름은 네트워크 피드와 콘텐츠 상세에 작성자 이름으로 표시됩니다.",
    heroImage: "PNG, JPG, WEBP 형식 4MB 이하 이미지를 업로드할 수 있습니다.",
    intro: "내 하위 네트워크가 이 채널에서 무엇을 기대하면 되는지 적어주세요.",
    payoutWalletAddress:
      "지금은 선택 사항입니다. 이후 USDT 유료 잠금해제 정산 지갑으로 사용됩니다.",
    summary: "네트워크 피드 카드에 보여줄 짧은 미리보기 문구입니다.",
    title: "한눈에 이해되게 짧고 구체적으로 적는 편이 좋습니다.",
  },
  labels: {
    author: "작성자",
    creatorProfile: "크리에이터 프로필",
    draft: "임시저장",
    feedEmpty: "현재 내 상위 네트워크에서 공개된 무료 콘텐츠가 없습니다.",
    free: "무료",
    level: "레벨",
    networkAccess: "네트워크 접근",
    posts: "콘텐츠",
    published: "게시됨",
    recentPosts: "최근 콘텐츠",
    studioNotice:
      "현재 1차 버전은 상위/하위 네트워크용 무료 콘텐츠만 지원합니다.",
  },
  messages: {
    connectRequired:
      "레퍼럴 네트워크에 사용하는 같은 회원 이메일로 로그인해야 합니다.",
    detailLoadFailed: "콘텐츠 상세를 불러오지 못했습니다.",
    feedLoadFailed: "네트워크 피드를 불러오지 못했습니다.",
    memberMissing: "회원을 찾을 수 없습니다.",
    paymentRequired: "완료 회원만 네트워크 콘텐츠를 사용할 수 있습니다.",
    profileSaved: "크리에이터 프로필을 저장했습니다.",
    publishSuccess: "무료 콘텐츠를 네트워크 피드에 게시했습니다.",
    saveDraftSuccess: "임시 저장했습니다.",
    studioLoadFailed: "크리에이터 스튜디오를 불러오지 못했습니다.",
    uploadFailed: "이미지 업로드에 실패했습니다.",
    uploadSuccess: "이미지를 업로드했습니다. 프로필 저장 후 반영됩니다.",
  },
  meta: {
    detailDescription: "상위 네트워크 안에서 공유된 콘텐츠를 확인하세요.",
    detailTitle: "네트워크 콘텐츠",
    feedDescription:
      "상위 6단계 네트워크의 크리에이터가 발행한 무료 콘텐츠를 확인하세요.",
    feedTitle: "네트워크 피드",
    studioDescription:
      "크리에이터 프로필을 설정하고 하위 네트워크에 노출될 무료 콘텐츠를 발행하세요.",
    studioTitle: "크리에이터 스튜디오",
  },
  page: {
    detailDescription:
      "이 콘텐츠는 해당 네트워크 브랜치 안의 회원만 열람할 수 있습니다.",
    detailEyebrow: "network content",
    feedDescription:
      "이 피드는 내 상위 6단계 네트워크 크리에이터의 콘텐츠로 구성됩니다.",
    feedEyebrow: "network content",
    feedTitle: "네트워크 피드",
    studioDescription:
      "내 프로필을 설정하고 하위 네트워크가 발견할 수 있는 무료 콘텐츠를 발행해보세요.",
    studioEyebrow: "creator tools",
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
