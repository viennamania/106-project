import type { Locale } from "@/lib/i18n";
import type { LandingBrandThemeKey } from "@/lib/landing-branding";

export type LandingBrandingCopy = {
  actions: {
    backHome: string;
    completeSignup: string;
    connectWallet: string;
    openPreview: string;
    openReferrals: string;
    refresh: string;
    save: string;
    saving: string;
  };
  defaults: {
    badgeLabel: string;
    brandNameFallback: string;
    ctaLabel: string;
    descriptionTemplate: string;
    headlineTemplate: string;
  };
  fields: {
    badgeLabel: string;
    brandName: string;
    ctaLabel: string;
    description: string;
    headline: string;
    mode: string;
    preview: string;
    referralLink: string;
    theme: string;
  };
  hints: {
    badgeLabel: string;
    brandName: string;
    ctaLabel: string;
    description: string;
    headline: string;
  };
  landing: {
    brandedExperience: string;
    referralCode: string;
    sharedBy: string;
  };
  messages: {
    customModeNotice: string;
    defaultModeNotice: string;
    disconnected: string;
    loadFailed: string;
    loading: string;
    memberMissing: string;
    paymentRequired: string;
    saveFailed: string;
    saveSuccess: string;
  };
  meta: {
    description: string;
    title: string;
  };
  modeOptions: {
    custom: string;
    customDescription: string;
    default: string;
    defaultDescription: string;
  };
  page: {
    description: string;
    eyebrow: string;
    title: string;
  };
  themeLabels: Record<LandingBrandThemeKey, string>;
};

const englishCopy: LandingBrandingCopy = {
  actions: {
    backHome: "Back home",
    completeSignup: "Complete signup",
    connectWallet: "Sign in with email",
    openPreview: "Open referral preview",
    openReferrals: "Open referrals",
    refresh: "Refresh",
    save: "Save branding",
    saving: "Saving...",
  },
  defaults: {
    badgeLabel: "Private Invite",
    brandNameFallback: "Partner Studio",
    ctaLabel: "Start with this invite",
    descriptionTemplate:
      "Launch your 1066friend+ signup flow from this referral page and keep the journey aligned with {brandName}.",
    headlineTemplate: "Start 1066friend+ with {brandName}",
  },
  fields: {
    badgeLabel: "Badge label",
    brandName: "Brand name",
    ctaLabel: "CTA label",
    description: "Hero description",
    headline: "Hero headline",
    mode: "Landing mode",
    preview: "Preview",
    referralLink: "Referral link",
    theme: "Theme",
  },
  hints: {
    badgeLabel: "Short label shown above the hero section.",
    brandName: "This name appears as the sharer's brand on the landing page and OG image.",
    ctaLabel: "Primary CTA text used on the branded landing page.",
    description: "Use one or two sentences that explain why this referral page feels different.",
    headline: "Keep it concise. This becomes the main title on the branded landing page.",
  },
  landing: {
    brandedExperience: "Branded Referral Landing",
    referralCode: "Referral Code",
    sharedBy: "Shared by",
  },
  messages: {
    customModeNotice:
      "Custom mode applies your saved copy and theme to referral landing traffic and OG previews.",
    defaultModeNotice:
      "Default mode keeps the current landing page unchanged. Your studio draft stays saved for later.",
    disconnected:
      "Sign in with the same member email you use for referrals to open your branding studio.",
    loadFailed: "Failed to load branding studio settings.",
    loading: "Loading your branding studio...",
    memberMissing: "Member not found.",
    paymentRequired:
      "Branding Studio is available after member signup is completed.",
    saveFailed: "Failed to save branding settings.",
    saveSuccess: "Branding settings saved.",
  },
  meta: {
    description:
      "Edit referral landing copy, choose the default or branded experience, and review the OG preview.",
    title: "Branding Studio | 1066friend+",
  },
  modeOptions: {
    custom: "Use branded landing",
    customDescription:
      "Referral links render your customized headline, description, CTA, and theme.",
    default: "Use default landing",
    defaultDescription:
      "Referral links continue to use the current shared landing page without custom branding.",
  },
  page: {
    description:
      "Choose whether your referral link should keep the default launch page or show your branded version. The same settings drive the OG share preview.",
    eyebrow: "member branding",
    title: "Branding Studio",
  },
  themeLabels: {
    emerald: "Emerald",
    gold: "Gold",
    ocean: "Ocean",
    rose: "Rose",
  },
};

