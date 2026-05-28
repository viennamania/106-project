import type { ContentPostVideoPreviewResponse } from "@/lib/content";

type CreateContentVideoPreviewInput = {
  email: string;
  sourceVideoUrl: string;
  title?: string | null;
  walletAddress: string;
};

export async function createContentVideoPreview(
  input: CreateContentVideoPreviewInput,
): Promise<ContentPostVideoPreviewResponse> {
  const response = await fetch("/api/content/posts/video-preview", {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as
    | ContentPostVideoPreviewResponse
    | { error?: string }
    | null;

  if (!response.ok || !payload || !("url" in payload)) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : "Failed to generate preview video.",
    );
  }

  return payload;
}
