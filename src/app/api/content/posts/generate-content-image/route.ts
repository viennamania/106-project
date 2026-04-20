import type {
  ContentPostGenerateCoverResponse,
  ContentPostGenerateCoverStreamEvent,
} from "@/lib/content";
import { generateAndUploadContentGalleryImage } from "@/lib/content-gallery-image-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { normalizeEmail } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const BODY_LIMIT = 480;
const VISUAL_BRIEF_LIMIT = 320;

type GenerateContentImageRequest = {
  body?: string | null;
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
          emit({
            error:
              error instanceof Error
                ? error.message
                : "Failed to generate the AI content image.",
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

  if (!process.env.REPLICATE_API_TOKEN?.trim()) {
    return jsonError("REPLICATE_API_TOKEN is not configured.", 500);
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
  const contentBody = trimToLength(body?.body, BODY_LIMIT);
  const visualBrief = trimToLength(body?.visualBrief, VISUAL_BRIEF_LIMIT);

  if (!title && !summary && !contentBody && !visualBrief) {
    return jsonError(
      "Provide title, summary, body, or visual direction to generate a content image.",
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
        body: contentBody,
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

  try {
    const generatedImage = await generateAndUploadContentGalleryImage({
      body: contentBody,
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
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to generate the AI content image.",
      500,
    );
  }
}
