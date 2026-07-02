import {
  CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  creatorAvatarExpressions,
  type ContentGenerationFailureDiagnostic,
  type ContentPostGenerateCoverResponse,
  type ContentPostGenerateCoverStreamEvent,
  type CreatorProfileAvatarCandidate,
  type CreatorProfileRecord,
} from "@/lib/content";
import {
  ContentVideoGenerationError,
  generateAndUploadContentGalleryVideo,
  type ContentVideoQualityMode,
} from "@/lib/content-gallery-video-service";
import { createContentVideoPreview } from "@/lib/content-video-preview-service";
import { getCreatorProfileSnapshotForCompletedMember } from "@/lib/content-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { normalizeEmail } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { enforceContentGenerationRateLimit } from "@/lib/content-generation-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;

type GenerateContentVideoRequest = {
  avatarReferenceExpression?: string | null;
  avatarReferenceMode?: string | null;
  email?: string | null;
  locale?: string | null;
  planId?: string | null;
  summary?: string | null;
  title?: string | null;
  visualBrief?: string | null;
  videoQualityMode?: string | null;
  walletAddress?: string | null;
};

type GenerateContentVideoErrorPayload = {
  diagnostic?: ContentGenerationFailureDiagnostic | null;
  error: string;
};

function createGenerationErrorPayload(
  error: unknown,
  fallback = "Failed to generate the AI content video.",
): GenerateContentVideoErrorPayload {
  const message = error instanceof Error ? error.message : fallback;

  return {
    ...(error instanceof ContentVideoGenerationError
      ? { diagnostic: error.diagnostic }
      : {}),
    error: message,
  };
}

function jsonError(
  message: string,
  status: number,
  diagnostic?: ContentGenerationFailureDiagnostic | null,
) {
  return Response.json(
    {
      ...(diagnostic ? { diagnostic } : {}),
      error: message,
    },
    { status },
  );
}

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

function normalizeAvatarReferenceExpression(
  value: string | null | undefined,
): CreatorProfileAvatarCandidate["expression"] | undefined {
  return creatorAvatarExpressions.find((expression) => expression === value);
}

function normalizeAvatarReferenceMode(value: string | null | undefined) {
  return value === "single" || value === "set" ? value : null;
}

function normalizeVideoQualityMode(
  value: string | null | undefined,
): ContentVideoQualityMode | null {
  if (value === "person_high" || value === "high") {
    return "person_high";
  }

  if (value === "standard") {
    return "standard";
  }

  return null;
}

