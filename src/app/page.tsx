import type { Metadata } from "next";
import Link from "next/link";

const supportedLandingLanguages = ["ko", "en", "ja", "zh", "vn", "id", "km"] as const;

type LandingLanguage = (typeof supportedLandingLanguages)[number];

const activationLocaleByLandingLanguage: Record<LandingLanguage, string> = {
  ko: "ko",
  en: "en",
  ja: "ja",
  zh: "zh",
  vn: "vi",
  id: "id",
  km: "en",
};

export const metadata: Metadata = {
  title: "1066friend+ | 새로운 소셜 패러다임",
  description:
    "참여가 가치와 평판 Context를 만드는 1066friend+ 랜딩 페이지입니다.",
};

const languageLabels: Record<LandingLanguage, string> = {
  ko: "KO",
  en: "EN",
  ja: "JA",
  zh: "中文",
  vn: "VIE",
  id: "IND",
  km: "ខ្មែរ",
};

const landingCopy: Record<
  LandingLanguage,
  {
    eyebrow: string;
    headline: string;
    subhead: string;
    primaryCta: string;
    secondaryCta: string;
    feeNote: string;
    steps: Array<{ title: string; body: string }>;
    proof: Array<{ label: string; value: string }>;
  }
> = {
  ko: {
    eyebrow: "1066FRIEND+",
    headline: "소셜 미디어의 새로운 패러다임",
    subhead: "참여하고, 추천하고, 콘텐츠를 소비하는 행동이 포인트와 성장 기록으로 연결됩니다.",
    primaryCta: "지금 시작하기",
    secondaryCta: "서비스 보기",
    feeNote: "10 USDT · 1회 서비스 이용료 · 투자 상품 아님",
    steps: [
      { title: "가입", body: "이메일과 지갑으로 서비스 상태를 확인합니다." },
      { title: "추천", body: "내 코드로 들어온 회원과 포인트를 관리합니다." },
      { title: "사용", body: "포인트로 콘텐츠와 리워드를 이용합니다." },
    ],
    proof: [
      { label: "서비스 허브", value: "가입 상태" },
      { label: "성장 리워드", value: "포인트" },
      { label: "지갑", value: "USDT" },
    ],
  },
  en: {
    eyebrow: "1066FRIEND+",
    headline: "A new social participation layer",
    subhead: "Join, refer, and use content while each action becomes points and growth context.",
    primaryCta: "Start now",
    secondaryCta: "View service",
    feeNote: "10 USDT · one-time service fee · not an investment product",
    steps: [
      { title: "Join", body: "Check your service status with email and wallet." },
      { title: "Refer", body: "Manage members and points from your code." },
      { title: "Use", body: "Spend points on content and rewards." },
    ],
    proof: [
      { label: "Service hub", value: "Status" },
      { label: "Growth rewards", value: "Points" },
      { label: "Wallet", value: "USDT" },
    ],
  },
  ja: {
    eyebrow: "1066FRIEND+",
    headline: "参加から始まる新しいソーシャル体験",
    subhead: "参加、紹介、コンテンツ利用がポイントと成長記録につながります。",
    primaryCta: "今すぐ始める",
    secondaryCta: "サービスを見る",
    feeNote: "10 USDT · 1回のサービス利用料 · 投資商品ではありません",
    steps: [
      { title: "参加", body: "メールとウォレットで状態を確認します。" },
      { title: "紹介", body: "紹介コードの会員とポイントを管理します。" },
      { title: "利用", body: "ポイントでコンテンツとリワードを利用します。" },
    ],
    proof: [
      { label: "サービス", value: "状態" },
      { label: "リワード", value: "ポイント" },
      { label: "ウォレット", value: "USDT" },
    ],
  },
  zh: {
    eyebrow: "1066FRIEND+",
    headline: "参与驱动的新社交网络",
    subhead: "加入、推荐和内容使用都会沉淀为积分与成长记录。",
    primaryCta: "开始使用",
    secondaryCta: "查看服务",
    feeNote: "10 USDT · 一次性服务费 · 非投资产品",
    steps: [
      { title: "加入", body: "用邮箱和钱包确认服务状态。" },
      { title: "推荐", body: "管理通过推荐码加入的成员和积分。" },
      { title: "使用", body: "用积分兑换内容和奖励。" },
    ],
    proof: [
      { label: "服务中心", value: "状态" },
      { label: "成长奖励", value: "积分" },
      { label: "钱包", value: "USDT" },
    ],
  },
  vn: {
    eyebrow: "1066FRIEND+",
    headline: "Một lớp tham gia xã hội mới",
    subhead: "Tham gia, giới thiệu và dùng nội dung để tích điểm và hồ sơ tăng trưởng.",
    primaryCta: "Bắt đầu",
    secondaryCta: "Xem dịch vụ",
    feeNote: "10 USDT · phí dịch vụ một lần · không phải sản phẩm đầu tư",
    steps: [
      { title: "Tham gia", body: "Kiểm tra trạng thái bằng email và ví." },
      { title: "Giới thiệu", body: "Quản lý thành viên và điểm từ mã của bạn." },
      { title: "Sử dụng", body: "Dùng điểm cho nội dung và phần thưởng." },
    ],
    proof: [
      { label: "Dịch vụ", value: "Trạng thái" },
      { label: "Thưởng", value: "Điểm" },
      { label: "Ví", value: "USDT" },
    ],
  },
  id: {
    eyebrow: "1066FRIEND+",
    headline: "Lapisan partisipasi sosial baru",
    subhead: "Bergabung, mengundang, dan memakai konten menjadi poin serta catatan pertumbuhan.",
    primaryCta: "Mulai sekarang",
    secondaryCta: "Lihat layanan",
    feeNote: "10 USDT · biaya layanan satu kali · bukan produk investasi",
    steps: [
      { title: "Gabung", body: "Cek status dengan email dan wallet." },
      { title: "Undang", body: "Kelola member dan poin dari kode Anda." },
      { title: "Gunakan", body: "Pakai poin untuk konten dan reward." },
    ],
    proof: [
      { label: "Hub layanan", value: "Status" },
      { label: "Reward", value: "Poin" },
      { label: "Wallet", value: "USDT" },
    ],
  },
  km: {
    eyebrow: "1066FRIEND+",
    headline: "ស្រទាប់ចូលរួមសង្គមថ្មី",
    subhead: "ការចូលរួម ការណែនាំ និងការប្រើមាតិកា ក្លាយជាពិន្ទុ និងកំណត់ត្រាកំណើន។",
    primaryCta: "ចាប់ផ្តើម",
    secondaryCta: "មើលសេវា",
    feeNote: "10 USDT · ថ្លៃសេវាម្តង · មិនមែនផលិតផលវិនិយោគ",
    steps: [
      { title: "ចូលរួម", body: "ពិនិត្យស្ថានភាពដោយអ៊ីមែល និងកាបូប។" },
      { title: "ណែនាំ", body: "គ្រប់គ្រងសមាជិក និងពិន្ទុតាមកូដរបស់អ្នក។" },
      { title: "ប្រើប្រាស់", body: "ប្រើពិន្ទុសម្រាប់មាតិកា និងរង្វាន់។" },
    ],
    proof: [
      { label: "មជ្ឈមណ្ឌលសេវា", value: "ស្ថានភាព" },
      { label: "រង្វាន់", value: "ពិន្ទុ" },
      { label: "កាបូប", value: "USDT" },
    ],
  },
};

