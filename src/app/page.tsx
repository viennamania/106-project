import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Coins,
  Gift,
  Globe2,
  Network,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
  WalletCards,
} from "lucide-react";

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

const landingFooterCopy: Record<
  LandingLanguage,
  {
    terms: string;
    disclaimer: string;
    bscscan: string;
    notice: string;
  }
> = {
  ko: {
    terms: "이용약관",
    disclaimer: "면책고지",
    bscscan: "BSCScan",
    notice:
      "1066FRIEND+는 소셜 네트워크 플랫폼입니다. 10 USDT는 디지털 서비스 이용료이며 투자 상품이 아닙니다. 포인트는 활동의 결과물이며 금전적 수익을 보장하지 않습니다. 바우처-BNB 전환은 거래 시점의 시장 가격에 따릅니다.",
  },
  en: {
    terms: "Terms of Service",
    disclaimer: "Disclaimer",
    bscscan: "BSCScan",
    notice:
      "1066FRIEND+ is a social network platform. 10 USDT is a digital service fee, not an investment product. Points are activity results and do not guarantee financial income. Voucher-to-BNB conversion depends on market price at the time of transaction.",
  },
  ja: {
    terms: "利用規約",
    disclaimer: "免責事項",
    bscscan: "BSCScan",
    notice:
      "1066FRIEND+はソーシャルネットワークプラットフォームです。10 USDTはデジタルサービス利用料であり、投資商品ではありません。ポイントは活動結果であり、金銭的収益を保証しません。バウチャーからBNBへの換算は取引時点の市場価格により変動します。",
  },
  zh: {
    terms: "服务条款",
    disclaimer: "免责声明",
    bscscan: "BSCScan",
    notice:
      "1066FRIEND+ 是社交网络平台。10 USDT 是数字服务费，并非投资产品。积分是活动结果，不保证金融收益。凭证到 BNB 的转换取决于交易时的市场价格。",
  },
  vn: {
    terms: "Điều khoản dịch vụ",
    disclaimer: "Miễn trách nhiệm",
    bscscan: "BSCScan",
    notice:
      "1066FRIEND+ là nền tảng mạng xã hội. 10 USDT là phí dịch vụ kỹ thuật số, không phải sản phẩm đầu tư. Điểm là kết quả hoạt động và không đảm bảo thu nhập tài chính. Việc chuyển đổi voucher sang BNB phụ thuộc vào giá thị trường tại thời điểm giao dịch.",
  },
  id: {
    terms: "Syarat Layanan",
    disclaimer: "Penafian",
    bscscan: "BSCScan",
    notice:
      "1066FRIEND+ adalah platform media sosial. 10 USDT adalah biaya layanan digital, bukan produk investasi. Poin adalah hasil aktivitas dan tidak menjamin pendapatan finansial. Konversi voucher ke BNB tergantung harga pasar saat transaksi.",
  },
  km: {
    terms: "លក្ខខណ្ឌសេវា",
    disclaimer: "ការបដិសេធទំនួលខុសត្រូវ",
    bscscan: "BSCScan",
    notice:
      "1066FRIEND+ គឺជាវេទិកាបណ្តាញសង្គម។ 10 USDT គឺជាថ្លៃសេវាឌីជីថល មិនមែនផលិតផលវិនិយោគទេ។ ពិន្ទុគឺជាលទ្ធផលសកម្មភាព ហើយមិនធានាចំណូលហិរញ្ញវត្ថុទេ។ ការបម្លែង voucher ទៅ BNB អាស្រ័យលើតម្លៃទីផ្សារនៅពេលប្រតិបត្តិការ។",
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
        body: "가입 완료 후 생성되는 내 AI 스타 프로필과 콘텐츠 제작 자격으로 확장됩니다.",
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
        body: "After activation, your AI Star profile and creator eligibility can expand.",
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
        body: "有効化後、AIスターのプロフィールと制作資格へ拡張できます。",
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
        body: "激活后可扩展到 AI Star 资料和内容制作资格。",
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
        body: "Sau khi kích hoạt, có thể mở rộng sang hồ sơ AI Star và tạo nội dung.",
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
        body: "Setelah aktif, profil AI Star dan hak membuat konten bisa berkembang.",
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
        body: "បន្ទាប់ពីដំណើរការ អាចពង្រីកទៅប្រវត្តិរូប AI Star និងការបង្កើតមាតិកា។",
        label: "បង្កើត",
      },
    ],
    loopTitle: "លំហូរសេវា",
    loopSteps: ["ចាប់ផ្តើម", "បញ្ជាក់", "ណែនាំ", "ប្រើពិន្ទុ", "ចូលរួម"],
    notice: "10 USDT គឺជាថ្លៃសេវាឌីជីថល មិនមែនផលិតផលវិនិយោគ។",
    statusLabel: "រួចរាល់",
  },
};

const serviceIconComponents = [
  Globe2,
  Network,
  Coins,
  WalletCards,
  Clapperboard,
  Sparkles,
] as const;

const landingStoryCopy: Record<
  LandingLanguage,
  {
    oldTag: string;
    oldTitle: string;
    oldItems: string[];
    newTag: string;
    newTitle: string;
    newItems: string[];
    universeEyebrow: string;
    universeTitle: string;
    universeBody: string;
    universeChips: string[];
    earnTitle: string;
    earnCards: Array<{ title: string; body: string; badge: string }>;
    pointsTitle: string;
    pointsBody: string;
    pointsOptions: Array<{ title: string; body: string }>;
    trustTitle: string;
    trustBody: string;
    trustCards: Array<{ title: string; body: string }>;
    finalTitle: string;
    finalBody: string;
    footerTagline: string;
  }
