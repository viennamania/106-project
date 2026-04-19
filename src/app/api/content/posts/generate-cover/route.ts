import type { ContentPostGenerateCoverResponse } from "@/lib/content";
import { generateAndUploadContentCover } from "@/lib/content-cover-service";
import { normalizeEmail } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const BODY_LIMIT = 480;

type GenerateCoverRequest = {
  body?: string | null;
  email?: string | null;
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
      error instanceof Error ? error.message : "Failed to generate AI cover.",
      500,
    );
  }
}
