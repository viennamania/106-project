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
    <main className="min-h-dvh overflow-hidden bg-[#fff7fb] text-[#1b1231]">
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

      <section className="mx-auto grid min-h-[calc(100dvh-92px)] w-full max-w-6xl items-center gap-10 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-[1fr_0.92fr]">
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

        <div id="service" className="rounded-[32px] border border-white/80 bg-white/78 p-4 shadow-[0_30px_90px_rgba(91,23,71,0.14)] backdrop-blur">
          <div className="rounded-[26px] bg-[#160b2d] p-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/52">
                Service Flow
              </p>
              <span className="rounded-full bg-emerald-300/16 px-3 py-1 text-xs font-bold text-emerald-100">
                Ready
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
    </main>
  );
}