> = {
  ko: {
    oldTag: "기존 SNS",
    oldTitle: "사용자가 가치를 만들고 플랫폼이 가져갑니다.",
    oldItems: ["콘텐츠를 봐도 기록이 남지 않음", "추천 관계가 사라짐", "포인트와 지갑이 분리됨"],
    newTag: "1066FRIEND+",
    newTitle: "참여하는 순간, 행동이 포인트와 성장 기록이 됩니다.",
    newItems: ["추천 코드가 네트워크 Context가 됨", "콘텐츠 사용이 포인트 흐름으로 연결", "지갑과 리워드가 한 화면에서 관리"],
    universeEyebrow: "GLOBAL RANDOM LINK",
    universeTitle: "전 세계 사용자가 하나의 참여 네트워크로 연결됩니다.",
    universeBody:
      "1066FRIEND+는 가입, 추천, 콘텐츠 소비, 포인트 사용을 분리하지 않고 하나의 서비스 흐름으로 연결합니다.",
    universeChips: ["추천 코드", "글로벌 피드", "포인트", "지갑", "콘텐츠"],
    earnTitle: "무엇을 하든, 포인트 흐름이 남습니다.",
    earnCards: [
      {
        title: "콘텐츠 보기",
        body: "공개 피드에서 콘텐츠를 보고 활동 Context를 남깁니다.",
        badge: "참여 기록",
      },
      {
        title: "추천 성장",
        body: "내 코드로 들어온 회원과 6단계 네트워크를 확인합니다.",
        badge: "성장 기록",
      },
      {
        title: "리워드 교환",
        body: "쌓인 포인트로 리워드를 교환하고 사용 흐름을 남깁니다.",
        badge: "사용 기록",
      },
    ],
    pointsTitle: "포인트는 사용자의 행동에서 만들어집니다.",
    pointsBody:
      "콘텐츠를 열람하고, 추천 네트워크를 키우고, 리워드를 교환하는 모든 흐름이 개인 서비스 Context로 축적됩니다.",
    pointsOptions: [
      { title: "콘텐츠 구매", body: "포인트로 글로벌 콘텐츠를 열람합니다." },
      { title: "리워드 교환", body: "Silver 카드처럼 반복 가능한 리워드로 확장됩니다." },
      { title: "네트워크 성장", body: "내 코드 기반 참여 기록이 쌓입니다." },
    ],
    trustTitle: "서비스 이용료와 보상 흐름은 분리해서 보여줍니다.",
    trustBody:
      "10 USDT는 디지털 서비스 이용료이며 투자 상품이 아닙니다. 포인트와 리워드는 서비스 활동 결과로 관리됩니다.",
    trustCards: [
      {
        title: "지갑 기반",
        body: "USDT, BNB, 지갑 연결 상태를 서비스 허브에서 확인합니다.",
      },
      {
        title: "활동 기반",
        body: "추천, 콘텐츠 이용, 리워드 교환이 각각 기록으로 남습니다.",
      },
    ],
    finalTitle: "지금 시작하고 내 서비스 흐름을 확인하세요.",
    finalBody:
      "가입 상태, 추천 코드, 포인트, 지갑, 콘텐츠 흐름을 한 번에 확인할 수 있습니다.",
    footerTagline: "새로운 소셜 패러다임 — 참여가 Context를 만듭니다.",
  },
  en: {
    oldTag: "Traditional SNS",
    oldTitle: "Users create value, but platforms keep the context.",
    oldItems: ["Viewing rarely becomes your record", "Referral relationships disappear", "Points and wallet are separated"],
    newTag: "1066FRIEND+",
    newTitle: "Participation becomes points, growth, and service context.",
    newItems: ["Referral codes become network context", "Content usage connects to points", "Wallet and rewards stay in one flow"],
    universeEyebrow: "GLOBAL RANDOM LINK",
    universeTitle: "Global users connect through one participation network.",
    universeBody:
      "1066FRIEND+ connects joining, referral, content usage, and points into a single service flow.",
    universeChips: ["Referral code", "Global feed", "Points", "Wallet", "Content"],
    earnTitle: "Every action leaves a points flow.",
    earnCards: [
      { title: "Watch content", body: "Use the public feed and leave activity context.", badge: "Activity" },
      { title: "Grow referrals", body: "Review members and the six-level network from your code.", badge: "Growth" },
      { title: "Redeem rewards", body: "Use points for rewards and keep usage context.", badge: "Utility" },
    ],
    pointsTitle: "Points are created from user actions.",
    pointsBody:
      "Content access, referral growth, and reward redemption accumulate as personal service context.",
    pointsOptions: [
      { title: "Content access", body: "Open global content with points." },
      { title: "Reward exchange", body: "Extend into repeatable rewards like Silver cards." },
      { title: "Network growth", body: "Build records around your referral code." },
    ],
    trustTitle: "Service fee and reward flow are shown separately.",
    trustBody:
      "10 USDT is a digital service fee, not an investment product. Points and rewards are managed as service activity results.",
    trustCards: [
      { title: "Wallet based", body: "Check USDT, BNB, and wallet status in the service hub." },
      { title: "Activity based", body: "Referral, content usage, and rewards each become records." },
    ],
    finalTitle: "Start now and review your service flow.",
    finalBody: "Check activation status, referral code, points, wallet, and content flow in one place.",
    footerTagline: "A new social paradigm — participation creates Context.",
  },
  ja: {
    oldTag: "従来のSNS",
    oldTitle: "ユーザーが価値を作り、文脈はプラットフォームに残ります。",
    oldItems: ["閲覧が自分の記録になりにくい", "紹介関係が消えやすい", "ポイントとウォレットが分離"],
    newTag: "1066FRIEND+",
    newTitle: "参加がポイント、成長、サービス文脈になります。",
    newItems: ["紹介コードがネットワーク文脈に", "コンテンツ利用がポイントへ接続", "ウォレットとリワードを一つの流れで管理"],
    universeEyebrow: "GLOBAL RANDOM LINK",
    universeTitle: "世界のユーザーが一つの参加ネットワークにつながります。",
    universeBody:
      "1066FRIEND+は参加、紹介、コンテンツ利用、ポイントを一つのサービスフローに接続します。",
    universeChips: ["紹介コード", "グローバルフィード", "ポイント", "ウォレット", "コンテンツ"],
    earnTitle: "すべての行動がポイントの流れとして残ります。",
    earnCards: [
      { title: "コンテンツを見る", body: "公開フィードで活動文脈を残します。", badge: "活動記録" },
      { title: "紹介を伸ばす", body: "紹介コードの会員と6段階ネットワークを確認します。", badge: "成長記録" },
      { title: "リワード交換", body: "ポイントでリワードを交換し利用文脈を残します。", badge: "利用記録" },
    ],
    pointsTitle: "ポイントはユーザーの行動から作られます。",
    pointsBody:
      "コンテンツ利用、紹介成長、リワード交換が個人のサービス文脈として蓄積されます。",
    pointsOptions: [
      { title: "コンテンツ利用", body: "ポイントでグローバルコンテンツを開きます。" },
      { title: "リワード交換", body: "Silverカードのような反復リワードに拡張します。" },
      { title: "ネットワーク成長", body: "紹介コード中心の参加記録が残ります。" },
    ],
    trustTitle: "サービス利用料とリワードの流れを分けて表示します。",
    trustBody:
      "10 USDTはデジタルサービス利用料であり、投資商品ではありません。ポイントとリワードは活動結果として管理されます。",
    trustCards: [
      { title: "ウォレット基盤", body: "USDT、BNB、ウォレット状態をサービスハブで確認します。" },
      { title: "活動基盤", body: "紹介、コンテンツ利用、リワード交換が記録になります。" },
    ],
    finalTitle: "今すぐ始めてサービスフローを確認しましょう。",
    finalBody: "参加状態、紹介コード、ポイント、ウォレット、コンテンツの流れを一つの画面で確認できます。",
    footerTagline: "新しいソーシャルパラダイム — 参加がContextを作ります。",
  },
  zh: {
    oldTag: "传统SNS",
    oldTitle: "用户创造价值，平台保留上下文。",
    oldItems: ["浏览很少成为自己的记录", "推荐关系容易消失", "积分和钱包分离"],
    newTag: "1066FRIEND+",
    newTitle: "参与会变成积分、成长和服务上下文。",
    newItems: ["推荐码成为网络上下文", "内容使用连接积分", "钱包和奖励在同一流程管理"],
    universeEyebrow: "GLOBAL RANDOM LINK",
    universeTitle: "全球用户通过一个参与网络连接。",
    universeBody: "1066FRIEND+ 把加入、推荐、内容使用和积分连接成一个服务流程。",
    universeChips: ["推荐码", "全球内容流", "积分", "钱包", "内容"],
    earnTitle: "每个行为都会留下积分流。",
    earnCards: [
      { title: "查看内容", body: "在公开内容流中留下活动上下文。", badge: "活动记录" },
      { title: "推荐成长", body: "查看通过代码加入的成员和六级网络。", badge: "成长记录" },
      { title: "兑换奖励", body: "用积分兑换奖励并留下使用上下文。", badge: "使用记录" },
    ],
    pointsTitle: "积分来自用户行为。",
    pointsBody: "内容使用、推荐成长和奖励兑换会积累为个人服务上下文。",
    pointsOptions: [
      { title: "内容购买", body: "用积分打开全球内容。" },
      { title: "奖励兑换", body: "扩展为 Silver 卡等可重复奖励。" },
      { title: "网络成长", body: "围绕推荐码积累参与记录。" },
    ],
    trustTitle: "服务费和奖励流分开显示。",
    trustBody: "10 USDT 是数字服务费，不是投资产品。积分和奖励按服务活动结果管理。",
    trustCards: [
      { title: "钱包基础", body: "在服务中心查看 USDT、BNB 和钱包状态。" },
      { title: "活动基础", body: "推荐、内容使用、奖励兑换分别成为记录。" },
    ],
    finalTitle: "现在开始并查看你的服务流程。",
    finalBody: "在一个地方查看激活状态、推荐码、积分、钱包和内容流。",
    footerTagline: "新的社交范式 — 参与创造 Context。",
  },
  vn: {
    oldTag: "SNS truyền thống",
    oldTitle: "Người dùng tạo giá trị, nhưng nền tảng giữ bối cảnh.",
    oldItems: ["Xem nội dung hiếm khi thành hồ sơ của bạn", "Quan hệ giới thiệu biến mất", "Điểm và ví bị tách rời"],
    newTag: "1066FRIEND+",
    newTitle: "Tham gia trở thành điểm, tăng trưởng và bối cảnh dịch vụ.",
    newItems: ["Mã giới thiệu thành bối cảnh mạng", "Nội dung kết nối với điểm", "Ví và thưởng trong một luồng"],
    universeEyebrow: "GLOBAL RANDOM LINK",
    universeTitle: "Người dùng toàn cầu kết nối qua một mạng tham gia.",
    universeBody: "1066FRIEND+ kết nối đăng ký, giới thiệu, nội dung và điểm trong một luồng dịch vụ.",
    universeChips: ["Mã giới thiệu", "Feed toàn cầu", "Điểm", "Ví", "Nội dung"],
    earnTitle: "Mỗi hành động để lại luồng điểm.",
    earnCards: [
      { title: "Xem nội dung", body: "Dùng feed công khai và để lại bối cảnh hoạt động.", badge: "Hoạt động" },
      { title: "Tăng giới thiệu", body: "Xem thành viên và mạng 6 cấp từ mã của bạn.", badge: "Tăng trưởng" },
      { title: "Đổi thưởng", body: "Dùng điểm đổi thưởng và lưu bối cảnh sử dụng.", badge: "Sử dụng" },
    ],
    pointsTitle: "Điểm được tạo từ hành động người dùng.",
    pointsBody: "Truy cập nội dung, tăng trưởng giới thiệu và đổi thưởng tích lũy thành bối cảnh dịch vụ cá nhân.",
    pointsOptions: [
      { title: "Mở nội dung", body: "Dùng điểm để mở nội dung toàn cầu." },
      { title: "Đổi thưởng", body: "Mở rộng thành phần thưởng lặp lại như thẻ Silver." },
      { title: "Tăng mạng", body: "Tích lũy hồ sơ quanh mã giới thiệu." },
    ],
    trustTitle: "Phí dịch vụ và luồng thưởng được tách rõ.",
    trustBody: "10 USDT là phí dịch vụ kỹ thuật số, không phải sản phẩm đầu tư. Điểm và thưởng là kết quả hoạt động.",
    trustCards: [
      { title: "Dựa trên ví", body: "Kiểm tra USDT, BNB và trạng thái ví trong hub." },
      { title: "Dựa trên hoạt động", body: "Giới thiệu, nội dung và thưởng đều thành hồ sơ." },
    ],
    finalTitle: "Bắt đầu và xem luồng dịch vụ của bạn.",
    finalBody: "Kiểm tra trạng thái, mã giới thiệu, điểm, ví và nội dung ở một nơi.",
    footerTagline: "Mô hình xã hội mới — tham gia tạo Context.",
  },
  id: {
    oldTag: "SNS biasa",
    oldTitle: "Pengguna membuat nilai, platform menyimpan konteks.",
    oldItems: ["Menonton jarang menjadi catatan Anda", "Relasi referral hilang", "Poin dan wallet terpisah"],
    newTag: "1066FRIEND+",
    newTitle: "Partisipasi menjadi poin, pertumbuhan, dan konteks layanan.",
    newItems: ["Kode referral menjadi konteks jaringan", "Konten terhubung ke poin", "Wallet dan reward dalam satu alur"],
    universeEyebrow: "GLOBAL RANDOM LINK",
    universeTitle: "Pengguna global terhubung lewat satu jaringan partisipasi.",
    universeBody: "1066FRIEND+ menghubungkan pendaftaran, referral, konten, dan poin dalam satu alur layanan.",
    universeChips: ["Kode referral", "Feed global", "Poin", "Wallet", "Konten"],
    earnTitle: "Setiap aksi meninggalkan alur poin.",
    earnCards: [
      { title: "Lihat konten", body: "Gunakan feed publik dan tinggalkan konteks aktivitas.", badge: "Aktivitas" },
      { title: "Referral tumbuh", body: "Lihat member dan jaringan 6 level dari kode Anda.", badge: "Growth" },
      { title: "Tukar reward", body: "Pakai poin untuk reward dan simpan konteks penggunaan.", badge: "Utility" },
    ],
    pointsTitle: "Poin dibuat dari aksi pengguna.",
    pointsBody: "Akses konten, referral, dan penukaran reward menjadi konteks layanan pribadi.",
    pointsOptions: [
      { title: "Akses konten", body: "Buka konten global dengan poin." },
      { title: "Tukar reward", body: "Berkembang menjadi reward berulang seperti Silver card." },
      { title: "Jaringan tumbuh", body: "Catatan partisipasi terkumpul di sekitar kode Anda." },
    ],
    trustTitle: "Biaya layanan dan reward ditampilkan terpisah.",
    trustBody: "10 USDT adalah biaya layanan digital, bukan produk investasi. Poin dan reward dikelola sebagai hasil aktivitas.",
    trustCards: [
      { title: "Berbasis wallet", body: "Cek USDT, BNB, dan status wallet di hub layanan." },
      { title: "Berbasis aktivitas", body: "Referral, konten, dan reward masing-masing menjadi catatan." },
    ],
    finalTitle: "Mulai dan lihat alur layanan Anda.",
    finalBody: "Cek status, kode referral, poin, wallet, dan konten di satu tempat.",
    footerTagline: "Paradigma sosial baru — partisipasi membuat Context.",
  },
  km: {
    oldTag: "SNS ធម្មតា",
    oldTitle: "អ្នកប្រើបង្កើតតម្លៃ ប៉ុន្តែវេទិការក្សាទុកបរិបទ។",
    oldItems: ["ការមើលមាតិកាមិនក្លាយជាកំណត់ត្រារបស់អ្នក", "ទំនាក់ទំនងណែនាំងាយបាត់", "ពិន្ទុ និងកាបូបបែកគ្នា"],
    newTag: "1066FRIEND+",
    newTitle: "ការចូលរួមក្លាយជាពិន្ទុ កំណើន និងបរិបទសេវា។",
    newItems: ["កូដណែនាំក្លាយជាបរិបទបណ្ដាញ", "មាតិកាភ្ជាប់ទៅពិន្ទុ", "កាបូប និងរង្វាន់នៅក្នុងលំហូរតែមួយ"],
    universeEyebrow: "GLOBAL RANDOM LINK",
    universeTitle: "អ្នកប្រើពិភពលោកភ្ជាប់តាមបណ្ដាញចូលរួមតែមួយ។",
    universeBody: "1066FRIEND+ ភ្ជាប់ការចុះឈ្មោះ ការណែនាំ មាតិកា និងពិន្ទុក្នុងលំហូរសេវាតែមួយ។",
    universeChips: ["កូដណែនាំ", "Feed ពិភពលោក", "ពិន្ទុ", "កាបូប", "មាតិកា"],
    earnTitle: "សកម្មភាពនីមួយៗទុកលំហូរពិន្ទុ។",
    earnCards: [
      { title: "មើលមាតិកា", body: "ប្រើ feed សាធារណៈ និងទុកបរិបទសកម្មភាព។", badge: "សកម្មភាព" },
      { title: "កំណើនណែនាំ", body: "ពិនិត្យសមាជិក និងបណ្ដាញ 6 កម្រិតពីកូដរបស់អ្នក។", badge: "កំណើន" },
      { title: "ប្តូររង្វាន់", body: "ប្រើពិន្ទុសម្រាប់រង្វាន់ និងរក្សាបរិបទប្រើប្រាស់។", badge: "ប្រើប្រាស់" },
    ],
    pointsTitle: "ពិន្ទុបង្កើតពីសកម្មភាពអ្នកប្រើ។",
    pointsBody: "ការបើកមាតិកា កំណើនណែនាំ និងការប្តូររង្វាន់ត្រូវបានសន្សំជាបរិបទសេវាផ្ទាល់ខ្លួន។",
    pointsOptions: [
      { title: "បើកមាតិកា", body: "ប្រើពិន្ទុដើម្បីបើកមាតិកាពិភពលោក។" },
      { title: "ប្តូររង្វាន់", body: "ពង្រីកទៅរង្វាន់ដែលអាចធ្វើម្តងហើយម្តងទៀត។" },
      { title: "កំណើនបណ្ដាញ", body: "កំណត់ត្រាចូលរួមសន្សំជុំវិញកូដរបស់អ្នក។" },
    ],
    trustTitle: "ថ្លៃសេវា និងលំហូររង្វាន់បង្ហាញដាច់ដោយឡែក។",
    trustBody: "10 USDT គឺជាថ្លៃសេវាឌីជីថល មិនមែនផលិតផលវិនិយោគ។ ពិន្ទុ និងរង្វាន់គ្រប់គ្រងតាមសកម្មភាព។",
    trustCards: [
      { title: "ផ្អែកលើកាបូប", body: "ពិនិត្យ USDT, BNB និងស្ថានភាពកាបូបនៅក្នុង hub។" },
      { title: "ផ្អែកលើសកម្មភាព", body: "ការណែនាំ មាតិកា និងរង្វាន់ក្លាយជាកំណត់ត្រា។" },
    ],
    finalTitle: "ចាប់ផ្តើម និងពិនិត្យលំហូរសេវារបស់អ្នក។",
    finalBody: "ពិនិត្យស្ថានភាព កូដណែនាំ ពិន្ទុ កាបូប និងមាតិកានៅកន្លែងតែមួយ។",
    footerTagline: "គំរូសង្គមថ្មី — ការចូលរួមបង្កើត Context។",
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
  const storyCopy = landingStoryCopy[landingLanguage];
  const footerCopy = landingFooterCopy[landingLanguage];
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
    <main className="relative min-h-dvh overflow-x-hidden bg-[#FDFAFE] text-[#1A0A2E]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(139,92,246,0.12),transparent_58%),radial-gradient(circle_at_82%_78%,rgba(232,24,90,0.10),transparent_34%),linear-gradient(180deg,#fff_0%,#fff7fb_52%,#fff_100%)]" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#8b5cf6]/10 bg-white/82 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link className="leading-none text-[#15183b]" href={languageHref(landingLanguage)}>
            <span className="block text-3xl font-black tracking-[-0.08em]">
              1066<span className="text-[#e8185a]">+</span>
            </span>
            <span className="block -mt-1 text-lg font-black tracking-[-0.055em]">
              friend<span className="text-[#e8185a]">+</span>
            </span>
          </Link>
          <nav
            className="flex max-w-[66vw] flex-wrap items-center justify-end gap-2 sm:max-w-none"
            aria-label="Language"
          >
          {supportedLandingLanguages.map((language) => (
            <Link
              className={`inline-flex min-h-9 items-center justify-center rounded-full border px-3 text-[0.68rem] font-black tracking-[0.12em] transition sm:px-4 ${
                language === landingLanguage
                  ? "border-transparent bg-[linear-gradient(135deg,#1E0B5E,#8B1A6B,#E8185A)] text-white shadow-[0_10px_28px_rgba(194,24,91,0.22)]"
                  : "border-[#f8bbd9] bg-white/70 text-[#9b6080] hover:border-[#e8185a] hover:bg-[#fde8f2]"
              }`}
              href={languageHref(language)}
              key={language}
              style={{ color: language === landingLanguage ? "#ffffff" : "#9b6080" }}
            >
              {languageLabels[language]}
            </Link>
          ))}
          </nav>
        </div>
      </header>

      <section className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-5 pb-16 pt-32 text-center sm:px-8">
        <div className="pointer-events-none absolute -right-28 top-8 size-[360px] rounded-full bg-[radial-gradient(circle,#e8185a,transparent_68%)] opacity-25 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-4 size-[300px] rounded-full bg-[radial-gradient(circle,#8b1a6b,transparent_68%)] opacity-20 blur-3xl" />
        {[
          ["left-[8%] top-[26%]", "size-1", "opacity-50"],
          ["right-[10%] top-[30%]", "size-1.5", "opacity-40"],
          ["left-[18%] bottom-[18%]", "size-1.5", "opacity-35"],
          ["right-[22%] bottom-[14%]", "size-1", "opacity-45"],
          ["left-[48%] top-[16%]", "size-1", "opacity-30"],
          ["right-[42%] bottom-[28%]", "size-1.5", "opacity-35"],
        ].map(([position, size, opacity], index) => (
          <span
            aria-hidden="true"
            className={`absolute rounded-full bg-[#c2185b] ${position} ${size} ${opacity} animate-pulse`}
            key={index}
          />
        ))}

        <div className="relative z-10 mx-auto max-w-4xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#f8bbd9] bg-[#fde8f2]/70 px-5 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#c2185b] shadow-[0_18px_60px_rgba(232,24,90,0.09)]">
            <span className="size-2 rounded-full bg-[linear-gradient(135deg,#1E0B5E,#E8185A)] shadow-[0_0_12px_rgba(232,24,90,0.45)]" />
            {copy.eyebrow}
          </p>
          <h1 className="mx-auto mt-8 max-w-3xl break-keep text-5xl font-black leading-[1.02] tracking-[-0.075em] text-[#1A0A2E] [word-break:keep-all] sm:text-7xl lg:text-8xl">
            {copy.headline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl break-keep text-lg font-semibold leading-8 text-[#5A2A4A] [word-break:keep-all] sm:text-xl">
            {copy.subhead}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#1E0B5E,#8B1A6B,#E8185A)] px-8 text-base font-black !text-white shadow-[0_14px_40px_rgba(194,24,91,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_54px_rgba(194,24,91,0.34)] sm:w-auto"
              href={activationHref}
              style={{ color: "#ffffff" }}
            >
              {copy.primaryCta}
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <a
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full border-2 border-[#f8bbd9] bg-white/70 px-8 text-base font-black text-[#8b1a6b] transition hover:border-[#e8185a] hover:bg-white sm:w-auto"
              href="#service"
              style={{ color: "#8b1a6b" }}
            >
              {copy.secondaryCta}
            </a>
          </div>
          <p className="mt-8 inline-flex rounded-full border border-[#ead9f2] bg-white/70 px-5 py-2 text-sm font-bold text-[#9b6080] shadow-[0_14px_36px_rgba(91,42,74,0.06)]">
            {copy.feeNote}
          </p>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c2185b]">
              1066FRIEND+
            </p>
            <h2 className="mt-4 break-keep text-3xl font-black leading-tight tracking-[-0.055em] text-[#1A0A2E] [word-break:keep-all] sm:text-5xl">
              {storyCopy.oldTag} vs {storyCopy.newTag}
            </h2>
            <p className="mt-4 break-keep text-base font-semibold leading-7 text-[#5A2A4A] [word-break:keep-all]">
              {serviceCopy.description}
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {[
              {
                tag: storyCopy.oldTag,
                title: storyCopy.oldTitle,
                items: storyCopy.oldItems,
                tone: "border-[#ffe4e4] bg-[#fff8f8] text-[#c53030]",
              },
              {
                tag: storyCopy.newTag,
                title: storyCopy.newTitle,
                items: storyCopy.newItems,
                tone: "border-[#f8bbd9] bg-[#fde8f2] text-[#8b1a6b] shadow-[0_0_80px_rgba(232,24,90,0.13)]",
              },
            ].map((card) => (
              <article
                className={`rounded-[28px] border-2 p-6 sm:p-10 ${card.tone}`}
                key={card.tag}
              >
                <span className="inline-flex rounded-full bg-white/76 px-4 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.18em]">
                  {card.tag}
                </span>
                <h3 className="mt-6 break-keep text-2xl font-black leading-tight tracking-[-0.04em] text-[#1A0A2E] [word-break:keep-all] sm:text-3xl">
                  {card.title}
                </h3>
                <ul className="mt-7 grid gap-3">
                  {card.items.map((item) => (
                    <li
                      className="flex items-start gap-3 rounded-2xl bg-white/72 p-4 text-sm font-bold leading-6 text-[#5A2A4A]"
                      key={item}
                    >
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#c2185b]" />
                      <span className="break-keep [word-break:keep-all]">{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28"
        id="service"
      >
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c2185b]">
              {serviceCopy.eyebrow}
            </p>
            <h2 className="mt-4 break-keep text-4xl font-black leading-[1.05] tracking-[-0.06em] text-[#1A0A2E] [word-break:keep-all] sm:text-6xl">
              {serviceCopy.title}
            </h2>
            <p className="mt-5 break-keep text-base font-semibold leading-8 text-[#5A2A4A] [word-break:keep-all]">
              {serviceCopy.description}
            </p>

            <div className="mt-8 rounded-[28px] bg-[#160b2d] p-5 text-white shadow-[0_28px_70px_rgba(30,11,94,0.20)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/54">
                  {serviceCopy.loopTitle}
                </p>
                <span className="rounded-full bg-emerald-300/14 px-3 py-1 text-xs font-black text-emerald-100">
                  {serviceCopy.statusLabel}
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {copy.steps.map((step, index) => (
                  <div
                    className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/[0.07] p-4"
                    key={step.title}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-[#160b2d]">
                      {index + 1}
                    </span>
                    <span>
                      <span className="block font-black">{step.title}</span>
                      <span className="mt-1 block break-keep text-sm leading-6 text-white/64 [word-break:keep-all]">
                        {step.body}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {serviceCopy.cards.map((card, index) => {
              const Icon = serviceIconComponents[index % serviceIconComponents.length];

              return (
                <article
                  className="rounded-[28px] border-2 border-[#f8bbd9] bg-white p-5 shadow-[0_18px_52px_rgba(139,26,107,0.08)] transition hover:-translate-y-1 hover:border-[#e8185a] hover:shadow-[0_24px_72px_rgba(194,24,91,0.14)]"
                  key={card.title}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-[#fde8f2] text-[#c2185b] ring-1 ring-[#f8bbd9]">
                      <Icon className="size-6" />
                    </span>
                    <span className="rounded-full border border-[#f8bbd9] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#8b1a6b]">
                      {card.label}
                    </span>
                  </div>
                  <h3 className="mt-5 break-keep text-xl font-black tracking-[-0.04em] text-[#1A0A2E] [word-break:keep-all]">
                    {card.title}
                  </h3>
                  <p className="mt-2 break-keep text-sm font-semibold leading-6 text-[#5A2A4A] [word-break:keep-all]">
                    {card.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[linear-gradient(150deg,#0D0520_0%,#1E0B5E_34%,#8B1A6B_72%,#C2185B_100%)] px-5 py-20 text-white sm:px-8 lg:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1.5px),radial-gradient(circle_at_75%_40%,white_1px,transparent_1.5px)] [background-size:90px_90px,130px_130px]" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#f8bbd9]">
              {storyCopy.universeEyebrow}
            </p>
            <h2 className="mt-4 break-keep text-4xl font-black leading-[1.08] tracking-[-0.06em] [word-break:keep-all] sm:text-6xl">
              {storyCopy.universeTitle}
            </h2>
            <p className="mt-5 break-keep text-lg font-semibold leading-8 text-white/76 [word-break:keep-all]">
              {storyCopy.universeBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {storyCopy.universeChips.map((chip) => (
                <span
                  className="rounded-full border border-white/22 bg-white/12 px-4 py-2 text-sm font-black text-white backdrop-blur"
                  key={chip}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[34px] border border-white/18 bg-white/10 p-3 shadow-[0_34px_90px_rgba(0,0,0,0.28)] backdrop-blur">
            <Image
              alt="1066FRIEND+ global network map"
              className="aspect-[3/4] w-full rounded-[26px] object-cover object-center"
              height={960}
              src="/landing/global-network-map.png?v=20260415"
              width={720}
            />
            <div className="absolute inset-x-6 bottom-6 rounded-[24px] border border-white/18 bg-[#0D0520]/72 p-4 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f8bbd9]">
                {serviceCopy.loopTitle}
              </p>
              <p className="mt-1 text-lg font-black">
                {storyCopy.universeChips.join(" · ")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c2185b]">
              POINTS FLOW
            </p>
            <h2 className="mt-4 break-keep text-4xl font-black leading-tight tracking-[-0.055em] text-[#1A0A2E] [word-break:keep-all] sm:text-6xl">
              {storyCopy.earnTitle}
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {storyCopy.earnCards.map((card, index) => {
              const icons = [Clapperboard, UserRoundPlus, Gift] as const;
              const Icon = icons[index % icons.length];

              return (
                <article
                  className="rounded-[28px] border-2 border-[#f8bbd9] bg-[#fde8f2] p-6 text-center transition hover:-translate-y-1 hover:border-[#c2185b] hover:bg-white hover:shadow-[0_22px_60px_rgba(194,24,91,0.12)] sm:p-8"
                  key={card.title}
                >
                  <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1E0B5E,#8B1A6B,#E8185A)] text-white shadow-[0_12px_28px_rgba(194,24,91,0.24)]">
                    <Icon className="size-7" />
                  </span>
                  <h3 className="mt-5 break-keep text-2xl font-black tracking-[-0.04em] text-[#1A0A2E] [word-break:keep-all]">
                    {card.title}
                  </h3>
                  <p className="mt-3 break-keep text-sm font-semibold leading-6 text-[#5A2A4A] [word-break:keep-all]">
                    {card.body}
                  </p>
                  <span className="mt-5 inline-flex rounded-full bg-[linear-gradient(135deg,#1E0B5E,#8B1A6B,#E8185A)] px-4 py-1.5 text-[0.7rem] font-black uppercase tracking-[0.12em] text-white">
                    {card.badge}
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#FDF5F8] px-5 py-20 text-center sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="mx-auto max-w-3xl break-keep text-4xl font-black leading-tight tracking-[-0.06em] text-[#1A0A2E] [word-break:keep-all] sm:text-6xl">
            {storyCopy.pointsTitle}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl break-keep text-lg font-semibold leading-8 text-[#5A2A4A] [word-break:keep-all]">
            {storyCopy.pointsBody}
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {storyCopy.pointsOptions.map((option, index) => (
              <article
                className="rounded-[28px] border-2 border-[#f8bbd9] bg-white p-6 shadow-[0_18px_48px_rgba(139,26,107,0.08)]"
                key={option.title}
              >
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#fde8f2] text-lg font-black text-[#c2185b] ring-1 ring-[#f8bbd9]">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-xl font-black tracking-[-0.035em] text-[#1A0A2E]">
                  {option.title}
                </h3>
                <p className="mt-2 break-keep text-sm font-semibold leading-6 text-[#5A2A4A] [word-break:keep-all]">
                  {option.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.86fr_1.14fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c2185b]">
              TRUST
            </p>
            <h2 className="mt-4 break-keep text-4xl font-black leading-tight tracking-[-0.055em] text-[#1A0A2E] [word-break:keep-all] sm:text-6xl">
              {storyCopy.trustTitle}
            </h2>
            <p className="mt-5 break-keep text-base font-semibold leading-8 text-[#5A2A4A] [word-break:keep-all]">
              {storyCopy.trustBody}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {storyCopy.trustCards.map((card, index) => {
              const Icon = index === 0 ? WalletCards : ShieldCheck;

              return (
                <article
                  className="rounded-[28px] border-2 border-[#f8bbd9] bg-[#fde8f2] p-6 transition hover:border-[#e8185a] hover:bg-white hover:shadow-[0_22px_60px_rgba(194,24,91,0.10)]"
                  key={card.title}
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-[#c2185b] ring-1 ring-[#f8bbd9]">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-5 break-keep text-2xl font-black tracking-[-0.04em] text-[#1A0A2E] [word-break:keep-all]">
                    {card.title}
                  </h3>
                  <p className="mt-3 break-keep text-sm font-semibold leading-6 text-[#5A2A4A] [word-break:keep-all]">
                    {card.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0D0520,#1E0B5E,#8B1A6B,#C2185B)] px-5 py-20 text-center text-white sm:px-8 lg:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_18%_30%,white_1px,transparent_1.5px),radial-gradient(circle_at_70%_60%,white_1px,transparent_1.5px)] [background-size:100px_100px,150px_150px]" />
        <div className="relative z-10 mx-auto max-w-3xl">
          <h2 className="break-keep text-4xl font-black leading-tight tracking-[-0.055em] [word-break:keep-all] sm:text-6xl">
            {storyCopy.finalTitle}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl break-keep text-lg font-semibold leading-8 text-white/74 [word-break:keep-all]">
            {storyCopy.finalBody}
          </p>
          <Link
            className="mt-9 inline-flex min-h-14 items-center justify-center rounded-full bg-white px-8 text-base font-black text-[#1E0B5E] shadow-[0_16px_42px_rgba(0,0,0,0.26)] transition hover:-translate-y-0.5"
            href={activationHref}
            style={{ color: "#1E0B5E" }}
          >
            {copy.primaryCta}
            <ArrowRight className="ml-2 size-4" />
          </Link>
          <p className="mt-6 break-keep text-xs font-semibold leading-6 text-white/50 [word-break:keep-all]">
            {serviceCopy.notice}
          </p>
        </div>
      </section>

      <footer className="bg-[#0D0520] px-5 py-10 text-white sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_auto] md:items-start">
          <div className="min-w-0">
            <Link className="inline-flex text-2xl font-black tracking-[-0.06em]" href={languageHref(landingLanguage)}>
              1066<span className="text-[#e8185a]">friend+</span>
            </Link>
            <p className="mt-2 break-keep text-sm font-semibold text-white/48 [word-break:keep-all]">
              {storyCopy.footerTagline}
            </p>
            <p className="mt-4 max-w-4xl break-keep text-xs font-medium leading-6 text-white/38 [word-break:keep-all]">
              {footerCopy.notice}
            </p>
          </div>

          <nav
            aria-label="1066FRIEND+ legal links"
            className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-bold text-white/58"
          >
            <Link className="transition hover:text-white" href={`/${activationLocale}/disclaimer`}>
              {footerCopy.terms}
            </Link>
            <Link className="transition hover:text-white" href={`/${activationLocale}/disclaimer`}>
              {footerCopy.disclaimer}
            </Link>
            <a
              className="transition hover:text-white"
              href="https://bscscan.com"
              rel="noreferrer"
              target="_blank"
            >
              {footerCopy.bscscan}
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
