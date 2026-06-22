"use client";

import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  CheckCircle2,
  Database,
  ExternalLink,
  LockKeyhole,
  Pencil,
  RefreshCw,
  ShieldCheck,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { FanletterResponsiveActionPanel } from "@/components/fanletter-responsive-action-panel";
import {
  recordFanletterAIStarMockSocialAccount,
  useFanletterAIStarServerSocialAccountState,
} from "@/components/fanletter-social-account-mock-state";
import { FanletterTrackedLink } from "@/components/fanletter-tracked-link";
import { HumanMemberAvatar } from "@/components/fanletter-founder-club-v2";
import type { AgentRankInteractionSource } from "@/lib/agentrank/interaction-events";
import type { Locale } from "@/lib/i18n";
import { fanletterTikTokApiCapabilities } from "@/mock/fanletter-tiktok-api-capabilities";
import {
  buildFanletterSuggestedTikTokHandle,
  buildFanletterTikTokProfileUrl,
  normalizeFanletterTikTokHandle,
  validateFanletterTikTokHandle,
  getFanletterAIStarSocialStatusLabel,
  type FanletterAIStarSocialAccount,
  type FanletterAIStarSocialAccountViewModel,
} from "@/mock/fanletter-social-accounts";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      aiStarBadge: "AI STAR",
      closePanel: "TikTok 연결 패널 닫기",
      conditionComplete: "크리에이터 여정 조건 완료",
      conditionReflected: "상단 진행률에 즉시 반영됨",
      connectedBy: "연결한 크리에이터",
      connectedTitle: "TikTok 채널 연결됨",
      connectComplete: "수동 미리보기 저장",
      connectHelper:
        "AI 스타별 TikTok 채널 연결은 평판 기록으로 남습니다. TikTok 승인 또는 미리보기 연결로 테스트할 수 있습니다.",
      connectRequired: "TikTok 연결 필요",
      connectTitle: "AI 스타별 TikTok 채널",
      creatorPermissionBody:
        "이 작업은 AI 스타의 크리에이터 또는 운영자 권한을 가진 회원만 실행할 수 있습니다.",
      creatorPermissionCta: "크리에이터 권한 활성화 확인",
      creatorPermissionTitle: "크리에이터 / 운영자 권한 필요",
      creatorOnly: "크리에이터 / 운영자 권한 필요",
      eventCreated: "평판 기록 생성됨",
      eventPreview: "평판 기록 미리보기",
      apiCapabilityStatus: {
        app_review_required: "앱 리뷰 필요",
        connected_ready: "연결 후 가능",
        not_available: "자동 수집 전",
        scope_required: "권한 승인 필요",
      },
      apiCapabilityTitle: "TikTok API 적용 범위",
      apiCoverageCta: "커버리지 확인",
      apiCoverageHint: "평판 기록 점검",
      apiCapabilityItems: {
        content_publish: {
          detail:
            "TikTok Content Posting API로 게시한 영상만 status/webhook 평판 기록으로 연결합니다.",
          title: "콘텐츠 게시",
        },
        manual_app_posting: {
          detail:
            "TikTok 앱에서 직접 올린 영상은 아직 자동으로 AI 스타 평판 기록에 반영되지 않습니다.",
          title: "수동 앱 포스팅",
        },
        performance_sync: {
          detail: "조회, 좋아요, 댓글, 공유 수를 Star Score와 평판 기록에 반영합니다.",
          title: "성과 동기화",
        },
        profile_sync: {
          detail: "프로필, 아바타, 표시 이름을 AI 스타 채널 신원으로 저장합니다.",
          title: "프로필 검증",
        },
        video_library: {
          detail: "최근 TikTok 영상을 AI 스타 유니버스에 자동 표시합니다.",
          title: "영상 목록 동기화",
        },
      },
      oauthCallbackFailed: "TikTok 승인 실패",
      oauthCallbackFailedBody:
        "TikTok이 권한 동의를 아직 완료 처리하지 않았습니다. Sandbox 등록 직후에는 테스트 사용자 권한 반영이 최대 1시간 지연될 수 있습니다.",
      oauthCallbackNextAction: "다음 행동",
      oauthCallbackRetryHint:
        "권한 반영 후 같은 AI 스타 채널로 다시 승인을 시도하세요.",
      oauthCallbackSuccess: "TikTok 승인 완료",
      oauthCallbackSuccessBody:
        "AI 스타 TikTok 채널 연결이 서버 평판 기록으로 저장되었습니다.",
      oauthModeLabel: "OAuth 모드",
      flowChannel: "채널 연결",
      flowCreatorJourney: "조건 반영",
      flowRecord: "평판 기록",
      handleHelper: "예: @minseo.golf.ai",
      handleLabel: "TikTok handle",
      handlePreview: "연결될 채널",
      handleReady: "입력 완료",
      handleSuggestion: "추천 handle 적용",
      handleTooShort: "TikTok handle은 최소 2자 이상이어야 합니다.",
      mockConnectError:
        "미리보기 연결을 완료하지 못했습니다. 입력값과 크리에이터 권한을 다시 확인해주세요.",
      mockConnectSaving: "미리보기 연결 저장 중",
      mockOnly:
        "실제 연결 테스트는 위 TikTok 승인 버튼을 사용하세요. 수동 미리보기 저장은 OAuth가 막혔을 때 UI와 평판 기록 흐름을 확인하는 백업 테스트입니다.",
      manualStatus: "수동 / 미리보기",
      oauthReadinessItems: [
        "TikTok 앱과 redirect URI 검증",
        "Sandbox 테스트 사용자와 Login Kit 권한 준비",
        "서버 토큰 저장·갱신·폐기 준비",
      ],
      oauthReadinessChecking: "OAuth 상태 확인 중",
      oauthReadinessBlocked: "TikTok 승인 대기 중",
      oauthReadinessCriteriaUnit: "개 조건 대기",
      oauthReadinessNote:
        "준비 완료 상태에서는 TikTok 승인 버튼으로 실제 AI 스타 채널 연결을 테스트합니다.",
      oauthReadinessPreview: "서버 승인 시작/콜백 경로는 미리보기 상태로 준비됨",
      oauthReadinessReady: "TikTok 승인 테스트 가능",
      oauthReadinessTitle: "TikTok 실제 연결 테스트",
      oauthRequestClientKey: "요청 client key",
      oauthRequestRedirectUri: "Redirect URI",
      oauthRequestTitle: "Sandbox 요청 정보",
      openTiktok: "TikTok 보기",
      panelDescription:
        "회원 개인 계정이 아니라 선택한 AI 스타의 TikTok 채널을 연결합니다.",
      panelTitle: "AI 스타 TikTok 채널 연결",
      primaryCta: "TikTok 연결하기",
      realOAuthCta: "TikTok으로 실제 연결 테스트",
      replaceCta: "채널 변경",
      reputationLedger: "평판 기록 보기",
      reputationLedgerHint: "연결 기록을 평판 기록에서 확인",
      retryOAuthCta: "다시 승인 시도",
      roleCreator: "크리에이터",
      roleOwner: "운영자",
      nextAction: "다음 행동",
      status: "상태",
      storageSource: "저장 출처",
      statusJourneyTitle: "TikTok 연결 상태",
      statusSteps: {
        channel: "채널 연결",
        reputation: "평판 기록",
        server: "서버 저장",
        sync: "동기화 가능",
      },
      sourceLocalMock: "브라우저 미리보기",
      sourceSample: "기본 미리보기",
      sourceServer: "서버 저장됨",
      sourceSyncing: "서버 확인 중",
      syncApiCta: "최근 영상 가져오기",
      syncApiError:
        "TikTok 미리보기 동기화를 완료하지 못했습니다. 연결 상태와 크리에이터 권한을 확인해주세요.",
      syncApiHelper:
        "현재는 미리보기 영상 목록으로 평판 기록 흐름을 확인합니다. 실제 TikTok video.list 권한 승인 후 같은 UI에 최근 영상을 표시합니다.",
      syncApiSaving: "동기화 중",
      syncApiTitle: "최근 TikTok 영상",
      syncResult: "평판 기록 생성됨",
      syncResultMetrics: "영상 {videos}개 · 조회 {views} · 좋아요 {likes}",
      syncVideoComments: "댓글",
      syncVideoLikes: "좋아요",
      syncVideoListTitle: "AI 스타 브이로그 프리뷰",
      syncVideoShares: "공유",
      syncVideoViews: "조회",
      syncRealityItems: [
        {
          detail: "TikTok 채널 연결 기록 생성",
          label: "계정 연결",
          status: "실제 승인",
        },
        {
          detail: "성과 동기화 테스트 기록 생성",
          label: "성과 동기화",
          status: "미리보기",
        },
        {
          detail: "Content Posting API 게시물만 webhook/status 수신",
          label: "게시 연동",
          status: "리뷰 필요",
        },
        {
          detail: "TikTok 앱에서 직접 올린 영상은 자동 반영 전",
          label: "수동 포스팅",
          status: "준비 전",
        },
      ],
      syncRealityTitle: "현재 TikTok 연동 범위",
      sandboxMode: "Sandbox 테스트",
      subtitle: "회원 개인 계정이 아니라 AI 스타 채널입니다.",
      tiktok: "TikTok",
      productionMode: "Production",
    };
  }

  if (locale === "ja") {
    return {
      aiStarBadge: "AI STAR",
      closePanel: "TikTok接続パネルを閉じる",
      conditionComplete: "Creator Journey条件完了",
      conditionReflected: "上部の進行率に即時反映",
      connectedBy: "接続したCreator",
      connectedTitle: "TikTokチャンネル接続済み",
      connectComplete: "手動mock保存",
      connectHelper:
        "AIスター別Creatorチャンネル接続は評判記録になります。TikTok認証またはmock接続でテストできます。",
      connectRequired: "TikTok接続が必要",
      connectTitle: "AIスター別TikTokチャンネル",
      creatorPermissionBody:
        "この操作はAIスターのCreatorまたはOwner権限を持つメンバーだけ実行できます。",
      creatorPermissionCta: "Creator権限有効化を確認",
      creatorPermissionTitle: "Creator / Owner権限が必要",
      creatorOnly: "Creator / Owner権限が必要",
      eventCreated: "評判記録作成済み",
      eventPreview: "評判記録プレビュー",
      apiCapabilityStatus: {
        app_review_required: "アプリ審査が必要",
        connected_ready: "接続後に利用可能",
        not_available: "自動収集中ではない",
        scope_required: "scope承認が必要",
      },
      apiCapabilityTitle: "TikTok API適用範囲",
      apiCoverageCta: "カバレッジ確認",
      apiCoverageHint: "評判記録チェック",
      apiCapabilityItems: {
        content_publish: {
          detail:
            "TikTok Content Posting APIで投稿した動画だけをstatus/webhook評判記録につなげます。",
          title: "コンテンツ投稿",
        },
        manual_app_posting: {
          detail:
            "TikTokアプリで直接投稿した動画は、まだAIスター評判記録へ自動反映されません。",
          title: "手動アプリ投稿",
        },
        performance_sync: {
          detail: "再生、いいね、コメント、共有数をStar Scoreと評判記録に反映します。",
          title: "成果同期",
        },
        profile_sync: {
          detail: "プロフィール、アバター、表示名をAIスターチャンネルIDとして保存します。",
          title: "プロフィール検証",
        },
        video_library: {
          detail: "最近のTikTok動画をAIスターUniverseに自動表示します。",
          title: "動画一覧同期",
        },
      },
      oauthCallbackFailed: "TikTok認証に失敗",
      oauthCallbackFailedBody:
        "TikTokが権限同意をまだ完了処理していません。Sandbox登録直後はテストユーザー権限の反映に最大1時間かかる場合があります。",
      oauthCallbackNextAction: "次のアクション",
      oauthCallbackRetryHint:
        "権限反映後、同じAIスターチャンネルでもう一度認証してください。",
      oauthCallbackSuccess: "TikTok認証完了",
      oauthCallbackSuccessBody:
        "AIスターTikTokチャンネル接続がサーバー評判記録として保存されました。",
      oauthModeLabel: "OAuthモード",
      flowChannel: "チャンネル接続",
      flowCreatorJourney: "条件反映",
      flowRecord: "評判記録",
      handleHelper: "例: @minseo.golf.ai",
      handleLabel: "TikTok handle",
      handlePreview: "接続されるチャンネル",
      handleReady: "入力完了",
      handleSuggestion: "おすすめhandleを適用",
      handleTooShort: "TikTok handleは2文字以上で入力してください。",
      mockConnectError:
        "Mock接続を完了できませんでした。入力値とCreator権限を確認してください。",
      mockConnectSaving: "Mock接続を保存中",
      mockOnly:
        "実接続テストは上のTikTok認証ボタンを使用してください。手動mock保存はOAuthが止まった場合のUI・評判記録確認用です。",
      manualStatus: "manual / mock",
      oauthReadinessItems: [
        "TikTokアプリとredirect URIを検証",
        "SandboxテストユーザーとLogin Kit scopeを準備",
        "サーバートークンの保存・更新・失効を準備",
      ],
      oauthReadinessChecking: "OAuth状態を確認中",
      oauthReadinessBlocked: "実OAuth待機中",
      oauthReadinessCriteriaUnit: "件の条件待ち",
      oauthReadinessNote:
        "準備完了状態ではTikTok認証ボタンで実際のAIスターチャンネル接続をテストします。",
      oauthReadinessPreview:
        "サーバーOAuth start/callback routeはpreview状態で準備済み",
      oauthReadinessReady: "TikTok認証テスト可能",
      oauthReadinessTitle: "TikTok実接続テスト",
      oauthRequestClientKey: "リクエスト client key",
      oauthRequestRedirectUri: "Redirect URI",
      oauthRequestTitle: "Sandboxリクエスト情報",
      openTiktok: "TikTokを見る",
      panelDescription:
        "個人アカウントではなく、選択したAIスターのTikTokチャンネルを接続します。",
      panelTitle: "AIスターTikTokチャンネル接続",
      primaryCta: "TikTok接続",
      realOAuthCta: "TikTokで実接続テスト",
      replaceCta: "チャンネル変更",
      reputationLedger: "評判記録を見る",
      reputationLedgerHint: "接続イベントを評判記録で確認",
      retryOAuthCta: "もう一度認証",
      roleCreator: "Creator",
      roleOwner: "Owner",
      nextAction: "次のアクション",
      status: "状態",
      storageSource: "保存元",
      statusJourneyTitle: "TikTok接続状態",
      statusSteps: {
        channel: "チャンネル接続",
        reputation: "評判記録",
        server: "サーバー保存",
        sync: "同期可能",
      },
      sourceLocalMock: "ブラウザmock",
      sourceSample: "基本mock",
      sourceServer: "サーバー保存済み",
      sourceSyncing: "サーバー確認中",
      syncApiCta: "最近の動画を取得",
      syncApiError:
        "TikTok mock同期を完了できませんでした。接続状態とCreator権限を確認してください。",
      syncApiHelper:
        "現在はmock動画一覧で評判記録フローを確認します。TikTok video.list scope承認後は同じUIに最近の動画を表示します。",
      syncApiSaving: "同期中",
      syncApiTitle: "最近のTikTok動画",
      syncResult: "評判記録作成済み",
      syncResultMetrics: "動画{videos}本 · 再生{views} · いいね{likes}",
      syncVideoComments: "コメント",
      syncVideoLikes: "いいね",
      syncVideoListTitle: "AIスターブイログプレビュー",
      syncVideoShares: "共有",
      syncVideoViews: "再生",
      syncRealityItems: [
        {
          detail: "TikTokチャンネル接続記録を作成",
          label: "アカウント接続",
          status: "実OAuth",
        },
        {
          detail: "成果同期テスト記録を作成",
          label: "成果同期",
          status: "mock",
        },
        {
          detail: "Content Posting API投稿のみwebhook/status受信",
          label: "投稿連携",
          status: "審査必要",
        },
        {
          detail: "TikTokアプリで直接投稿した動画は自動反映前",
          label: "手動投稿",
          status: "準備前",
        },
      ],
      syncRealityTitle: "現在のTikTok連携範囲",
      sandboxMode: "Sandboxテスト",
      subtitle: "個人アカウントではなくAIスターのチャンネルです。",
      tiktok: "TikTok",
      productionMode: "Production",
    };
  }

  return {
    aiStarBadge: "AI STAR",
    closePanel: "Close TikTok connection panel",
    conditionComplete: "Creator Journey condition complete",
    conditionReflected: "Reflected in top progress",
    connectedBy: "Connected Creator",
    connectedTitle: "TikTok channel connected",
    connectComplete: "Save manual mock",
    connectHelper:
      "AI Star channel connection becomes a Reputation Event. You can test it with TikTok authorization or mock connection.",
    connectRequired: "TikTok connection required",
    connectTitle: "AI Star TikTok channel",
    creatorPermissionBody:
      "Only a Creator or Owner for this AI Star can connect the channel.",
    creatorPermissionCta: "Review Creator permission",
    creatorPermissionTitle: "Creator / Owner permission required",
    creatorOnly: "Creator / Owner permission required",
    eventCreated: "Reputation record created",
    eventPreview: "Reputation record preview",
    apiCapabilityStatus: {
      app_review_required: "App review required",
      connected_ready: "Ready after connection",
      not_available: "Not auto-collected",
      scope_required: "Scope approval required",
    },
    apiCapabilityTitle: "TikTok API coverage",
    apiCoverageCta: "Check Coverage",
    apiCoverageHint: "Reputation record review",
    apiCapabilityItems: {
      content_publish: {
        detail:
          "Only posts created through TikTok Content Posting API can flow into status/webhook Reputation Events.",
        title: "Content publishing",
      },
      manual_app_posting: {
        detail:
          "Videos posted directly inside the TikTok app are not automatically reflected in AI Star Reputation Records yet.",
        title: "Manual app posting",
      },
      performance_sync: {
        detail:
          "Use views, likes, comments, and shares in Star Score and Reputation Records.",
        title: "Performance sync",
      },
      profile_sync: {
        detail:
          "Save profile, avatar, and display name as the AI Star channel identity.",
        title: "Profile verification",
      },
      video_library: {
        detail: "Show recent TikTok videos inside the AI Star Universe.",
        title: "Video library sync",
      },
    },
    oauthCallbackFailed: "TikTok authorization failed",
    oauthCallbackFailedBody:
      "TikTok has not completed the scope consent yet. Right after Sandbox registration, target-user permission propagation can take up to 1 hour.",
    oauthCallbackNextAction: "Next action",
    oauthCallbackRetryHint:
      "After permission propagation, retry authorization for the same AI Star channel.",
    oauthCallbackSuccess: "TikTok authorization complete",
    oauthCallbackSuccessBody:
      "The AI Star TikTok channel connection was saved as a server Reputation Event.",
    oauthModeLabel: "OAuth mode",
    flowChannel: "Channel connected",
    flowCreatorJourney: "Condition reflected",
    flowRecord: "Reputation record",
    handleHelper: "Example: @minseo.golf.ai",
    handleLabel: "TikTok handle",
    handlePreview: "Channel to connect",
    handleReady: "Ready",
    handleSuggestion: "Use suggested handle",
    handleTooShort: "TikTok handle must be at least 2 characters.",
    mockConnectError:
      "Mock connection could not be completed. Check the handle and Creator permission.",
    mockConnectSaving: "Saving mock connection",
    mockOnly:
      "Use the TikTok authorization button above for the real connection test. Manual mock save is a backup path for checking UI and Reputation Record flow when OAuth is blocked.",
    manualStatus: "manual / mock",
    oauthReadinessItems: [
      "Verify TikTok app and redirect URI",
      "Prepare Sandbox target user and Login Kit scope",
      "Prepare server token storage, refresh, and revocation",
    ],
    oauthReadinessChecking: "Checking OAuth status",
    oauthReadinessBlocked: "Real OAuth waiting",
    oauthReadinessCriteriaUnit: "criteria pending",
    oauthReadinessNote:
      "When ready, use the TikTok authorization button to test the real AI Star channel connection.",
    oauthReadinessPreview:
      "Server OAuth start/callback routes are ready in preview mode",
    oauthReadinessReady: "TikTok authorization test ready",
    oauthReadinessTitle: "TikTok Real Connection Test",
    oauthRequestClientKey: "Request client key",
    oauthRequestRedirectUri: "Redirect URI",
    oauthRequestTitle: "Sandbox request info",
    openTiktok: "View TikTok",
    panelDescription:
      "Connect the selected AI Star channel, not a personal member account.",
    panelTitle: "Connect AI Star TikTok channel",
    primaryCta: "Connect TikTok",
    realOAuthCta: "Test real connection with TikTok",
    replaceCta: "Change channel",
    reputationLedger: "View Reputation Record",
    reputationLedgerHint: "Check the connection event in reputation records",
    retryOAuthCta: "Try authorization again",
    roleCreator: "Creator",
    roleOwner: "Owner",
    nextAction: "Next action",
    status: "Status",
    storageSource: "Storage Source",
    statusJourneyTitle: "TikTok connection state",
    statusSteps: {
      channel: "Channel connected",
      reputation: "Reputation record",
      server: "Server saved",
      sync: "Sync ready",
    },
    sourceLocalMock: "Browser mock",
    sourceSample: "Default mock",
    sourceServer: "Saved on server",
    sourceSyncing: "Checking server",
    syncApiCta: "Fetch Recent Videos",
    syncApiError:
      "TikTok mock sync could not be completed. Check the connection state and Creator permission.",
    syncApiHelper:
      "This currently uses a mock video list to test the Reputation Record flow. After TikTok video.list scope approval, the same UI can show recent live videos.",
    syncApiSaving: "Syncing",
    syncApiTitle: "Recent TikTok Videos",
    syncResult: "Reputation Record Created",
    syncResultMetrics: "{videos} videos · {views} views · {likes} likes",
    syncVideoComments: "comments",
    syncVideoLikes: "likes",
    syncVideoListTitle: "AI Star vlog preview",
    syncVideoShares: "shares",
    syncVideoViews: "views",
    syncRealityItems: [
      {
        detail: "Creates a TikTok channel connection record",
        label: "Account connection",
        status: "Real OAuth",
      },
      {
        detail: "Creates a performance sync test record",
        label: "Performance sync",
        status: "mock",
      },
      {
        detail: "Only Content Posting API posts can send webhook/status events",
        label: "Publishing",
        status: "Review needed",
      },
      {
        detail: "Direct TikTok app posts are not auto-reflected yet",
        label: "Manual posting",
        status: "Not ready",
      },
    ],
    syncRealityTitle: "Current TikTok integration scope",
    sandboxMode: "Sandbox test",
    subtitle: "This is the AI Star channel, not a personal member account.",
    tiktok: "TikTok",
    productionMode: "Production",
  };
}

