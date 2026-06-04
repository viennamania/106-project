import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeDollarSign,
  Blocks,
  CheckCircle2,
  Clapperboard,
  Coins,
  Eye,
  FileText,
  HandHeart,
  Images,
  Layers3,
  LockKeyhole,
  Mail,
  Newspaper,
  PlayCircle,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Trophy,
  TrendingUp,
  UsersRound,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { FanletterAutoplayVideo } from "@/components/fanletter-autoplay-video";
import { FanletterBrandMark } from "@/components/fanletter-brand-mark";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { FanletterHeroBackgroundCarousel } from "@/components/fanletter-mobile-hero-carousel";
import { FanletterNewsPlatformInquiryForm } from "@/components/fanletter-news-platform-inquiry-form";
import {
  FanletterNewsPlatformMomentum,
  type FanletterNewsPlatformMomentumStat,
} from "@/components/fanletter-news-platform-momentum";
import { LandingReveal } from "@/components/landing/landing-reveal";
import type { FanletterNewsReportDocument } from "@/lib/content";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import { getFanletterLandingData } from "@/lib/fanletter-landing-service";
import {
  getFanletterNewsCharacterStats,
  hydrateFanletterNewsCharacterStats,
  type FanletterNewsCharacterStat,
} from "@/lib/fanletter-news-character-directory";
import {
  getFanletterNewsReportsForCharacterDirectory,
  getLatestFanletterNewsReports,
  getFanletterNewsTeaserGalleryItems,
  type FanletterNewsTeaserGalleryItem,
} from "@/lib/fanletter-news-report-service";
import {
  getFanletterNewsBareArticleDisplayTitle as getArticleDisplayTitle,
} from "@/lib/fanletter-news-related";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterNewsPlatformSearchParams = {
  ref?: string | string[];
};

