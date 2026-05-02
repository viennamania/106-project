import {
  CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  type ContentGenerationFailureDiagnostic,
  type ContentPostGenerateCoverResponse,
  type ContentPostGenerateCoverStreamEvent,
} from "@/lib/content";
import {
  ContentVideoGenerationError,
  generateAndUploadContentGalleryVideo,
} from "@/lib/content-gallery-video-service";
import { getCreatorProfileSnapshotForCompletedMember } from "@/lib/content-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { normalizeEmail } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";
export const maxDuration = 300;

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;

type GenerateContentVideoRequest = {
  email?: string | null;
  locale?: string | null;
  summary?: string | null;
  title?: string | null;
  visualBrief?: string | null;
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
          const payload = createGenerationErrorPayload(error);

          emit({
            ...(payload.diagnostic ? { diagnostic: payload.diagnostic } : {}),
            error: payload.error,
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

  if (!process.env.FAL_KEY?.trim()) {
    return jsonError("FAL_KEY is not configured.", 500);
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

  if (!visualBrief) {
    return jsonError(
      "Provide a video prompt to generate a content video.",
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

      const generatedVideo = await generateAndUploadContentGalleryVideo({
        characterPersona: profileSnapshot.profile.characterPersona,
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
        contentType: generatedVideo.contentType,
        pathname: generatedVideo.pathname,
        revisedPrompt: generatedVideo.revisedPrompt,
        url: generatedVideo.url,
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

  try {
    const profileSnapshot = await getCreatorProfileSnapshotForCompletedMember(
      member,
    );
    const generatedVideo = await generateAndUploadContentGalleryVideo({
      characterPersona: profileSnapshot.profile.characterPersona,
      referralCode: member.referralCode,
      summary,
      title,
      visualBrief,
    });

    const response: ContentPostGenerateCoverResponse = {
      contentType: generatedVideo.contentType,
      pathname: generatedVideo.pathname,
      revisedPrompt: generatedVideo.revisedPrompt,
      url: generatedVideo.url,
    };

    return Response.json(response);
  } catch (error) {
    const payload = createGenerationErrorPayload(error);

    return jsonError(payload.error, 500, payload.diagnostic);
  }
}