function formatConnectedAt(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function formatCompactNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(
    locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US",
    {
      compactDisplay: "short",
      maximumFractionDigits: 1,
      notation: "compact",
    },
  ).format(value);
}

function getTikTokOAuthReasonLabel(reason: string | null, locale: Locale) {
  if (!reason) {
    return null;
  }

  const labels: Record<string, Partial<Record<Locale, string>> & { en: string }> = {
    access_denied: {
      en: "TikTok authorization was cancelled. Start again from this AI Star.",
      ja: "TikTok認証がキャンセルされました。同じAIスターから再試行してください。",
      ko: "TikTok 승인이 취소되었습니다. 이 AI 스타에서 다시 시작하세요.",
    },
    creator_or_owner_required: {
      en: "Creator or Owner permission is required for this AI Star.",
      ja: "このAIスターのCreatorまたはOwner権限が必要です。",
      ko: "이 AI 스타의 Creator 또는 Owner 권한이 필요합니다.",
    },
    fanletter_tiktok_oauth_preview_mode: {
      en: "TikTok OAuth feature flag is not enabled for this mode.",
      ja: "このモードではTikTok OAuth機能が有効化されていません。",
      ko: "이 모드의 TikTok OAuth 기능 플래그가 아직 켜져 있지 않습니다.",
    },
    invalid_oauth_callback: {
      en: "TikTok returned without a valid authorization code. Try again from the same AI Star.",
      ja: "TikTokから有効な認証コードが返りませんでした。同じAIスターから再試行してください。",
      ko: "TikTok 승인 코드가 유효하지 않습니다. 같은 AI 스타에서 다시 시도하세요.",
    },
    member_session_required: {
      en: "Connect your FanLetter account first, then retry TikTok authorization.",
      ja: "先にFanLetterアカウントを接続してからTikTok認証を再試行してください。",
      ko: "먼저 FanLetter 계정을 연결한 뒤 TikTok 승인을 다시 시도하세요.",
    },
    non_sandbox_target: {
      en: "This TikTok account is not recognized as a Sandbox target user for the FanLetter app. Log in with a registered Sandbox username, or add this username in the TikTok Developer Portal and wait for propagation.",
      ja: "このTikTokアカウントはFanLetterアプリのSandbox対象ユーザーとして認識されていません。登録済みSandboxユーザーでログインするか、このユーザー名をTikTok Developer Portalに追加して反映を待ってください。",
      ko: "현재 TikTok 계정이 FanLetter 앱의 Sandbox Target User로 인식되지 않습니다. 등록된 Sandbox 사용자로 로그인하거나, 이 username을 TikTok Developer Portal에 추가한 뒤 반영을 기다려주세요.",
    },
    oauth_state_secret_missing: {
      en: "OAuth state signing is not configured on the server.",
      ja: "サーバーのOAuth state署名設定が未完了です。",
      ko: "서버 OAuth state 서명 설정이 아직 완료되지 않았습니다.",
    },
    tiktok_client_key_missing: {
      en: "TikTok client key is not configured for this mode.",
      ja: "このモードのTikTok client keyが設定されていません。",
      ko: "이 모드의 TikTok client key가 설정되지 않았습니다.",
    },
    tiktok_client_secret_missing: {
      en: "TikTok client secret is not configured for this mode.",
      ja: "このモードのTikTok client secretが設定されていません。",
      ko: "이 모드의 TikTok client secret이 설정되지 않았습니다.",
    },
    tiktok_client_config_missing: {
      en: "TikTok app credentials are not ready on the server.",
      ja: "サーバー側のTikTokアプリ認証情報が未準備です。",
      ko: "서버의 TikTok 앱 인증 정보가 아직 준비되지 않았습니다.",
    },
    tiktok_oauth_failed: {
      en: "TikTok authorization failed. In Sandbox mode, first confirm that the currently logged-in TikTok username is listed as a Target User for this FanLetter app.",
      ja: "TikTok認証に失敗しました。Sandboxモードでは、現在ログイン中のTikTokユーザー名がこのFanLetterアプリのTarget Userに登録されているか確認してください。",
      ko: "TikTok 승인이 실패했습니다. Sandbox 모드에서는 현재 로그인한 TikTok username이 이 FanLetter 앱의 Target User에 등록되어 있는지 먼저 확인하세요.",
    },
    tiktok_profile_fetch_failed: {
      en: "TikTok profile could not be read after authorization. Check the approved scope and retry.",
      ja: "認証後にTikTokプロフィールを取得できませんでした。承認済みscopeを確認して再試行してください。",
      ko: "승인 후 TikTok 프로필을 읽지 못했습니다. 승인된 scope를 확인하고 다시 시도하세요.",
    },
    tiktok_scope_not_authorized: {
      en: "TikTok returned a code, but the approved scope was not enough to read the AI Star channel profile. Keep only user.info.basic fields or approve the required scope in the TikTok Developer Portal.",
      ja: "TikTokからcodeは返りましたが、承認済みscopeではAIスターチャンネルプロフィールを取得できません。user.info.basicの範囲に合わせるか、TikTok Developer Portalで必要なscopeを承認してください。",
      ko: "TikTok 승인 code는 돌아왔지만 AI 스타 채널 프로필을 읽을 scope가 부족했습니다. user.info.basic 필드만 사용하거나 TikTok Developer Portal에서 필요한 scope를 승인하세요.",
    },
    tiktok_token_exchange_failed: {
      en: "TikTok token exchange failed. Confirm the redirect URI and target user, then retry.",
      ja: "TikTokトークン交換に失敗しました。redirect URIとテストユーザーを確認して再試行してください。",
      ko: "TikTok 토큰 교환이 실패했습니다. redirect URI와 테스트 사용자를 확인하고 다시 시도하세요.",
    },
    token_store_not_ready: {
      en: "Server token storage is not ready.",
      ja: "サーバートークン保存がまだ準備できていません。",
      ko: "서버 토큰 저장소가 아직 준비되지 않았습니다.",
    },
  };

  const label = labels[reason];

  return label?.[locale] ?? label?.en ?? reason;
}