const serviceLandingCopy: Record<
  LandingLanguage,
  {
    eyebrow: string;
    title: string;
    description: string;
    cards: Array<{ title: string; body: string; label: string }>;
    loopTitle: string;
    loopSteps: string[];
    notice: string;
    statusLabel: string;
  }
> = {
  ko: {
    eyebrow: "SERVICE",
    title: "1066FRIEND+에서 무엇을 할 수 있나요?",
    description:
      "가입, 추천, 콘텐츠 이용, 포인트, 지갑을 한 흐름으로 연결한 소셜 참여 서비스입니다. 랜딩에서 바로 서비스 구조를 이해하고 시작할 수 있어야 합니다.",
    cards: [
      {
        title: "글로벌 피드",
        body: "전 세계 사용자의 공개 콘텐츠를 둘러보고, 마음에 드는 콘텐츠를 포인트로 이용합니다.",
        label: "둘러보기",
      },
      {
        title: "추천 네트워크",
        body: "내 코드로 가입한 회원과 6단계 네트워크 상태를 확인합니다.",
        label: "성장",
      },
      {
        title: "포인트 관리",
        body: "활동으로 쌓인 포인트와 리워드 교환 가능 상태를 확인합니다.",
        label: "리워드",
      },
      {
        title: "지갑 / 자산",
        body: "서비스 이용에 필요한 USDT, BNB, 지갑 연결 상태를 관리합니다.",
        label: "지갑",
      },
      {
        title: "콘텐츠 구매",
        body: "포인트로 콘텐츠를 열람하고, 공개 피드에서 활동 기록을 남깁니다.",
        label: "사용",
      },
      {
        title: "콘텐츠 제작",
        body: "가입 완료 후 생성되는 AI 스타 IP와 콘텐츠 제작 자격으로 확장됩니다.",
        label: "창작",
      },
    ],
    loopTitle: "서비스 흐름",
    loopSteps: ["시작", "가입 확인", "추천 관리", "포인트 사용", "콘텐츠 참여"],
    notice: "10 USDT는 디지털 서비스 이용료이며 투자 상품이 아닙니다.",
    statusLabel: "준비됨",
  },
  en: {
    eyebrow: "SERVICE",
    title: "What can you do in 1066FRIEND+?",
    description:
      "A social participation service that connects joining, referrals, content usage, points, and wallet status in one flow.",
    cards: [
      {
        title: "Global feed",
        body: "Browse public content from global users and use points for content you want.",
        label: "Browse",
      },
      {
        title: "Referral network",
        body: "Review members who joined with your code and the six-level network state.",
        label: "Growth",
      },
      {
        title: "Points",
        body: "Check points accumulated from activity and reward exchange readiness.",
        label: "Rewards",
      },
      {
        title: "Wallet",
        body: "Manage USDT, BNB, and wallet connection status for service use.",
        label: "Wallet",
      },
      {
        title: "Content access",
        body: "Use points to open content and create activity records in the public feed.",
        label: "Use",
      },
      {
        title: "Creator path",
        body: "After activation, your AI Star IP and creator eligibility can expand.",
        label: "Create",
      },
    ],
    loopTitle: "Service flow",
    loopSteps: ["Start", "Verify", "Refer", "Use points", "Participate"],
    notice: "10 USDT is a digital service fee, not an investment product.",
    statusLabel: "Ready",
  },
  ja: {
    eyebrow: "SERVICE",
    title: "1066FRIEND+でできること",
    description:
      "参加、紹介、コンテンツ利用、ポイント、ウォレット状態を一つの流れでつなぐソーシャル参加サービスです。",
    cards: [
      {
        title: "グローバルフィード",
        body: "世界中の公開コンテンツを見て、ポイントで利用できます。",
        label: "見る",
      },
      {
        title: "紹介ネットワーク",
        body: "紹介コードで参加した会員と6段階ネットワークを確認します。",
        label: "成長",
      },
      {
        title: "ポイント管理",
        body: "活動で貯まったポイントとリワード交換状態を確認します。",
        label: "リワード",
      },
      {
        title: "ウォレット",
        body: "USDT、BNB、ウォレット接続状態を管理します。",
        label: "ウォレット",
      },
      {
        title: "コンテンツ利用",
        body: "ポイントでコンテンツを開き、公開フィードで活動記録を残します。",
        label: "利用",
      },
      {
        title: "クリエイター",
        body: "有効化後、AIスターIPと制作資格へ拡張できます。",
        label: "制作",
      },
    ],
    loopTitle: "サービスの流れ",
    loopSteps: ["開始", "確認", "紹介", "ポイント利用", "参加"],
    notice: "10 USDTはデジタルサービス利用料であり、投資商品ではありません。",
    statusLabel: "準備完了",
  },
  zh: {
    eyebrow: "SERVICE",
    title: "1066FRIEND+ 可以做什么？",
    description:
      "把加入、推荐、内容使用、积分与钱包状态连接成一个流程的社交参与服务。",
    cards: [
      {
        title: "全球内容流",
        body: "浏览全球用户的公开内容，并用积分使用喜欢的内容。",
        label: "浏览",
      },
      {
        title: "推荐网络",
        body: "查看通过你的代码加入的成员和六级网络状态。",
        label: "成长",
      },
      {
        title: "积分管理",
        body: "查看活动积分和奖励兑换状态。",
        label: "奖励",
      },
      {
        title: "钱包 / 资产",
        body: "管理 USDT、BNB 与钱包连接状态。",
        label: "钱包",
      },
      {
        title: "内容购买",
        body: "用积分打开内容，并在公开内容流中留下活动记录。",
        label: "使用",
      },
      {
        title: "创作者路径",
        body: "激活后可扩展到 AI Star IP 和内容制作资格。",
        label: "创作",
      },
    ],
    loopTitle: "服务流程",
    loopSteps: ["开始", "确认", "推荐", "使用积分", "参与"],
    notice: "10 USDT 是数字服务费，并非投资产品。",
    statusLabel: "已准备",
  },
  vn: {
    eyebrow: "SERVICE",
    title: "Bạn có thể làm gì trong 1066FRIEND+?",
    description:
      "Dịch vụ tham gia xã hội kết nối đăng ký, giới thiệu, nội dung, điểm và ví trong một luồng.",
    cards: [
      {
        title: "Nguồn nội dung",
        body: "Xem nội dung công khai từ người dùng toàn cầu và dùng điểm để mở nội dung.",
        label: "Xem",
      },
      {
        title: "Mạng giới thiệu",
        body: "Kiểm tra thành viên tham gia bằng mã của bạn và mạng 6 cấp.",
        label: "Tăng trưởng",
      },
      {
        title: "Quản lý điểm",
        body: "Theo dõi điểm từ hoạt động và trạng thái đổi thưởng.",
        label: "Thưởng",
      },
      {
        title: "Ví / tài sản",
        body: "Quản lý USDT, BNB và trạng thái kết nối ví.",
        label: "Ví",
      },
      {
        title: "Mua nội dung",
        body: "Dùng điểm để mở nội dung và tạo lịch sử hoạt động.",
        label: "Dùng",
      },
      {
        title: "Đường creator",
        body: "Sau khi kích hoạt, có thể mở rộng sang AI Star IP và tạo nội dung.",
        label: "Tạo",
      },
    ],
    loopTitle: "Luồng dịch vụ",
    loopSteps: ["Bắt đầu", "Xác minh", "Giới thiệu", "Dùng điểm", "Tham gia"],
    notice: "10 USDT là phí dịch vụ kỹ thuật số, không phải sản phẩm đầu tư.",
    statusLabel: "Sẵn sàng",
  },
  id: {
    eyebrow: "SERVICE",
    title: "Apa yang bisa dilakukan di 1066FRIEND+?",
    description:
      "Layanan partisipasi sosial yang menghubungkan pendaftaran, referral, konten, poin, dan wallet.",
    cards: [
      {
        title: "Feed global",
        body: "Lihat konten publik dari pengguna global dan gunakan poin untuk membuka konten.",
        label: "Lihat",
      },
      {
        title: "Jaringan referral",
        body: "Pantau member dari kode Anda dan struktur jaringan 6 level.",
        label: "Growth",
      },
      {
        title: "Poin",
        body: "Cek poin aktivitas dan status penukaran reward.",
        label: "Reward",
      },
      {
        title: "Wallet",
        body: "Kelola USDT, BNB, dan status koneksi wallet.",
        label: "Wallet",
      },
      {
        title: "Akses konten",
        body: "Gunakan poin untuk membuka konten dan membuat riwayat aktivitas.",
        label: "Pakai",
      },
      {
        title: "Creator path",
        body: "Setelah aktif, AI Star IP dan hak membuat konten bisa berkembang.",
        label: "Buat",
      },
    ],
    loopTitle: "Alur layanan",
    loopSteps: ["Mulai", "Verifikasi", "Referral", "Pakai poin", "Partisipasi"],
    notice: "10 USDT adalah biaya layanan digital, bukan produk investasi.",
    statusLabel: "Siap",
  },
  km: {
    eyebrow: "SERVICE",
    title: "អ្នកអាចធ្វើអ្វីខ្លះក្នុង 1066FRIEND+?",
    description:
      "សេវាចូលរួមសង្គមដែលភ្ជាប់ការចុះឈ្មោះ ការណែនាំ មាតិកា ពិន្ទុ និងកាបូប។",
    cards: [
      {
        title: "Feed ពិភពលោក",
        body: "មើលមាតិកាសាធារណៈ និងប្រើពិន្ទុដើម្បីបើកមាតិកា។",
        label: "មើល",
      },
      {
        title: "បណ្ដាញណែនាំ",
        body: "ពិនិត្យសមាជិកដែលចូលតាមកូដរបស់អ្នក និងបណ្ដាញ 6 កម្រិត។",
        label: "កំណើន",
      },
      {
        title: "គ្រប់គ្រងពិន្ទុ",
        body: "ពិនិត្យពិន្ទុពីសកម្មភាព និងស្ថានភាពប្តូររង្វាន់។",
        label: "រង្វាន់",
      },
      {
        title: "កាបូប",
        body: "គ្រប់គ្រង USDT, BNB និងស្ថានភាពភ្ជាប់កាបូប។",
        label: "កាបូប",
      },
      {
        title: "ទិញមាតិកា",
        body: "ប្រើពិន្ទុដើម្បីបើកមាតិកា និងបង្កើតកំណត់ត្រាសកម្មភាព។",
        label: "ប្រើ",
      },
      {
        title: "Creator path",
        body: "បន្ទាប់ពីដំណើរការ អាចពង្រីកទៅ AI Star IP និងការបង្កើតមាតិកា។",
        label: "បង្កើត",
      },
    ],
    loopTitle: "លំហូរសេវា",
    loopSteps: ["ចាប់ផ្តើម", "បញ្ជាក់", "ណែនាំ", "ប្រើពិន្ទុ", "ចូលរួម"],
    notice: "10 USDT គឺជាថ្លៃសេវាឌីជីថល មិនមែនផលិតផលវិនិយោគ។",
    statusLabel: "រួចរាល់",
  },
};

function readSingleValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeLandingLanguage(value?: string | string[]): LandingLanguage {
  const candidate = readSingleValue(value)?.trim().toLowerCase();

  if (candidate === "vi") {
    return "vn";
  }

  if (candidate === "zh-cn") {
    return "zh";
  }

  if (
    supportedLandingLanguages.includes(candidate as LandingLanguage)
  ) {
    return candidate as LandingLanguage;
  }

  return "ko";
}

function buildActivationHref({
  activationLocale,
  landingLanguage,
  referralCode,
}: {
  activationLocale: string;
  landingLanguage: LandingLanguage;
  referralCode?: string;
}) {
  const params = new URLSearchParams({ landingLang: landingLanguage });

  if (referralCode) {
    params.set("ref", referralCode);
  }

  return `/${activationLocale}/activate?${params.toString()}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string | string[];
    locale?: string | string[];
    ref?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const referralCode = readSingleValue(query.ref);
  const landingLanguage = normalizeLandingLanguage(query.lang ?? query.locale);
  const activationLocale = activationLocaleByLandingLanguage[landingLanguage];
  const copy = landingCopy[landingLanguage];
  const serviceCopy = serviceLandingCopy[landingLanguage];
  const activationHref = buildActivationHref({
    activationLocale,
    landingLanguage,
    referralCode,
  });

  const languageHref = (language: LandingLanguage) => {
    const params = new URLSearchParams({ lang: language });

    if (referralCode) {
      params.set("ref", referralCode);
    }

    return `/?${params.toString()}`;
  };

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#fff7fb] text-[#1b1231]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_22%,rgba(236,72,153,0.14),transparent_28%),radial-gradient(circle_at_78%_12%,rgba(126,34,206,0.12),transparent_26%),linear-gradient(180deg,#fff_0%,#fff7fb_58%,#fff_100%)]" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link className="text-2xl font-black tracking-[-0.06em] text-[#15183b]" href="/">
          1066<span className="text-[#d41462]">+</span>
          <span className="block text-base tracking-[-0.04em]">friend+</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2" aria-label="Language">
          {supportedLandingLanguages.map((language) => (
            <Link
              className={`inline-flex min-h-10 items-center justify-center rounded-full border px-3 text-xs font-bold transition sm:px-4 ${
                language === landingLanguage
                  ? "border-[#9b0f62] bg-[#9b0f62] text-white shadow-[0_14px_32px_rgba(155,15,98,0.22)]"
                  : "border-[#f2b5d4] bg-white/70 text-[#9b4773] hover:border-[#d41462]"
              }`}
              href={languageHref(language)}
              key={language}
            >
              {languageLabels[language]}
            </Link>
          ))}
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-12 pt-8 sm:px-8 lg:min-h-[calc(100dvh-92px)] lg:grid-cols-[1fr_0.92fr]">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#f2b5d4] bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#d41462] shadow-[0_14px_38px_rgba(212,20,98,0.08)]">
            <span className="size-2 rounded-full bg-[#d41462]" />
            {copy.eyebrow}
          </p>
          <h1 className="mt-7 break-keep text-5xl font-black leading-[1.02] tracking-[-0.07em] text-[#160b2d] [word-break:keep-all] sm:text-6xl lg:text-7xl">
            {copy.headline}
          </h1>
          <p className="mt-5 max-w-xl break-keep text-lg font-semibold leading-8 text-[#70415d] [word-break:keep-all]">
            {copy.subhead}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#43106d,#d41462)] px-7 text-base font-black text-white shadow-[0_20px_45px_rgba(212,20,98,0.24)] transition hover:scale-[1.01]"
              href={activationHref}
            >
              {copy.primaryCta}
              <span className="ml-2">→</span>
            </Link>
            <a
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#f2b5d4] bg-white/62 px-7 text-base font-bold text-[#8a1456] transition hover:border-[#d41462] hover:bg-white"
              href="#service"
            >
              {copy.secondaryCta}
            </a>
          </div>
          <p className="mt-5 inline-flex rounded-full border border-[#ead9f2] bg-white/70 px-4 py-2 text-sm font-bold text-[#9b4773]">
            {copy.feeNote}
          </p>
        </div>

        <div className="rounded-[32px] border border-white/80 bg-white/78 p-4 shadow-[0_30px_90px_rgba(91,23,71,0.14)] backdrop-blur">
          <div className="rounded-[26px] bg-[#160b2d] p-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/52">
                {serviceCopy.loopTitle}
              </p>
              <span className="rounded-full bg-emerald-300/16 px-3 py-1 text-xs font-bold text-emerald-100">
                {serviceCopy.statusLabel}
              </span>
            </div>
            <div className="mt-6 grid gap-3">
              {copy.steps.map((step, index) => (
                <div
                  className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/[0.06] p-4"
                  key={step.title}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-[#160b2d]">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-base font-black">{step.title}</span>
                    <span className="mt-1 block break-keep text-sm leading-6 text-white/62 [word-break:keep-all]">
                      {step.body}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {copy.proof.map((item) => (
              <div
                className="rounded-[20px] border border-[#f2e5ed] bg-white px-3 py-4 text-center"
                key={item.label}
              >
                <p className="truncate text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#9b4773]">
                  {item.label}
                </p>
                <p className="mt-1 truncate text-sm font-black text-[#160b2d]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="mx-auto w-full max-w-6xl px-5 pb-24 pt-4 sm:px-8 lg:pt-8"
        id="service"
      >
        <div className="rounded-[36px] border border-[#f3d4e5] bg-white/82 p-5 shadow-[0_34px_100px_rgba(91,23,71,0.12)] backdrop-blur sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="min-w-0">
              <p className="inline-flex rounded-full border border-[#f2b5d4] bg-[#fff7fb] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#b31363]">
                {serviceCopy.eyebrow}
              </p>
              <h2 className="mt-5 max-w-xl break-keep text-3xl font-black leading-[1.08] tracking-[-0.055em] text-[#160b2d] [word-break:keep-all] sm:text-5xl">
                {serviceCopy.title}
              </h2>
              <p className="mt-4 max-w-xl break-keep text-base font-semibold leading-7 text-[#70415d] [word-break:keep-all]">
                {serviceCopy.description}
              </p>

              <div className="mt-7 rounded-[28px] bg-[#160b2d] p-4 text-white sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">
                    {serviceCopy.loopTitle}
                  </p>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/74">
                    1066FRIEND+
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {serviceCopy.loopSteps.map((step, index) => (
                    <span
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 text-xs font-bold text-white/82"
                      key={step}
                    >
                      <span className="flex size-6 items-center justify-center rounded-full bg-white text-[0.68rem] font-black text-[#160b2d]">
                        {index + 1}
                      </span>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {serviceCopy.cards.map((card, index) => (
                <article
                  className="group rounded-[28px] border border-[#f2e5ed] bg-white p-4 shadow-[0_20px_55px_rgba(91,23,71,0.07)] transition hover:-translate-y-0.5 hover:border-[#efb3d2] hover:shadow-[0_24px_70px_rgba(91,23,71,0.12)] sm:p-5"
                  key={card.title}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff0f7] text-sm font-black text-[#b31363] ring-1 ring-[#f2b5d4]">
                      {index + 1}
                    </span>
                    <span className="rounded-full border border-[#f2e5ed] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#9b4773]">
                      {card.label}
                    </span>
                  </div>
                  <h3 className="mt-4 break-keep text-xl font-black tracking-[-0.035em] text-[#160b2d] [word-break:keep-all]">
                    {card.title}
                  </h3>
                  <p className="mt-2 break-keep text-sm font-semibold leading-6 text-[#70415d] [word-break:keep-all]">
                    {card.body}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[#f2e5ed] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-keep text-sm font-bold leading-6 text-[#8b6378] [word-break:keep-all]">
              {serviceCopy.notice}
            </p>
            <Link
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#160b2d] px-5 text-sm font-black text-white transition hover:bg-[#2b1b47]"
              href={activationHref}
            >
              {copy.primaryCta}
              <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