const copies: Record<Locale, LandingBrandingCopy> = {
  en: englishCopy,
  id: {
    ...englishCopy,
    actions: {
      ...englishCopy.actions,
      backHome: "Kembali ke beranda",
      completeSignup: "Selesaikan pendaftaran",
      connectWallet: "Masuk dengan email",
      openPreview: "Buka preview referral",
      openReferrals: "Buka referral",
      refresh: "Muat ulang",
      save: "Simpan branding",
      saving: "Menyimpan...",
    },
    page: {
      ...englishCopy.page,
      eyebrow: "branding member",
      title: "Branding Studio",
    },
  },
  ja: {
    ...englishCopy,
    actions: {
      ...englishCopy.actions,
      backHome: "ホームへ戻る",
      completeSignup: "登録を完了",
      connectWallet: "メールでログイン",
      openPreview: "紹介プレビューを開く",
      openReferrals: "紹介ページへ",
      refresh: "更新",
      save: "ブランディングを保存",
      saving: "保存中...",
    },
    defaults: {
      badgeLabel: "限定招待",
      brandNameFallback: "パートナースタジオ",
      ctaLabel: "この招待で始める",
      descriptionTemplate:
        "{brandName} の紹介ページから 1066friend+ の参加フローを始め、体験をブランドに合わせて整えましょう。",
      headlineTemplate: "{brandName} と一緒に 1066friend+ を始める",
    },
    fields: {
      badgeLabel: "バッジラベル",
      brandName: "ブランド名",
      ctaLabel: "CTA ラベル",
      description: "ヒーロー説明",
      headline: "ヒーロー見出し",
      mode: "ランディングモード",
      preview: "プレビュー",
      referralLink: "紹介リンク",
      theme: "テーマ",
    },
    hints: {
      badgeLabel: "ヒーロー上部に表示される短いラベルです。",
      brandName:
        "ランディングページと OG 画像で紹介者のブランドとして表示されます。",
      ctaLabel: "ブランディングされたランディングで使うメイン CTA 文言です。",
      description:
        "この紹介ページが通常版とどう違うかを 1〜2 文で説明してください。",
      headline:
        "短くまとめてください。ブランディング版ランディングのメイン見出しになります。",
    },
    landing: {
      brandedExperience: "ブランディング紹介ランディング",
      referralCode: "紹介コード",
      sharedBy: "Shared by",
    },
    messages: {
      customModeNotice:
        "カスタムモードでは、保存したコピーとテーマが紹介ランディングと OG プレビューに適用されます。",
      defaultModeNotice:
        "デフォルトモードでは既存のランディングをそのまま使います。スタジオの下書きは保持されます。",
      disconnected:
        "紹介機能で使っている会員メールでログインすると、ブランディングスタジオを開けます。",
      loadFailed: "ブランディングスタジオ設定を読み込めませんでした。",
      loading: "ブランディングスタジオを読み込み中...",
      memberMissing: "会員が見つかりません。",
      paymentRequired:
        "ブランディングスタジオは会員登録完了後に利用できます。",
      saveFailed: "ブランディング設定を保存できませんでした。",
      saveSuccess: "ブランディング設定を保存しました。",
    },
    meta: {
      description:
        "紹介ランディングのコピーを編集し、デフォルトまたはブランド版の体験を選び、OG プレビューを確認します。",
      title: "Branding Studio | 1066friend+",
    },
    modeOptions: {
      custom: "ブランド版を使う",
      customDescription:
        "紹介リンクでカスタム見出し、説明、CTA、テーマを表示します。",
      default: "デフォルト版を使う",
      defaultDescription:
        "紹介リンクは現在の共有ランディングをそのまま使います。",
    },
    page: {
      description:
        "紹介リンクでデフォルトのランディングを使うか、ブランド版を見せるかを選択します。同じ設定が OG シェアプレビューにも反映されます。",
      eyebrow: "member branding",
      title: "Branding Studio",
    },
    themeLabels: {
      emerald: "エメラルド",
      gold: "ゴールド",
      ocean: "オーシャン",
      rose: "ローズ",
    },
  },
  ko: {
    ...englishCopy,
    actions: {
      backHome: "홈으로",
      completeSignup: "가입 완료하기",
      connectWallet: "이메일 로그인",
      openPreview: "레퍼럴 미리보기 열기",
      openReferrals: "레퍼럴 페이지",
      refresh: "새로고침",
      save: "브랜딩 저장",
      saving: "저장 중...",
    },
    defaults: {
      badgeLabel: "프라이빗 초대",
      brandNameFallback: "파트너 스튜디오",
      ctaLabel: "이 초대로 시작하기",
      descriptionTemplate:
        "{brandName} 전용 레퍼럴 랜딩에서 1066friend+ 가입 흐름을 시작하고, 공유 경험을 브랜드에 맞게 정리하세요.",
      headlineTemplate: "{brandName}와 함께 1066friend+ 시작하기",
    },
    fields: {
      badgeLabel: "배지 문구",
      brandName: "브랜드 이름",
      ctaLabel: "CTA 문구",
      description: "히어로 설명",
      headline: "히어로 헤드라인",
      mode: "랜딩 모드",
      preview: "미리보기",
      referralLink: "레퍼럴 링크",
      theme: "테마",
    },
    hints: {
      badgeLabel: "히어로 상단에 짧게 노출되는 문구입니다.",
      brandName:
        "랜딩 페이지와 OG 이미지에서 공유자 브랜드로 표시됩니다.",
      ctaLabel: "브랜딩 랜딩 페이지의 메인 CTA 버튼 문구입니다.",
      description:
        "이 레퍼럴 페이지가 기본 페이지와 어떻게 다른지 1~2문장으로 설명하세요.",
      headline:
        "짧고 강하게 작성하세요. 브랜딩 랜딩 페이지의 메인 제목이 됩니다.",
    },
    landing: {
      brandedExperience: "브랜딩 레퍼럴 랜딩",
      referralCode: "레퍼럴 코드",
      sharedBy: "공유자",
    },
    messages: {
      customModeNotice:
        "커스텀 모드를 켜면 저장한 카피와 테마가 레퍼럴 랜딩과 OG 미리보기에 반영됩니다.",
      defaultModeNotice:
        "디폴트 모드는 현재 랜딩 페이지를 그대로 사용합니다. 스튜디오 초안은 저장된 상태로 유지됩니다.",
      disconnected:
        "레퍼럴에 사용하는 회원 이메일로 로그인하면 브랜딩 스튜디오를 열 수 있습니다.",
      loadFailed: "브랜딩 스튜디오 설정을 불러오지 못했습니다.",
      loading: "브랜딩 스튜디오를 불러오는 중입니다...",
      memberMissing: "회원 정보를 찾을 수 없습니다.",
      paymentRequired: "브랜딩 스튜디오는 가입 완료 회원에게만 제공됩니다.",
      saveFailed: "브랜딩 설정 저장에 실패했습니다.",
      saveSuccess: "브랜딩 설정이 저장되었습니다.",
    },
    meta: {
      description:
        "레퍼럴 랜딩 카피를 수정하고, 디폴트/브랜딩 노출 방식을 선택한 뒤 OG 미리보기를 확인합니다.",
      title: "브랜딩 스튜디오 | 1066friend+",
    },
    modeOptions: {
      custom: "브랜딩 랜딩 사용",
      customDescription:
        "레퍼럴 링크에 내 헤드라인, 설명, CTA, 테마를 적용합니다.",
      default: "디폴트 랜딩 사용",
      defaultDescription:
        "레퍼럴 링크는 지금의 공용 랜딩 페이지를 그대로 사용합니다.",
    },
    page: {
      description:
        "내 레퍼럴 링크가 디폴트 런칭 페이지를 보여줄지, 브랜딩 버전을 보여줄지 선택하세요. 같은 설정이 OG 공유 미리보기에도 연결됩니다.",
      eyebrow: "member branding",
      title: "브랜딩 스튜디오",
    },
    themeLabels: {
      emerald: "에메랄드",
      gold: "골드",
      ocean: "오션",
      rose: "로즈",
    },
  },
  vi: {
    ...englishCopy,
    actions: {
      ...englishCopy.actions,
      backHome: "Về trang chủ",
      completeSignup: "Hoàn tất đăng ký",
      connectWallet: "Đăng nhập email",
      openPreview: "Mở xem trước referral",
      openReferrals: "Mở referral",
      refresh: "Làm mới",
      save: "Lưu branding",
      saving: "Đang lưu...",
    },
    page: {
      ...englishCopy.page,
      eyebrow: "member branding",
      title: "Branding Studio",
    },
  },
  zh: {
    ...englishCopy,
    actions: {
      ...englishCopy.actions,
      backHome: "返回首页",
      completeSignup: "完成注册",
      connectWallet: "邮箱登录",
      openPreview: "打开推荐预览",
      openReferrals: "打开推荐页",
      refresh: "刷新",
      save: "保存品牌配置",
      saving: "保存中...",
    },
    defaults: {
      badgeLabel: "专属邀请",
      brandNameFallback: "Partner Studio",
      ctaLabel: "通过此邀请开始",
      descriptionTemplate:
        "从 {brandName} 的专属推荐页进入 1066friend+ 注册流程，让分享体验更贴合你的品牌。",
      headlineTemplate: "与 {brandName} 一起开始 1066friend+",
    },
    fields: {
      badgeLabel: "徽章文案",
      brandName: "品牌名称",
      ctaLabel: "CTA 文案",
      description: "主视觉描述",
      headline: "主视觉标题",
      mode: "落地页模式",
      preview: "预览",
      referralLink: "推荐链接",
      theme: "主题",
    },
    hints: {
      badgeLabel: "显示在主视觉上方的短标签。",
      brandName: "会在落地页和 OG 图片中显示为分享者品牌。",
      ctaLabel: "品牌版落地页主 CTA 按钮文案。",
      description: "用 1 到 2 句话说明这个推荐页与默认页的差异。",
      headline: "尽量简洁，这会成为品牌版落地页的主标题。",
    },
    landing: {
      brandedExperience: "品牌推荐落地页",
      referralCode: "推荐码",
      sharedBy: "分享者",
    },
    messages: {
      customModeNotice:
        "开启自定义模式后，保存的文案和主题会应用到推荐落地页和 OG 预览。",
      defaultModeNotice:
        "默认模式会继续使用当前公共落地页，工作室草稿会保留。",
      disconnected:
        "请使用与你的推荐会员一致的邮箱登录后进入 Branding Studio。",
      loadFailed: "无法加载 Branding Studio 设置。",
      loading: "正在加载 Branding Studio...",
      memberMissing: "未找到会员信息。",
      paymentRequired: "Branding Studio 仅对完成注册的会员开放。",
      saveFailed: "保存品牌设置失败。",
      saveSuccess: "品牌设置已保存。",
    },
    meta: {
      description:
        "编辑推荐落地页文案，选择默认或品牌版体验，并检查 OG 预览效果。",
      title: "Branding Studio | 1066friend+",
    },
    modeOptions: {
      custom: "使用品牌版落地页",
      customDescription: "推荐链接显示你的自定义标题、描述、CTA 和主题。",
      default: "使用默认落地页",
      defaultDescription: "推荐链接继续显示当前共享落地页，不启用品牌化内容。",
    },
    page: {
      description:
        "选择你的推荐链接是继续显示默认落地页，还是展示品牌版页面。同一套设置也会驱动 OG 分享预览。",
      eyebrow: "member branding",
      title: "Branding Studio",
    },
    themeLabels: {
      emerald: "祖母绿",
      gold: "金色",
      ocean: "海洋",
      rose: "玫瑰",
    },
  },
};

export function getLandingBrandingCopy(locale: Locale) {
  return copies[locale];
}