const HERO_IMAGE = "/landing/premium-phone.png?v=20260415";
const MARKET_SIGNAL_ARTICLE_URL =
  "https://biz.chosun.com/distribution/channel/2026/06/02/32FCODIXEVG3PF3GFXWKHDYPSI/";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        title: "AIAVpark 플랫폼 투자자 브리프",
        description:
          "AI 캐릭터 숏폼 반응을 팬 리포트, 원본 브이로그, 구매 전환, 정산 기록으로 연결하는 AIAVpark 플랫폼 투자자 브리프입니다.",
        brand: "AIAVpark",
        eyebrow: "Shortform Exposure Engine",
        heroTitle: "숏폼 반응을 뉴스·원본·구매로 이어주는 노출력 홈",
        heroBody:
          "팬 기자가 편집한 티저 컷으로 먼저 반응을 만들고, 마음에 드는 AI 캐릭터의 원본 브이로그와 다른 뉴스, 구매 흐름까지 이어갈 수 있습니다.",
        primaryCta: "지금 뉴스 보기",
        secondaryCta: "AI 캐릭터 보기",
        contactCta: "투자·제휴 문의",
        proofBadges: ["숏폼 노출", "리포터 4컷", "구매 기여"],
        heroStats: [
          { label: "먼저 만드는 반응", value: "4 Cuts", hint: "팬 리포터 포토 뉴스" },
          { label: "이어보는 원본", value: "Vlog", hint: "AI 캐릭터 원본 장면" },
          { label: "기록되는 성과", value: "Signal", hint: "공유·오픈·구매 기여" },
        ],
        mobileQuickNav: {
          data: "데이터",
          inquiry: "문의",
          summary: "요약",
        },
        investorSnapshot: {
          basis: "기준: 공개 일반 콘텐츠와 현재 운영 DB",
          body:
            "동일한 리포트 제목 반복은 줄이고, 투자자가 바로 해석할 수 있는 운영 규모와 콘텐츠 다양성 지표를 먼저 보여줍니다.",
          contactCta: "문의하기",
          eyebrow: "Investor Snapshot",
          metrics: {
            characters: {
              hint: "캐릭터별 소비와 IP 확장의 기본 단위",
              label: "캐릭터 채널",
            },
            previews: {
              hint: "뉴스 안에서 원본 소비를 유도하는 프리뷰",
              label: "원본 프리뷰",
            },
            representativeReports: {
              hint: "동일 제목/캐릭터 중복을 제거한 대표 노출",
              label: "대표 리포트",
            },
            reports: {
              hint: "현재 홈에서 집계 가능한 공개 리포트",
              label: "운영 리포트",
            },
          },
          title: "투자자가 30초 안에 확인할 핵심 운영 지표",
        },
        momentumStats: {
          characters: {
            hint: "뉴스와 브이로그가 쌓이는 캐릭터 채널",
            label: "AI 캐릭터",
            suffix: "명",
          },
          news: {
            hint: "SNS 유입 후 바로 이어볼 노출 리포트",
            label: "노출 리포트",
            suffix: "개",
          },
          previews: {
            hint: "뉴스 안에서 움직이는 원본 프리뷰",
            label: "원본 프리뷰",
            suffix: "개",
          },
        },
        momentumTicker: {
          body:
            "클릭되는 4컷 리포트가 원본 브이로그, 팬 참여, 구매 기여로 이어지는 홍보 흐름입니다.",
          label: "Live Exposure Flow",
        },
        homeNews: {
          body:
            "SNS에서 들어온 사용자가 바로 이어보기 좋은 최신 노출 리포트입니다. 티저 컷, 원본 브이로그, 캐릭터 채널로 자연스럽게 연결됩니다.",
          cta: "뉴스 읽기",
          empty: "아직 홈에 표시할 공개 뉴스가 없습니다.",
          eyebrow: "지금 이어볼 뉴스",
          previewBadge: "원본 프리뷰",
          title: "뉴스가 반응과 원본 소비로 이어지는 흐름",
        },
        homeCharacters: {
          body:
            "캐릭터의 얼굴과 이름을 먼저 기억하게 하고, 같은 캐릭터의 뉴스와 브이로그를 계속 소비하도록 연결합니다.",
          cta: "캐릭터 채널",
          empty: "아직 홈에 표시할 AI 캐릭터가 없습니다.",
          eyebrow: "AI 캐릭터 채널",
          news: "뉴스",
          profileCuts: (count: string) => `${count}컷`,
          source: "원본 오픈",
          title: "계속 보게 만드는 캐릭터 IP",
          vlogs: "브이로그",
        },
        homeGrowth: {
          body:
            "뉴스 발행, 원본 브이로그, 원본 오픈, 팬 리포터 확산을 합산해 어떤 AI 캐릭터 IP가 더 빠르게 성장하는지 보여줍니다.",
          empty: "아직 성장 차트로 표시할 AI 캐릭터 데이터가 없습니다.",
          eyebrow: "AI 성장 차트",
          legend: {
            news: "뉴스",
            reporters: "리포터",
            source: "원본 오픈",
            vlogs: "브이로그",
          },
          score: "IP 지수",
          title: "캐릭터 IP 성장 레이스",
        },
        liveStudio: {
          characterRail: "성장 중인 AI 캐릭터",
          eyebrow: "실시간 운영 쇼케이스",
          liveReports: "라이브 뉴스",
          proof:
            "현재 서비스 DB에서 불러온 공개 리포트, 원본 프리뷰, 캐릭터 채널로 운영 중인 콘텐츠 흐름을 보여줍니다.",
          reportStack: "노출 리포트 스택",
          signalRail: "노출 → 원본 → 구매 기여",
          sourceClip: "원본 프리뷰",
          sourcePreviews: "원본 클립",
          title: "데모가 아니라 지금 운영 중인 콘텐츠 월",
        },
        marketSignal: {
          assetLabel: "라이브 증거",
          body:
            "K-뷰티가 제품력 다음 경쟁 축을 노출력으로 옮기고 있습니다. AIAVpark News는 이 변화를 AI 캐릭터 콘텐츠에도 그대로 적용해, 발견·반응·원본 소비·구매 기여를 한 화면에서 이어줍니다.",
          eyebrow: "시장 신호",
          liveReports: "운영 중인 리포트",
          source:
            "조선비즈 2026.06.02 · ‘제품력’ 넘어 ‘노출력’ 경쟁",
          sourceCta: "시장 기사 보기",
          sourcePreviews: "움직이는 원본 프리뷰",
          thesis:
            "제품이 좋아도 먼저 발견되지 않으면 팔리지 않습니다. 이제 콘텐츠 플랫폼은 노출을 만들고, 반응을 읽고, 구매 기여를 기록해야 합니다.",
          title: "제품력 이후의 승부처는 노출력입니다",
          totalAssets: "노출 자산",
          tracks: [
            {
              body:
                "숏폼에서 먼저 멈춰 보게 만드는 티저 컷과 영상 프리뷰를 전면에 배치합니다.",
              kicker: "01 발견",
              title: "스크롤을 멈추는 첫 장면",
            },
            {
              body:
                "팬 리포터가 장면을 뉴스처럼 포장해 AI 캐릭터와 원본 콘텐츠에 대한 궁금증을 키웁니다.",
              kicker: "02 반응",
              title: "팬이 만드는 리포트 확산",
            },
            {
              body:
                "원본 오픈, 구매, 보상 기록까지 연결해 단순 조회수가 아닌 기여 흐름으로 설명합니다.",
              kicker: "03 전환",
              title: "구매와 정산으로 이어지는 신호",
            },
          ],
        },
        investorBrief: {
          body:
            "AIAVpark News는 원본 브이로그, 팬 리포트, 원본 오픈, 구매 기여를 하나의 흐름으로 연결합니다. 현재 운영 중인 콘텐츠가 그 구조를 바로 보여줍니다.",
          ctaCharacters: "캐릭터 자산 보기",
          ctaNews: "라이브 뉴스 보기",
          ctaReports: "리포터 데스크",
          eyebrow: "플랫폼 구조 요약",
          evidenceTitle: "지금 보여줄 수 있는 운영 증거",
          latestReport: "최신 리포트",
          noReport: "공개 리포트 준비 중",
          script: [
            "시장은 제품력만으로는 부족하고 노출력이 성과를 가르는 구조로 바뀌고 있습니다.",
            "AIAVpark News는 AI 캐릭터의 원본 숏폼을 팬 리포터 뉴스로 재포장해 발견과 반응을 만듭니다.",
            "그 반응은 원본 오픈, 구매, 보상 기록으로 이어져 플랫폼의 기여 데이터가 됩니다.",
          ],
          scriptLabel: "운영 흐름 요약",
          stats: {
            characters: "캐릭터 채널",
            reports: "라이브 리포트",
            reportDesk: "리포터 동선",
            sourcePreviews: "원본 프리뷰",
          },
          title: "뉴스가 원본 소비로 이어지는 구조",
          cards: [
            {
              eyebrow: "Problem",
              title: "콘텐츠는 넘치지만 먼저 발견되기 어렵습니다",
              body:
                "AI 캐릭터와 숏폼 원본이 많아질수록, 소비 전에 반응을 만드는 노출 계층이 필요합니다.",
            },
            {
              eyebrow: "Product",
              title: "팬 리포터가 원본을 뉴스로 바꿉니다",
              body:
                "원본 장면을 4컷 리포트와 프리뷰로 재포장해 캐릭터 기억과 원본 소비를 동시에 만듭니다.",
            },
            {
              eyebrow: "Revenue",
              title: "원본 오픈과 구매 기여가 기록됩니다",
              body:
                "뉴스에서 생긴 반응은 원본 보기, 팬 요청, 구매 흐름으로 이어지고 보상 기준이 됩니다.",
            },
            {
              eyebrow: "Moat",
              title: "콘텐츠 DB와 기여 원장이 같이 쌓입니다",
              body:
                "캐릭터, 리포트, 프리뷰, 정산 이벤트가 연결될수록 플랫폼 데이터가 방어력이 됩니다.",
            },
          ],
        },
        inquiryForm: {
          asideItems: [
            "투자 검토, 전략적 제휴, 미디어 문의를 담당자가 함께 확인합니다.",
            "남겨주신 배경과 관심 분야를 바탕으로 후속 자료나 미팅 일정을 정리합니다.",
            "문의가 접수되면 입력하신 이메일로 회신할 수 있도록 기록됩니다.",
          ],
          asideTitle: "접수 후 진행 방식",
          body:
            "AIAVpark의 사업 구조, 투자 검토, 제휴 가능성에 대해 남겨주세요. 페이지를 벗어나지 않고 바로 접수됩니다.",
          emailLabel: "이메일",
          emailPlaceholder: "name@company.com",
          errorMessages: {
            blocked:
              "문의 내용에 접수할 수 없는 문구가 포함되어 있습니다. 내용을 조정해 다시 보내주세요.",
            duplicate:
              "같은 내용의 문의가 이미 접수되었습니다. 담당자가 확인 후 회신하겠습니다.",
            fallback:
              "문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.",
            invalidEmail: "회신 가능한 이메일 주소를 입력해주세요.",
            messageRequired: "문의 내용을 10자 이상 입력해주세요.",
            nameRequired: "이름을 입력해주세요.",
            rateLimited:
              "짧은 시간 안에 여러 번 접수되었습니다. 잠시 후 다시 시도해주세요.",
          },
          eyebrow: "Contact",
          messageLabel: "문의 내용",
          messagePlaceholder:
            "검토하고 싶은 내용, 회사 소개, 미팅 희망 일정 등을 적어주세요.",
          nameLabel: "이름",
          namePlaceholder: "홍길동",
          organizationLabel: "회사/소속",
          organizationPlaceholder: "회사명 또는 투자사명",
          privacyCta: "약관 보기",
          privacyNote:
            "입력한 정보는 문의 응대와 후속 연락 목적으로만 사용되며, 처리 목적에 필요한 기간 동안 보관됩니다.",
          responseHint:
            "담당자가 내용을 확인한 뒤 입력하신 이메일로 회신합니다.",
          submit: "문의 접수하기",
          submitting: "접수 중",
          successBody:
            "남겨주신 연락처로 검토 후 회신하겠습니다.",
          successTitle: "문의가 접수되었습니다.",
          title: "투자 및 제휴 문의를 바로 남겨주세요",
          typeLabel: "문의 유형",
          typeOptions: [
            { label: "투자 검토", value: "investment" },
            { label: "전략적 제휴", value: "partnership" },
            { label: "미디어/취재", value: "media" },
            { label: "기타", value: "other" },
          ],
        },
        portalStrategy: {
          body:
            "불법 유통의 방식이 아니라, 사용자가 계속 돌아오는 콘텐츠 포털의 구조를 합법적으로 가져갑니다. AIAVpark는 직접 생성·권리 보유·팬 리포터 기여 기록을 기반으로 AI 캐릭터 콘텐츠의 업데이트 허브가 되어야 합니다.",
          ctaCharacters: "캐릭터별 포털 보기",
          ctaNews: "최신 업데이트 보기",
          ctaReports: "리포터로 참여하기",
          eyebrow: "Legal Content Portal Strategy",
          proofLabel: "현재 라이브 데이터로 시작",
          title: "AIAVpark가 가야 할 길은 AI 캐릭터판 합법 콘텐츠 포털입니다",
          modules: [
            {
              label: "01 Update",
              title: "매일 들어오는 최신 업데이트 홈",
              body:
                "최신 리포트, 새 브이로그, 원본 프리뷰를 한 화면에 모아 사용자가 습관적으로 확인하게 만듭니다.",
            },
            {
              label: "02 Episodes",
              title: "캐릭터별 회차형 소비",
              body:
                "캐릭터 채널을 시즌·에피소드처럼 구성해 1편을 본 사용자가 다음 뉴스와 원본으로 이어가게 합니다.",
            },
            {
              label: "03 Rankings",
              title: "오늘 인기와 급상승 랭킹",
              body:
                "많이 열린 원본, 급상승 캐릭터, 인기 리포터를 보여줘 탐색 시간을 늘리고 다음 클릭을 만듭니다.",
            },
            {
              label: "04 Free → Paid",
              title: "무료 티저에서 유료 원본으로",
              body:
                "가입 전에도 볼 수 있는 티저를 넓히고, 반응이 생긴 장면은 원본 오픈과 구매로 자연스럽게 연결합니다.",
            },
            {
              label: "05 Community",
              title: "팬 요청과 리포터 참여",
              body:
                "보고싶어요, 다음 장면 요청, 리포트 작성, 공유를 보상 가능한 기여 이벤트로 축적합니다.",
            },
          ],
          roadmap: [
            {
              label: "Now",
              title: "뉴스 홈을 업데이트 포털로 정리",
              body:
                "최신·인기·캐릭터별 흐름을 강화해 처음 온 사용자가 바로 볼 콘텐츠를 찾게 합니다.",
            },
            {
              label: "Next",
              title: "캐릭터별 시즌/회차 UX",
              body:
                "캐릭터 페이지 안에서 뉴스, 브이로그, 원본 오픈, 팬 요청을 이어보기 구조로 묶습니다.",
            },
            {
              label: "Scale",
              title: "랭킹과 보상 원장으로 네트워크 효과",
              body:
                "인기 리포트와 리포터 보상이 공개되면 팬이 소비자이자 유통 파트너가 됩니다.",
            },
          ],
          stats: {
            characters: "캐릭터 포털",
            reports: "업데이트 항목",
            sourcePreviews: "무료 프리뷰",
          },
        },
        newsroomPreview: {
          label: "EXPOSURE ENTRY",
          title: "4컷 리포트 한 편이 원본 소비의 입구가 됩니다",
          body:
            "대표 티저, 리포터 편집 컷, 팬 오픈 투표를 한 화면에 묶어 원본 장면과 다음 구매 행동을 보고 싶게 만듭니다.",
          flow: ["SNS 유입", "4컷 리포트", "원본 보기", "구매 기여"],
          metrics: [
            { label: "유입", value: "SNS" },
            { label: "티저", value: "4컷" },
            { label: "성과", value: "Signal" },
          ],
        },
        vloggerSignal: {
          eyebrow: "Character Curiosity Loop",
          title: "뉴스를 읽고, 원본을 보고, 캐릭터를 따라갑니다",
        },
        modelTitle: "하나의 숏폼 원본이 노출력 자산이 되는 방식",
        modelBody:
          "뉴스는 반응을 만드는 노출 계층이고, 브이로그는 실제 소비 대상입니다. 팬 참여가 많을수록 캐릭터 IP의 콘텐츠, 공유, 구매, 정산 기록이 함께 축적됩니다.",
        modelSteps: [
          {
            title: "Persona",
            body:
              "AI 캐릭터의 외모, 말투, 일상, 세계관을 지속적으로 축적합니다.",
          },
          {
            title: "One Scene Vlog",
            body:
              "캐릭터가 하나의 장면에서 카메라를 바라보며 말하거나 행동하는 모바일 숏폼 원본입니다.",
          },
          {
            title: "Photo News",
            body:
              "대표 티저와 장면 이미지를 4컷 노출 리포트로 편집해 브이로그 소비를 유도합니다.",
          },
          {
            title: "Participation",
            body:
              "팬 요청, 보고싶어요, 리포트 작성, 공유, 구매 전환을 기여 이벤트로 기록합니다.",
          },
          {
            title: "USDT Sharing",
            body:
              "수익이 발생하면 기여도 기준으로 보상 내역을 만들고 USDT 정산 기록으로 투명성을 높입니다.",
          },
        ],
        participationTitle: "팬 반응이 캐릭터 IP의 노출력 자산이 됩니다",
        participationBody:
          "단순한 좋아요가 아니라, 다음 장면을 만들고 리포트 확산과 구매 전환에 영향을 준 행동을 분리해서 추적합니다.",
        participationItems: [
          {
            title: "팬",
            body:
              "보고 싶은 장면을 요청하고, 보고싶어요와 구매로 캐릭터의 다음 콘텐츠 수요를 만듭니다.",
            metric: "Request · Vote · Purchase",
          },
          {
            title: "팬 리포터",
            body:
              "브이로그를 4컷 노출 리포트로 포장해 더 많은 팬이 원본 콘텐츠를 소비하게 만듭니다.",
            metric: "리포트 · 공유 · 구매 전환",
          },
          {
            title: "브이로거",
            body:
              "캐릭터 페르소나를 기준으로 공개/팬 전용 브이로그를 제작하고 IP 자산을 늘립니다.",
            metric: "Create · Upload · Monetize",
          },
        ],
        settlementTitle: "USDT 정산이 공정성을 설명합니다",
        settlementBody:
          "AIAVpark의 핵심은 참여 기록과 수익 기록을 분리하지 않는 것입니다. 누가 어떤 행동으로 매출에 기여했는지 남기고, 정산 결과를 USDT 기준으로 확인할 수 있게 설계합니다.",
        settlementItems: [
          "구매, 언락, 팬 요청 결제를 수익 이벤트로 기록",
          "리포트, 보고싶어요, 공유, 구매 전환을 기여 이벤트로 기록",
          "보상 포인트와 USDT 지급 내역을 정산 로그로 연결",
        ],
        settlementEyebrow: "Transparent Settlement",
        ledgerTitle: "USDT 기준으로 설명 가능한 보상 기록",
        ledgerEyebrow: "Reward Ledger",
        eventLabels: {
          contribution: "Contribution Event",
          revenue: "Revenue Event",
          settlement: "USDT Settlement",
        },
        loopTitle: "노출 리포트는 유입, 브이로그는 소비, 정산은 신뢰입니다",
        loopBody:
          "이 세 가지가 연결될 때 팬은 단순 소비자가 아니라 AI 캐릭터 IP의 성장 파트너가 됩니다.",
        ctaTitle: "AIAVpark News 홈에서 노출력 성장 흐름을 시작하세요",
        ctaBody:
          "뉴스 홈에서 4컷 리포트와 AI 캐릭터를 둘러보고, 리포터 데스크에서 직접 브이로그 기반 노출 리포트를 작성할 수 있습니다.",
        ctaNews: "뉴스룸 보기",
        ctaCharacters: "AI 캐릭터",
        ctaReports: "리포터 데스크",
      }
    : {
        title: "AIAVpark Platform Investor Brief",
        description:
          "An AIAVpark platform investor brief showing how AI character shortform reactions connect to fan reports, source vlogs, purchase conversion, and settlement records.",
        brand: "AIAVpark",
        eyebrow: "Shortform Exposure Engine",
        heroTitle: "Turn shortform reactions into news, sources, and purchases",
        heroBody:
          "Fan reporters create the first reaction with teaser cuts, then readers continue into the original AI character vlog, more news, and purchase flows.",
        primaryCta: "Read news",
        secondaryCta: "AI characters",
        contactCta: "Investor inquiry",
        proofBadges: ["Shortform exposure", "Reporter four-cuts", "Purchase assists"],
        heroStats: [
          { label: "First reaction", value: "4 Cuts", hint: "Fan-reporter photo news" },
          { label: "Next content", value: "Vlog", hint: "Original AI character scene" },
          { label: "Tracked impact", value: "Signal", hint: "Shares, opens, and purchase assists" },
        ],
        mobileQuickNav: {
          data: "Data",
          inquiry: "Contact",
          summary: "Summary",
        },
        investorSnapshot: {
          basis: "Basis: public general content and the current operating database",
          body:
            "Repeated report titles are reduced, and the first block focuses on operating scale and content-diversity metrics investors can read quickly.",
          contactCta: "Contact us",
          eyebrow: "Investor Snapshot",
          metrics: {
            characters: {
              hint: "The base unit for character consumption and IP expansion",
              label: "Character channels",
            },
            previews: {
              hint: "Previews that pull readers from news into source consumption",
              label: "Source previews",
            },
            representativeReports: {
              hint: "Representative exposure after removing same-title character duplicates",
              label: "Representative reports",
            },
            reports: {
              hint: "Public reports currently measurable from News home",
              label: "Operating reports",
            },
          },
          title: "The key operating metrics investors should grasp in 30 seconds",
        },
        momentumStats: {
          characters: {
            hint: "Character channels accumulating news and vlogs",
            label: "AI characters",
            suffix: "",
          },
          news: {
            hint: "Exposure reports ready for SNS visitors to continue",
            label: "Exposure reports",
            suffix: "",
          },
          previews: {
            hint: "Moving source previews inside news",
            label: "Source previews",
            suffix: "",
          },
        },
        momentumTicker: {
          body:
            "Every clicked four-cut report can continue into a source vlog, fan participation, and purchase attribution.",
          label: "Live Exposure Flow",
        },
        homeNews: {
          body:
            "Latest exposure reports that help SNS visitors keep reading, open source vlogs, and remember the character channel.",
          cta: "Read news",
          empty: "No public news is ready for the home page yet.",
          eyebrow: "Continue Reading",
          previewBadge: "Source preview",
          title: "News that turns into reactions and source consumption",
        },
        homeCharacters: {
          body:
            "Show the face and name first, then connect readers to more news and source vlogs from the same AI character.",
          cta: "Character channel",
          empty: "No AI characters are ready for the home page yet.",
          eyebrow: "AI Character Channels",
          news: "News",
          profileCuts: (count: string) => `${count} cuts`,
          source: "Opened sources",
          title: "Character IP worth following",
          vlogs: "Vlogs",
        },
        homeGrowth: {
          body:
            "A visual score combining published news, source vlogs, opened sources, and fan-reporter distribution.",
          empty: "No AI character data is ready for the growth chart yet.",
          eyebrow: "AI Growth Chart",
          legend: {
            news: "News",
            reporters: "Reporters",
            source: "Opened",
            vlogs: "Vlogs",
          },
          score: "IP score",
          title: "Character IP growth race",
        },
        liveStudio: {
          characterRail: "Growing AI characters",
          eyebrow: "Live Operating Showcase",
          liveReports: "Live news",
          proof:
            "Public reports, source previews, and character channels are pulled from the live service database to show the operating content flow.",
          reportStack: "Exposure report stack",
          signalRail: "Exposure → source → purchase assist",
          sourceClip: "Source preview",
          sourcePreviews: "Source clips",
          title: "A live content wall, not a static demo",
        },
        marketSignal: {
          assetLabel: "Live proof",
          body:
            "K-beauty is shifting the next competition layer from product quality alone to exposure power. AIAVpark News applies the same shift to AI character content by connecting discovery, reaction, source consumption, and purchase attribution.",
          eyebrow: "Market Signal",
          liveReports: "Live reports",
          source:
            "ChosunBiz 2026.06.02 · exposure power after product power",
          sourceCta: "Read market article",
          sourcePreviews: "Moving source previews",
          thesis:
            "Great products do not sell if they are not discovered first. Content platforms now need to create exposure, read reactions, and record purchase contribution.",
          title: "After product power, exposure power becomes the battleground",
          totalAssets: "Exposure assets",
          tracks: [
            {
              body:
                "Lead with teaser cuts and moving source previews that stop the shortform scroll.",
              kicker: "01 Discovery",
              title: "The first scene that earns attention",
            },
            {
              body:
                "Fan reporters package scenes like news, increasing curiosity for the AI character and source content.",
              kicker: "02 Reaction",
              title: "Reporter-led distribution",
            },
            {
              body:
                "Source opens, purchases, and rewards connect the signal beyond raw view counts.",
              kicker: "03 Conversion",
              title: "Signals that continue into settlement",
            },
          ],
        },
        investorBrief: {
          body:
            "AIAVpark News connects source vlogs, fan reports, source opens, and purchase assists into one operating flow. Live content on the service shows that structure directly.",
          ctaCharacters: "View character assets",
          ctaNews: "View live news",
          ctaReports: "Reporter desk",
          eyebrow: "Platform flow summary",
          evidenceTitle: "Operating proof available now",
          latestReport: "Latest report",
          noReport: "Public reports are being prepared",
          script: [
            "The market is moving from product quality alone to exposure power as a performance driver.",
            "AIAVpark News repackages AI character source shorts into fan-reporter news to create discovery and reaction.",
            "Those reactions continue into source opens, purchases, reward records, and contribution data.",
          ],
          scriptLabel: "Operating flow summary",
          stats: {
            characters: "Character channels",
            reports: "Live reports",
            reportDesk: "Reporter path",
            sourcePreviews: "Source previews",
          },
          title: "How news leads to source consumption",
          cards: [
            {
              eyebrow: "Problem",
              title: "Content is abundant, but discovery is scarce",
              body:
                "As AI characters and shortform sources multiply, platforms need an exposure layer before consumption.",
            },
            {
              eyebrow: "Product",
              title: "Fan reporters turn sources into news",
              body:
                "Source scenes become four-cut reports and previews that build character memory and source consumption.",
            },
            {
              eyebrow: "Revenue",
              title: "Source opens and purchase assists are recorded",
              body:
                "Reactions from news continue into source views, paid requests, purchases, and reward criteria.",
            },
            {
              eyebrow: "Moat",
              title: "Content DB and contribution ledger compound together",
              body:
                "Characters, reports, previews, and settlement events become more defensible as they connect.",
            },
          ],
        },
        inquiryForm: {
          asideItems: [
            "Investment, strategic partnership, and media inquiries are reviewed by the team.",
            "The context you share helps us prepare follow-up materials or meeting options.",
            "Your inquiry is recorded so the team can reply through the email you provide.",
          ],
          asideTitle: "What happens after submission",
          body:
            "Leave a note about AIAVpark's business structure, investment review, or partnership potential without leaving this page.",
          emailLabel: "Email",
          emailPlaceholder: "name@company.com",
          errorMessages: {
            blocked:
              "The message includes terms that cannot be accepted. Please revise it and try again.",
            duplicate:
              "The same inquiry has already been submitted. The team will review it and follow up.",
            fallback: "Failed to submit the inquiry. Please try again shortly.",
            invalidEmail: "Please enter a reachable email address.",
            messageRequired: "Please enter a message with at least 10 characters.",
            nameRequired: "Please enter your name.",
            rateLimited:
              "Too many inquiries were submitted in a short time. Please try again later.",
          },
          eyebrow: "Contact",
          messageLabel: "Message",
          messagePlaceholder:
            "Share what you would like to review, your company context, or preferred meeting timing.",
          nameLabel: "Name",
          namePlaceholder: "Alex Kim",
          organizationLabel: "Company",
          organizationPlaceholder: "Company or fund name",
          privacyCta: "View terms",
          privacyNote:
            "Submitted information is used only for inquiry handling and follow-up contact, and retained only as needed for that purpose.",
          responseHint:
            "The team will review your message and reply through the email you provide.",
          submit: "Submit inquiry",
          submitting: "Submitting",
          successBody:
            "We will review your note and follow up through the contact information provided.",
          successTitle: "Inquiry submitted.",
          title: "Send an investment or partnership inquiry",
          typeLabel: "Inquiry type",
          typeOptions: [
            { label: "Investment review", value: "investment" },
            { label: "Strategic partnership", value: "partnership" },
            { label: "Media", value: "media" },
            { label: "Other", value: "other" },
          ],
        },
        portalStrategy: {
          body:
            "The goal is not to copy illegal distribution, but to legally adopt the product structure that makes people return: fast updates, serialized consumption, rankings, free previews, and community contribution. AIAVpark should become the update hub for rights-owned AI character content.",
          ctaCharacters: "View character portals",
          ctaNews: "View latest updates",
          ctaReports: "Join as reporter",
          eyebrow: "Legal Content Portal Strategy",
          proofLabel: "Start from live data",
          title:
            "AIAVpark should become the legal content portal for AI characters",
          modules: [
            {
              label: "01 Update",
              title: "A daily latest-update home",
              body:
                "Put latest reports, new vlogs, and source previews in one place so users build a habit of checking in.",
            },
            {
              label: "02 Episodes",
              title: "Serialized consumption by character",
              body:
                "Structure character channels like seasons and episodes so one view leads into the next report and source.",
            },
            {
              label: "03 Rankings",
              title: "Today’s popular and rising rankings",
              body:
                "Show opened sources, rising characters, and top reporters to extend exploration and generate the next click.",
            },
            {
              label: "04 Free → Paid",
              title: "From free teaser to paid source",
              body:
                "Widen free previews before signup, then move high-intent scenes into source opens and purchases.",
            },
            {
              label: "05 Community",
              title: "Fan requests and reporter participation",
              body:
                "Convert want-to-watch, scene requests, report creation, and sharing into rewardable contribution events.",
            },
          ],
          roadmap: [
            {
              label: "Now",
              title: "Turn News home into an update portal",
              body:
                "Strengthen latest, popular, and character-based flows so new users immediately find something to watch.",
            },
            {
              label: "Next",
              title: "Season and episode UX by character",
              body:
                "Bind news, vlogs, source opens, and fan requests inside each character page as a continue-watching loop.",
            },
            {
              label: "Scale",
              title: "Rankings and reward ledger create network effects",
              body:
                "When popular reports and reporter rewards are visible, fans become distribution partners.",
            },
          ],
          stats: {
            characters: "Character portals",
            reports: "Update items",
            sourcePreviews: "Free previews",
          },
        },
        newsroomPreview: {
          label: "EXPOSURE ENTRY",
          title: "One four-cut report becomes the source-consumption entrance",
          body:
            "Lead teasers, reporter-edited cuts, and fan-open votes make readers want the source scene and the next purchase action.",
          flow: ["SNS entry", "Four-cut report", "Source vlog", "Purchase assist"],
          metrics: [
            { label: "Entry", value: "SNS" },
            { label: "Teasers", value: "4 cuts" },
            { label: "Impact", value: "Signal" },
          ],
        },
        vloggerSignal: {
          eyebrow: "Character Curiosity Loop",
          title: "Read the news, watch the source, follow the character",
        },
        modelTitle: "How one shortform source becomes an exposure asset",
        modelBody:
          "News is the exposure layer that creates reactions, and the vlog is the product people consume. The more fans participate, the more character IP, sharing, purchases, and settlement history compound.",
        modelSteps: [
          {
            title: "Persona",
            body:
              "Accumulate the AI character's look, voice, daily life, and world context.",
          },
          {
            title: "One Scene Vlog",
            body:
              "A mobile shortform original where the character faces the camera in one focused scene.",
          },
          {
            title: "Photo News",
            body:
              "Edit lead teasers and scene images into four-cut exposure reports that drive vlog consumption.",
          },
          {
            title: "Participation",
            body:
              "Record requests, want-to-watch votes, reports, shares, and purchases as contribution events.",
          },
          {
            title: "USDT Sharing",
            body:
              "When revenue happens, contribution-based rewards are settled with a transparent USDT record.",
          },
        ],
        participationTitle: "Fan reactions become character IP exposure equity",
        participationBody:
          "Fan actions are tracked by role and impact, separating demand creation, report distribution, and purchase conversion.",
        participationItems: [
          {
            title: "Fans",
            body:
              "Request scenes, vote to unlock, and purchase content to create demand for the next character moment.",
            metric: "Request · Vote · Purchase",
          },
          {
            title: "Fan reporters",
            body:
              "Package vlogs as four-cut exposure reports so more fans discover and consume the source content.",
            metric: "Report · Share · Purchase",
          },
          {
            title: "Vloggers",
            body:
              "Produce public and fan-only vlogs from a character persona and grow the IP catalog.",
            metric: "Create · Upload · Monetize",
          },
        ],
        settlementTitle: "USDT settlement makes fairness visible",
        settlementBody:
          "AIAVpark keeps participation and revenue connected. It records who contributed to revenue and lets members inspect settlement outcomes in USDT terms.",
        settlementItems: [
          "Record purchases, unlocks, and paid requests as revenue events",
          "Record reports, votes, shares, and purchase conversion as contribution events",
          "Connect reward points and USDT payouts through a settlement ledger",
        ],
        settlementEyebrow: "Transparent Settlement",
        ledgerTitle: "Reward records that can be explained in USDT",
        ledgerEyebrow: "Reward Ledger",
        eventLabels: {
          contribution: "Contribution Event",
          revenue: "Revenue Event",
          settlement: "USDT Settlement",
        },
        loopTitle: "Exposure reports bring traffic, vlogs drive consumption, settlement builds trust",
        loopBody:
          "When all three are connected, fans become growth partners for AI character IP instead of passive consumers.",
        ctaTitle: "Start the exposure growth loop from AIAVpark News home",
        ctaBody:
          "Browse four-cut reports and AI characters, then use the reporter desk to create exposure reports from vlog source content.",
        ctaNews: "Newsroom",
        ctaCharacters: "AI characters",
        ctaReports: "Reporter desk",
      };
}

