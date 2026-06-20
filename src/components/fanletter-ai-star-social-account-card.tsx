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
  useFanletterAIStarMockSocialAccount,
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
      conditionComplete: "Creator Journey 조건 완료",
      conditionReflected: "상단 진행률에 즉시 반영됨",
      connectedBy: "연결한 Creator",
      connectedTitle: "TikTok 채널 연결됨",
      connectComplete: "Mock 연결 완료",
      connectHelper:
        "AI 스타별 Creator 채널 연결은 평판 기록으로 남습니다. TikTok 승인 또는 mock 연결로 테스트할 수 있습니다.",
      connectRequired: "TikTok 연결 필요",
      connectTitle: "AI 스타별 TikTok 채널",
      creatorPermissionBody:
        "이 작업은 AI 스타의 Creator 또는 Owner 권한을 가진 회원만 실행할 수 있습니다.",
      creatorPermissionCta: "Creator 권한 활성화 확인",
      creatorPermissionTitle: "Creator / Owner 권한 필요",
      creatorOnly: "Creator / Owner 권한 필요",
      eventCreated: "평판 기록 생성됨",
      apiCapabilityStatus: {
        app_review_required: "앱 리뷰 필요",
        connected_ready: "연결 후 가능",
        scope_required: "scope 승인 필요",
      },
      apiCapabilityTitle: "TikTok API 적용 범위",
      apiCoverageCta: "커버리지 확인",
      apiCoverageHint: "AgentRank 감사 흐름",
      apiCapabilityItems: {
        content_publish: {
          detail: "AIAVpark 브이로그를 TikTok 게시 요청으로 연결합니다.",
          title: "콘텐츠 게시",
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
        "Mock 연결을 완료하지 못했습니다. 입력값과 Creator 권한을 다시 확인해주세요.",
      mockConnectSaving: "Mock 연결 저장 중",
      mockOnly:
        "실제 TikTok OAuth/API는 아직 실행하지 않습니다. 이 입력은 AgentRank 평판 기록 mock으로만 저장됩니다.",
      manualStatus: "manual / mock",
      oauthReadinessItems: [
        "TikTok 앱과 redirect URI 확정",
        "Login Kit / Display API scope 승인",
        "서버 토큰 저장·갱신·폐기 준비",
      ],
      oauthReadinessChecking: "OAuth 상태 확인 중",
      oauthReadinessBlocked: "실제 OAuth 대기 중",
      oauthReadinessCriteriaUnit: "개 조건 대기",
      oauthReadinessNote: "조건이 준비되면 이 mock 연결 버튼을 실제 OAuth로 교체합니다.",
      oauthReadinessPreview: "서버 OAuth start/callback route는 preview 상태로 준비됨",
      oauthReadinessReady: "실제 OAuth 전환 가능",
      oauthReadinessTitle: "실제 OAuth 전환 조건",
      openTiktok: "TikTok 보기",
      panelDescription:
        "회원 개인 계정이 아니라 선택한 AI 스타의 TikTok 채널을 연결합니다.",
      panelTitle: "AI 스타 TikTok 채널 연결",
      primaryCta: "TikTok 연결하기",
      realOAuthCta: "TikTok 승인으로 연결",
      replaceCta: "채널 변경",
      reputationLedger: "평판 기록 보기",
      reputationLedgerHint: "AgentRank 원장에서 연결 이벤트 확인",
      retryOAuthCta: "다시 승인 시도",
      roleCreator: "Creator",
      roleOwner: "Owner",
      nextAction: "다음 행동",
      status: "상태",
      storageSource: "저장 출처",
      sourceLocalMock: "브라우저 mock",
      sourceSample: "기본 mock",
      sourceServer: "서버 저장됨",
      sourceSyncing: "서버 확인 중",
      syncApiCta: "동기화 테스트",
      syncApiError:
        "TikTok mock 동기화를 완료하지 못했습니다. 연결 상태와 Creator 권한을 확인해주세요.",
      syncApiHelper:
        "연결된 TikTok 채널의 영상/성과를 mock으로 동기화하고 content_engaged 평판 기록을 생성합니다.",
      syncApiSaving: "동기화 중",
      syncApiTitle: "영상/성과 동기화",
      syncResult: "평판 기록 생성됨",
      syncResultMetrics: "영상 {videos}개 · 조회 {views} · 좋아요 {likes}",
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
      connectComplete: "Mock接続を完了",
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
      apiCapabilityStatus: {
        app_review_required: "アプリ審査が必要",
        connected_ready: "接続後に利用可能",
        scope_required: "scope承認が必要",
      },
      apiCapabilityTitle: "TikTok API適用範囲",
      apiCoverageCta: "カバレッジ確認",
      apiCoverageHint: "AgentRank監査フロー",
      apiCapabilityItems: {
        content_publish: {
          detail: "AIAVparkのVlogをTikTok投稿リクエストにつなげます。",
          title: "コンテンツ投稿",
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
        "実際のTikTok OAuth/APIはまだ実行しません。この入力はAgentRank評判記録mockとしてのみ保存されます。",
      manualStatus: "manual / mock",
      oauthReadinessItems: [
        "TikTokアプリとredirect URIを確定",
        "Login Kit / Display API scopeを承認",
        "サーバートークンの保存・更新・失効を準備",
      ],
      oauthReadinessChecking: "OAuth状態を確認中",
      oauthReadinessBlocked: "実OAuth待機中",
      oauthReadinessCriteriaUnit: "件の条件待ち",
      oauthReadinessNote:
        "条件が整ったら、このmock接続ボタンを実際のOAuthに置き換えます。",
      oauthReadinessPreview:
        "サーバーOAuth start/callback routeはpreview状態で準備済み",
      oauthReadinessReady: "実OAuthへ切り替え可能",
      oauthReadinessTitle: "実OAuth切り替え条件",
      openTiktok: "TikTokを見る",
      panelDescription:
        "個人アカウントではなく、選択したAIスターのTikTokチャンネルを接続します。",
      panelTitle: "AIスターTikTokチャンネル接続",
      primaryCta: "TikTok接続",
      realOAuthCta: "TikTok認証で接続",
      replaceCta: "チャンネル変更",
      reputationLedger: "評判記録を見る",
      reputationLedgerHint: "AgentRank台帳で接続イベントを確認",
      retryOAuthCta: "もう一度認証",
      roleCreator: "Creator",
      roleOwner: "Owner",
      nextAction: "次のアクション",
      status: "状態",
      storageSource: "保存元",
      sourceLocalMock: "ブラウザmock",
      sourceSample: "基本mock",
      sourceServer: "サーバー保存済み",
      sourceSyncing: "サーバー確認中",
      syncApiCta: "同期テスト",
      syncApiError:
        "TikTok mock同期を完了できませんでした。接続状態とCreator権限を確認してください。",
      syncApiHelper:
        "接続済みTikTokチャンネルの動画・成果をmock同期し、content_engaged評判記録を作成します。",
      syncApiSaving: "同期中",
      syncApiTitle: "動画・成果同期",
      syncResult: "評判記録作成済み",
      syncResultMetrics: "動画{videos}本 · 再生{views} · いいね{likes}",
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
    connectComplete: "Complete mock connection",
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
    apiCapabilityStatus: {
      app_review_required: "App review required",
      connected_ready: "Ready after connection",
      scope_required: "Scope approval required",
    },
    apiCapabilityTitle: "TikTok API coverage",
    apiCoverageCta: "Check Coverage",
    apiCoverageHint: "AgentRank audit flow",
    apiCapabilityItems: {
      content_publish: {
        detail: "Connect AIAVpark vlogs to TikTok publish requests.",
        title: "Content publishing",
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
      "Real TikTok OAuth/API is not executed yet. This saves a mock AgentRank Reputation Event only.",
    manualStatus: "manual / mock",
    oauthReadinessItems: [
      "Finalize TikTok app and redirect URI",
      "Approve Login Kit / Display API scopes",
      "Prepare server token storage, refresh, and revocation",
    ],
    oauthReadinessChecking: "Checking OAuth status",
    oauthReadinessBlocked: "Real OAuth waiting",
    oauthReadinessCriteriaUnit: "criteria pending",
    oauthReadinessNote:
      "When these are ready, this mock connection button becomes real OAuth.",
    oauthReadinessPreview:
      "Server OAuth start/callback routes are ready in preview mode",
    oauthReadinessReady: "Ready for real OAuth",
    oauthReadinessTitle: "Real OAuth Switch Criteria",
    openTiktok: "View TikTok",
    panelDescription:
      "Connect the selected AI Star channel, not a personal member account.",
    panelTitle: "Connect AI Star TikTok channel",
    primaryCta: "Connect TikTok",
    realOAuthCta: "Connect with TikTok Authorization",
    replaceCta: "Change channel",
    reputationLedger: "View Reputation Record",
    reputationLedgerHint: "Check the connection event in AgentRank Ledger",
    retryOAuthCta: "Try authorization again",
    roleCreator: "Creator",
    roleOwner: "Owner",
    nextAction: "Next action",
    status: "Status",
    storageSource: "Storage Source",
    sourceLocalMock: "Browser mock",
    sourceSample: "Default mock",
    sourceServer: "Saved on server",
    sourceSyncing: "Checking server",
    syncApiCta: "Test Sync",
    syncApiError:
      "TikTok mock sync could not be completed. Check the connection state and Creator permission.",
    syncApiHelper:
      "Mock-sync connected TikTok videos and performance into a content_engaged Reputation Event.",
    syncApiSaving: "Syncing",
    syncApiTitle: "Video / Performance Sync",
    syncResult: "Reputation Record Created",
    syncResultMetrics: "{videos} videos · {views} views · {likes} likes",
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
          likes: number;
          videos: number;
          views: number;
        };
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
  const localMockAccount = useFanletterAIStarMockSocialAccount({
    platform: social.platform,
    starId,
  });
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
    "production",
  );
  const [oauthPreview, setOauthPreview] =
    useState<TikTokOAuthPreviewResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSnapshot, setSyncSnapshot] = useState<
    Extract<TikTokMockSyncResponse, { snapshot: object }>["snapshot"] | null
  >(null);
  const serverAccount = serverAccountState.account;
  const account = localMockAccount ?? serverAccount ?? social.account;
  const accountSource = localMockAccount
    ? "local"
    : serverAccount
      ? "server"
      : social.account
        ? "sample"
        : "none";
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
        ? copy.manualStatus
        : copy.creatorOnly;
  const storageSourceLabel =
    serverAccountState.loading && !localMockAccount
      ? copy.sourceSyncing
      : accountSource === "local"
        ? copy.sourceLocalMock
        : accountSource === "server"
          ? copy.sourceServer
          : accountSource === "sample"
            ? copy.sourceSample
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
  const liveOAuthStartParams = new URLSearchParams({
    canConnect: String(social.canConnect),
    creatorRole: social.creatorRole,
    locale,
    oauthMode,
    returnTo:
      oauthMode === "sandbox"
        ? `/${locale}/fanletter/${encodeURIComponent(starId)}?tiktokSandbox=1#tiktok-channel`
        : `/${locale}/fanletter/${encodeURIComponent(starId)}#tiktok-channel`,
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
    const shouldUseSandbox =
      params.get("tiktokSandbox") === "1" ||
      params.get("oauthMode") === "sandbox";
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

    if (source === "fanletter_my_ai") {
      setIsOauthPreviewLoading(false);
      setOauthPreview(null);
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

    if (source === "fanletter_my_ai") {
      recordFanletterAIStarMockSocialAccount({
        connectedAt: new Date().toISOString(),
        connectedByMemberId: social.creatorMemberId,
        connectedByMemberInitials: social.creatorMemberInitials,
        connectedByMemberName: social.creatorMemberName,
        creatorRoleAtConnection: social.creatorRole,
        handle,
        platform: social.platform,
        profileUrl: buildFanletterTikTokProfileUrl(handle),
        starId,
        status: "mock_connected",
      });
      setIsPanelOpen(false);
      return;
    }

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
    if (!account || isSyncingTikTok) {
      return;
    }

    setIsSyncingTikTok(true);
    setSyncError(null);

    try {
      const response = await fetch(
        "/api/fanletter/founder-club/social-account/tiktok/mock-sync",
        {
          body: JSON.stringify({
            capabilityId: "performance_sync",
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
                  {oauthCallbackStatus.reason ? (
                    <p className="mt-2 break-words rounded-md bg-white/70 px-2 py-1 text-[0.68rem] font-semibold text-current">
                      {oauthCallbackStatus.reason}
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
                      <span className="inline-flex min-h-6 max-w-full items-center rounded-full bg-zinc-100 px-2 font-mono text-[0.62rem] font-semibold text-zinc-600">
                        <span className="min-w-0 truncate">
                          {capability.agentRankEventType}
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

          {account ? (
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
              </div>
              <button
                className="inline-flex min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-zinc-950 px-4 text-sm font-semibold leading-tight text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
                creator_social_connected · target: ai_star · platform: tiktok
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
                  className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-center text-sm font-semibold leading-tight !text-white transition hover:bg-zinc-800 sm:w-auto sm:shrink-0"
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
                  className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-center text-sm font-semibold leading-tight text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 sm:w-auto sm:shrink-0"
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
                    className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-center text-sm font-semibold leading-tight text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 sm:col-span-2 sm:w-auto"
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
                className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-center text-sm font-semibold leading-tight text-white transition hover:bg-zinc-800 sm:w-auto"
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
        <div className="grid min-w-0 gap-4">
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
            <form className="grid min-w-0 gap-4" onSubmit={handleSubmit}>
              <label className="grid min-w-0 gap-2">
                <span className="flex min-w-0 items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-zinc-800">
                    {copy.handleLabel}
                  </span>
                  <button
                    className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
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
                    <p className="font-semibold">{copy.eventCreated}</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-800/78">
                      creator_social_connected · target: ai_star · platform:
                      tiktok
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
                    "liveReady" in oauthPreview &&
                    oauthPreview.liveReady ? (
                      <a
                        className="mt-3 inline-flex min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:w-auto"
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
                className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
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
                className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
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