function buildTikTokOAuthReturnTo({
  locale,
  oauthMode,
  source,
  starId,
}: {
  locale: Locale;
  oauthMode: "production" | "sandbox";
  source: AgentRankInteractionSource;
  starId: string;
}) {
  const encodedStarId = encodeURIComponent(starId);
  const query = new URLSearchParams();

  if (oauthMode === "sandbox") {
    query.set("tiktokSandbox", "1");
  }

  if (source === "fanletter_my_ai") {
    const queryString = query.toString();

    return `/${locale}/fanletter/my-ai${queryString ? `?${queryString}` : ""}#my-ai-tiktok-test`;
  }

  if (source === "fanletter_creator_unlock") {
    query.set("starId", starId);

    return `/${locale}/fanletter/creator-unlock/tiktok?${query.toString()}`;
  }

  if (source === "fanletter_founder_universe") {
    const queryString = query.toString();

    return `/${locale}/fanletter/${encodedStarId}/universe${queryString ? `?${queryString}` : ""}#tiktok-channel`;
  }

  const queryString = query.toString();

  return `/${locale}/fanletter/${encodedStarId}${queryString ? `?${queryString}` : ""}#tiktok-channel`;
}

type MockSocialAccountConnectResponse =
  | {
      account: FanletterAIStarSocialAccount;
      mode: "mock";
    }
  | {
      error?: string;
      mode?: "mock";
    };

