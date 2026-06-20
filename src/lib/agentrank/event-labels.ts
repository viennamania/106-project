import type { Locale } from "@/lib/i18n";
import type { AgentRankReputationEventType } from "@/lib/agentrank/reputation-events";

type AgentRankEventLabelMap = Record<AgentRankReputationEventType, string>;

const koEventTypeLabels: AgentRankEventLabelMap = {
  ai_star_discovered: "AI 스타 발견",
  ai_star_spawned: "AI 스타 생성",
  content_engaged: "콘텐츠 참여",
  content_published: "TikTok 콘텐츠 게시 완료",
  content_publish_failed: "TikTok 콘텐츠 게시 실패",
  cp_earned: "CP 획득",
  cp_pool_generated: "CP Pool 생성",
  creator_unlock_evaluated: "권한 활성화 평가",
  creator_unlocked: "크리에이터 권한 활성화",
  creator_social_connected: "TikTok 채널 연결",
  creator_social_disconnected: "TikTok 채널 연결 해제",
  founder_joined: "파운더 참여",
  referral_code_created: "추천 코드 생성",
  referral_shared: "추천 링크 공유",
  referral_converted: "추천 전환",
  source_universe_selected: "출처 AI 스타 유니버스 선택",
  universe_growth: "네트워크 성장",
  x402_mock_payment_intent: "x402 mock 결제 의도",
};

const enEventTypeLabels: AgentRankEventLabelMap = {
  ai_star_discovered: "AI Star Discovery",
  ai_star_spawned: "AI Star Created",
  content_engaged: "Content Engagement",
  content_published: "TikTok Content Published",
  content_publish_failed: "TikTok Content Publish Failed",
  cp_earned: "CP Earned",
  cp_pool_generated: "CP Pool Generated",
  creator_unlock_evaluated: "Creator Permission Evaluation",
  creator_unlocked: "Creator Permission Activated",
  creator_social_connected: "Creator Social Connected",
  creator_social_disconnected: "Creator Social Disconnected",
  founder_joined: "Founder Joined",
  referral_code_created: "Referral Code Created",
  referral_shared: "Referral Shared",
  referral_converted: "Referral Converted",
  source_universe_selected: "Source AI Star Universe Selected",
  universe_growth: "Network Growth",
  x402_mock_payment_intent: "x402 Mock Payment Intent",
};

const jaEventTypeLabels: AgentRankEventLabelMap = {
  ai_star_discovered: "AIスター発見",
  ai_star_spawned: "AIスター作成",
  content_engaged: "コンテンツ参加",
  content_published: "TikTokコンテンツ公開完了",
  content_publish_failed: "TikTokコンテンツ公開失敗",
  cp_earned: "CP獲得",
  cp_pool_generated: "CP Pool生成",
  creator_unlock_evaluated: "Creator権限評価",
  creator_unlocked: "Creator権限有効化",
  creator_social_connected: "TikTokチャンネル連携",
  creator_social_disconnected: "TikTokチャンネル連携解除",
  founder_joined: "Founder参加",
  referral_code_created: "紹介コード作成",
  referral_shared: "紹介リンク共有",
  referral_converted: "紹介転換",
  source_universe_selected: "出所AIスターUniverse選択",
  universe_growth: "ネットワーク成長",
  x402_mock_payment_intent: "x402 mock決済意図",
};

export function getAgentRankEventTypeLabel(
  type: AgentRankReputationEventType,
  locale: Locale,
) {
  if (locale === "ko") {
    return koEventTypeLabels[type];
  }

  if (locale === "ja") {
    return jaEventTypeLabels[type];
  }

  return enEventTypeLabels[type];
}

export function getAgentRankRecordsLabel(locale: Locale) {
  if (locale === "ko") {
    return "평판 기록";
  }

  if (locale === "ja") {
    return "評価記録";
  }

  return "Reputation Records";
}