function getValidatedAvatarReferenceUrls({
  expression,
  mode,
  planId,
  profile,
}: {
  expression: CreatorProfileAvatarCandidate["expression"] | undefined;
  mode: "set" | "single" | null;
  planId: string | null;
  profile: CreatorProfileRecord;
}) {
  const candidates = [
    ...(profile.avatarImageUrl
      ? [
          {
            expression: "default" as const,
            url: profile.avatarImageUrl,
          },
        ]
      : []),
    ...(profile.avatarImageSet ?? []).map((candidate) => ({
      expression: candidate.expression,
      url: candidate.url,
    })),
  ].filter((candidate) => Boolean(candidate.url?.trim()));
  const uniqueCandidates: Array<{
    expression: CreatorProfileAvatarCandidate["expression"] | undefined;
    url: string;
  }> = [];
  const seenUrls = new Set<string>();

  for (const candidate of candidates) {
    const url = candidate.url.trim();

    if (!url || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    uniqueCandidates.push({
      expression: candidate.expression,
      url,
    });
  }

  if (uniqueCandidates.length === 0) {
    return [];
  }

  const prioritizeCandidates = (
    preferredExpression?: CreatorProfileAvatarCandidate["expression"],
  ) => {
    const expressionPriority: Array<
      CreatorProfileAvatarCandidate["expression"]
    > = [
      ...(preferredExpression ? [preferredExpression] : []),
      "default",
      "smile",
      "focus",
      "serious",
      "thumbnail",
      "reaction",
      "fanservice",
      "shy",
    ];
    const ranked = [...uniqueCandidates].sort((left, right) => {
      const leftRank = expressionPriority.indexOf(left.expression);
      const rightRank = expressionPriority.indexOf(right.expression);

      return (
        (leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank) -
        (rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank)
      );
    });

    return ranked.map((candidate) => candidate.url);
  };

  if (expression) {
    const selectedCandidate = uniqueCandidates.find(
      (candidate) => candidate.expression === expression,
    );

    if (!selectedCandidate) {
      throw new Error("Selected avatar reference is not available.");
    }

    const stableExpressionCandidates = [
      selectedCandidate,
      uniqueCandidates.find(
        (candidate) =>
          candidate.expression === "default" &&
          candidate.url !== selectedCandidate.url,
      ),
    ].filter((candidate): candidate is (typeof uniqueCandidates)[number] =>
      Boolean(candidate),
    );

    return stableExpressionCandidates.map((candidate) => candidate.url);
  }

  if (mode === "set" || planId === "avatar-set-direction") {
    return prioritizeCandidates("default").slice(0, 4);
  }

  return [uniqueCandidates[0].url];
}

function wantsStream(request: Request) {
  return request.headers.get("accept")?.includes("application/x-ndjson") ?? false;
}

function createProgressCopy(locale: Locale) {
  return locale === "ko"
    ? {
        authorizingCompleted: "회원 권한 확인이 완료되었습니다.",
        authorizingRunning: "회원 권한과 지갑 연결을 확인하고 있습니다.",
        finalizingCompleted: "AI 콘텐츠 동영상 생성이 완료되었습니다.",
        finalizingRunning: "생성 결과를 정리하고 있습니다.",
      }
    : {
        authorizingCompleted: "Member authorization has been confirmed.",
        authorizingRunning: "Checking wallet ownership and member access.",
        finalizingCompleted: "AI content video generation is complete.",
        finalizingRunning: "Finalizing the generated content video.",
      };
}

function resolveGenerationFailureMessage(
  diagnostic: ContentGenerationFailureDiagnostic | null | undefined,
  locale: Locale,
): string {
  const ko = locale === "ko";

  switch (diagnostic?.kind) {
    case "safety":
      return ko
        ? "이 장면이 생성 안전 정책에 걸렸어요. 문구나 표현을 조금 바꿔 다시 시도해 주세요."
        : "This scene was blocked by the generator's safety policy. Adjust the wording and try again.";
    case "timeout":
      return ko
        ? "영상 생성이 제한 시간 안에 끝나지 않았어요. 잠시 후 다시 시도해 주세요."
        : "Video generation timed out. Please try again in a moment.";
    case "validation":
      return ko
        ? "입력한 프롬프트를 처리할 수 없었어요. 문구를 조금 바꿔 다시 시도해 주세요."
        : "We couldn't process that prompt. Adjust the wording and try again.";
    default:
      return ko
        ? "AI 영상 생성에 실패했어요. 잠시 후 다시 시도해 주세요."
        : "AI video generation failed. Please try again in a moment.";
  }
}

function createStreamResponse(
  locale: Locale,
  run: (
    emit: (event: ContentPostGenerateCoverStreamEvent) => void,
  ) => Promise<void>,
) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (event: ContentPostGenerateCoverStreamEvent) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          await run(emit);
        } catch (error) {
          const payload = createGenerationErrorPayload(error);

          emit({
            ...(payload.diagnostic ? { diagnostic: payload.diagnostic } : {}),
            error: resolveGenerationFailureMessage(payload.diagnostic, locale),
            type: "error",
          });
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/x-ndjson; charset=utf-8",
      },
      status: 200,
    },
  );
}