type TikTokMockSyncResponse =
  | {
      mode: "mock";
      snapshot: {
        capabilityId: string;
        eventType: "content_engaged";
        mockOnly: true;
        syncedAt: string;
        totals: {
          comments: number;
          likes: number;
          shares: number;
          videos: number;
          views: number;
        };
        videos: Array<{
          comments: number;
          contentId: string;
          likes: number;
          shares: number;
          title: string;
          videoUrl: string;
          views: number;
        }>;
      };
    }
  | {
      error?: string;
      mode?: "mock";
    };

type TikTokOAuthPreviewResponse =
  | {
      blockedReasons: string[];
      liveReady: boolean;
      mode: "oauth_preview";
      oauth: {
        clientKeyPreview?: string | null;
        mode?: "production" | "sandbox";
        redirectUri: string;
        willRedirect: false;
      };
    }
  | {
      error?: string;
      mode?: "oauth_preview";
    };

export function FanletterAIStarSocialAccountCard({
  className,
  connectHref,
  locale,
  social,
  source,
  starId,
  starName,
  starPortraitImageUrl,
  starPortraitInitials,
}: {
  className?: string;
  connectHref?: string;
  locale: Locale;
  social: FanletterAIStarSocialAccountViewModel;
  source: AgentRankInteractionSource;
  starId: string;
  starName: string;
  starPortraitImageUrl?: string | null;
  starPortraitInitials?: string | null;
}) {
  const copy = getCopy(locale);
  const serverAccountState = useFanletterAIStarServerSocialAccountState({
    platform: social.platform,
    starId,
  });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [handleInput, setHandleInput] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [oauthCallbackStatus, setOauthCallbackStatus] = useState<{
    reason: string | null;
    status: "connected" | "failed";
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncingTikTok, setIsSyncingTikTok] = useState(false);
  const [isOauthPreviewLoading, setIsOauthPreviewLoading] = useState(false);
  const [oauthMode, setOauthMode] = useState<"production" | "sandbox">(
    "sandbox",
  );
  const [oauthPreview, setOauthPreview] =
    useState<TikTokOAuthPreviewResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSnapshot, setSyncSnapshot] = useState<
    Extract<TikTokMockSyncResponse, { snapshot: object }>["snapshot"] | null
  >(null);
  const serverAccount = serverAccountState.account;
  const account = serverAccount;
  const accountSource = serverAccount ? "server" : "none";
  const canSyncTikTok = accountSource === "server";
  const isConnected = Boolean(account);
  const actorMemberId = account?.connectedByMemberId ?? social.creatorMemberId;
  const actorMemberName =
    account?.connectedByMemberName ?? social.creatorMemberName;
  const actorMemberInitials =
    account?.connectedByMemberInitials ?? social.creatorMemberInitials;
  const roleLabel =
    (account?.creatorRoleAtConnection ?? social.creatorRole) === "owner"
      ? copy.roleOwner
      : copy.roleCreator;
  const statusLabel = account
    ? getFanletterAIStarSocialStatusLabel({
        locale,
        status: account.status,
      })
      : social.canConnect
        ? copy.connectRequired
        : copy.creatorOnly;
  const storageSourceLabel =
    serverAccountState.loading
      ? copy.sourceSyncing
      : accountSource === "server"
        ? copy.sourceServer
        : copy.connectRequired;
  const effectiveConnectHref = connectHref ?? "#tiktok-channel";
  const suggestedHandle = useMemo(
    () => buildFanletterSuggestedTikTokHandle({ fallbackId: starId, starName }),
    [starId, starName],
  );
  const handleValidation = validateFanletterTikTokHandle(
    handleInput || suggestedHandle,
  );
  const normalizedHandle = handleValidation.handle;
  const normalizedSuggestedHandle = normalizeFanletterTikTokHandle(suggestedHandle);
  const handlePreviewUrl = normalizedHandle
    ? buildFanletterTikTokProfileUrl(normalizedHandle)
    : "";
  const handleValidationMessage =
    handleValidation.reason === "too_short" ? copy.handleTooShort : null;
  const oauthPreviewBlockedCount =
    oauthPreview && "blockedReasons" in oauthPreview
      ? oauthPreview.blockedReasons.length
      : 0;
  const oauthPreviewStatusLabel = isOauthPreviewLoading
    ? copy.oauthReadinessChecking
    : oauthPreview && "liveReady" in oauthPreview && oauthPreview.liveReady
      ? copy.oauthReadinessReady
      : oauthPreviewBlockedCount > 0
        ? locale === "en"
          ? `${copy.oauthReadinessBlocked} · ${oauthPreviewBlockedCount} ${copy.oauthReadinessCriteriaUnit}`
          : `${copy.oauthReadinessBlocked} · ${oauthPreviewBlockedCount}${copy.oauthReadinessCriteriaUnit}`
        : copy.oauthReadinessPreview;
  const oauthModeLabel =
    oauthMode === "sandbox" ? copy.sandboxMode : copy.productionMode;
  const oauthCallbackReasonLabel = getTikTokOAuthReasonLabel(
    oauthCallbackStatus?.reason ?? null,
    locale,
  );
  const liveOAuthReturnTo = buildTikTokOAuthReturnTo({
    locale,
    oauthMode,
    source,
    starId,
  });
  const liveOAuthStartParams = new URLSearchParams({
    canConnect: String(social.canConnect),
    creatorRole: social.creatorRole,
    locale,
    oauthMode,
    returnTo: liveOAuthReturnTo,
    source,
    starId,
  });
  const liveOAuthStartHref = `/api/fanletter/founder-club/social-account/tiktok/oauth/start?${liveOAuthStartParams.toString()}`;
  const reputationLedgerParams = new URLSearchParams({
    coverageAction: "creator_social_connected",
    limit: "40",
    sort: "latest",
    starId,
    type: "creator_social_connected",
  });
  const reputationLedgerHref = `/${locale}/fanletter/agentrank/events?${reputationLedgerParams.toString()}`;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedOAuthMode = params.get("oauthMode");
    const shouldUseSandbox =
      params.get("tiktokSandbox") === "1" ||
      requestedOAuthMode !== "production";
    const callbackStatus = params.get("tiktok");

    setOauthMode(shouldUseSandbox ? "sandbox" : "production");
    setOauthCallbackStatus(
      callbackStatus === "connected" || callbackStatus === "failed"
        ? {
            reason: params.get("tiktokReason"),
            status: callbackStatus,
          }
        : null,
    );
  }, []);

  useEffect(() => {
    if (!isPanelOpen || !social.canConnect) {
      return;
    }

    const controller = new AbortController();

    async function loadOAuthPreview() {
      setIsOauthPreviewLoading(true);

      try {
        const response = await fetch(
          "/api/fanletter/founder-club/social-account/tiktok/oauth/start",
          {
            body: JSON.stringify({
              canConnect: social.canConnect,
              creatorRole: social.creatorRole,
              locale,
              oauthMode,
              returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
              source,
              starId,
            }),
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
            signal: controller.signal,
          },
        );
        const data = (await response.json().catch(() => null)) as
          | TikTokOAuthPreviewResponse
          | null;

        if (data) {
          setOauthPreview(data);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setOauthPreview(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsOauthPreviewLoading(false);
        }
      }
    }

    void loadOAuthPreview();

    return () => controller.abort();
  }, [
    isPanelOpen,
    locale,
    oauthMode,
    social.canConnect,
    social.creatorRole,
    source,
    starId,
  ]);

  function handleOpenPanel() {
    setHandleInput(account?.handle ?? suggestedHandle);
    setConnectError(null);
    setIsPanelOpen(true);
  }

  function handleUseSuggestedHandle() {
    setHandleInput(normalizedSuggestedHandle);
    setConnectError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!social.canConnect) {
      return;
    }

    const handle = normalizedHandle;

    if (!handle || !handleValidation.ok) {
      setConnectError(handleValidationMessage ?? copy.mockConnectError);
      return;
    }

    setConnectError(null);

    setIsConnecting(true);

    try {
      const response = await fetch(
        "/api/fanletter/founder-club/social-account/mock-connect",
        {
          body: JSON.stringify({
            canConnect: social.canConnect,
            connectedByMemberId: social.creatorMemberId,
            connectedByMemberInitials: social.creatorMemberInitials,
            connectedByMemberName: social.creatorMemberName,
            creatorRoleAtConnection: social.creatorRole,
            handle,
            locale,
            source,
            starId,
            starName,
          }),
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
      const data = (await response.json().catch(() => null)) as
        | MockSocialAccountConnectResponse
        | null;

      if (!response.ok || !data || !("account" in data)) {
        throw new Error(
          data && "error" in data && data.error
            ? data.error
            : copy.mockConnectError,
        );
      }

      recordFanletterAIStarMockSocialAccount(data.account);
      serverAccountState.refresh();
      setIsPanelOpen(false);
    } catch (error) {
      setConnectError(
        error instanceof Error && error.message
          ? error.message
          : copy.mockConnectError,
      );
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleSyncTikTok() {
    if (!account || !canSyncTikTok || isSyncingTikTok) {
      return;
    }

    setIsSyncingTikTok(true);
    setSyncError(null);

    try {
      const response = await fetch(
        "/api/fanletter/founder-club/social-account/tiktok/mock-sync",
        {
          body: JSON.stringify({
            capabilityId: "video_library",
            locale,
            source,
            starId,
            starName,
          }),
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
      const data = (await response.json().catch(() => null)) as
        | TikTokMockSyncResponse
        | null;

      if (!response.ok || !data || !("snapshot" in data)) {
        throw new Error(
          data && "error" in data && data.error ? data.error : copy.syncApiError,
        );
      }

      setSyncSnapshot(data.snapshot);
    } catch (error) {
      setSyncError(
        error instanceof Error && error.message ? error.message : copy.syncApiError,
      );
    } finally {
      setIsSyncingTikTok(false);
    }
  }

  return (
    <>
      <section
        className={joinClasses(
          "w-full min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white text-black shadow-[0_18px_44px_rgba(15,23,42,0.06)]",
          className,
        )}
        id="tiktok-channel"
      >
      <div className="grid min-w-0 gap-0 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 border-b border-zinc-200 bg-zinc-950 p-4 text-white sm:border-b-0 sm:border-r sm:border-zinc-800">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={joinClasses(
                "relative flex size-16 shrink-0 items-center justify-center overflow-hidden border-2 border-violet-400 bg-[linear-gradient(145deg,#8b5cf6,#111827_56%,#22d3ee)] text-sm font-semibold text-white shadow-[0_16px_32px_rgba(15,23,42,0.3)]",
                "[clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)]",
              )}
              style={
                starPortraitImageUrl
                  ? {
                      backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.05), rgba(17,24,39,0.25)), url(${starPortraitImageUrl})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                    }
                  : undefined
              }
            >
              {starPortraitImageUrl ? null : (starPortraitInitials ?? "AI")}
            </div>
            <div className="min-w-0">
              <span className="inline-flex h-6 items-center rounded-full bg-white/12 px-2 text-[0.62rem] font-semibold text-white/82">
                {copy.aiStarBadge}
              </span>
              <p className="mt-1 truncate text-lg font-semibold">{starName}</p>
              <p className="truncate text-xs font-semibold text-white/52">
                {copy.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                <AtSign className="size-4" />
                {copy.tiktok}
              </p>
              <h2 className="mt-2 break-words text-xl font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
                {isConnected ? copy.connectedTitle : copy.connectRequired}
              </h2>
            </div>
            <span
              className={joinClasses(
                "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold",
                isConnected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700",
              )}
            >
              {isConnected ? (
                <BadgeCheck className="size-3.5" />
              ) : (
                <ShieldCheck className="size-3.5" />
              )}
              {statusLabel}
            </span>
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap gap-2">
            {isConnected ? (
              <>
                <span className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span className="min-w-0 truncate">
                    {copy.conditionComplete}
                  </span>
                </span>
                <span className="inline-flex min-h-8 max-w-full items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-600">
                  <span className="min-w-0 truncate">
                    {copy.conditionReflected}
                  </span>
                </span>
              </>
            ) : null}
            <span className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600">
              <Database className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">
                {copy.storageSource} · {storageSourceLabel}
              </span>
            </span>
          </div>

          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              {copy.statusJourneyTitle}
            </p>
            <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-4">
              {[
                {
                  done: isConnected,
                  label: copy.statusSteps.channel,
                },
                {
                  done: canSyncTikTok,
                  label: copy.statusSteps.server,
                },
                {
                  done: canSyncTikTok,
                  label: copy.statusSteps.sync,
                },
                {
                  done: Boolean(syncSnapshot),
                  label: copy.statusSteps.reputation,
                },
              ].map((step, index) => (
                <div
                  className={joinClasses(
                    "flex min-w-0 items-center gap-2 rounded-md border px-2 py-2",
                    step.done
                      ? "border-emerald-200 bg-white text-emerald-800"
                      : "border-zinc-200 bg-white/70 text-zinc-500",
                  )}
                  key={step.label}
                >
                  <span
                    className={joinClasses(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-semibold",
                      step.done ? "bg-emerald-500 text-white" : "bg-zinc-100",
                    )}
                  >
                    {step.done ? <CheckCircle2 className="size-3.5" /> : index + 1}
                  </span>
                  <span className="min-w-0 truncate text-xs font-semibold">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {account && canSyncTikTok ? (
            <div className="mt-3 rounded-lg border border-zinc-950 bg-zinc-950 p-3 text-white shadow-[0_16px_34px_rgba(15,23,42,0.18)]">
              <div className="grid min-w-0 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-white/58">
                    {copy.nextAction}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold leading-tight text-white">
                    {syncSnapshot ? copy.syncResult : copy.syncApiTitle}
                  </h3>
                  <p className="mt-1 text-xs font-medium leading-5 text-white/62 [word-break:keep-all]">
                    {syncSnapshot
                      ? copy.reputationLedgerHint
                      : copy.syncApiHelper}
                  </p>
                </div>
                {syncSnapshot ? (
                  <FanletterTrackedLink
                    agentRank={{
                      eventType: "content_engaged",
                      intent: "creator_tiktok_sync_ledger_opened",
                      source: "fanletter_agentrank",
                      starId,
                    }}
                    className="inline-flex min-h-10 w-full max-w-full min-w-0 box-border items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold !text-zinc-950 transition hover:bg-zinc-100 sm:w-auto"
                    eventName="content_open"
                    href={reputationLedgerHref}
                    metadata={{
                      actorMemberId,
                      actorMemberName,
                      actorType: "creator_member",
                      mockOnly: true,
                      platform: "tiktok",
                      socialApiCapability: syncSnapshot.capabilityId,
                      starId,
                      starName,
                      targetType: "ai_star",
                    }}
                  >
                    <Database className="size-4 shrink-0" />
                    <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
                      {copy.reputationLedger}
                    </span>
                  </FanletterTrackedLink>
                ) : (
                  <button
                    className="inline-flex min-h-10 w-full max-w-full min-w-0 box-border items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    disabled={isSyncingTikTok}
                    onClick={handleSyncTikTok}
                    type="button"
                  >
                    <RefreshCw
                      className={joinClasses(
                        "size-4 shrink-0",
                        isSyncingTikTok && "animate-spin",
                      )}
                    />
                    <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
                      {isSyncingTikTok ? copy.syncApiSaving : copy.syncApiCta}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="text-sm font-semibold text-zinc-950">
                {copy.syncRealityTitle}
              </p>
              <span className="inline-flex min-h-7 shrink-0 items-center rounded-full bg-zinc-950 px-2.5 text-[0.68rem] font-semibold text-white">
                API
              </span>
            </div>
            <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
              {copy.syncRealityItems.map((item, index) => (
                <div
                  className={joinClasses(
                    "min-w-0 rounded-md border p-2.5",
                    index === 0
                      ? isConnected
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-zinc-200 bg-zinc-50"
                      : index === 1
                        ? "border-zinc-200 bg-zinc-50"
                        : index === 2
                          ? "border-amber-200 bg-amber-50"
                          : "border-zinc-200 bg-zinc-50",
                  )}
                  key={item.label}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-zinc-950">
                      {item.label}
                    </p>
                    <span
                      className={joinClasses(
                        "inline-flex min-h-6 shrink-0 items-center rounded-full px-2 text-[0.62rem] font-semibold",
                        index === 0 && isConnected
                          ? "bg-emerald-600 text-white"
                          : index === 2
                            ? "bg-amber-100 text-amber-900"
                            : "bg-white text-zinc-600 ring-1 ring-zinc-200",
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium leading-5 text-zinc-500 [word-break:keep-all]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {oauthCallbackStatus ? (
            <div
              className={joinClasses(
                "mt-4 rounded-lg border p-3 text-sm leading-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] [word-break:keep-all]",
                oauthCallbackStatus.status === "connected"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-950",
              )}
            >
              <div className="flex min-w-0 items-start gap-2">
                {oauthCallbackStatus.status === "connected" ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {oauthCallbackStatus.status === "connected"
                        ? copy.oauthCallbackSuccess
                        : copy.oauthCallbackFailed}
                    </p>
                    <span className="inline-flex min-h-6 items-center rounded-full bg-white/75 px-2 text-[0.66rem] font-semibold text-current ring-1 ring-current/10">
                      {copy.oauthModeLabel}: {oauthModeLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium">
                    {oauthCallbackStatus.status === "connected"
                      ? copy.oauthCallbackSuccessBody
                      : copy.oauthCallbackFailedBody}
                  </p>
                  {oauthCallbackReasonLabel ? (
                    <p className="mt-2 break-words rounded-md bg-white/70 px-2 py-1 text-[0.68rem] font-semibold text-current">
                      {oauthCallbackReasonLabel}
                    </p>
                  ) : null}
                  {oauthCallbackStatus.status === "failed" &&
                  social.canConnect ? (
                    <div className="mt-3 flex min-w-0 flex-col gap-2 rounded-md bg-white/70 p-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] opacity-70">
                          {copy.oauthCallbackNextAction}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold">
                          {oauthMode === "sandbox"
                            ? copy.oauthCallbackRetryHint
                            : copy.oauthReadinessNote}
                        </p>
                      </div>
                      <a
                        className="inline-flex min-h-9 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 sm:w-auto sm:shrink-0"
                        href={liveOAuthStartHref}
                      >
                        <RefreshCw className="size-3.5 shrink-0" />
                        <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
                          {copy.retryOAuthCta}
                        </span>
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {isConnected ? (
            <div className="mt-4 flex min-w-0 flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              {[
                {
                  icon: <AtSign className="size-3.5" />,
                  label: copy.flowChannel,
                },
                {
                  icon: <Database className="size-3.5" />,
                  label: copy.flowRecord,
                },
                {
                  icon: <BadgeCheck className="size-3.5" />,
                  label: copy.flowCreatorJourney,
                },
              ].map((item, index) => (
                <div className="flex min-w-0 items-center gap-1.5" key={item.label}>
                  {index > 0 ? (
                    <ArrowRight className="size-3.5 shrink-0 text-zinc-300" />
                  ) : null}
                  <span
                    className={joinClasses(
                      "inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-[0.68rem] font-semibold leading-tight",
                      index === 1
                        ? "bg-black text-white"
                        : "bg-zinc-100 text-zinc-700",
                    )}
                  >
                    {item.icon}
                    <span className="min-w-0 truncate">{item.label}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="text-sm font-semibold text-zinc-950">
                {copy.apiCapabilityTitle}
              </p>
              <span className="inline-flex min-h-7 shrink-0 items-center rounded-full bg-white px-2.5 text-[0.68rem] font-semibold text-zinc-600 ring-1 ring-zinc-200">
                API
              </span>
            </div>
            <div className="mt-3 grid min-w-0 gap-2">
              {fanletterTikTokApiCapabilities.map((capability) => {
                const item = copy.apiCapabilityItems[capability.id];
                const statusLabel =
                  copy.apiCapabilityStatus[capability.status];
                const coverageParams = new URLSearchParams({
                  coverageAction: capability.agentRankEventType,
                  limit: "120",
                  starId,
                  tiktokCapability: capability.id,
                });
                const coverageHref = `/${locale}/fanletter/agentrank/coverage?${coverageParams.toString()}`;

                return (
                  <div
                    className="min-w-0 rounded-lg border border-zinc-200 bg-white p-2.5"
                    key={capability.id}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs font-medium leading-5 text-zinc-500 [word-break:keep-all]">
                          {item.detail}
                        </p>
                      </div>
                      <span
                        className={joinClasses(
                          "inline-flex min-h-7 shrink-0 items-center rounded-full border px-2 text-[0.64rem] font-semibold",
                          capability.status === "connected_ready"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : capability.status === "scope_required"
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600",
                        )}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                      <span className="inline-flex min-h-6 max-w-full items-center rounded-full bg-zinc-100 px-2 font-mono text-[0.62rem] font-semibold text-zinc-600">
                        <span className="min-w-0 truncate">
                          {capability.endpoint}
                        </span>
                      </span>
                      <span
                        className="inline-flex min-h-6 max-w-full items-center rounded-full bg-zinc-100 px-2 text-[0.62rem] font-semibold text-zinc-600"
                        title={capability.agentRankEventType}
                      >
                        <span className="min-w-0 truncate">
                          {item.title} · {copy.flowRecord}
                        </span>
                      </span>
                    </div>
                    <FanletterTrackedLink
                      agentRank={{
                        eventType: "content_engaged",
                        intent: "creator_tiktok_api_coverage_opened",
                        source,
                        starId,
                      }}
                      className="mt-2 inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 text-[0.68rem] font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                      eventName="content_open"
                      href={coverageHref}
                      metadata={{
                        actorMemberId,
                        actorMemberName,
                        actorType: "creator_member",
                        agentRankEventType: capability.agentRankEventType,
                        endpoint: capability.endpoint,
                        platform: "tiktok",
                        requiredScopes: capability.requiredScopes.join(","),
                        socialApiCapability: capability.id,
                        starId,
                        starName,
                        status: capability.status,
                        targetType: "ai_star",
                      }}
                    >
                      <Database className="size-3.5 shrink-0" />
                      <span className="min-w-0 truncate">
                        {copy.apiCoverageCta}
                      </span>
                      <span className="hidden text-zinc-400 sm:inline">
                        · {copy.apiCoverageHint}
                      </span>
                      <ArrowRight className="size-3.5 shrink-0" />
                    </FanletterTrackedLink>
                  </div>
                );
              })}
            </div>
          </div>

          {account && canSyncTikTok ? (
            <div className="mt-3 grid min-w-0 gap-3 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-950">
                  {copy.syncApiTitle}
                </p>
                <p className="mt-1 text-xs font-medium leading-5 text-zinc-500 [word-break:keep-all]">
                  {copy.syncApiHelper}
                </p>
                {syncSnapshot ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    {copy.syncResult} ·{" "}
                    {copy.syncResultMetrics
                      .replace(
                        "{videos}",
                        new Intl.NumberFormat().format(
                          syncSnapshot.totals.videos,
                        ),
                      )
                      .replace(
                        "{views}",
                        new Intl.NumberFormat().format(
                          syncSnapshot.totals.views,
                        ),
                      )
                      .replace(
                        "{likes}",
                        new Intl.NumberFormat().format(
                          syncSnapshot.totals.likes,
                        ),
                      )}
                  </p>
                ) : null}
                {syncError ? (
                  <p className="mt-2 text-xs font-semibold text-rose-700">
                    {syncError}
                  </p>
                ) : null}
                {syncSnapshot?.videos?.length ? (
                  <div className="mt-3 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                      {copy.syncVideoListTitle}
                    </p>
                    <div className="mt-2 grid min-w-0 gap-2 md:grid-cols-3">
                      {syncSnapshot.videos.map((video, index) => (
                        <FanletterTrackedLink
                          agentRank={{
                            eventType: "content_engaged",
                            intent: "creator_tiktok_synced_video_opened",
                            source,
                            starId,
                          }}
                          className="group grid min-w-0 gap-2 rounded-lg border border-zinc-200 bg-white p-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                          eventName="content_open"
                          href={video.videoUrl}
                          key={video.contentId}
                          metadata={{
                            actorMemberId,
                            actorMemberName,
                            actorType: "creator_member",
                            comments: video.comments,
                            likes: video.likes,
                            mockOnly: true,
                            platform: "tiktok",
                            shares: video.shares,
                            socialApiCapability: syncSnapshot.capabilityId,
                            starId,
                            starName,
                            targetType: "ai_star",
                            tiktokVideoId: video.contentId,
                            views: video.views,
                          }}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                              {index + 1}
                            </span>
                            <ExternalLink className="size-3.5 shrink-0 text-zinc-400 transition group-hover:text-zinc-700" />
                          </div>
                          <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-zinc-950 [word-break:keep-all]">
                            {video.title}
                          </p>
                          <div className="grid min-w-0 grid-cols-2 gap-1.5 text-[0.68rem] font-semibold text-zinc-600">
                            <span className="rounded-md bg-zinc-100 px-2 py-1">
                              {formatCompactNumber(video.views, locale)}{" "}
                              {copy.syncVideoViews}
                            </span>
                            <span className="rounded-md bg-zinc-100 px-2 py-1">
                              {formatCompactNumber(video.likes, locale)}{" "}
                              {copy.syncVideoLikes}
                            </span>
                            <span className="rounded-md bg-zinc-100 px-2 py-1">
                              {formatCompactNumber(video.comments, locale)}{" "}
                              {copy.syncVideoComments}
                            </span>
                            <span className="rounded-md bg-zinc-100 px-2 py-1">
                              {formatCompactNumber(video.shares, locale)}{" "}
                              {copy.syncVideoShares}
                            </span>
                          </div>
                        </FanletterTrackedLink>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              {syncSnapshot ? (
                <button
                  className="inline-flex min-h-10 w-full max-w-full min-w-0 box-border items-center justify-center gap-2 rounded-full border border-zinc-200 bg-zinc-950 px-4 text-sm font-semibold leading-tight text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={isSyncingTikTok}
                  onClick={handleSyncTikTok}
                  type="button"
                >
                  <RefreshCw
                    className={joinClasses(
                      "size-4 shrink-0",
                      isSyncingTikTok && "animate-spin",
                    )}
                  />
                  <span className="min-w-0 truncate">
                    {isSyncingTikTok ? copy.syncApiSaving : copy.syncApiCta}
                  </span>
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                {copy.connectTitle}
              </p>
              <p className="mt-1 truncate text-base font-semibold text-zinc-950">
                {account?.handle ?? copy.primaryCta}
              </p>
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                {account ? formatConnectedAt(account.connectedAt, locale) : roleLabel}
              </p>
              <p className="mt-2 inline-flex min-h-7 max-w-full items-center rounded-full bg-white px-2 text-[0.68rem] font-semibold text-zinc-500 ring-1 ring-zinc-200">
                <span className="min-w-0 truncate">{storageSourceLabel}</span>
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                {copy.connectedBy}
              </p>
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <HumanMemberAvatar
                  member={{
                    initials: actorMemberInitials,
                    name: actorMemberName,
                  }}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-950">
                    {actorMemberName}
                  </p>
                  <p className="truncate text-xs font-semibold text-zinc-500">
                    {roleLabel} · ID {actorMemberId}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {account ? (
                <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                  {copy.nextAction}
                </p>
              ) : null}
              <p className="text-sm font-medium leading-5 text-zinc-600">
                {account ? copy.eventCreated : copy.connectHelper}
              </p>
              {account ? (
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  {copy.reputationLedgerHint}
                </p>
              ) : null}
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                {copy.eventPreview} · {copy.tiktok}
              </p>
            </div>
            {account ? (
              <div className="grid w-full min-w-0 gap-2 sm:w-auto sm:shrink-0 sm:grid-cols-[max-content_max-content]">
                <FanletterTrackedLink
                  agentRank={{
                    eventType: "content_engaged",
                    intent: "creator_social_connection_ledger_opened",
                    source: "fanletter_agentrank",
                    starId,
                  }}
                  className="inline-flex min-h-11 w-full max-w-full min-w-0 box-border items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-center text-sm font-semibold leading-tight !text-white transition hover:bg-zinc-800 sm:w-auto sm:shrink-0"
                  eventName="content_open"
                  href={reputationLedgerHref}
                  metadata={{
                    actorMemberId,
                    actorMemberName,
                    actorType: "creator_member",
                    creatorJourneyConditionId: "creatorSocialConnected",
                    creatorJourneyConditionMet: true,
                    creatorRoleAtConnection: account.creatorRoleAtConnection,
                    ledgerFilter: "creator_social_connected",
                    mockOnly: true,
                    platform: "tiktok",
                    socialConnectionStatus: account.status,
                    starId,
                    starName,
                    targetType: "ai_star",
                  }}
                >
                  <Database className="size-4 shrink-0" />
                  <span className="min-w-0 whitespace-normal text-center sm:whitespace-nowrap [word-break:keep-all]">
                    {copy.reputationLedger}
                  </span>
                </FanletterTrackedLink>
                <FanletterTrackedLink
                  agentRank={{
                    eventType: "content_engaged",
                    intent: "creator_tiktok_channel_opened",
                    source,
                    starId,
                  }}
                  className="inline-flex min-h-11 w-full max-w-full min-w-0 box-border items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-center text-sm font-semibold leading-tight text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 sm:w-auto sm:shrink-0"
                  eventName="external_browser_click"
                  href={account.profileUrl}
                  metadata={{
                    actorMemberId,
                    actorMemberName,
                    actorType: "creator_member",
                    creatorRoleAtConnection: account.creatorRoleAtConnection,
                    mockOnly: true,
                    platform: "tiktok",
                    socialConnectionStatus: account.status,
                    starId,
                    starName,
                    targetType: "ai_star",
                  }}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
                    {copy.openTiktok}
                  </span>
                  <ExternalLink className="size-4 shrink-0" />
                </FanletterTrackedLink>
                {social.canConnect ? (
                  <button
                    className="inline-flex min-h-11 w-full max-w-full min-w-0 box-border items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-center text-sm font-semibold leading-tight text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 sm:col-span-2 sm:w-auto"
                    onClick={handleOpenPanel}
                    type="button"
                  >
                    <Pencil className="size-4 shrink-0" />
                    <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
                      {copy.replaceCta}
                    </span>
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                className="inline-flex min-h-11 w-full max-w-full min-w-0 box-border items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-center text-sm font-semibold leading-tight text-white transition hover:bg-zinc-800 sm:w-auto"
                onClick={handleOpenPanel}
                type="button"
              >
                <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
                  {copy.primaryCta}
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>
      </section>

      <FanletterResponsiveActionPanel
        closeLabel={copy.closePanel}
        description={copy.panelDescription}
        eyebrow={copy.tiktok}
        onClose={() => setIsPanelOpen(false)}
        open={isPanelOpen}
        title={copy.panelTitle}
      >
        <div className="grid w-full max-w-full min-w-0 grid-cols-1 gap-4 overflow-hidden">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={joinClasses(
                  "relative flex size-20 shrink-0 items-center justify-center overflow-hidden border-2 border-violet-500 bg-[linear-gradient(145deg,#8b5cf6,#111827_56%,#22d3ee)] text-sm font-semibold text-white shadow-[0_18px_36px_rgba(15,23,42,0.22)]",
                  "[clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)]",
                )}
                style={
                  starPortraitImageUrl
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.02), rgba(17,24,39,0.22)), url(${starPortraitImageUrl})`,
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                      }
                    : undefined
                }
              >
                {starPortraitImageUrl ? null : (starPortraitInitials ?? "AI")}
              </div>
              <div className="min-w-0">
                <span className="inline-flex h-6 items-center rounded-full bg-black px-2 text-[0.62rem] font-semibold text-white">
                  {copy.aiStarBadge}
                </span>
                <p className="mt-2 truncate text-xl font-semibold text-zinc-950">
                  {starName}
                </p>
                <p className="truncate text-sm font-semibold text-zinc-500">
                  {copy.subtitle}
                </p>
              </div>
            </div>
          </div>

          {social.canConnect ? (
            <form
              className="grid w-full max-w-full min-w-0 grid-cols-1 gap-4 overflow-hidden"
              onSubmit={handleSubmit}
            >
              <label className="grid w-full max-w-full min-w-0 grid-cols-1 gap-2">
                <span className="grid min-w-0 gap-2 sm:flex sm:items-center sm:justify-between sm:gap-3">
                  <span className="text-sm font-semibold text-zinc-800">
                    {copy.handleLabel}
                  </span>
                  <button
                    className="inline-flex min-h-8 max-w-full shrink-0 items-center justify-center justify-self-start gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                    onClick={handleUseSuggestedHandle}
                    type="button"
                  >
                    <WandSparkles className="size-3.5" />
                    {copy.handleSuggestion}
                  </button>
                </span>
                <input
                  className="min-h-12 w-full min-w-0 rounded-xl border border-zinc-200 bg-white px-3 text-base font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-950/8"
                  onChange={(event) => setHandleInput(event.target.value)}
                  placeholder={copy.handleHelper}
                  value={handleInput}
                />
                <span
                  className={joinClasses(
                    "text-xs font-semibold",
                    handleValidation.ok ? "text-emerald-700" : "text-red-700",
                  )}
                >
                  {handleValidation.ok
                    ? `${copy.handleReady} · ${normalizedHandle}`
                    : (handleValidationMessage ?? copy.handleHelper)}
                </span>
              </label>

              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <div className="flex min-w-0 items-start gap-2">
                  <AtSign className="mt-0.5 size-4 shrink-0 text-zinc-700" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-950">
                      {copy.handlePreview}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-zinc-500">
                      {handlePreviewUrl || buildFanletterTikTokProfileUrl(normalizedSuggestedHandle)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <HumanMemberAvatar
                    member={{
                      initials: social.creatorMemberInitials,
                      name: social.creatorMemberName,
                    }}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-950">
                      {social.creatorMemberName}
                    </p>
                    <p className="truncate text-xs font-semibold text-zinc-500">
                      {roleLabel} · ID {social.creatorMemberId}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium leading-5 text-emerald-900">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold">{copy.eventPreview}</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-800/78">
                      {copy.connectedTitle} · {copy.flowRecord}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs font-medium leading-5 text-zinc-500 [word-break:keep-all]">
                {copy.mockOnly}
              </p>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-zinc-700" />
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-950">
                        {copy.oauthReadinessTitle}
                      </p>
                      <span className="inline-flex min-h-7 max-w-full items-center rounded-full border border-zinc-200 bg-white px-2.5 text-[0.68rem] font-semibold text-zinc-700">
                        <span className="min-w-0 truncate">
                          {copy.oauthModeLabel}: {oauthModeLabel}
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1.5">
                      {copy.oauthReadinessItems.map((item) => (
                        <p
                          className="flex min-w-0 items-start gap-2 text-xs font-semibold leading-5 text-zinc-600 [word-break:keep-all]"
                          key={item}
                        >
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-zinc-400" />
                          <span className="min-w-0">{item}</span>
                        </p>
                      ))}
                    </div>
                    <p
                      className={joinClasses(
                        "mt-3 inline-flex min-h-8 max-w-full items-center rounded-full border bg-white px-2.5 text-xs font-semibold leading-5 [word-break:keep-all]",
                        oauthPreview &&
                          "liveReady" in oauthPreview &&
                          oauthPreview.liveReady
                          ? "border-emerald-200 text-emerald-800"
                          : "border-zinc-200 text-zinc-700",
                      )}
                    >
                      {oauthPreviewStatusLabel}
                    </p>
                    <p className="mt-2 text-xs font-medium leading-5 text-zinc-500 [word-break:keep-all]">
                      {copy.oauthReadinessNote}
                    </p>
                    {oauthPreview &&
                    "oauth" in oauthPreview &&
                    oauthPreview.oauth ? (
                      <div className="mt-3 grid min-w-0 gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                          {copy.oauthRequestTitle}
                        </p>
                        <div className="grid min-w-0 gap-1.5 text-xs font-semibold leading-5 text-zinc-700">
                          <p className="grid min-w-0 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
                            <span className="text-zinc-500">
                              {copy.oauthRequestClientKey}
                            </span>
                            <code className="min-w-0 break-all rounded-lg bg-white px-2 py-1 font-mono text-[0.72rem] text-zinc-900 ring-1 ring-zinc-200">
                              {oauthPreview.oauth.clientKeyPreview ?? "-"}
                            </code>
                          </p>
                          <p className="grid min-w-0 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
                            <span className="text-zinc-500">
                              {copy.oauthRequestRedirectUri}
                            </span>
                            <code className="min-w-0 break-all rounded-lg bg-white px-2 py-1 font-mono text-[0.72rem] text-zinc-900 ring-1 ring-zinc-200">
                              {oauthPreview.oauth.redirectUri}
                            </code>
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {oauthPreview &&
                    "liveReady" in oauthPreview &&
                    oauthPreview.liveReady ? (
                      <a
                        className="mt-3 inline-flex min-h-10 w-full max-w-full min-w-0 box-border items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800 sm:w-auto"
                        href={liveOAuthStartHref}
                      >
                        <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
                          {copy.realOAuthCta}
                        </span>
                        <ExternalLink className="size-4 shrink-0" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>

              {connectError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold leading-5 text-red-700 [word-break:keep-all]">
                  {connectError}
                </p>
              ) : null}

              <button
                className="inline-flex min-h-12 w-[min(100%,calc(100vw-3rem))] max-w-full min-w-0 box-border items-center justify-center justify-self-stretch gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                disabled={!handleValidation.ok || isConnecting}
                type="submit"
              >
                <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
                  {isConnecting ? copy.mockConnectSaving : copy.connectComplete}
                </span>
                <BadgeCheck className="size-4 shrink-0" />
              </button>
            </form>
          ) : (
            <div className="grid min-w-0 gap-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
                    <LockKeyhole className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-zinc-950">
                      {copy.creatorPermissionTitle}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-zinc-600 [word-break:keep-all]">
                      {copy.creatorPermissionBody}
                    </p>
                  </div>
                </div>
              </div>

              <a
                className="inline-flex min-h-12 w-full max-w-full min-w-0 box-border items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                href={effectiveConnectHref}
                onClick={() => setIsPanelOpen(false)}
              >
                <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
                  {copy.creatorPermissionCta}
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </a>
            </div>
          )}
        </div>
      </FanletterResponsiveActionPanel>
    </>
  );
}
