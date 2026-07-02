import {
  CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  type ContentPostGenerateCoverResponse,
  type ContentPostGenerateCoverStreamEvent,
} from "@/lib/content";
import { generateAndUploadContentGalleryImage } from "@/lib/content-gallery-image-service";
import { getCreatorProfileSnapshotForCompletedMember } from "@/lib/content-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { normalizeEmail } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { enforceContentGenerationRateLimit } from "@/lib/content-generation-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 240;

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
type GenerateContentImageRequest = {
  email?: string | null;
  locale?: string | null;
  summary?: string | null;
  title?: string | null;
  visualBrief?: string | null;
  walletAddress?: string | null;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

function wantsStream(request: Request) {
  return request.headers.get("accept")?.includes("application/x-ndjson") ?? false;
}

function createProgressCopy(locale: Locale) {
  return locale === "ko"
    ? {
        authorizingCompleted: "회원 권한 확인이 완료되었습니다.",
        authorizingRunning: "회원 권한과 지갑 연결을 확인하고 있습니다.",
        finalizingCompleted: "AI 콘텐츠 이미지 생성이 완료되었습니다.",
        finalizingRunning: "생성 결과를 정리하고 있습니다.",
      }
    : {
        authorizingCompleted: "Member authorization has been confirmed.",
        authorizingRunning: "Checking wallet ownership and member access.",
        finalizingCompleted: "AI content image generation is complete.",
        finalizingRunning: "Finalizing the generated content image.",
      };
}

function isImageSafetyErrorMessage(message: string) {
  return /safety|rejected by the safety system|safety_violations|moderation|content[_ ]policy|flagged/i.test(
    message,
  );
}

// Never return the raw provider error to the client: it leaks internal model
// IDs and prompt-shape diagnostics (e.g. "q_descale must have shape ..."). Log
// the raw cause for ops and return a friendly, localized message.
function getImageGenerationErrorMessage(error: unknown, locale: Locale) {
  const raw =
    error instanceof Error ? error.message : "Failed to generate content image.";

  console.error("[generate-content-image] generation failed", raw);

  if (isImageSafetyErrorMessage(raw)) {
    return locale === "ko"
      ? "AI 이미지 안전 필터가 이 요청을 차단했습니다. 민감하게 해석될 수 있는 문구를 줄이고 다시 시도해 주세요."
      : "The AI image safety filter blocked this request. Try again with a more neutral prompt.";
  }

  return locale === "ko"
    ? "AI 이미지 생성에 실패했어요. 잠시 후 다시 시도해 주세요."
    : "AI image generation failed. Please try again in a moment.";
}

function createStreamResponse(
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
          // Log the raw cause; emit a generic message so the provider error
          // (internal model IDs / prompt-shape diagnostics) never reaches the
          // client. (This stream branch has no locale in scope.)
          console.error(
            "[generate-content-image] stream generation failed",
            error instanceof Error ? error.message : error,
          );
          emit({
            error: "AI image generation failed. Please try again in a moment.",
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
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return jsonError("BLOB_READ_WRITE_TOKEN is not configured.", 500);
  }

  if (
    !process.env.FAL_KEY?.trim() &&
    !process.env.REPLICATE_API_TOKEN?.trim()
  ) {
    return jsonError("FAL_KEY or REPLICATE_API_TOKEN is not configured.", 500);
  }

  let body: GenerateContentImageRequest | null = null;

  try {
    body = (await request.json()) as GenerateContentImageRequest;
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

  if (!visualBrief) {
    return jsonError(
      "Provide an image prompt to generate a content image.",
      400,
    );
  }

  const stream = wantsStream(request);

  if (stream) {
    return createStreamResponse(async (emit) => {
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

      const imageRateLimit = await enforceContentGenerationRateLimit(
        `content-image:${member.referralCode}`,
        { maxEnvVar: "CONTENT_IMAGE_RATE_LIMIT_MAX" },
      );
      if (!imageRateLimit.allowed) {
        emit({
          error:
            "이미지 생성 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
          type: "error",
        });
        return;
      }

      const profileSnapshot = await getCreatorProfileSnapshotForCompletedMember(
        member,
      );
      emit({
        progress: {
          message: progressCopy.authorizingCompleted,
          progress: 14,
          status: "completed",
          step: "authorizing",
        },
        type: "progress",
      });

      const generatedImage = await generateAndUploadContentGalleryImage({
        avatarImageUrl: profileSnapshot.profile.avatarImageUrl,
        characterMemory: profileSnapshot.profile.characterMemory,
        characterPersona: profileSnapshot.profile.characterPersona,
        characterTimeline: profileSnapshot.profile.characterTimeline,
        memberEmail: member.email,
        onProgress(progress) {
          emit({
            progress,
            type: "progress",
          });
        },
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

      const response: ContentPostGenerateCoverResponse = {
        contentType: generatedImage.contentType,
        pathname: generatedImage.pathname,
        revisedPrompt: generatedImage.revisedPrompt,
        url: generatedImage.url,
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

  const imageRateLimit = await enforceContentGenerationRateLimit(
    `content-image:${member.referralCode}`,
    { maxEnvVar: "CONTENT_IMAGE_RATE_LIMIT_MAX" },
  );
  if (!imageRateLimit.allowed) {
    return jsonError(
      "이미지 생성 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      429,
    );
  }

  try {
    const profileSnapshot = await getCreatorProfileSnapshotForCompletedMember(
      member,
    );
    const generatedImage = await generateAndUploadContentGalleryImage({
      avatarImageUrl: profileSnapshot.profile.avatarImageUrl,
      characterMemory: profileSnapshot.profile.characterMemory,
      characterPersona: profileSnapshot.profile.characterPersona,
      characterTimeline: profileSnapshot.profile.characterTimeline,
      memberEmail: member.email,
      referralCode: member.referralCode,
      summary,
      title,
      visualBrief,
    });

    const response: ContentPostGenerateCoverResponse = {
      contentType: generatedImage.contentType,
      pathname: generatedImage.pathname,
      revisedPrompt: generatedImage.revisedPrompt,
      url: generatedImage.url,
    };

    return Response.json(response);
  } catch (error) {
    return jsonError(getImageGenerationErrorMessage(error, locale), 500);
  }
}
