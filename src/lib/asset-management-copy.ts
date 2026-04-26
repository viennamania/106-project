import type { Locale } from "@/lib/i18n";

type AssetManagementCopy = {
  actions: {
    manageBnb: string;
    manageUsdt: string;
    openExplorer: string;
    refresh: string;
  };
  bnb: {
    description: string;
    label: string;
    metric: string;
  };
  description: string;
  disconnected: string;
  emptyHistory: string;
  eyebrow: string;
  labels: {
    account: string;
    assets: string;
    estimatedValue: string;
    lastUpdated: string;
    network: string;
    recentActivity: string;
    spotPrice: string;
    totalOverview: string;
    walletAddress: string;
  };
  loading: string;
  metaDescription: string;
  security: {
    description: string;
    title: string;
  };
  title: string;
  unavailable: string;
  usdt: {
    description: string;
    label: string;
    metric: string;
  };
};

const copyByLocale: Record<Locale, AssetManagementCopy> = {
  ko: {
    actions: {
      manageBnb: "BNB 관리",
      manageUsdt: "테더 관리",
      openExplorer: "BscScan 보기",
      refresh: "자산 새로고침",
    },
    bnb: {
      description: "가스비와 시세 평가에 필요한 BNB 잔고입니다.",
      label: "BNB",
      metric: "원화 평가",
    },
    description:
      "내 스마트 월렛의 USDT와 BNB 상태를 한 화면에서 확인하고 필요한 관리 화면으로 바로 이동합니다.",
    disconnected: "이메일 로그인 후 나의 자산 현황을 확인할 수 있습니다.",
    emptyHistory: "아직 표시할 USDT 입출금 내역이 없습니다.",
    eyebrow: "asset management",
    labels: {
      account: "계정 상태",
      assets: "보유 자산",
      estimatedValue: "추정 보유 자산",
      lastUpdated: "최근 갱신",
      network: "네트워크",
      recentActivity: "최근 USDT 내역",
      spotPrice: "BNB/KRW 시세",
      totalOverview: "USDT + BNB 평가",
      walletAddress: "내 지갑 주소",
    },
    loading: "자산 데이터를 불러오는 중입니다.",
    metaDescription:
      "스마트 월렛의 USDT, BNB 잔고와 관리 화면을 한 곳에서 확인합니다.",
    security: {
      description:
        "현재 화면은 BSC 네트워크 기준으로 표시됩니다. 전송이나 출금은 각 관리 화면에서 주소와 금액을 다시 확인한 뒤 진행하세요.",
      title: "BSC 기준 자산 관리",
    },
    title: "자산 관리",
    unavailable: "확인 필요",
    usdt: {
      description: "결제와 정산에 사용하는 BSC USDT 잔고입니다.",
      label: "USDT",
      metric: "사용 가능 잔고",
    },
  },
  en: {
    actions: {
      manageBnb: "Manage BNB",
      manageUsdt: "Manage USDT",
      openExplorer: "Open BscScan",
      refresh: "Refresh assets",
    },
    bnb: {
      description: "BNB balance used for gas and KRW valuation.",
      label: "BNB",
      metric: "KRW value",
    },
    description:
      "Review the USDT and BNB status of your smart wallet and jump into the right management screen.",
    disconnected: "Sign in with email to review your asset dashboard.",
    emptyHistory: "There are no USDT transfers to show yet.",
    eyebrow: "asset management",
    labels: {
      account: "Account status",
      assets: "Assets",
      estimatedValue: "Estimated holdings",
      lastUpdated: "Last updated",
      network: "Network",
      recentActivity: "Recent USDT activity",
      spotPrice: "BNB/KRW price",
      totalOverview: "USDT + BNB valuation",
      walletAddress: "Wallet address",
    },
    loading: "Loading asset data.",
    metaDescription:
      "Review your smart wallet USDT and BNB balances from one asset hub.",
    security: {
      description:
        "This page is based on the BSC network. Confirm addresses and amounts again on the management screen before sending or withdrawing.",
      title: "BSC asset controls",
    },
    title: "Asset Management",
    unavailable: "Needs check",
    usdt: {
      description: "BSC USDT balance used for payments and settlement.",
      label: "USDT",
      metric: "Available balance",
    },
  },
  ja: {
    actions: {
      manageBnb: "BNB 管理",
      manageUsdt: "USDT 管理",
      openExplorer: "BscScan を開く",
      refresh: "資産を更新",
    },
    bnb: {
      description: "ガス代と評価額の確認に使う BNB 残高です。",
      label: "BNB",
      metric: "KRW 評価",
    },
    description:
      "スマートウォレットの USDT と BNB の状態を一画面で確認し、必要な管理画面へ移動できます。",
    disconnected: "メールログイン後に資産ダッシュボードを確認できます。",
    emptyHistory: "表示できる USDT 入出金履歴はまだありません。",
    eyebrow: "asset management",
    labels: {
      account: "アカウント状態",
      assets: "保有資産",
      estimatedValue: "推定保有資産",
      lastUpdated: "最終更新",
      network: "ネットワーク",
      recentActivity: "最近の USDT 履歴",
      spotPrice: "BNB/KRW 価格",
      totalOverview: "USDT + BNB 評価",
      walletAddress: "ウォレットアドレス",
    },
    loading: "資産データを読み込んでいます。",
    metaDescription:
      "スマートウォレットの USDT と BNB 残高を一つの資産ハブで確認します。",
    security: {
      description:
        "この画面は BSC ネットワーク基準です。送金や出金は各管理画面でアドレスと金額を再確認してから進めてください。",
      title: "BSC 基準の資産管理",
    },
    title: "資産管理",
    unavailable: "確認が必要",
    usdt: {
      description: "決済と精算に使う BSC USDT 残高です。",
      label: "USDT",
      metric: "利用可能残高",
    },
  },
  zh: {
    actions: {
      manageBnb: "管理 BNB",
      manageUsdt: "管理 USDT",
      openExplorer: "打开 BscScan",
      refresh: "刷新资产",
    },
    bnb: {
      description: "用于 Gas 和估值查看的 BNB 余额。",
      label: "BNB",
      metric: "KRW 估值",
    },
    description:
      "在一个页面查看智能钱包的 USDT 与 BNB 状态，并进入对应管理页面。",
    disconnected: "请先通过邮箱登录后查看资产面板。",
    emptyHistory: "暂无可显示的 USDT 转账记录。",
    eyebrow: "asset management",
    labels: {
      account: "账户状态",
      assets: "持有资产",
      estimatedValue: "预估持有资产",
      lastUpdated: "最近更新",
      network: "网络",
      recentActivity: "最近 USDT 记录",
      spotPrice: "BNB/KRW 价格",
      totalOverview: "USDT + BNB 估值",
      walletAddress: "钱包地址",
    },
    loading: "正在加载资产数据。",
    metaDescription:
      "在一个资产中心查看智能钱包的 USDT 与 BNB 余额。",
    security: {
      description:
        "此页面以 BSC 网络为准。转账或提现前，请在对应管理页面再次确认地址和金额。",
      title: "BSC 资产管理",
    },
    title: "资产管理",
    unavailable: "需要确认",
    usdt: {
      description: "用于支付和结算的 BSC USDT 余额。",
      label: "USDT",
      metric: "可用余额",
    },
  },
  vi: {
    actions: {
      manageBnb: "Quản lý BNB",
      manageUsdt: "Quản lý USDT",
      openExplorer: "Mở BscScan",
      refresh: "Làm mới tài sản",
    },
    bnb: {
      description: "Số dư BNB dùng cho phí gas và định giá KRW.",
      label: "BNB",
      metric: "Giá trị KRW",
    },
    description:
      "Xem trạng thái USDT và BNB của smart wallet rồi chuyển nhanh tới màn hình quản lý phù hợp.",
    disconnected: "Đăng nhập email để xem bảng tài sản của bạn.",
    emptyHistory: "Chưa có giao dịch USDT nào để hiển thị.",
    eyebrow: "asset management",
    labels: {
      account: "Trạng thái tài khoản",
      assets: "Tài sản",
      estimatedValue: "Tài sản ước tính",
      lastUpdated: "Cập nhật gần nhất",
      network: "Mạng",
      recentActivity: "Hoạt động USDT gần đây",
      spotPrice: "Giá BNB/KRW",
      totalOverview: "USDT + định giá BNB",
      walletAddress: "Địa chỉ wallet",
    },
    loading: "Đang tải dữ liệu tài sản.",
    metaDescription:
      "Xem số dư USDT và BNB của smart wallet trong một trung tâm tài sản.",
    security: {
      description:
        "Trang này dùng dữ liệu trên mạng BSC. Hãy kiểm tra lại địa chỉ và số tiền trên màn hình quản lý trước khi gửi hoặc rút.",
      title: "Quản lý tài sản BSC",
    },
    title: "Quản lý tài sản",
    unavailable: "Cần kiểm tra",
    usdt: {
      description: "Số dư BSC USDT dùng cho thanh toán và quyết toán.",
      label: "USDT",
      metric: "Số dư khả dụng",
    },
  },
  id: {
    actions: {
      manageBnb: "Kelola BNB",
      manageUsdt: "Kelola USDT",
      openExplorer: "Buka BscScan",
      refresh: "Segarkan aset",
    },
    bnb: {
      description: "Saldo BNB untuk gas dan valuasi KRW.",
      label: "BNB",
      metric: "Nilai KRW",
    },
    description:
      "Lihat status USDT dan BNB smart wallet lalu buka layar pengelolaan yang tepat.",
    disconnected: "Masuk dengan email untuk melihat dashboard aset Anda.",
    emptyHistory: "Belum ada transfer USDT untuk ditampilkan.",
    eyebrow: "asset management",
    labels: {
      account: "Status akun",
      assets: "Aset",
      estimatedValue: "Estimasi aset",
      lastUpdated: "Pembaruan terakhir",
      network: "Jaringan",
      recentActivity: "Aktivitas USDT terbaru",
      spotPrice: "Harga BNB/KRW",
      totalOverview: "USDT + valuasi BNB",
      walletAddress: "Alamat wallet",
    },
    loading: "Memuat data aset.",
    metaDescription:
      "Lihat saldo USDT dan BNB smart wallet dari satu pusat aset.",
    security: {
      description:
        "Halaman ini memakai jaringan BSC. Periksa kembali alamat dan jumlah di layar pengelolaan sebelum mengirim atau menarik aset.",
      title: "Kontrol aset BSC",
    },
    title: "Manajemen aset",
    unavailable: "Perlu diperiksa",
    usdt: {
      description: "Saldo BSC USDT untuk pembayaran dan penyelesaian.",
      label: "USDT",
      metric: "Saldo tersedia",
    },
  },
};

export function getAssetManagementCopy(locale: Locale) {
  return copyByLocale[locale] ?? copyByLocale.en;
}
