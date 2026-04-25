import type {
  ContentAutomationRunProgressEvent,
  ContentAutomationRunRequest,
  ContentAutomationRunResponse,
  ContentAutomationRunStreamEvent,
} from "@/lib/content-automation";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import {
  runContentAutomationForMember,
  serializeAutomationMember,
} from "@/lib/content-automation-service";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isStreamingRequest(request: Request) {
  return request.headers.get("accept")?.includes("application/x-ndjson") ?? false;
}

function createStreamingResponse(
  run: (emit: (event: ContentAutomationRunStreamEvent) => Promise<void>) => Promise<void>,
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = async (event: ContentAutomationRunStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await run(emit);
      } catch (error) {
        await emit({
          error:
            error instanceof Error
              ? error.message
              : "Failed to run content automation.",
          type: "error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

async function buildRunResponse(
  result: Awaited<ReturnType<typeof runContentAutomationForMember>>,
): Promise<ContentAutomationRunResponse> {
  return {
    content: result.content,
    job: result.job,
    member: serializeAutomationMember(result.member),
    profile: result.profile,
    sources: result.sources,
  };
}

function resolveStatus(message: string) {
  if (message === "Member not found.") {
    return 404;
  }

  if (
    message === "Completed signup is required." ||
    message === "Content automation is not enabled for this member."
  ) {
    return 403;
  }

  if (
    message.endsWith("is required.") ||
    message.includes("Only ") ||
    message.includes("No public sources")
  ) {
    return 400;
  }

  if (
    message.includes("limit") ||
    message.includes("interval") ||
    message.includes("disabled") ||
    message.includes("한도") ||
    message.includes("간격") ||
    message.includes("비활성")
  ) {
    return 409;
  }

  return 500;
}

export async function POST(request: Request) {
  const wantsStream = isStreamingRequest(request);
  let body: ContentAutomationRunRequest | null = null;

  try {
    body = (await request.json()) as ContentAutomationRunRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.memberEmail) {
    return jsonError("memberEmail is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: body.memberEmail,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      if (wantsStream) {
        const errorData = (await authorization.error
          .clone()
          .json()
          .catch(() => null)) as { error?: string } | null;

        return createStreamingResponse(async (emit) => {
          await emit({
            error: errorData?.error ?? "Failed to run content automation.",
            type: "error",
          });
        });
      }

      return authorization.error;
    }

    if (wantsStream) {
      return createStreamingResponse(async (emit) => {
        await emit({
          progress: {
            message: null,
            progress: 5,
            status: "completed",
            step: "authorizing",
          },
          type: "progress",
        });

        const result = await runContentAutomationForMember(
          {
            ...body,
            memberEmail: authorization.normalizedEmail,
          },
          {
            onProgress: async (progress: ContentAutomationRunProgressEvent) => {
              await emit({
                progress,
                type: "progress",
              });
            },
          },
        );
        await emit({
          response: await buildRunResponse(result),
          type: "result",
        });
      });
    }

    const result = await runContentAutomationForMember({
      ...body,
      memberEmail: authorization.normalizedEmail,
    });
    const response = await buildRunResponse(result);

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to run content automation.";
    return jsonError(message, resolveStatus(message));
  }
}
