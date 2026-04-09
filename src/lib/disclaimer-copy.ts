import type { Locale } from "@/lib/i18n";

type LegalLocale = Locale;

type LegalClause = {
  body: string[];
  bullets?: string[];
  title: string;
};

export type DisclaimerCopy = {
  backHomeLabel: string;
  disclaimerClauses: LegalClause[];
  disclaimerTitle: string;
  eyebrow: string;
  intro: string;
  meta: {
    description: string;
    title: string;
  };
  navLabel: string;
  termsClauses: LegalClause[];
  termsTitle: string;
  title: string;
};

const disclaimerCopy: Record<LegalLocale, DisclaimerCopy> = {
  ko: {
    backHomeLabel: "홈으로 돌아가기",
    disclaimerClauses: [
      {
        title: "1. 금전적 보장 부인",
        body: [
          "1066friend+는 글로벌 네트워킹과 자동 매칭을 지원하기 위한 플랫폼입니다. 특정한 금전적 수익, 수입, 또는 '즉시 현금흐름'을 보장하지 않습니다.",
          "모든 결과는 사용자 개별 참여도, 네트워크의 질, 외부 시장 상황에 따라 달라질 수 있습니다.",
        ],
      },
      {
        title: "2. 금융 투자 상품 아님",
        body: [
          "이 서비스는 네트워킹 도구이며, 금융 투자 상품, 증권 제공, 또는 은행 서비스에 해당하지 않습니다.",
          "시스템 내에서 적립되는 포인트, 보상, 또는 혜택은 명시적으로 안내되지 않는 한 서비스 외부에서 고유한 금전적 가치를 가지지 않습니다.",
        ],
      },
      {
        title: "3. 관할 지역 제한",
        body: [
          "프로젝트 운영, 네트워크 기반 보상 개념, 또는 자동 매칭 서비스가 법적으로 허용되지 않는 지역에서는 이 서비스를 사용할 수 없습니다.",
          "참여가 현지법, 주법, 국가법에 부합하는지 확인할 책임은 전적으로 사용자에게 있습니다.",
        ],
      },
      {
        title: "4. 책임의 제한",
        body: [
          "1066friend+, 개발자, 그리고 관련 당사자는 서비스 사용 또는 사용 불가로 인해 발생하는 직접적, 간접적, 부수적, 결과적 손해에 대해 책임을 지지 않습니다.",
        ],
      },
    ],
    disclaimerTitle: "면책고지",
    eyebrow: "legal notice",
    intro:
      "아래 내용은 전달받은 면책고지 문서를 기준으로 정리한 1066friend+의 법적 고지 및 이용조건 요약입니다.",
    meta: {
      description: "1066friend+ 면책고지와 서비스 이용약관 안내 페이지",
      title: "1066friend+ | 면책고지",
    },
    navLabel: "면책고지",
    termsClauses: [
      {
        title: "제1조 (목적)",
        body: [
          "본 약관은 1066friend+ 웹사이트 및 관련 서비스의 이용 조건을 규정합니다. 플랫폼에 접근하거나 사용하는 경우, 본 약관을 읽고 이해했으며 이에 동의한 것으로 간주합니다.",
        ],
      },
      {
        title: "제2조 (이용자 자격 및 행위)",
        body: [],
        bullets: [
          "연령 요건: 이용자는 만 18세 이상 또는 해당 관할지역의 성년 연령 이상이어야 합니다.",
          "정보의 정확성: 자동 매칭 시스템을 사용할 때 사실에 부합하는 정확한 정보를 제공해야 합니다.",
          "금지 행위: 시스템 조작, 다중 허위 계정 생성, 서비스의 본래 사용 목적을 우회하는 행위는 사전 통지 없이 즉시 계정 종료 사유가 됩니다.",
        ],
      },
      {
        title: "제3조 (서비스 변경)",
        body: [
          "1066friend+는 플랫폼의 지속 가능성을 위해 보상 구조 및 기능을 포함한 서비스의 일부를 언제든 수정, 업데이트, 중단, 종료할 권리를 가집니다.",
        ],
      },
      {
        title: "제4조 (법적 책임)",
        body: [
          "법으로 금지된 지역에서는 본 프로젝트 사용을 삼가야 합니다. 그럼에도 사용을 선택하는 경우 발생하는 모든 법적 결과와 제재는 사용자 본인의 책임입니다.",
        ],
      },
      {
        title: "제5조 (데이터 및 개인정보)",
        body: [
          "1066friend+를 이용함으로써 사용자는 개인정보 처리방침에 명시된 범위 내에서 자동 매칭 시스템 운영에 필요한 데이터 수집 및 이용에 동의하게 됩니다.",
        ],
      },
      {
        title: "제6조 (준거법)",
        body: [
          "본 약관은 [국가/지역 기입 필요, 예: Singapore]의 법률에 따라 해석되고 적용됩니다. 서비스 이용과 관련해 발생하는 분쟁은 해당 지역 법원의 전속 관할에 따릅니다.",
        ],
      },
    ],
    termsTitle: "서비스 이용약관",
    title: "1066friend+ 면책고지 및 이용약관",
  },
  en: {
    backHomeLabel: "Back home",
    disclaimerClauses: [
      {
        title: "1. No Financial Guarantee",
        body: [
          '1066friend+ is a platform designed to facilitate global networking and automated matching. We do not guarantee any specific financial returns, earnings, or "instant cash flow."',
          "All results depend on individual user engagement, the quality of your network, and external market conditions.",
        ],
      },
      {
        title: "2. Not a Financial Investment",
        body: [
          "This service is a networking tool and does not constitute a financial investment product, securities offering, or banking service.",
          "Any points, rewards, or benefits earned within the system are subject to internal platform policies and hold no inherent monetary value outside the service unless explicitly stated.",
        ],
      },
      {
        title: "3. Jurisdictional Restrictions",
        body: [
          "Use of this project is prohibited in jurisdictions where its operation, network-based rewards, or automated matching services are not permitted by law.",
          "It is the user's sole responsibility to ensure that participation complies with all applicable local, state, and national laws.",
        ],
      },
      {
        title: "4. Limitation of Liability",
        body: [
          "1066friend+, its developers, and affiliates shall not be held liable for any direct, indirect, incidental, or consequential damages arising from the use of, or inability to use, the service.",
        ],
      },
    ],
    disclaimerTitle: "Disclaimer",
    eyebrow: "legal notice",
    intro:
      "This page presents the disclaimer and terms of service supplied for 1066friend+ in a readable, localized format.",
    meta: {
      description: "1066friend+ disclaimer and terms of service",
      title: "1066friend+ | Disclaimer",
    },
    navLabel: "Disclaimer",
    termsClauses: [
      {
        title: "Article 1 (Purpose)",
        body: [
          "These terms and conditions govern the use of the 1066friend+ website and all related services. By accessing or using the platform, you acknowledge that you have read, understood, and agreed to be bound by these terms.",
        ],
      },
      {
        title: "Article 2 (User Eligibility and Conduct)",
        body: [],
        bullets: [
          "Age Requirement: Users must be at least 18 years of age, or the legal age of majority in their jurisdiction.",
          "Accuracy of Information: Users must provide truthful and accurate information when using the automated matching system.",
          "Prohibited Activities: Attempts to manipulate the system, create multiple fraudulent accounts, or bypass the intended use of the platform may result in immediate termination without notice.",
        ],
      },
      {
        title: "Article 3 (Modification of Service)",
        body: [
          "1066friend+ reserves the right to modify, update, suspend, or discontinue any portion of the service, including reward structures and features, at any time in order to support platform sustainability.",
        ],
      },
      {
        title: "Article 4 (Legal Responsibility)",
        body: [
          "Please refrain from using this project in jurisdictions where its use is not permitted by law. If you choose to use it regardless of such restrictions, you will be solely responsible for any legal consequences or penalties.",
        ],
      },
      {
        title: "Article 5 (Data and Privacy)",
        body: [
          "By using 1066friend+, you agree to the collection and use of data necessary for the automated matching system as outlined in our Privacy Policy.",
        ],
      },
      {
        title: "Article 6 (Governing Law)",
        body: [
          "These terms shall be governed by and construed in accordance with the laws of [Insert Country/Region, e.g., Singapore]. Any disputes arising from the use of this service shall be subject to the exclusive jurisdiction of the courts in that region.",
        ],
      },
    ],
    termsTitle: "Terms of Service",
    title: "1066friend+ Disclaimer and Terms of Service",
  },
  ja: {
    backHomeLabel: "ホームへ戻る",
    disclaimerClauses: [
      {
        title: "1. 金融的保証の否認",
        body: [
          "1066friend+ は、グローバルネットワーキングと自動マッチングを支援するためのプラットフォームです。特定の金銭的利益、収益、または「即時キャッシュフロー」を保証するものではありません。",
          "すべての結果は、個々の利用者の関与度、ネットワークの質、外部市場環境によって左右されます。",
        ],
      },
      {
        title: "2. 金融投資商品ではありません",
        body: [
          "本サービスはネットワーキングツールであり、金融投資商品、証券提供、または銀行サービスには該当しません。",
          "システム内で得られるポイント、報酬、または便益は、明示されない限り、本サービス外で固有の金銭的価値を持ちません。",
        ],
      },
      {
        title: "3. 法域上の制限",
        body: [
          "本プロジェクトの運営、ネットワーク型報酬、または自動マッチングサービスが法律上認められていない地域では利用できません。",
          "参加が地域法、州法、国家法に適合することを確認する責任は、すべて利用者本人にあります。",
        ],
      },
      {
        title: "4. 責任の制限",
        body: [
          "1066friend+、その開発者、および関連当事者は、本サービスの利用または利用不能に起因する直接的、間接的、付随的、または結果的損害について責任を負いません。",
        ],
      },
    ],
    disclaimerTitle: "免責事項",
    eyebrow: "legal notice",
    intro:
      "このページでは、受領した免責文書をもとに 1066friend+ の免責事項と利用条件を各言語で確認できます。",
    meta: {
      description: "1066friend+ の免責事項と利用規約ページ",
      title: "1066friend+ | 免責事項",
    },
    navLabel: "免責事項",
    termsClauses: [
      {
        title: "第1条（目的）",
        body: [
          "本規約は、1066friend+ ウェブサイトおよび関連サービスの利用条件を定めるものです。プラットフォームにアクセスまたは利用することで、本規約を読み、理解し、拘束されることに同意したものとみなされます。",
        ],
      },
      {
        title: "第2条（利用資格および行為）",
        body: [],
        bullets: [
          "年齢要件: 利用者は 18 歳以上、または当該法域における成年年齢以上でなければなりません。",
          "情報の正確性: 自動マッチングシステムを利用する際は、真実かつ正確な情報を提供しなければなりません。",
          "禁止行為: システム操作、複数の不正アカウント作成、または本来の利用目的を回避する行為は、通知なしの即時アカウント停止事由となります。",
        ],
      },
      {
        title: "第3条（サービスの変更）",
        body: [
          "1066friend+ は、プラットフォームの持続可能性を確保するため、報酬構造や機能を含むサービスの全部または一部を随時変更、更新、停止、終了する権利を有します。",
        ],
      },
      {
        title: "第4条（法的責任）",
        body: [
          "法律で禁止されている地域では、本プロジェクトの利用を控えてください。制限を承知のうえで利用する場合、その法的結果や罰則はすべて利用者自身の責任となります。",
        ],
      },
      {
        title: "第5条（データとプライバシー）",
        body: [
          "1066friend+ を利用することで、利用者はプライバシーポリシーに定める範囲で、自動マッチングシステムに必要なデータの収集および利用に同意したものとみなされます。",
        ],
      },
      {
        title: "第6条（準拠法）",
        body: [
          "本規約は [国/地域を記入、例: Singapore] の法令に準拠し、これに従って解釈されます。本サービスに関する紛争は、当該地域の裁判所の専属管轄に服します。",
        ],
      },
    ],
    termsTitle: "利用規約",
    title: "1066friend+ 免責事項および利用規約",
  },
  zh: {
    backHomeLabel: "返回首页",
    disclaimerClauses: [
      {
        title: "1. 不作任何财务保证",
        body: [
          "1066friend+ 是一个用于支持全球网络连接和自动匹配的平台。我们不保证任何特定财务回报、收益或“即时现金流”。",
          "所有结果都取决于用户个人参与程度、网络质量以及外部市场环境。",
        ],
      },
      {
        title: "2. 并非金融投资产品",
        body: [
          "本服务是一个网络工具，不构成金融投资产品、证券发行或银行服务。",
          "系统内获得的任何积分、奖励或权益，除非明确说明，否则在服务之外不具有固有货币价值。",
        ],
      },
      {
        title: "3. 司法辖区限制",
        body: [
          "如果某司法辖区不允许此类项目运营、网络型奖励模式或自动匹配服务，则严禁使用本项目。",
          "确保参与行为符合当地、州级和国家法律的责任完全由用户本人承担。",
        ],
      },
      {
        title: "4. 责任限制",
        body: [
          "1066friend+、其开发者及关联方对因使用或无法使用本服务而产生的任何直接、间接、附带或后果性损害不承担责任。",
        ],
      },
    ],
    disclaimerTitle: "免责声明",
    eyebrow: "legal notice",
    intro:
      "本页根据提供的免责声明文档整理了 1066friend+ 的免责声明与服务条款，供各语言版本查看。",
    meta: {
      description: "1066friend+ 免责声明与服务条款页面",
      title: "1066friend+ | 免责声明",
    },
    navLabel: "免责声明",
    termsClauses: [
      {
        title: "第1条（目的）",
        body: [
          "本条款用于规范 1066friend+ 网站及所有相关服务的使用。访问或使用本平台即表示你已阅读、理解并同意受本条款约束。",
        ],
      },
      {
        title: "第2条（用户资格与行为）",
        body: [],
        bullets: [
          "年龄要求：用户必须年满 18 周岁，或达到其所在司法辖区的法定成年年龄。",
          "信息准确性：使用自动匹配系统时，用户必须提供真实、准确的信息。",
          "禁止行为：任何试图操纵系统、创建多个欺诈账号或绕过平台预期用途的行为，都可能导致账号在无通知的情况下被立即终止。",
        ],
      },
      {
        title: "第3条（服务变更）",
        body: [
          "为确保平台可持续运行，1066friend+ 保留随时修改、更新、暂停或终止服务任意部分的权利，包括奖励结构和功能。",
        ],
      },
      {
        title: "第4条（法律责任）",
        body: [
          "如某地区法律不允许使用本项目，请勿使用。若你仍选择使用，则由你本人独自承担所有法律后果或处罚。",
        ],
      },
      {
        title: "第5条（数据与隐私）",
        body: [
          "使用 1066friend+ 即表示你同意按照隐私政策所述，为自动匹配系统的运行收集并使用必要数据。",
        ],
      },
      {
        title: "第6条（适用法律）",
        body: [
          "本条款应依照 [请填写国家/地区，例如 Singapore] 的法律解释并执行。因使用本服务而产生的任何争议，应由该地区法院专属管辖。",
        ],
      },
    ],
    termsTitle: "服务条款",
    title: "1066friend+ 免责声明与服务条款",
  },
  vi: {
    backHomeLabel: "Quay lại trang chủ",
    disclaimerClauses: [
      {
        title: "1. Không bảo đảm lợi nhuận tài chính",
        body: [
          "1066friend+ là nền tảng hỗ trợ kết nối mạng lưới toàn cầu và ghép nối tự động. Chúng tôi không bảo đảm bất kỳ khoản lợi nhuận tài chính, thu nhập hay “dòng tiền tức thì” cụ thể nào.",
          "Mọi kết quả phụ thuộc vào mức độ tham gia của từng người dùng, chất lượng mạng lưới của bạn và các điều kiện thị trường bên ngoài.",
        ],
      },
      {
        title: "2. Không phải sản phẩm đầu tư tài chính",
        body: [
          "Dịch vụ này là công cụ kết nối mạng lưới và không cấu thành sản phẩm đầu tư tài chính, chào bán chứng khoán hay dịch vụ ngân hàng.",
          "Bất kỳ điểm, phần thưởng hoặc quyền lợi nào phát sinh trong hệ thống đều tuân theo chính sách nội bộ của nền tảng và không có giá trị tiền tệ cố hữu bên ngoài dịch vụ trừ khi được nêu rõ.",
        ],
      },
      {
        title: "3. Hạn chế theo khu vực pháp lý",
        body: [
          "Nghiêm cấm sử dụng dự án này tại các khu vực pháp lý nơi hoạt động của dự án, cơ chế thưởng dựa trên mạng lưới hoặc dịch vụ ghép nối tự động không được pháp luật cho phép.",
          "Người dùng hoàn toàn chịu trách nhiệm bảo đảm rằng việc tham gia của mình tuân thủ mọi quy định pháp luật địa phương, cấp bang/tỉnh và quốc gia.",
        ],
      },
      {
        title: "4. Giới hạn trách nhiệm",
        body: [
          "1066friend+, các nhà phát triển và các bên liên quan sẽ không chịu trách nhiệm đối với bất kỳ thiệt hại trực tiếp, gián tiếp, ngẫu nhiên hoặc hệ quả nào phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ.",
        ],
      },
    ],
    disclaimerTitle: "Tuyên bố miễn trừ trách nhiệm",
    eyebrow: "legal notice",
    intro:
      "Trang này trình bày tuyên bố miễn trừ trách nhiệm và điều khoản dịch vụ của 1066friend+ theo từng ngôn ngữ.",
    meta: {
      description: "Trang tuyên bố miễn trừ trách nhiệm và điều khoản dịch vụ của 1066friend+",
      title: "1066friend+ | Miễn trừ trách nhiệm",
    },
    navLabel: "Miễn trừ trách nhiệm",
    termsClauses: [
      {
        title: "Điều 1 (Mục đích)",
        body: [
          "Các điều khoản này điều chỉnh việc sử dụng trang web 1066friend+ và tất cả các dịch vụ liên quan. Khi truy cập hoặc sử dụng nền tảng, bạn xác nhận rằng mình đã đọc, hiểu và đồng ý bị ràng buộc bởi các điều khoản này.",
        ],
      },
      {
        title: "Điều 2 (Tư cách người dùng và hành vi)",
        body: [],
        bullets: [
          "Yêu cầu độ tuổi: Người dùng phải từ 18 tuổi trở lên hoặc đạt độ tuổi thành niên theo quy định tại khu vực pháp lý của mình.",
          "Tính chính xác của thông tin: Người dùng phải cung cấp thông tin trung thực và chính xác khi sử dụng hệ thống ghép nối tự động.",
          "Hành vi bị cấm: Mọi hành vi thao túng hệ thống, tạo nhiều tài khoản gian lận hoặc vượt qua mục đích sử dụng dự kiến của nền tảng đều có thể dẫn đến việc chấm dứt tài khoản ngay lập tức mà không cần thông báo.",
        ],
      },
      {
        title: "Điều 3 (Thay đổi dịch vụ)",
        body: [
          "1066friend+ có quyền sửa đổi, cập nhật, tạm ngừng hoặc chấm dứt bất kỳ phần nào của dịch vụ, bao gồm cấu trúc phần thưởng và tính năng, vào bất kỳ thời điểm nào để bảo đảm tính bền vững của nền tảng.",
        ],
      },
      {
        title: "Điều 4 (Trách nhiệm pháp lý)",
        body: [
          "Vui lòng không sử dụng dự án này tại những khu vực mà pháp luật không cho phép. Nếu bạn vẫn lựa chọn sử dụng, bạn sẽ tự chịu hoàn toàn trách nhiệm đối với mọi hậu quả hoặc hình phạt pháp lý phát sinh.",
        ],
      },
      {
        title: "Điều 5 (Dữ liệu và quyền riêng tư)",
        body: [
          "Khi sử dụng 1066friend+, bạn đồng ý với việc thu thập và sử dụng dữ liệu cần thiết cho hệ thống ghép nối tự động theo Chính sách quyền riêng tư của chúng tôi.",
        ],
      },
      {
        title: "Điều 6 (Luật điều chỉnh)",
        body: [
          "Các điều khoản này sẽ được điều chỉnh và giải thích theo pháp luật của [Điền quốc gia/khu vực, ví dụ: Singapore]. Mọi tranh chấp phát sinh từ việc sử dụng dịch vụ này sẽ thuộc thẩm quyền xét xử riêng của tòa án tại khu vực đó.",
        ],
      },
    ],
    termsTitle: "Điều khoản dịch vụ",
    title: "Miễn trừ trách nhiệm và Điều khoản dịch vụ của 1066friend+",
  },
  id: {
    backHomeLabel: "Kembali ke beranda",
    disclaimerClauses: [
      {
        title: "1. Tidak Ada Jaminan Keuangan",
        body: [
          "1066friend+ adalah platform yang dirancang untuk memfasilitasi jejaring global dan pencocokan otomatis. Kami tidak menjamin hasil keuangan tertentu, penghasilan, atau “arus kas instan.”",
          "Semua hasil bergantung pada keterlibatan masing-masing pengguna, kualitas jaringan Anda, dan kondisi pasar eksternal.",
        ],
      },
      {
        title: "2. Bukan Investasi Keuangan",
        body: [
          "Layanan ini adalah alat jejaring dan bukan produk investasi keuangan, penawaran sekuritas, atau layanan perbankan.",
          "Setiap poin, hadiah, atau manfaat yang diperoleh dalam sistem tunduk pada kebijakan internal platform dan tidak memiliki nilai moneter inheren di luar layanan kecuali dinyatakan secara tegas.",
        ],
      },
      {
        title: "3. Pembatasan Yurisdiksi",
        body: [
          "Penggunaan proyek ini dilarang keras di yurisdiksi yang tidak mengizinkan operasinya, konsep imbalan berbasis jaringan, atau layanan pencocokan otomatis menurut hukum.",
          "Pengguna sepenuhnya bertanggung jawab untuk memastikan partisipasinya mematuhi seluruh hukum lokal, regional, dan nasional yang berlaku.",
        ],
      },
      {
        title: "4. Batasan Tanggung Jawab",
        body: [
          "1066friend+, para pengembangnya, dan afiliasinya tidak bertanggung jawab atas kerugian langsung, tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan atau ketidakmampuan menggunakan layanan.",
        ],
      },
    ],
    disclaimerTitle: "Pernyataan Penafian",
    eyebrow: "legal notice",
    intro:
      "Halaman ini menampilkan pernyataan penafian dan ketentuan layanan 1066friend+ dalam format yang dilokalkan untuk setiap bahasa.",
    meta: {
      description: "Halaman penafian dan ketentuan layanan 1066friend+",
      title: "1066friend+ | Penafian",
    },
    navLabel: "Penafian",
    termsClauses: [
      {
        title: "Pasal 1 (Tujuan)",
        body: [
          "Syarat dan ketentuan ini mengatur penggunaan situs web 1066friend+ dan seluruh layanan terkait. Dengan mengakses atau menggunakan platform ini, Anda menyatakan telah membaca, memahami, dan setuju untuk terikat oleh ketentuan ini.",
        ],
      },
      {
        title: "Pasal 2 (Kelayakan Pengguna dan Perilaku)",
        body: [],
        bullets: [
          "Persyaratan usia: Pengguna harus berusia minimal 18 tahun atau telah mencapai usia dewasa menurut yurisdiksinya.",
          "Keakuratan informasi: Pengguna wajib memberikan informasi yang benar dan akurat saat menggunakan sistem pencocokan otomatis.",
          "Aktivitas terlarang: Upaya memanipulasi sistem, membuat banyak akun palsu, atau menghindari tujuan penggunaan platform dapat mengakibatkan penghentian akun segera tanpa pemberitahuan.",
        ],
      },
      {
        title: "Pasal 3 (Perubahan Layanan)",
        body: [
          "1066friend+ berhak untuk mengubah, memperbarui, menangguhkan, atau menghentikan sebagian layanan, termasuk struktur hadiah dan fitur, kapan saja demi menjaga keberlanjutan platform.",
        ],
      },
      {
        title: "Pasal 4 (Tanggung Jawab Hukum)",
        body: [
          "Mohon tidak menggunakan proyek ini di yurisdiksi yang melarang penggunaannya. Jika Anda tetap memilih untuk menggunakannya, Anda sepenuhnya bertanggung jawab atas segala konsekuensi atau sanksi hukum yang timbul.",
        ],
      },
      {
        title: "Pasal 5 (Data dan Privasi)",
        body: [
          "Dengan menggunakan 1066friend+, Anda menyetujui pengumpulan dan penggunaan data yang diperlukan untuk sistem pencocokan otomatis sebagaimana dijelaskan dalam Kebijakan Privasi kami.",
        ],
      },
      {
        title: "Pasal 6 (Hukum yang Mengatur)",
        body: [
          "Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum [Isi negara/wilayah, misalnya: Singapore]. Setiap sengketa yang timbul dari penggunaan layanan ini akan tunduk pada yurisdiksi eksklusif pengadilan di wilayah tersebut.",
        ],
      },
    ],
    termsTitle: "Ketentuan Layanan",
    title: "Penafian dan Ketentuan Layanan 1066friend+",
  },
};

export function getDisclaimerCopy(locale: Locale) {
  return disclaimerCopy[locale];
}
