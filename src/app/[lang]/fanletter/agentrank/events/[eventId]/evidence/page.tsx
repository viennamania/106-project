import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterAgentRankEvidencePacketPage } from "@/components/fanletter-agentrank-evidence-packet-page";
import {
  getAgentRankEventEvidencePacket,
  normalizeAgentRankEventId,
} from "@/lib/agentrank/evidence-packet";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type AgentRankEvidenceSearchParams = {
  memberEmail?: string | string[];
  starId?: string | string[];
};

function readFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeMemberEmail(value?: string | string[]) {
  const normalized = readFirstParam(value)?.trim().toLowerCase();

  return normalized || null;
}

function getEvidencePacketMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "AgentRank Reputation Event의 Oracle Evidence Packet을 사람이 검토할 수 있는 화면입니다.",
      title: "AgentRank Evidence Packet | FanLetter",
    };
  }

  return {
    description:
      "A human-readable AgentRank Oracle Evidence Packet for a FanLetter Reputation Event.",
    title: "AgentRank Evidence Packet | FanLetter",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string; lang: string }>;
}): Promise<Metadata> {
  const { eventId, lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getEvidencePacketMeta(locale);

  return {
    title: `${meta.title} | ${eventId.slice(0, 18)}`,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/agentrank/events/${eventId}/evidence`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/agentrank/events/${eventId}/evidence`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterAgentRankEvidencePacketRoute({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; lang: string }>;
  searchParams: Promise<AgentRankEvidenceSearchParams>;
}) {
  const [{ eventId: rawEventId, lang }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!hasLocale(lang)) {
    notFound();
  }

  const eventId = normalizeAgentRankEventId(rawEventId);

  if (!eventId) {
    notFound();
  }

  const locale = lang as Locale;
  const starId = normalizeFanletterStarId(readFirstParam(query.starId) ?? null);
  const memberEmail = normalizeMemberEmail(query.memberEmail);
  const result = await getAgentRankEventEvidencePacket({
    eventId,
    memberEmail,
    starId,
  });

  if (!result) {
    notFound();
  }

  return (
    <FanletterAgentRankEvidencePacketPage
      event={result.event}
      locale={locale}
      packet={result.packet}
    />
  );
}