function FeaturePill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/24 bg-black/24 px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.12em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.24)] backdrop-blur">
      <CheckCircle2 className="size-3.5 text-[#44f26e]" />
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
      <Sparkles className="size-4" />
      {children}
    </p>
  );
}

function CtaLink({
  children,
  href,
  variant = "primary",
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      className={
        variant === "primary"
          ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 py-3 text-sm font-black !text-[#071108] shadow-[0_20px_45px_rgba(68,242,110,0.24)] transition hover:translate-y-[-1px] hover:bg-[#5dff82]"
          : "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/26 bg-white/10 px-5 py-3 text-sm font-black !text-white backdrop-blur transition hover:border-white/48 hover:bg-white/16"
      }
      href={href}
    >
      {children}
      <ArrowRight className="size-4" />
    </Link>
  );
}

function PlatformMobileQuickNav({ copy }: { copy: ReturnType<typeof getCopy> }) {
  const items = [
    {
      href: "#platform-investor-summary",
      icon: Blocks,
      label: copy.mobileQuickNav.summary,
    },
    {
      href: "#platform-operating-data",
      icon: TrendingUp,
      label: copy.mobileQuickNav.data,
    },
    {
      href: "#platform-inquiry",
      icon: Mail,
      label: copy.mobileQuickNav.inquiry,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-[#f8faf4]/96 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-18px_44px_rgba(17,21,16,0.12)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <Link
              className={
                index === 2
                  ? "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#071108] px-2.5 text-xs font-black !text-white"
                  : "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 text-xs font-black !text-[#111510]"
              }
              href={item.href}
              key={item.href}
            >
              <Icon
                className={
                  index === 2
                    ? "size-3.5 text-[#44f26e]"
                    : "size-3.5 text-[#16702e]"
                }
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: Date | string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function getReportDate(report: FanletterNewsReportDocument) {
  return report.sourcePublishedAt ?? report.createdAt ?? null;
}

function getReportDiversityKey(report: FanletterNewsReportDocument) {
  const title = getArticleDisplayTitle(report.title)
    .trim()
    .toLocaleLowerCase("en-US");
  const contentId = report.contentId.trim();
  const creator =
    report.creatorReferralCode?.trim() ||
    report.creatorName?.trim() ||
    report.reporterName?.trim() ||
    "aiavpark";

  return `${creator.toLocaleLowerCase("en-US")}:${contentId || title || report.reportId}`;
}

function getRepresentativeReports(
  reports: FanletterNewsReportDocument[],
  limit: number,
) {
  const seen = new Set<string>();
  const representativeReports: FanletterNewsReportDocument[] = [];

  for (const report of reports) {
    const key = getReportDiversityKey(report);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    representativeReports.push(report);

    if (representativeReports.length >= limit) {
      break;
    }
  }

  return representativeReports;
}

function canShowReportPreviewVideo(report: FanletterNewsReportDocument) {
  return report.contentMaturityRating !== "nsfw";
}

function NewsHomeReportCard({
  copy,
  href,
  locale,
  previewClipVideoUrl,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  href: string;
  locale: Locale;
  previewClipVideoUrl?: string | null;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(getReportDate(report), locale);
  const normalizedPreviewClipVideoUrl = canShowReportPreviewVideo(report)
    ? previewClipVideoUrl?.trim() ?? ""
    : "";
  const hasPreviewVideo = Boolean(normalizedPreviewClipVideoUrl);
  const accessLabel =
    locale === "ko"
      ? report.priceType === "paid"
        ? "팬 전용"
        : "공개 뉴스"
      : report.priceType === "paid"
        ? "Fan-only"
        : "Public news";

  return (
    <Link
      className="group grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-black/10 bg-white !text-[#111510] shadow-[0_16px_42px_rgba(17,21,16,0.06)] transition hover:border-[#19b84b]/55 hover:shadow-[0_20px_52px_rgba(17,21,16,0.1)] sm:grid-cols-1"
      href={href}
    >
      <div className="relative min-h-[9.5rem] overflow-hidden bg-[#071108] sm:min-h-[15rem]">
        {report.coverImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            fill
            sizes="(max-width: 640px) 7.5rem, (max-width: 1024px) 50vw, 25rem"
            src={report.coverImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              report.coverImageUrl,
            )}
          />
        ) : !hasPreviewVideo ? (
          <div className="flex h-full min-h-[9.5rem] items-center justify-center text-[#44f26e]">
            <Newspaper className="size-10" />
          </div>
        ) : null}
        {hasPreviewVideo ? (
          <FanletterAutoplayVideo
            ariaHidden
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            poster={report.coverImageUrl ?? undefined}
            src={normalizedPreviewClipVideoUrl}
          />
        ) : null}
        {hasPreviewVideo ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] text-[#071108] shadow-[0_10px_24px_rgba(0,0,0,0.22)] sm:left-3 sm:top-3">
            <Clapperboard className="size-3" />
            {copy.homeNews.previewBadge}
          </span>
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,8,0)_38%,rgba(7,17,8,0.58)_100%)]" />
      </div>
      <div className="flex min-w-0 flex-col p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#ecfff0] px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
            {accessLabel}
          </span>
          {publishedAt ? (
            <span className="text-[0.66rem] font-bold text-black/38">
              {publishedAt}
            </span>
          ) : null}
        </div>
        <h3 className="mt-2 line-clamp-2 break-words text-base font-black leading-5 [word-break:keep-all] sm:text-xl sm:leading-7">
          {getArticleDisplayTitle(report.title)}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-black/56 sm:mt-2 sm:text-sm sm:leading-6">
          {report.dek}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <span className="truncate text-xs font-bold text-black/42">
            {report.creatorName || report.reporterName}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-[#16702e]">
            {copy.homeNews.cta}
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function getTeaserGalleryImage(item: FanletterNewsTeaserGalleryItem) {
  return item.teaserImageUrls[0] ?? item.coverImageUrl;
}

function getOptionalTeaserGalleryImage(
  item: FanletterNewsTeaserGalleryItem | null | undefined,
) {
  return item ? getTeaserGalleryImage(item) : null;
}

function PlatformLiveContentWall({
  characters,
  copy,
  locale,
  referralCode,
  reports,
  teaserItems,
}: {
  characters: FanletterNewsCharacterStat[];
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
  reports: FanletterNewsReportDocument[];
  teaserItems: FanletterNewsTeaserGalleryItem[];
}) {
  const primaryTeaser = teaserItems[0] ?? null;
  const primaryReport =
    (primaryTeaser
      ? reports.find((report) => report.reportId === primaryTeaser.reportId)
      : null) ??
    reports[0] ??
    null;
  const primaryHref = primaryReport
    ? buildPathWithReferral(
        `/${locale}/fanletter/news/${primaryReport.reportId}`,
        referralCode,
      )
    : buildPathWithReferral(`/${locale}/fanletter/news`, referralCode);
  const primaryCoverImageUrl =
    primaryTeaser?.coverImageUrl ??
    primaryReport?.coverImageUrl ??
    getOptionalTeaserGalleryImage(teaserItems[1] ?? primaryTeaser) ??
    null;
  const previewTiles = teaserItems.slice(0, 4);
  const reportStack = reports.slice(0, 4);
  const characterRail = characters.slice(0, 3);
  const statTiles = [
    {
      label: copy.liveStudio.liveReports,
      value: reports.length,
    },
    {
      label: copy.liveStudio.sourcePreviews,
      value: teaserItems.length,
    },
    {
      label: copy.homeCharacters.eyebrow,
      value: characters.length,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-[1.35rem] border border-white/18 bg-white/[0.08] p-2.5 shadow-[0_34px_110px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-3">
      <span
        aria-hidden="true"
        className="platform-scan-line pointer-events-none absolute left-0 top-0 z-20 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,215,107,0.86),rgba(68,242,110,0.92),transparent)]"
      />
      <div className="grid gap-2.5">
        <div className="flex items-center justify-between gap-3 px-1.5 pt-1">
          <p className="inline-flex min-w-0 items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#9bffad]">
            <RadioTower className="platform-live-indicator size-3.5 shrink-0" />
            <span className="truncate">{copy.liveStudio.eyebrow}</span>
          </p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#071108]">
            <PlayCircle className="size-3.5" />
            Live
          </span>
        </div>

        <Link
          aria-label={
            primaryReport
              ? `${copy.liveStudio.liveReports}: ${getArticleDisplayTitle(
                  primaryReport.title,
                )}`
              : copy.liveStudio.title
          }
          className="group relative min-h-[14.5rem] overflow-hidden rounded-[1.05rem] border border-white/14 bg-[#071108] !text-white sm:min-h-[23rem] lg:min-h-[28rem]"
          href={primaryHref}
        >
          {primaryCoverImageUrl ? (
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover opacity-72 saturate-[1.08] transition duration-700 group-hover:scale-[1.035]"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 34rem"
              src={primaryCoverImageUrl}
              unoptimized={shouldBypassFanletterImageOptimization(
                primaryCoverImageUrl,
              )}
            />
          ) : null}
          {primaryTeaser?.previewClipVideoUrl ? (
            <FanletterAutoplayVideo
              ariaHidden
              className="absolute inset-0 h-full w-full object-cover opacity-82 saturate-[1.08] transition duration-700 group-hover:scale-[1.035]"
              poster={primaryCoverImageUrl ?? undefined}
              src={primaryTeaser.previewClipVideoUrl}
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,8,0.04)_0%,rgba(7,17,8,0.34)_42%,rgba(7,17,8,0.92)_100%)]" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/46 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/82 backdrop-blur">
              <Clapperboard className="size-3.5 text-[#ffd76b]" />
              {copy.liveStudio.sourceClip}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#44f26e]/36 bg-[#44f26e]/14 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#9bffad] backdrop-blur">
              <Eye className="size-3.5" />
              Signal
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
            <p className="max-w-sm text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#9bffad]">
              {copy.liveStudio.title}
            </p>
            <h2 className="mt-2 line-clamp-2 max-w-md text-2xl font-black leading-tight [word-break:keep-all] sm:text-3xl">
              {primaryReport
                ? getArticleDisplayTitle(primaryReport.title)
                : copy.newsroomPreview.title}
            </h2>
            <p className="mt-2 line-clamp-2 max-w-md text-sm font-bold leading-6 text-white/68">
              {primaryReport?.dek ?? copy.liveStudio.proof}
            </p>
          </div>
        </Link>

        <div className="grid grid-cols-3 gap-2">
          {statTiles.map((stat, index) => (
            <div
              className={
                index === 0
                  ? "min-w-0 rounded-lg bg-[#44f26e] p-2.5 text-[#071108]"
                  : index === 1
                    ? "min-w-0 rounded-lg border border-[#ffd76b]/28 bg-[#ffd76b]/12 p-2.5 text-white"
                    : "min-w-0 rounded-lg border border-[#4cc9f0]/28 bg-[#4cc9f0]/12 p-2.5 text-white"
              }
              key={stat.label}
            >
              <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.1em] opacity-70">
                {stat.label}
              </p>
              <p className="mt-1 text-lg font-black">
                {formatNumber(stat.value, locale)}
              </p>
            </div>
          ))}
        </div>

        {previewTiles.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {previewTiles.map((item) => {
              const imageUrl = getTeaserGalleryImage(item);
              const href = buildPathWithReferral(
                `/${locale}/fanletter/news/${item.reportId}`,
                referralCode,
              );

              return (
                <Link
                  aria-label={`${copy.liveStudio.sourceClip}: ${getArticleDisplayTitle(
                    item.title,
                  )}`}
                  className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-white/12 bg-[#071108] !text-white"
                  href={href}
                  key={item.reportId}
                >
                  {imageUrl ? (
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="object-cover transition duration-500 group-hover:scale-[1.05]"
                      fill
                      sizes="(max-width: 1024px) 22vw, 7rem"
                      src={imageUrl}
                      unoptimized={shouldBypassFanletterImageOptimization(
                        imageUrl,
                      )}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,8,0)_20%,rgba(7,17,8,0.78)_100%)]" />
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate text-[0.55rem] font-black uppercase tracking-[0.08em] text-white/82">
                    {item.creatorName || item.reporterName}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : null}

        <div className="hidden gap-2 rounded-lg border border-white/12 bg-black/24 p-2.5 sm:grid">
          <div className="flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#ffd76b]">
              <Layers3 className="size-3.5" />
              {copy.liveStudio.reportStack}
            </p>
            <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/38">
              {copy.liveStudio.signalRail}
            </p>
          </div>
          <div className="grid gap-1.5">
            {reportStack.map((report, index) => (
              <Link
                aria-label={`${copy.liveStudio.reportStack}: ${getArticleDisplayTitle(
                  report.title,
                )}`}
                className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-2 !text-white transition hover:border-[#44f26e]/44 hover:bg-[#44f26e]/10"
                href={buildPathWithReferral(
                  `/${locale}/fanletter/news/${report.reportId}`,
                  referralCode,
                )}
                key={report.reportId}
              >
                <span className="font-mono text-[0.6rem] font-black text-[#9bffad]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black">
                    {getArticleDisplayTitle(report.title)}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.58rem] font-bold text-white/38">
                    {report.creatorName || report.reporterName}
                  </span>
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-[#44f26e]" />
              </Link>
            ))}
          </div>
        </div>

        {characterRail.length > 0 ? (
          <div className="hidden rounded-lg border border-white/12 bg-white/[0.06] p-2.5 sm:block">
            <p className="inline-flex items-center gap-1.5 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#4cc9f0]">
              <Images className="size-3.5" />
              {copy.liveStudio.characterRail}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {characterRail.map((character) => {
                const imageUrl = getCharacterProfileImages(character)[0] ?? null;

                return (
                  <Link
                    aria-label={`${copy.liveStudio.characterRail}: ${character.name}`}
                    className="group min-w-0 overflow-hidden rounded-lg border border-white/10 bg-black/22 !text-white transition hover:border-[#4cc9f0]/54 hover:bg-[#4cc9f0]/10"
                    href={buildPathWithReferral(
                      `/${locale}/fanletter/news/characters/${character.referralCode}`,
                      referralCode,
                    )}
                    key={character.referralCode}
                  >
                    <span className="relative block aspect-square overflow-hidden bg-[#071108]">
                      {imageUrl ? (
                        <Image
                          alt=""
                          aria-hidden="true"
                          className="object-cover object-top transition duration-500 group-hover:scale-[1.05]"
                          fill
                          sizes="(max-width: 1024px) 28vw, 8rem"
                          src={imageUrl}
                          unoptimized={shouldBypassFanletterImageOptimization(
                            imageUrl,
                          )}
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[#44f26e]">
                          <UserRound className="size-6" />
                        </span>
                      )}
                    </span>
                    <span className="block min-w-0 p-2">
                      <span className="block truncate text-xs font-black">
                        {character.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.56rem] font-black uppercase tracking-[0.08em] text-[#9bffad]">
                        {formatNumber(character.newsCount, locale)}{" "}
                        {copy.homeCharacters.news}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlatformMarketSignal({
  characters,
  copy,
  locale,
  referralCode,
  reports,
  teaserItems,
}: {
  characters: FanletterNewsCharacterStat[];
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
  reports: FanletterNewsReportDocument[];
  teaserItems: FanletterNewsTeaserGalleryItem[];
}) {
  const signalIcons = [Eye, FileText, WalletCards];
  const marketTiles = teaserItems.slice(0, 6);
  const featuredReport = reports[0] ?? null;
  const featuredReportHref = featuredReport
    ? buildPathWithReferral(
        `/${locale}/fanletter/news/${featuredReport.reportId}`,
        referralCode,
      )
    : buildPathWithReferral(`/${locale}/fanletter/news`, referralCode);
  const proofStats = [
    {
      className: "bg-[#44f26e] text-[#071108]",
      label: copy.marketSignal.totalAssets,
      value: reports.length + teaserItems.length + characters.length,
    },
    {
      className: "border border-[#ffd76b]/30 bg-[#ffd76b]/12 text-white",
      label: copy.marketSignal.liveReports,
      value: reports.length,
    },
    {
      className: "border border-[#4cc9f0]/30 bg-[#4cc9f0]/12 text-white",
      label: copy.marketSignal.sourcePreviews,
      value: teaserItems.length,
    },
  ];

  return (
    <section className="relative overflow-hidden border-y border-[#44f26e]/18 bg-[#071108] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(68,242,110,0.16)_0%,rgba(7,17,8,0)_36%,rgba(76,201,240,0.13)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(68,242,110,0.9),rgba(255,215,107,0.85),transparent)]" />
      <div className="relative mx-auto grid max-w-[92rem] gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-start lg:px-8">
        <LandingReveal variant="soft">
          <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7cff98]">
            <TrendingUp className="size-4" />
            {copy.marketSignal.eyebrow}
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
            {copy.marketSignal.title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-white/66 sm:text-base sm:leading-7">
            {copy.marketSignal.body}
          </p>
          <div className="mt-6 border-l-4 border-[#44f26e] bg-white/[0.07] px-4 py-4">
            <p className="text-lg font-black leading-7 [word-break:keep-all] sm:text-2xl sm:leading-9">
              {copy.marketSignal.thesis}
            </p>
            <a
              className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#ffd76b] underline-offset-4 hover:underline"
              href={MARKET_SIGNAL_ARTICLE_URL}
              rel="noreferrer"
              target="_blank"
            >
              {copy.marketSignal.source}
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </LandingReveal>

        <LandingReveal className="grid gap-3" delay={120} variant="soft">
          <div className="grid gap-2 sm:grid-cols-3">
            {proofStats.map((stat) => (
              <div
                className={`min-w-0 rounded-lg p-3 shadow-[0_20px_52px_rgba(0,0,0,0.18)] ${stat.className}`}
                key={stat.label}
              >
                <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.12em] opacity-70">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-black">
                  {formatNumber(stat.value, locale)}
                </p>
              </div>
            ))}
          </div>

          {marketTiles.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {marketTiles.map((item, index) => {
                const imageUrl = getTeaserGalleryImage(item);
                const href = buildPathWithReferral(
                  `/${locale}/fanletter/news/${item.reportId}`,
                  referralCode,
                );

                return (
                  <Link
                    className={
                      index === 0
                        ? "group relative col-span-2 row-span-2 aspect-[4/5] overflow-hidden rounded-lg border border-white/14 bg-black !text-white"
                        : "group relative aspect-[4/5] overflow-hidden rounded-lg border border-white/14 bg-black !text-white"
                    }
                    href={href}
                    key={`${item.reportId}:${index}`}
                  >
                    {imageUrl ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="object-cover transition duration-700 group-hover:scale-[1.045]"
                        fill
                        sizes={
                          index === 0
                            ? "(max-width: 1024px) 66vw, 34rem"
                            : "(max-width: 1024px) 33vw, 13rem"
                        }
                        src={imageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          imageUrl,
                        )}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,8,0.02)_0%,rgba(7,17,8,0.18)_42%,rgba(7,17,8,0.82)_100%)]" />
                    <span className="absolute bottom-2 left-2 right-2 truncate text-[0.58rem] font-black uppercase tracking-[0.1em] text-white/82">
                      {item.creatorName || item.reporterName}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : null}

          <div className="grid gap-2 lg:grid-cols-3">
            {copy.marketSignal.tracks.map((track, index) => {
              const Icon = signalIcons[index] ?? Sparkles;

              return (
                <div
                  className="min-w-0 rounded-lg border border-white/12 bg-white/[0.07] p-4"
                  key={track.kicker}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                      {track.kicker}
                    </p>
                    <Icon className="size-4 shrink-0 text-[#ffd76b]" />
                  </div>
                  <h3 className="mt-3 text-lg font-black leading-6 [word-break:keep-all]">
                    {track.title}
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/56">
                    {track.body}
                  </p>
                </div>
              );
            })}
          </div>

          {featuredReport ? (
            <Link
              className="group grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-[#44f26e]/32 bg-[#44f26e]/12 px-4 py-3 !text-white transition hover:border-[#44f26e]/72 hover:bg-[#44f26e]/18"
              href={featuredReportHref}
            >
              <span className="min-w-0">
                <span className="block text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                  {copy.marketSignal.assetLabel}
                </span>
                <span className="mt-1 block truncate text-base font-black">
                  {getArticleDisplayTitle(featuredReport.title)}
                </span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-[#44f26e] transition group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </LandingReveal>
      </div>
    </section>
  );
}

function PlatformInvestorBrief({
  characters,
  charactersHref,
  copy,
  locale,
  newsHref,
  reports,
  reportsHref,
  teaserItems,
}: {
  characters: FanletterNewsCharacterStat[];
  charactersHref: string;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  newsHref: string;
  reports: FanletterNewsReportDocument[];
  reportsHref: string;
  teaserItems: FanletterNewsTeaserGalleryItem[];
}) {
  const latestReport = reports[0] ?? null;
  const leadingCharacter = characters[0] ?? null;
  const leadingCharacterImageUrl = leadingCharacter
    ? getCharacterProfileImages(leadingCharacter)[0] ?? null
    : null;
  const statTiles = [
    {
      label: copy.investorBrief.stats.reports,
      value: reports.length,
    },
    {
      label: copy.investorBrief.stats.sourcePreviews,
      value: teaserItems.length,
    },
    {
      label: copy.investorBrief.stats.characters,
      value: characters.length,
    },
    {
      label: copy.investorBrief.stats.reportDesk,
      value: "Live",
    },
  ];
  const cardIcons = [Eye, Newspaper, BadgeDollarSign, ShieldCheck];
  const ctaLinks = [
    {
      href: newsHref,
      label: copy.investorBrief.ctaNews,
    },
    {
      href: charactersHref,
      label: copy.investorBrief.ctaCharacters,
    },
    {
      href: reportsHref,
      label: copy.investorBrief.ctaReports,
    },
  ];

  return (
    <section
      className="border-b border-black/10 bg-[#f4f6f0]"
      id="platform-operating-data"
    >
      <div className="mx-auto grid max-w-[92rem] gap-5 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start lg:px-8">
        <LandingReveal
          className="rounded-lg border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(17,21,16,0.08)] sm:p-7"
          variant="soft"
        >
          <SectionLabel>{copy.investorBrief.eyebrow}</SectionLabel>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
            {copy.investorBrief.title}
          </h2>
          <p className="mt-4 text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
            {copy.investorBrief.body}
          </p>

          <div className="mt-6 rounded-lg border border-black/10 bg-[#071108] p-4 text-white sm:p-5">
            <p className="text-[0.64rem] font-black uppercase tracking-[0.16em] text-[#7cff98]">
              {copy.investorBrief.scriptLabel}
            </p>
            <div className="mt-4 grid gap-3">
              {copy.investorBrief.script.map((line, index) => (
                <div
                  className="grid grid-cols-[auto_minmax(0,1fr)] gap-3"
                  key={line}
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#44f26e] font-mono text-xs font-black text-[#071108]">
                    {index + 1}
                  </span>
                  <p className="text-sm font-bold leading-6 text-white/74">
                    {line}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </LandingReveal>

        <LandingReveal className="grid gap-3" delay={120} variant="soft">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {statTiles.map((stat, index) => (
              <div
                className={
                  index === 0
                    ? "min-w-0 rounded-lg bg-[#44f26e] p-3 text-[#071108]"
                    : index === 1
                      ? "min-w-0 rounded-lg border border-[#4cc9f0]/24 bg-[#e9fbff] p-3 text-[#071108]"
                      : index === 2
                        ? "min-w-0 rounded-lg border border-[#ffd76b]/36 bg-[#fff7d8] p-3 text-[#071108]"
                        : "min-w-0 rounded-lg border border-black/10 bg-white p-3 text-[#071108]"
                }
                key={stat.label}
              >
                <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.1em] opacity-62">
                  {stat.label}
                </p>
                <p className="mt-1 truncate text-2xl font-black">
                  {typeof stat.value === "number"
                    ? formatNumber(stat.value, locale)
                    : stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="grid gap-3 sm:grid-cols-2">
              {copy.investorBrief.cards.map((card, index) => {
                const Icon = cardIcons[index] ?? CheckCircle2;

                return (
                  <div
                    className="min-w-0 rounded-lg border border-black/10 bg-white p-4 shadow-[0_16px_42px_rgba(17,21,16,0.05)]"
                    key={card.eyebrow}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
                        {card.eyebrow}
                      </p>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#071108] text-[#44f26e]">
                        <Icon className="size-4" />
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-black leading-6 [word-break:keep-all]">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-black/54">
                      {card.body}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3 rounded-lg border border-black/10 bg-[#071108] p-3 text-white">
              <p className="px-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#7cff98]">
                {copy.investorBrief.evidenceTitle}
              </p>
              {leadingCharacter ? (
                <Link
                  aria-label={`${copy.investorBrief.ctaCharacters}: ${leadingCharacter.name}`}
                  className="group overflow-hidden rounded-lg border border-white/12 bg-white/[0.07] !text-white"
                  href={charactersHref}
                >
                  <span className="relative block aspect-square overflow-hidden bg-black">
                    {leadingCharacterImageUrl ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="object-cover object-top transition duration-500 group-hover:scale-[1.04]"
                        fill
                        sizes="16rem"
                        src={leadingCharacterImageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          leadingCharacterImageUrl,
                        )}
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[#44f26e]">
                        <UserRound className="size-9" />
                      </span>
                    )}
                    <span className="absolute bottom-2 left-2 right-2 truncate text-sm font-black">
                      {leadingCharacter.name}
                    </span>
                  </span>
                </Link>
              ) : null}
              <Link
                aria-label={
                  latestReport
                    ? `${copy.investorBrief.latestReport}: ${getArticleDisplayTitle(
                        latestReport.title,
                      )}`
                    : copy.investorBrief.ctaNews
                }
                className="group min-w-0 rounded-lg border border-[#44f26e]/30 bg-[#44f26e]/12 p-3 !text-white transition hover:border-[#44f26e]/70 hover:bg-[#44f26e]/18"
                href={newsHref}
              >
                <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                  {copy.investorBrief.latestReport}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-black leading-5">
                  {latestReport
                    ? getArticleDisplayTitle(latestReport.title)
                    : copy.investorBrief.noReport}
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-[#9bffad]">
                  {copy.investorBrief.ctaNews}
                  <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {ctaLinks.map((link, index) => (
              <Link
                className={
                  index === 0
                    ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#071108] px-4 py-3 text-sm font-black !text-white transition hover:bg-[#19251a]"
                    : "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-black/12 bg-white px-4 py-3 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                }
                href={link.href}
                key={link.href}
              >
                {link.label}
                <ArrowRight className="size-4 text-[#44f26e]" />
              </Link>
            ))}
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

function PlatformPortalStrategy({
  characters,
  charactersHref,
  copy,
  locale,
  newsHref,
  referralCode,
  reports,
  reportsHref,
  teaserItems,
}: {
  characters: FanletterNewsCharacterStat[];
  charactersHref: string;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  newsHref: string;
  referralCode: string | null;
  reports: FanletterNewsReportDocument[];
  reportsHref: string;
  teaserItems: FanletterNewsTeaserGalleryItem[];
}) {
  const portalStats = [
    {
      label: copy.portalStrategy.stats.reports,
      value: reports.length,
    },
    {
      label: copy.portalStrategy.stats.sourcePreviews,
      value: teaserItems.length,
    },
    {
      label: copy.portalStrategy.stats.characters,
      value: characters.length,
    },
  ];
  const moduleIcons = [RadioTower, Layers3, Trophy, BadgeDollarSign, UsersRound];
  const featuredReports = getRepresentativeReports(reports, 4);
  const featuredCharacters = characters.slice(0, 3);
  const ctaLinks = [
    {
      href: newsHref,
      label: copy.portalStrategy.ctaNews,
    },
    {
      href: charactersHref,
      label: copy.portalStrategy.ctaCharacters,
    },
    {
      href: reportsHref,
      label: copy.portalStrategy.ctaReports,
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-black/10 bg-[#071108] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(68,242,110,0.14)_0%,rgba(7,17,8,0)_44%,rgba(76,201,240,0.1)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(68,242,110,0.86),rgba(255,215,107,0.72),transparent)]" />
      <div className="relative mx-auto max-w-[92rem] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-start">
          <LandingReveal variant="soft">
            <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#7cff98]">
              <Blocks className="size-4" />
              {copy.portalStrategy.eyebrow}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.portalStrategy.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-white/66 sm:text-base sm:leading-7">
              {copy.portalStrategy.body}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {portalStats.map((stat, index) => (
                <div
                  className={
                    index === 0
                      ? "min-w-0 rounded-lg bg-[#44f26e] p-3 text-[#071108]"
                      : index === 1
                        ? "min-w-0 rounded-lg border border-[#4cc9f0]/32 bg-[#4cc9f0]/12 p-3 text-white"
                        : "min-w-0 rounded-lg border border-[#ffd76b]/32 bg-[#ffd76b]/12 p-3 text-white"
                  }
                  key={stat.label}
                >
                  <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.1em] opacity-70">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {formatNumber(stat.value, locale)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {ctaLinks.map((link, index) => (
                <Link
                  className={
                    index === 0
                      ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 py-3 text-sm font-black !text-[#071108] transition hover:bg-[#69ff8c]"
                      : "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/16 bg-white/[0.08] px-4 py-3 text-sm font-black !text-white transition hover:border-[#44f26e]/60 hover:bg-[#44f26e]/12"
                  }
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                  <ArrowRight className="size-4" />
                </Link>
              ))}
            </div>
          </LandingReveal>

          <LandingReveal className="grid gap-3" delay={120} variant="soft">
            <div className="grid gap-2 sm:grid-cols-2">
              {copy.portalStrategy.modules.map((module, index) => {
                const Icon = moduleIcons[index] ?? Sparkles;

                return (
                  <div
                    className={
                      index === 0
                        ? "min-w-0 rounded-lg border border-[#44f26e]/26 bg-[#44f26e]/12 p-4 sm:col-span-2"
                        : "min-w-0 rounded-lg border border-white/12 bg-white/[0.07] p-4"
                    }
                    key={module.label}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                        {module.label}
                      </p>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#ffd76b]">
                        <Icon className="size-4" />
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-black leading-7 [word-break:keep-all]">
                      {module.title}
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
                      {module.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </LandingReveal>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <LandingReveal
            className="rounded-lg border border-white/12 bg-white/[0.06] p-4"
            delay={160}
            variant="soft"
          >
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#7cff98]">
              {copy.portalStrategy.proofLabel}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {featuredReports.map((report, index) => (
                <Link
                  className="group grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-white/10 bg-black/24 px-3 py-2.5 !text-white transition hover:border-[#44f26e]/54 hover:bg-[#44f26e]/10"
                  href={buildPathWithReferral(
                    `/${locale}/fanletter/news/${report.reportId}`,
                    referralCode,
                  )}
                  key={report.reportId}
                >
                  <span className="font-mono text-[0.62rem] font-black text-[#9bffad]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {getArticleDisplayTitle(report.title)}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.58rem] font-bold text-white/38">
                      {report.creatorName || report.reporterName}
                    </span>
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-[#44f26e]" />
                </Link>
              ))}
            </div>
          </LandingReveal>

          <LandingReveal
            className="rounded-lg border border-white/12 bg-white/[0.06] p-4"
            delay={220}
            variant="soft"
          >
            <div className="grid gap-3">
              {copy.portalStrategy.roadmap.map((step, index) => (
                <div
                  className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-black/24 p-3"
                  key={step.label}
                >
                  <span
                    className={
                      index === 0
                        ? "flex size-11 items-center justify-center rounded-full bg-[#44f26e] font-mono text-xs font-black uppercase text-[#071108]"
                        : "flex size-11 items-center justify-center rounded-full border border-white/16 bg-white/[0.08] font-mono text-xs font-black uppercase text-[#9bffad]"
                    }
                  >
                    {step.label}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-black [word-break:keep-all]">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-sm font-semibold leading-6 text-white/54">
                      {step.body}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </LandingReveal>
        </div>

        {featuredCharacters.length > 0 ? (
          <LandingReveal
            className="mt-3 grid gap-2 sm:grid-cols-3"
            delay={260}
            variant="soft"
          >
            {featuredCharacters.map((character) => {
              const imageUrl = getCharacterProfileImages(character)[0] ?? null;

              return (
                <Link
                  className="group grid min-w-0 grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-3 rounded-lg border border-white/12 bg-white/[0.07] p-2.5 !text-white transition hover:border-[#44f26e]/60 hover:bg-[#44f26e]/10"
                  href={buildPathWithReferral(
                    `/${locale}/fanletter/news/characters/${character.referralCode}`,
                    referralCode,
                  )}
                  key={character.referralCode}
                >
                  <span className="relative aspect-square overflow-hidden rounded-lg bg-black">
                    {imageUrl ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="object-cover object-top transition duration-500 group-hover:scale-[1.04]"
                        fill
                        sizes="4.25rem"
                        src={imageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          imageUrl,
                        )}
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[#44f26e]">
                        <UserRound className="size-6" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-black">
                      {character.name}
                    </span>
                    <span className="mt-1 block truncate text-[0.58rem] font-black uppercase tracking-[0.08em] text-[#9bffad]">
                      {formatNumber(character.newsCount, locale)}{" "}
                      {copy.homeCharacters.news}
                    </span>
                  </span>
                </Link>
              );
            })}
          </LandingReveal>
        ) : null}
      </div>
    </section>
  );
}

const CHARACTER_GROWTH_SCORE_WEIGHTS = {
  news: 3,
  reporters: 5,
  source: 8,
  vlogs: 2,
} as const;

function getCharacterProfileImages(character: FanletterNewsCharacterStat) {
  const uniqueImageUrls = new Set<string>();

  return [
    ...character.profileImageUrls,
    character.avatarImageUrl,
    character.representativeReport.coverImageUrl,
  ]
    .map((imageUrl) => imageUrl?.trim() ?? "")
    .filter((imageUrl) => {
      if (!imageUrl || uniqueImageUrls.has(imageUrl)) {
        return false;
      }

      uniqueImageUrls.add(imageUrl);
      return true;
    })
    .slice(0, 5);
}

function CharacterProfileReel({
  character,
  copy,
  locale,
}: {
  character: FanletterNewsCharacterStat;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
}) {
  const profileImages = getCharacterProfileImages(character);
  const hasMultipleImages = profileImages.length > 1;
  const reelImages = hasMultipleImages
    ? [...profileImages, ...profileImages]
    : profileImages;
  const reelStyle = hasMultipleImages
    ? ({
        "--platform-character-reel-duration": `${Math.max(
          9,
          profileImages.length * 2.6,
        )}s`,
        width: `${reelImages.length * 100}%`,
      } as CSSProperties)
    : undefined;
  const reelItemStyle =
    reelImages.length > 0
      ? ({
          width: `${100 / reelImages.length}%`,
        } as CSSProperties)
      : undefined;

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-[#071108]">
      {reelImages.length > 0 ? (
        <div
          className={
            hasMultipleImages
              ? "platform-character-profile-reel flex h-full"
              : "flex h-full w-full"
          }
          style={reelStyle}
        >
          {reelImages.map((imageUrl, index) => (
            <div
              className="relative h-full shrink-0 overflow-hidden"
              key={`${imageUrl}:${index}`}
              style={reelItemStyle}
            >
              <Image
                alt=""
                aria-hidden="true"
                className="object-cover object-top transition duration-500 group-hover:scale-[1.04]"
                fill
                sizes="(max-width: 640px) 5.25rem, 6.5rem"
                src={imageUrl}
                unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-[#44f26e]">
          <UserRound className="size-8" />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,8,0)_34%,rgba(7,17,8,0.7)_100%)]" />

      {hasMultipleImages ? (
        <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 -space-x-1.5">
            {profileImages.slice(0, 3).map((imageUrl) => (
              <span
                className="relative block size-5 shrink-0 overflow-hidden rounded-full border border-white/74 bg-[#071108]"
                key={imageUrl}
              >
                <Image
                  alt=""
                  aria-hidden="true"
                  className="object-cover object-top"
                  fill
                  sizes="1.25rem"
                  src={imageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
                />
              </span>
            ))}
          </div>
          <span className="shrink-0 rounded-full border border-white/24 bg-black/52 px-2 py-1 text-[0.52rem] font-black uppercase tracking-[0.06em] text-[#9bffad] backdrop-blur">
            {copy.homeCharacters.profileCuts(
              formatNumber(profileImages.length, locale),
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function getCharacterGrowthScore(character: FanletterNewsCharacterStat) {
  return (
    character.newsCount * CHARACTER_GROWTH_SCORE_WEIGHTS.news +
    character.publicVideoCount * CHARACTER_GROWTH_SCORE_WEIGHTS.vlogs +
    character.sourceRevealUnlockedCount *
      CHARACTER_GROWTH_SCORE_WEIGHTS.source +
    character.reporterCount * CHARACTER_GROWTH_SCORE_WEIGHTS.reporters
  );
}

function getPercent(value: number, max: number) {
  if (max <= 0 || value <= 0) {
    return 0;
  }

  return Math.max(6, Math.min(100, Math.round((value / max) * 100)));
}

function getSegmentPercent(value: number, total: number) {
  if (total <= 0 || value <= 0) {
    return 0;
  }

  return Math.max(4, (value / total) * 100);
}

function HomeCharacterCard({
  character,
  copy,
  href,
  locale,
}: {
  character: FanletterNewsCharacterStat;
  copy: ReturnType<typeof getCopy>;
  href: string;
  locale: Locale;
}) {
  return (
    <Link
      className="group grid min-w-0 grid-cols-[5.25rem_minmax(0,1fr)] gap-3 rounded-lg border border-white/12 bg-white/[0.07] p-3 !text-white transition hover:border-[#44f26e]/60 hover:bg-white/[0.1] sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:p-4"
      href={href}
    >
      <CharacterProfileReel character={character} copy={copy} locale={locale} />
      <div className="min-w-0">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#7cff98]">
          {copy.homeCharacters.eyebrow}
        </p>
        <h3 className="mt-1 truncate text-xl font-black">{character.name}</h3>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          {[
            {
              label: copy.homeCharacters.news,
              value: character.newsCount,
            },
            {
              label: copy.homeCharacters.vlogs,
              value: character.publicVideoCount,
            },
            {
              label: copy.homeCharacters.source,
              value: character.sourceRevealUnlockedCount,
            },
          ].map((stat) => (
            <div
              className="min-w-0 rounded-md border border-white/10 bg-black/22 px-1.5 py-2"
              key={stat.label}
            >
              <p className="truncate text-sm font-black">
                {formatNumber(stat.value, locale)}
              </p>
              <p className="mt-0.5 truncate text-[0.54rem] font-black uppercase tracking-[0.05em] text-white/42">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-[#9bffad]">
          {copy.homeCharacters.cta}
          <ArrowRight className="size-3.5" />
        </p>
      </div>
    </Link>
  );
}

function CharacterGrowthChart({
  characters,
  copy,
  locale,
  referralCode,
}: {
  characters: FanletterNewsCharacterStat[];
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
}) {
  const rows = characters
    .map((character) => {
      const weightedNews =
        character.newsCount * CHARACTER_GROWTH_SCORE_WEIGHTS.news;
      const weightedVlogs =
        character.publicVideoCount * CHARACTER_GROWTH_SCORE_WEIGHTS.vlogs;
      const weightedSource =
        character.sourceRevealUnlockedCount *
        CHARACTER_GROWTH_SCORE_WEIGHTS.source;
      const weightedReporters =
        character.reporterCount * CHARACTER_GROWTH_SCORE_WEIGHTS.reporters;
      const score = getCharacterGrowthScore(character);
      const segmentTotal =
        weightedNews + weightedVlogs + weightedSource + weightedReporters;

      return {
        character,
        profileImageUrl: getCharacterProfileImages(character)[0] ?? null,
        score,
        segments: {
          news: getSegmentPercent(weightedNews, segmentTotal),
          reporters: getSegmentPercent(weightedReporters, segmentTotal),
          source: getSegmentPercent(weightedSource, segmentTotal),
          vlogs: getSegmentPercent(weightedVlogs, segmentTotal),
        },
      };
    })
    .sort((left, right) => right.score - left.score);
  const maxScore = Math.max(1, ...rows.map((row) => row.score));
  const legendItems = [
    {
      className: "bg-[#44f26e]",
      label: copy.homeGrowth.legend.news,
    },
    {
      className: "bg-[#4cc9f0]",
      label: copy.homeGrowth.legend.vlogs,
    },
    {
      className: "bg-[#ffd76b]",
      label: copy.homeGrowth.legend.source,
    },
    {
      className: "bg-[#b98cff]",
      label: copy.homeGrowth.legend.reporters,
    },
  ];

  return (
    <section className="border-b border-black/10 bg-white">
      <div className="mx-auto grid max-w-[92rem] gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:items-start lg:px-8">
        <LandingReveal className="lg:sticky lg:top-8" variant="soft">
          <SectionLabel>{copy.homeGrowth.eyebrow}</SectionLabel>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
            {copy.homeGrowth.title}
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
            {copy.homeGrowth.body}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {legendItems.map((item) => (
              <span
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f6f8f4] px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.08em] text-black/62"
                key={item.label}
              >
                <span className={`size-2.5 rounded-full ${item.className}`} />
                {item.label}
              </span>
            ))}
          </div>
        </LandingReveal>

        {rows.length > 0 ? (
          <div className="grid gap-3">
            {rows.map((row, index) => {
              const { character } = row;
              const scorePercent = getPercent(row.score, maxScore);
              const href = buildPathWithReferral(
                `/${locale}/fanletter/news/characters/${character.referralCode}`,
                referralCode,
              );

              return (
                <LandingReveal
                  delay={index * 65}
                  key={character.referralCode}
                  variant="soft"
                >
                  <Link
                    className="group block rounded-lg border border-black/10 bg-[#f7f8f4] p-4 !text-[#111510] shadow-[0_16px_42px_rgba(17,21,16,0.06)] transition hover:border-[#19b84b]/55 hover:bg-[#f0fff3] sm:p-5"
                    href={href}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#111510] font-mono text-sm font-black text-[#44f26e]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-full border border-black/10 bg-[#071108]">
                        {row.profileImageUrl ? (
                          <Image
                            alt=""
                            aria-hidden="true"
                            className="object-cover object-top transition duration-500 group-hover:scale-[1.05]"
                            fill
                            sizes="3rem"
                            src={row.profileImageUrl}
                            unoptimized={shouldBypassFanletterImageOptimization(
                              row.profileImageUrl,
                            )}
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-[#44f26e]">
                            <UserRound className="size-5" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xl font-black">
                          {character.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-black uppercase tracking-[0.08em] text-[#16702e]">
                          {copy.homeGrowth.score}{" "}
                          {formatNumber(row.score, locale)}
                        </span>
                      </span>
                      <TrendingUp className="hidden size-5 shrink-0 text-[#16702e] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:block" />
                    </div>

                    <div className="mt-4">
                      <div className="h-4 overflow-hidden rounded-full bg-black/8">
                        <div
                          className="flex h-full overflow-hidden rounded-full shadow-[0_0_28px_rgba(68,242,110,0.22)] transition-[width] duration-700"
                          style={{ width: `${scorePercent}%` }}
                        >
                          <span
                            className="h-full bg-[#44f26e]"
                            style={{ width: `${row.segments.news}%` }}
                          />
                          <span
                            className="h-full bg-[#4cc9f0]"
                            style={{ width: `${row.segments.vlogs}%` }}
                          />
                          <span
                            className="h-full bg-[#ffd76b]"
                            style={{ width: `${row.segments.source}%` }}
                          />
                          <span
                            className="h-full bg-[#b98cff]"
                            style={{ width: `${row.segments.reporters}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                      {[
                        {
                          label: copy.homeGrowth.legend.news,
                          value: character.newsCount,
                        },
                        {
                          label: copy.homeGrowth.legend.vlogs,
                          value: character.publicVideoCount,
                        },
                        {
                          label: copy.homeGrowth.legend.source,
                          value: character.sourceRevealUnlockedCount,
                        },
                        {
                          label: copy.homeGrowth.legend.reporters,
                          value: character.reporterCount,
                        },
                      ].map((stat) => (
                        <div
                          className="min-w-0 rounded-md border border-black/8 bg-white px-1.5 py-2"
                          key={stat.label}
                        >
                          <p className="truncate text-sm font-black">
                            {formatNumber(stat.value, locale)}
                          </p>
                          <p className="mt-0.5 truncate text-[0.54rem] font-black uppercase tracking-[0.04em] text-black/42">
                            {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Link>
                </LandingReveal>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-black/10 bg-[#f7f8f4] p-5 text-sm font-semibold text-black/54">
            {copy.homeGrowth.empty}
          </p>
        )}
      </div>
    </section>
  );
}

function PlatformInvestorSnapshot({
  characters,
  contactHref,
  copy,
  locale,
  reports,
  representativeReports,
  teaserItems,
}: {
  characters: FanletterNewsCharacterStat[];
  contactHref: string;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  reports: FanletterNewsReportDocument[];
  representativeReports: FanletterNewsReportDocument[];
  teaserItems: FanletterNewsTeaserGalleryItem[];
}) {
  const metrics = [
    {
      icon: Newspaper,
      label: copy.investorSnapshot.metrics.reports.label,
      value: formatNumber(reports.length, locale),
      hint: copy.investorSnapshot.metrics.reports.hint,
    },
    {
      icon: Layers3,
      label: copy.investorSnapshot.metrics.representativeReports.label,
      value: formatNumber(representativeReports.length, locale),
      hint: copy.investorSnapshot.metrics.representativeReports.hint,
    },
    {
      icon: PlayCircle,
      label: copy.investorSnapshot.metrics.previews.label,
      value: formatNumber(teaserItems.length, locale),
      hint: copy.investorSnapshot.metrics.previews.hint,
    },
    {
      icon: UsersRound,
      label: copy.investorSnapshot.metrics.characters.label,
      value: formatNumber(characters.length, locale),
      hint: copy.investorSnapshot.metrics.characters.hint,
    },
  ];

  return (
    <section
      className="border-b border-black/10 bg-[#f8faf4]"
      id="platform-investor-summary"
    >
      <div className="mx-auto grid max-w-[92rem] gap-4 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)] lg:items-center lg:px-8">
        <LandingReveal variant="soft">
          <SectionLabel>{copy.investorSnapshot.eyebrow}</SectionLabel>
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
            {copy.investorSnapshot.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
            {copy.investorSnapshot.body}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-9 items-center rounded-full border border-[#16702e]/16 bg-white px-3 text-xs font-black text-[#16702e]">
              {copy.investorSnapshot.basis}
            </span>
            <Link
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-[#071108] px-3 text-xs font-black !text-white transition hover:bg-[#19251a]"
              href={contactHref}
            >
              {copy.investorSnapshot.contactCta}
              <ArrowRight className="size-3.5 text-[#44f26e]" />
            </Link>
          </div>
        </LandingReveal>

        <LandingReveal delay={120} variant="soft">
          <div className="grid gap-px overflow-hidden rounded-lg border border-black/10 bg-black/10 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;

              return (
                <div
                  className={
                    index === 0
                      ? "min-w-0 bg-[#44f26e] p-4 text-[#071108]"
                      : "min-w-0 bg-white p-4 text-[#111510]"
                  }
                  key={metric.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.12em] opacity-62">
                      {metric.label}
                    </p>
                    <Icon className="size-4 shrink-0 text-[#16702e]" />
                  </div>
                  <p className="mt-3 text-3xl font-black leading-none">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-xs font-bold leading-5 opacity-62">
                    {metric.hint}
                  </p>
                </div>
              );
            })}
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

function NewsFlowTicker({
  copy,
  locale,
  referralCode,
  reports,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
  reports: FanletterNewsReportDocument[];
}) {
  if (reports.length === 0) {
    return null;
  }

  const tickerReports = reports.length > 1 ? [...reports, ...reports] : reports;

  return (
    <section className="border-y border-[#44f26e]/18 bg-[#071108] text-white">
      <div className="mx-auto grid max-w-[92rem] gap-3 px-4 py-3 sm:grid-cols-[18rem_minmax(0,1fr)] sm:items-center sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#7cff98]">
            <Sparkles className="size-3.5" />
            {copy.momentumTicker.label}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-white/54">
            {copy.momentumTicker.body}
          </p>
        </div>
        <div className="min-w-0 overflow-hidden">
          <div className="platform-news-marquee flex w-max gap-2 pr-2">
            {tickerReports.map((report, index) => (
              <Link
                className="group inline-flex h-12 min-w-[16rem] max-w-[18rem] shrink-0 items-center justify-between gap-3 rounded-full border border-white/12 bg-white/[0.07] px-3 !text-white transition hover:border-[#44f26e]/62 hover:bg-[#44f26e]/12 sm:h-14 sm:min-w-[21rem] sm:max-w-[23rem] sm:px-4"
                href={buildPathWithReferral(
                  `/${locale}/fanletter/news/${report.reportId}`,
                  referralCode,
                )}
                key={`${report.reportId}:${index}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#7cff98]">
                    {report.creatorName || report.reporterName || "AIAVpark"}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-black">
                    {getArticleDisplayTitle(report.title)}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-[#44f26e] transition group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsPlatformSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const canonical = buildPathWithReferral(
    `/${locale}/fanletter/news/platform`,
    referralCode,
  );

  return {
    title: `${copy.title} | AIAVpark News`,
    description: copy.description,
    alternates: {
      canonical,
    },
    openGraph: {
      description: copy.description,
      images: [
        {
          alt: copy.title,
          height: 1088,
          url: HERO_IMAGE,
          width: 1920,
        },
      ],
      siteName: "AIAVpark News",
      title: `${copy.title} | AIAVpark News`,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      description: copy.description,
      images: [HERO_IMAGE],
      title: `${copy.title} | AIAVpark News`,
    },
  };
}

export default async function FanletterNewsPlatformPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsPlatformSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const [
    landingData,
    latestReports,
    teaserGalleryItems,
    characterDirectoryReports,
  ] = await Promise.all([
    getFanletterLandingData(locale, false),
    getLatestFanletterNewsReports({
      contentMaturityRating: "general",
      limit: 48,
      locale,
      promoteFirstReports: true,
    }),
    getFanletterNewsTeaserGalleryItems({
      limit: 8,
      locale,
    }),
    getFanletterNewsReportsForCharacterDirectory({ locale }),
  ]);
  const latestReportById = new Map(
    latestReports.map((report) => [report.reportId, report] as const),
  );
  const previewClipVideoUrlByReportId = new Map(
    teaserGalleryItems.map(
      (item) => [item.reportId, item.previewClipVideoUrl] as const,
    ),
  );
  const previewClipVideoUrlByContentId = new Map(
    teaserGalleryItems.map(
      (item) => [item.contentId, item.previewClipVideoUrl] as const,
    ),
  );
  const featuredPreviewReports: (typeof latestReports)[number][] = [];

  for (const item of teaserGalleryItems) {
    const report = latestReportById.get(item.reportId);

    if (report) {
      featuredPreviewReports.push(report);
    }
  }
  const featuredPreviewContentIds = new Set(
    featuredPreviewReports.map((report) => report.contentId),
  );
  const representativeReports = getRepresentativeReports(latestReports, 12);
  const featuredReportCandidates = [
    ...featuredPreviewReports,
    ...latestReports.filter(
      (report) => !featuredPreviewContentIds.has(report.contentId),
    ),
  ];
  const featuredReports = getRepresentativeReports(featuredReportCandidates, 6);
  const characterCandidateReports = characterDirectoryReports.filter(
    (report) => report.contentMaturityRating === "general",
  );
  const featuredCharacters = await hydrateFanletterNewsCharacterStats(
    getFanletterNewsCharacterStats(characterCandidateReports, 6, {
      sort: "discovery",
    }),
    { limit: 4, sort: "discovery" },
  );
  const platformMomentumStats: FanletterNewsPlatformMomentumStat[] = [
    {
      ...copy.momentumStats.news,
      value: latestReports.length,
    },
    {
      ...copy.momentumStats.previews,
      value: teaserGalleryItems.length,
    },
    {
      ...copy.momentumStats.characters,
      value: featuredCharacters.length,
    },
  ];
  const heroSlides = [
    ...landingData.featuredVideos,
    ...landingData.featuredPaidVideos,
  ]
    .filter((video) => video.contentMaturityRating !== "nsfw")
    .filter((video) => video.videoUrl.trim())
    .slice(0, 5)
    .map((video) => ({
      authorName: video.authorName,
      coverImageUrl: video.coverImageUrl,
      title: video.title,
      videoUrl: video.videoUrl,
    }));
  const hasHeroVideoSlides = heroSlides.length > 0;
  const homeHref = buildPathWithReferral(
    `/${locale}/fanletter/news/platform`,
    referralCode,
  );
  const newsHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const reportsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    referralCode,
  );
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    referralCode,
  );
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] pb-20 text-[#111510] md:pb-0">
      <PlatformMobileQuickNav copy={copy} />
      <section className="relative min-h-[100svh] overflow-hidden bg-[#071108] text-white sm:min-h-[92svh]">
        {hasHeroVideoSlides ? (
          <FanletterHeroBackgroundCarousel
            mobileLayout="immersive"
            randomizeOnMount
            slides={heroSlides}
          />
        ) : (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover object-center opacity-70"
            fill
            priority
            sizes="100vw"
            src={HERO_IMAGE}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,8,0.04)_0%,rgba(7,17,8,0.1)_30%,rgba(7,17,8,0.74)_58%,#071108_100%)] sm:bg-[linear-gradient(180deg,rgba(7,17,8,0.28)_0%,rgba(7,17,8,0.42)_34%,rgba(7,17,8,0.82)_66%,#071108_100%)] lg:bg-[linear-gradient(90deg,rgba(7,17,8,0.96)_0%,rgba(7,17,8,0.82)_38%,rgba(7,17,8,0.28)_72%,rgba(7,17,8,0.56)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,8,0.28)_0%,rgba(7,17,8,0.12)_58%,rgba(7,17,8,0.08)_100%)] sm:bg-[linear-gradient(90deg,rgba(7,17,8,0.72)_0%,rgba(7,17,8,0.28)_54%,rgba(7,17,8,0.08)_100%)] lg:hidden" />
        <div className="absolute inset-x-0 top-0 h-[22svh] bg-[linear-gradient(180deg,rgba(7,17,8,0.5)_0%,rgba(7,17,8,0.08)_100%)] sm:hidden" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(180deg,rgba(7,17,8,0)_0%,#071108_100%)]" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-[92rem] flex-col px-4 py-4 sm:min-h-[92svh] sm:px-6 sm:py-7 lg:px-8">
          <header className="flex items-center justify-between gap-3 border-b border-white/14 pb-3 sm:gap-4 sm:pb-4">
            <Link
              className="inline-flex min-w-0 items-center gap-2 text-lg font-black !text-white"
              href={homeHref}
            >
              <FanletterBrandMark className="size-9" />
              <span className="truncate">{copy.brand} News</span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <FanletterGlobalLanguageSwitcher
                className="hidden sm:inline-flex"
                compact
                locale={locale}
              />
              <FanletterGlobalLanguageSwitcher
                className="inline-flex sm:hidden"
                compact
                locale={locale}
                tight
              />
              <Link
                className="hidden min-h-10 items-center justify-center rounded-full border border-white/18 px-4 text-xs font-black uppercase tracking-[0.12em] !text-white/82 transition hover:border-[#44f26e] hover:text-white sm:inline-flex"
                href={charactersHref}
              >
                {copy.ctaCharacters}
              </Link>
            </div>
          </header>

          <div className="grid flex-1 content-start gap-5 pb-10 pt-[26svh] sm:gap-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_34rem] lg:items-center lg:py-10">
            <LandingReveal className="max-w-3xl" variant="hero">
              <p className="inline-flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.16em] text-[#7cff98] drop-shadow-[0_2px_16px_rgba(0,0,0,0.42)] sm:text-[0.72rem]">
                <Blocks className="size-4" />
                {copy.eyebrow}
              </p>
              <h1 className="mt-3 max-w-3xl text-[2rem] font-black leading-[1.08] tracking-normal text-white drop-shadow-[0_6px_28px_rgba(0,0,0,0.55)] [word-break:keep-all] sm:mt-5 sm:text-[3.25rem] lg:text-[3.65rem]">
                {copy.heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-white/82 drop-shadow-[0_3px_18px_rgba(0,0,0,0.58)] [word-break:keep-all] sm:mt-5 sm:text-lg sm:leading-8">
                {copy.heroBody}
              </p>

              <div className="mt-6 hidden flex-wrap gap-2 sm:flex">
                {copy.proofBadges.map((badge) => (
                  <FeaturePill key={badge}>{badge}</FeaturePill>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:mt-7 sm:flex sm:flex-row sm:gap-3">
                <CtaLink href={newsHref}>{copy.primaryCta}</CtaLink>
                <CtaLink href={charactersHref} variant="secondary">
                  {copy.secondaryCta}
                </CtaLink>
                <CtaLink href="#platform-inquiry" variant="secondary">
                  {copy.contactCta}
                </CtaLink>
              </div>

            </LandingReveal>

            <LandingReveal delay={120} variant="soft">
              <PlatformLiveContentWall
                characters={featuredCharacters}
                copy={copy}
                locale={locale}
                referralCode={referralCode}
                reports={featuredReports}
                teaserItems={teaserGalleryItems}
              />
            </LandingReveal>

            <LandingReveal
              className="lg:col-span-2"
              delay={180}
              variant="soft"
            >
              <FanletterNewsPlatformMomentum
                flowItems={copy.newsroomPreview.flow}
                locale={locale}
                stats={platformMomentumStats}
              />
            </LandingReveal>
          </div>
        </div>
      </section>

      <NewsFlowTicker
        copy={copy}
        locale={locale}
        referralCode={referralCode}
        reports={featuredReports}
      />

      <PlatformInvestorSnapshot
        characters={featuredCharacters}
        contactHref="#platform-inquiry"
        copy={copy}
        locale={locale}
        reports={latestReports}
        representativeReports={representativeReports}
        teaserItems={teaserGalleryItems}
      />

      <PlatformMarketSignal
        characters={featuredCharacters}
        copy={copy}
        locale={locale}
        referralCode={referralCode}
        reports={latestReports}
        teaserItems={teaserGalleryItems}
      />

      <PlatformInvestorBrief
        characters={featuredCharacters}
        charactersHref={charactersHref}
        copy={copy}
        locale={locale}
        newsHref={newsHref}
        reports={latestReports}
        reportsHref={reportsHref}
        teaserItems={teaserGalleryItems}
      />

      <FanletterNewsPlatformInquiryForm
        copy={copy.inquiryForm}
        locale={locale}
        referralCode={referralCode}
      />

      <PlatformPortalStrategy
        characters={featuredCharacters}
        charactersHref={charactersHref}
        copy={copy}
        locale={locale}
        newsHref={newsHref}
        referralCode={referralCode}
        reports={latestReports}
        reportsHref={reportsHref}
        teaserItems={teaserGalleryItems}
      />

      <section className="mx-auto max-w-[92rem] px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-5 grid gap-3 sm:mb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <SectionLabel>{copy.homeNews.eyebrow}</SectionLabel>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.homeNews.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
              {copy.homeNews.body}
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/12 bg-white px-4 py-2.5 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
            href={newsHref}
          >
            {copy.ctaNews}
            <ArrowRight className="size-4 text-[#16702e]" />
          </Link>
        </div>

        {featuredReports.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {featuredReports.map((report) => (
              <NewsHomeReportCard
                copy={copy}
                href={buildPathWithReferral(
                  `/${locale}/fanletter/news/${report.reportId}`,
                  referralCode,
                )}
                key={report.reportId}
                locale={locale}
                previewClipVideoUrl={
                  previewClipVideoUrlByReportId.get(report.reportId) ??
                  previewClipVideoUrlByContentId.get(report.contentId)
                }
                report={report}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-black/10 bg-white p-5 text-sm font-semibold text-black/54">
            {copy.homeNews.empty}
          </p>
        )}
      </section>

      <section className="border-y border-black/10 bg-[#071108] text-white">
        <div className="mx-auto grid max-w-[92rem] gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:items-start lg:px-8">
          <LandingReveal className="lg:sticky lg:top-8" variant="soft">
            <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              <Sparkles className="size-4" />
              {copy.homeCharacters.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.homeCharacters.title}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/62 sm:text-base sm:leading-7">
              {copy.homeCharacters.body}
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 py-2.5 text-sm font-black !text-[#071108] transition hover:bg-[#69ff8c]"
              href={charactersHref}
            >
              {copy.ctaCharacters}
              <ArrowRight className="size-4" />
            </Link>
          </LandingReveal>

          {featuredCharacters.length > 0 ? (
            <div className="grid gap-3">
              {featuredCharacters.map((character) => (
                <HomeCharacterCard
                  character={character}
                  copy={copy}
                  href={buildPathWithReferral(
                    `/${locale}/fanletter/news/characters/${character.referralCode}`,
                    referralCode,
                  )}
                  key={character.referralCode}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-white/12 bg-white/[0.07] p-5 text-sm font-semibold text-white/58">
              {copy.homeCharacters.empty}
            </p>
          )}
        </div>
      </section>

      <CharacterGrowthChart
        characters={featuredCharacters}
        copy={copy}
        locale={locale}
        referralCode={referralCode}
      />

      <section className="mx-auto max-w-[92rem] px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <LandingReveal className="lg:sticky lg:top-8" variant="soft">
            <SectionLabel>Platform Loop</SectionLabel>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.modelTitle}
            </h2>
          </LandingReveal>

          <div className="grid gap-3">
            {copy.modelSteps.map((step, index) => {
              const icons = [
                Sparkles,
                Clapperboard,
                Newspaper,
                HandHeart,
                WalletCards,
              ];
              const Icon = icons[index] ?? CheckCircle2;

              return (
                <LandingReveal
                  className="grid gap-3 border border-black/10 bg-white p-4 shadow-[0_16px_45px_rgba(17,21,16,0.05)] sm:grid-cols-[auto_minmax(0,1fr)] sm:p-5"
                  delay={index * 55}
                  key={step.title}
                  variant="soft"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#071108] text-[#44f26e]">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black text-[#16702e]">
                        0{index + 1}
                      </span>
                      <h3 className="text-xl font-black">{step.title}</h3>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
                      {step.body}
                    </p>
                  </div>
                </LandingReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white">
        <div className="mx-auto grid max-w-[92rem] gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.82fr)] lg:px-8">
          <LandingReveal variant="soft">
            <SectionLabel>Fan Participation</SectionLabel>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.participationTitle}
            </h2>
          </LandingReveal>

          <div className="grid gap-3">
            {copy.participationItems.map((item, index) => {
              const icons = [UsersRound, FileText, Trophy];
              const Icon = icons[index] ?? UsersRound;

              return (
                <LandingReveal
                  className="rounded-lg border border-black/10 bg-[#f7f8f4] p-4"
                  delay={index * 60}
                  key={item.title}
                  variant="soft"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#ecfff0] text-[#16702e]">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-black">{item.title}</h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-black/58">
                        {item.body}
                      </p>
                      <p className="mt-3 inline-flex max-w-full rounded-full bg-white px-3 py-1.5 font-mono text-[0.68rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
                        <span className="truncate">{item.metric}</span>
                      </p>
                    </div>
                  </div>
                </LandingReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-4 py-9 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-stretch">
          <LandingReveal className="bg-[#071108] p-5 text-white shadow-[0_28px_80px_rgba(7,17,8,0.2)] sm:p-8">
            <p className="inline-flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.18em] text-[#7cff98]">
              <ShieldCheck className="size-4" />
              {copy.settlementEyebrow}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.settlementTitle}
            </h2>

            <div className="mt-7 grid gap-3">
              {copy.settlementItems.map((item) => (
                <div
                  className="flex items-start gap-3 border border-white/12 bg-white/7 p-4"
                  key={item}
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#44f26e]" />
                  <p className="text-sm font-bold leading-6 text-white/76">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </LandingReveal>

          <LandingReveal
            className="grid content-between gap-4 border border-black/10 bg-white p-5 sm:p-6"
            delay={120}
          >
            <div>
              <div className="flex size-14 items-center justify-center rounded-full bg-[#44f26e] text-[#071108]">
                <Coins className="size-7" />
              </div>
              <p className="mt-5 text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                {copy.ledgerEyebrow}
              </p>
              <h3 className="mt-2 text-2xl font-black leading-tight">
                {copy.ledgerTitle}
              </h3>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between border-b border-black/10 py-3 text-sm font-black">
                <span className="text-black/50">{copy.eventLabels.revenue}</span>
                <BadgeDollarSign className="size-5 text-[#16702e]" />
              </div>
              <div className="flex items-center justify-between border-b border-black/10 py-3 text-sm font-black">
                <span className="text-black/50">
                  {copy.eventLabels.contribution}
                </span>
                <Eye className="size-5 text-[#16702e]" />
              </div>
              <div className="flex items-center justify-between py-3 text-sm font-black">
                <span className="text-black/50">
                  {copy.eventLabels.settlement}
                </span>
                <LockKeyhole className="size-5 text-[#16702e]" />
              </div>
            </div>
          </LandingReveal>
        </div>
      </section>

      <section className="border-t border-black/10 bg-[#111510] text-white">
        <div className="mx-auto grid max-w-[92rem] gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
          <LandingReveal variant="soft">
            <p className="text-[0.72rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.loopTitle}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.ctaTitle}
            </h2>
          </LandingReveal>
          <LandingReveal className="grid gap-3 sm:min-w-[17rem]" delay={120}>
            <CtaLink href={newsHref}>{copy.ctaNews}</CtaLink>
            <CtaLink href={charactersHref} variant="secondary">
              {copy.ctaCharacters}
            </CtaLink>
            <CtaLink href={reportsHref} variant="secondary">
              {copy.ctaReports}
            </CtaLink>
          </LandingReveal>
        </div>
      </section>
    </main>
  );
}
