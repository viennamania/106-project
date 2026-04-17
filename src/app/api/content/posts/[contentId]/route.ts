import type {
  ContentDetailResponse,
  ContentPostMutationResponse,
  ContentPostUpdateRequest,
} from "@/lib/content";
import {
  getContentDetailForMember,
  updateContentPostForMember,
} from "@/lib/content-service";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await context.params;
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  try {
    const response: ContentDetailResponse = await getContentDetailForMember(
      contentId,
      rawEmail,
    );

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load content.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : message === "Content not found."
            ? 404
            : message === "Content is not available in your network." ||
                message === "This content requires a paid unlock."
              ? 403
              : 500;

    return jsonError(message, status);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await context.params;
  let body: Omit<ContentPostUpdateRequest, "contentId"> | null = null;

  try {
    body = (await request.json()) as Omit<ContentPostUpdateRequest, "contentId">;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  try {
    const response: ContentPostMutationResponse = {
      content: await updateContentPostForMember({
        ...body,
        contentId,
      }),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update content.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : message === "Content not found."
            ? 404
            : message === "Only the author can update this content." ||
                message === "Only free content is supported in this release."
              ? 403
              : 500;

    return jsonError(message, status);
  }
}
