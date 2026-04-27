import type {
  ContentPostGenerateCoverResponse,
  ContentPostGenerateCoverStreamEvent,
} from "@/lib/content";
import { generateAndUploadContentCover } from "@/lib/content-cover-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { normalizeEmail } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const BODY_LIMIT = 480;

type GenerateCoverRequest = {
  body?: string | null;
  email?: string | null;
  locale?: string | null;
  summary?: string | null;
  title?: string | null;
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
        finalizingCompleted: "AI 커버 생성이 완료되었습니다.",
        finalizingRunning: "생성 결과를 정리하고 있습니다.",
      }
    : {
        authorizingCompleted: "Member authorization has been confirmed.",
        authorizingRunning: "Checking wallet ownership and member access.",
        finalizingCompleted: "AI cover generation is complete.",
        finalizingRunning: "Finalizing the generated cover result.",
      };
}

function isOpenAiSafetyErrorMessage(message: string) {
  return /OpenAI image generation failed:.*safety|rejected by the safety system|safety_violations/i.test(
    message,
  );
}

function getCoverGenerationErrorMessage(error: unknown, locale: Locale) {
  const message =
    error instanceof Error ? error.message : "Failed to generate AI cover.";

  if (!isOpenAiSafetyErrorMessage(message)) {
    return message;
  }

  return locale === "ko"
    ? "AI 이미지 안전 필터가 이 요청을 차단했습니다. 사람, 신체, 노출, 선정적 표현처럼 민감하게 해석될 수 있는 문구를 줄이고 다시 시도해 주세요."
    : "The AI image safety filter blocked this request. Try again with a more neutral prompt and avoid wording about people, bodies, nudity, or suggestive presentation.";
}

function createStreamResponse(
  run: (
    emit: (event: ContentPostGenerateCoverStreamEvent) => void,
  ) => Promise<void>,
  locale: Locale,
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
            error: getCoverGenerationErrorMessage(error, locale),
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

  let body: GenerateCoverRequest | null = null;

  try {
    body = (await request.json()) as GenerateCoverRequest;
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

  if (!title && !summary && !contentBody) {
    return jsonError("Provide title, summary, or body to generate a cover.", 400);
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
          error: payload?.error ?? "This wallet is not authorized for the requested member.",
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

      const generatedCover = await generateAndUploadContentCover({
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
        contentType: generatedCover.contentType,
        pathname: generatedCover.pathname,
        revisedPrompt: generatedCover.revisedPrompt,
        url: generatedCover.url,
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
    }, locale);
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
    const generatedCover = await generateAndUploadContentCover({
      body: contentBody,
      referralCode: member.referralCode,
      summary,
      title,
    });
    const response: ContentPostGenerateCoverResponse = {
      contentType: generatedCover.contentType,
      pathname: generatedCover.pathname,
      revisedPrompt: generatedCover.revisedPrompt,
      url: generatedCover.url,
    };

    return Response.json(response);
  } catch (error) {
    return jsonError(
      getCoverGenerationErrorMessage(error, locale),
      500,
    );
  }
}
