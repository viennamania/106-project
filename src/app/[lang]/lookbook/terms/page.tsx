import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

type Section = { h: string; body: string[] };

const SECTIONS_KO: Section[] = [
  {
    h: "1. 생성 결과물의 소유·라이선스",
    body: [
      "회원이 포인트를 사용해 생성한 룩북 이미지에 대해, 회원은 전 세계·영구·비독점의 상업적 사용권을 가집니다. 본인의 상품 판매·마케팅·SNS·쇼핑몰 게시 등에 자유롭게 사용·복제·수정·배포할 수 있습니다.",
      "AI로 생성된 이미지는 국가에 따라 저작권 보호가 제한될 수 있습니다(인간 창작성 요건). 따라서 본 권리는 저작권 귀속이 아니라 계약상 라이선스로 보장됩니다.",
      "라이선스는 비독점입니다. 동일한 AI 스타·배경이 다른 셀러의 결과물에도 쓰일 수 있습니다.",
    ],
  },
  {
    h: "2. AI 스타(모델) 사용",
    body: [
      "룩북의 모델은 항상 플랫폼이 제공하는 가상의 AI 스타입니다. 회원은 임의의 실존 인물 사진을 모델로 사용할 수 없습니다.",
      "AI 스타는 가상의 캐릭터이며, 결과물이 특정 실존 인물의 추천·보증을 의미하지 않습니다. 회원은 실존 인물의 보증으로 오인되게 사용해서는 안 됩니다.",
      "플랫폼은 AI 스타를 모델로 제공할 권리를 보유하며, 스타 제작자에 대한 보상·동의 정책은 플랫폼 정책을 따릅니다.",
    ],
  },
  {
    h: "3. 회원이 업로드한 의류·자산",
    body: [
      "회원은 업로드하는 의류/상품 이미지에 대한 정당한 권리(소유 또는 사용 허락)를 보유함을 보증합니다.",
      "타인의 상표·디자인·저작물을 무단으로 포함한 이미지를 업로드해서는 안 되며, 이로 인한 분쟁의 책임은 회원에게 있습니다.",
    ],
  },
  {
    h: "4. 플랫폼의 권리",
    body: [
      "플랫폼은 서비스 운영·호스팅·품질개선을 위해 결과물을 처리·저장할 수 있습니다.",
      "플랫폼이 결과물을 자체 홍보·포트폴리오에 사용하려는 경우 별도 동의 또는 옵트아웃 절차를 제공합니다.",
    ],
  },
  {
    h: "5. 포인트·결제",
    body: [
      "룩북은 fanletter 멤버 계정의 포인트(컷당 50P)로 생성됩니다. 생성에는 이메일 로그인과 멤버 가입이 필요합니다.",
      "생성에 실패한 경우 차감된 포인트는 환불됩니다. 정상 생성된 결과물에 대한 포인트는 환불되지 않습니다.",
    ],
  },
  {
    h: "6. 금지 사항",
    body: [
      "불법·미성년·성적·폭력적·혐오 콘텐츠, 타인 권리 침해, 허위 보증·기만적 광고 목적의 사용을 금지합니다.",
    ],
  },
];

const SECTIONS_EN: Section[] = [
  {
    h: "1. Ownership & license of generated results",
    body: [
      "For lookbook images you generate using points, you receive a worldwide, perpetual, non-exclusive commercial license. You may freely use, copy, modify and distribute them for your own product sales, marketing, social media and shop listings.",
      "AI-generated images may have limited copyright protection in some jurisdictions (human-authorship requirements). These rights are therefore granted as a contractual license rather than as copyright ownership.",
      "The license is non-exclusive. The same AI star and scene may appear in other sellers' results.",
    ],
  },
  {
    h: "2. Use of AI stars (models)",
    body: [
      "The model is always a virtual AI star provided by the platform. You may not use photos of real people as the model.",
      "AI stars are fictional characters; results do not imply endorsement by any real person. You must not use them in a way that could be mistaken for a real person's endorsement.",
      "The platform reserves the right to offer AI stars as models; compensation and consent policies for star creators follow platform policy.",
    ],
  },
  {
    h: "3. Garments & assets you upload",
    body: [
      "You warrant that you hold the necessary rights (ownership or permission) to the garment/product images you upload.",
      "You must not upload images that include others' trademarks, designs or copyrighted works without authorization; you are responsible for any resulting disputes.",
    ],
  },
  {
    h: "4. Platform rights",
    body: [
      "The platform may process and store results to operate, host and improve the service.",
      "If the platform wishes to use results for its own promotion or portfolio, it will provide a separate consent or opt-out process.",
    ],
  },
  {
    h: "5. Points & payment",
    body: [
      "Lookbooks are generated with points on a fanletter member account (50P per shot). Generation requires email sign-in and membership.",
      "If a generation fails, the charged points are refunded. Points for successfully generated results are non-refundable.",
    ],
  },
  {
    h: "6. Prohibited use",
    body: [
      "Illegal, minor, sexual, violent or hateful content, infringement of others' rights, and use for false endorsement or deceptive advertising are prohibited.",
    ],
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  return locale === "en"
    ? {
        title: "AI Lookbook Studio — Terms & License",
        description:
          "Ownership and usage rights for generated lookbook images, and AI star model terms.",
      }
    : {
        title: "AI 룩북 스튜디오 — 이용약관 & 라이선스",
        description:
          "생성한 룩북 이미지의 소유·이용 권리, AI 스타 모델 사용 조건.",
      };
}

export default async function SellerLookbookTermsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const en = locale === "en";
  const sections = en ? SECTIONS_EN : SECTIONS_KO;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#16702e]">
        Lookbook Studio
      </p>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-neutral-900">
        {en ? "Terms & License" : "이용약관 & 라이선스"}
      </h1>
      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
        {en
          ? "⚠️ This is a pre-legal-review draft. A lawyer must review it before launch."
          : "⚠️ 본 문서는 법률 검토 전 초안입니다. 정식 서비스 전 반드시 변호사 검토가 필요합니다."}
      </p>

      <div className="mt-6 space-y-6">
        {sections.map((section) => (
          <section key={section.h}>
            <h2 className="text-base font-extrabold text-neutral-900">
              {section.h}
            </h2>
            <ul className="mt-2 space-y-2">
              {section.body.map((line, index) => (
                <li
                  className="text-sm leading-relaxed text-neutral-600"
                  key={index}
                >
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-neutral-400">
        {en
          ? "Contact: platform operator. These terms may change with prior notice."
          : "문의: 플랫폼 운영자. 본 약관은 사전 고지 후 변경될 수 있습니다."}
      </p>
    </div>
  );
}
