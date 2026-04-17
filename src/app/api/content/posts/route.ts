import type {
  ContentPostCreateRequest,
  ContentPostMutationResponse,
  CreatorStudioPostsResponse,
} from "@/lib/content";
import {
  createContentPostForMember,
  getCreatorStudioPostsForMember,
} from "@/lib/content-service";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  try {
    const response: CreatorStudioPostsResponse =
      await getCreatorStudioPostsForMember(rawEmail);
    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load creator posts.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : 500;

    return jsonError(message, status);
  }
}

export async function POST(request: Request) {
  let body: ContentPostCreateRequest | null = null;

  try {
    body = (await request.json()) as ContentPostCreateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.title?.trim()) {
    return jsonError("title is required.", 400);
  }

  if (!body.summary?.trim()) {
    return jsonError("summary is required.", 400);
  }

  if (!body.body?.trim()) {
    return jsonError("body is required.", 400);
  }

  try {
    const response: ContentPostMutationResponse = {
      content: await createContentPostForMember(body),
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create content.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : message.endsWith("is required.") ||
              message === "Only free content is supported in this release."
            ? 400
            : 500;

    return jsonError(message, status);
  }
}