export async function POST(request: Request) {
  // These are server-config preconditions (missing env). Surface a friendly,
  // creator-facing message (503 = not available yet) and keep the technical
  // cause in the server log for ops — don't leak "FAL_KEY is not configured."
  // to the creator's screen.
  const generationUnavailableMessage =
    "AI 영상 생성을 아직 사용할 수 없어요. 잠시 후 다시 시도해 주세요. (Video generation isn't available yet.)";
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    console.error(
      "[generate-content-video] BLOB_READ_WRITE_TOKEN is not configured.",
    );
    return jsonError(generationUnavailableMessage, 503);
  }

  if (!process.env.FAL_KEY?.trim()) {
    console.error("[generate-content-video] FAL_KEY is not configured.");
    return jsonError(generationUnavailableMessage, 503);
  }

  let body: GenerateContentVideoRequest | null = null;

  try {
    body = (await request.json()) as GenerateContentVideoRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const email = normalizeEmail(body?.email ?? "");
  const walletAddress = body?.walletAddress?.trim() ?? "";
  const locale = hasLocale(body?.locale ?? "") ? (body?.locale as Locale) : "ko";
  const progressCopy = createProgressCopy(locale);

  if (!email) {
    return jsonError("email is required.", 400);
  }

  if (!walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  const title = trimToLength(body?.title, TITLE_LIMIT);
  const summary = trimToLength(body?.summary, SUMMARY_LIMIT);
  const visualBrief = trimToLength(
    body?.visualBrief,
    CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  );
  const avatarReferenceExpression = normalizeAvatarReferenceExpression(
    body?.avatarReferenceExpression,
  );
  const avatarReferenceMode = normalizeAvatarReferenceMode(
    body?.avatarReferenceMode,
  );
  const planId = trimToLength(body?.planId, 120) || null;
  const requestedVideoQualityMode = normalizeVideoQualityMode(
    body?.videoQualityMode,
  );

  if (!visualBrief) {
    return jsonError(
      "Provide a video prompt to generate a content video.",
      400,
    );
  }

  const stream = wantsStream(request);

  if (stream) {
    return createStreamResponse(locale, async (emit) => {
      emit({
        progress: {
          message: progressCopy.authorizingRunning,
          progress: 6,
          status: "running",
          step: "authorizing",
        },
        type: "progress",
      });

      const authorization = await validateMemberWalletOwner({
        email,
        walletAddress,
      });

      if (authorization.error) {
        const payload = (await authorization.error
          .json()
          .catch(() => null)) as { error?: string } | null;

        emit({
          error:
            payload?.error ??
            "This wallet is not authorized for the requested member.",
          type: "error",
        });
        return;
      }

      const member = authorization.member;

      if (!member?.referralCode) {
        emit({
          error: "Creator Studio is only available to completed members.",
          type: "error",
        });
        return;
      }

      const videoRateLimit = await enforceContentGenerationRateLimit(
        `content-video:${member.referralCode}`,
        { max: 5, maxEnvVar: "CONTENT_VIDEO_RATE_LIMIT_MAX" },
      );
      if (!videoRateLimit.allowed) {
        emit({
          error:
            "영상 생성 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
          type: "error",
        });
        return;
      }

      const profileSnapshot = await getCreatorProfileSnapshotForCompletedMember(
        member,
      );
      const avatarReferenceUrls = getValidatedAvatarReferenceUrls({
        expression: avatarReferenceExpression,
        mode: avatarReferenceMode,
        planId,
        profile: profileSnapshot.profile,
      });
      const videoQualityMode: ContentVideoQualityMode =
        avatarReferenceUrls.length > 0
          ? (requestedVideoQualityMode ?? "person_high")
          : "standard";

      emit({
        progress: {
          message: progressCopy.authorizingCompleted,
          progress: 14,
          status: "completed",
          step: "authorizing",
        },
        type: "progress",
      });

      const generatedVideo = await generateAndUploadContentGalleryVideo({
        avatarImageUrl: profileSnapshot.profile.avatarImageUrl,
        avatarImageUrls: avatarReferenceUrls,
        characterMemory: profileSnapshot.profile.characterMemory,
        characterPersona: profileSnapshot.profile.characterPersona,
        characterTimeline: profileSnapshot.profile.characterTimeline,
        onProgress(progress) {
          emit({
            progress,
            type: "progress",
          });
        },
        qualityMode: videoQualityMode,
        referralCode: member.referralCode,
        summary,
        title,
        visualBrief,
      });

      emit({
        progress: {
          message: progressCopy.finalizingRunning,
          progress: 97,
          status: "running",
          step: "finalizing",
        },
        type: "progress",
      });
      const generatedPreviewVideo = await createContentVideoPreview({
        referralCode: member.referralCode,
        sourceVideoUrl: generatedVideo.url,
        title: title || summary || "ai-content-video",
      }).catch(() => null);

      const response: ContentPostGenerateCoverResponse = {
        contentType: generatedVideo.contentType,
        durationSec: generatedVideo.durationSec,
        height: null,
        pathname: generatedVideo.pathname,
        previewClipVideoUrl: generatedPreviewVideo?.url ?? null,
        revisedPrompt: generatedVideo.revisedPrompt,
        url: generatedVideo.url,
        width: null,
      };

      emit({
        progress: {
          message: progressCopy.finalizingCompleted,
          progress: 100,
          status: "completed",
          step: "finalizing",
        },
        type: "progress",
      });
      emit({
        response,
        type: "result",
      });
    });
  }

  const authorization = await validateMemberWalletOwner({
    email,
    walletAddress,
  });

  if (authorization.error) {
    return authorization.error;
  }

  const member = authorization.member;

  if (!member?.referralCode) {
    return jsonError("Creator Studio is only available to completed members.", 403);
  }

  const videoRateLimit = await enforceContentGenerationRateLimit(
    `content-video:${member.referralCode}`,
    { max: 5, maxEnvVar: "CONTENT_VIDEO_RATE_LIMIT_MAX" },
  );
  if (!videoRateLimit.allowed) {
    return jsonError(
      "영상 생성 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      429,
    );
  }

  try {
    const profileSnapshot = await getCreatorProfileSnapshotForCompletedMember(
      member,
    );
    const avatarReferenceUrls = getValidatedAvatarReferenceUrls({
      expression: avatarReferenceExpression,
      mode: avatarReferenceMode,
      planId,
      profile: profileSnapshot.profile,
    });
    const videoQualityMode: ContentVideoQualityMode =
      avatarReferenceUrls.length > 0
        ? (requestedVideoQualityMode ?? "person_high")
        : "standard";
    const generatedVideo = await generateAndUploadContentGalleryVideo({
      avatarImageUrl: profileSnapshot.profile.avatarImageUrl,
      avatarImageUrls: avatarReferenceUrls,
      characterMemory: profileSnapshot.profile.characterMemory,
      characterPersona: profileSnapshot.profile.characterPersona,
      characterTimeline: profileSnapshot.profile.characterTimeline,
      qualityMode: videoQualityMode,
      referralCode: member.referralCode,
      summary,
      title,
      visualBrief,
    });
    const generatedPreviewVideo = await createContentVideoPreview({
      referralCode: member.referralCode,
      sourceVideoUrl: generatedVideo.url,
      title: title || summary || "ai-content-video",
    }).catch(() => null);

    const response: ContentPostGenerateCoverResponse = {
      contentType: generatedVideo.contentType,
      durationSec: generatedVideo.durationSec,
      height: null,
      pathname: generatedVideo.pathname,
      previewClipVideoUrl: generatedPreviewVideo?.url ?? null,
      revisedPrompt: generatedVideo.revisedPrompt,
      url: generatedVideo.url,
      width: null,
    };

    return Response.json(response);
  } catch (error) {
    const payload = createGenerationErrorPayload(error);

    // A missing selected-avatar reference is a specific, client-fixable 400.
    if (payload.error === "Selected avatar reference is not available.") {
      return jsonError(payload.error, 400, payload.diagnostic);
    }

    // Everything else (fal failures, blob upload, world-context) becomes a
    // friendly, localized creator message; the technical cause stays in the
    // diagnostic + server logs (fal failures are already logged in the service).
    console.error("[generate-content-video] generation failed", payload.error);

    return jsonError(
      resolveGenerationFailureMessage(payload.diagnostic, locale),
      500,
      payload.diagnostic,
    );
  }
}
