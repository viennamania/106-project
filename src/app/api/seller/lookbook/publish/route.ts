import { createContentPostForMember } from "@/lib/content-service";
import { recordSellerFeedPublication } from "@/lib/seller-feed-publications";
import {
  getStarFeedPublishOptIn,
  getStarOwnerEmail,
} from "@/lib/seller-stars";
import { authorizeSellerWorkspace } from "@/lib/seller-workspace";
import { isLookbookBlobUrl } from "@/lib/star-lookbook-pricing";

export const runtime = "nodejs";

type PublishRequest = {
  workspaceId?: string | null;
  workspaceKey?: string | null;
  starId?: string | null;
  imageUrl?: string | null;
  starName?: string | null;
  productUrl?: string | null;
  shopName?: string | null;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// The product URL goes into the public post body as a link, so only allow plain
// http(s) URLs (no javascript:/data: etc.).
function normalizeProductUrl(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return raw.slice(0, 300);
  } catch {
    return null;
  }
}

// Publish a seller's generated lookbook to the AI star's feed — authored by the
// star's owner, only if the owner opted in to feed publishing, and clearly
// labeled as sponsored/seller (ad) content.
export async function POST(request: Request) {
  let body: PublishRequest | null = null;
  try {
    body = (await request.json()) as PublishRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const workspace = await authorizeSellerWorkspace({
    workspaceId: body?.workspaceId,
    workspaceKey: body?.workspaceKey,
  });
  if (!workspace) {
    return jsonError("Workspace not found or unauthorized.", 401);
  }

  const starId = body?.starId?.trim() ?? "";
  const imageUrl = body?.imageUrl?.trim() ?? "";

  if (!starId) {
    return jsonError("AI 스타를 선택하세요.", 400);
  }
  if (!imageUrl || !isLookbookBlobUrl(imageUrl)) {
    return jsonError("게시할 룩북 이미지가 올바르지 않습니다.", 400);
  }

  const shopName = body?.shopName?.trim().slice(0, 60) || null;
  let productUrl: string | null = null;
  if (body?.productUrl?.trim()) {
    productUrl = normalizeProductUrl(body.productUrl);
    if (!productUrl) {
      return jsonError("상품 링크는 올바른 http(s) 주소여야 합니다.", 400);
    }
  }

  // The star owner must have explicitly allowed seller feed publishing.
  if (!(await getStarFeedPublishOptIn(starId))) {
    return jsonError(
      "이 AI 스타는 셀러 피드 게시를 허용하지 않았습니다.",
      403,
    );
  }

  const ownerEmail = await getStarOwnerEmail(starId);
  if (!ownerEmail) {
    return jsonError("AI 스타 소유자를 찾을 수 없습니다.", 404);
  }

  const name = body?.starName?.trim() || "AI 스타";
  const title = `[광고] ${name} 룩북`.slice(0, 100);
  const linkLine = productUrl
    ? `\n\n🛍 ${shopName ? `${shopName} ` : ""}상품 보기: ${productUrl}`
    : "";
  const postBody =
    `${name}이(가) 입은 셀러 상품 룩북입니다. 본 게시물은 셀러 협찬(광고)입니다.${linkLine}`.slice(
      0,
      400,
    );

  try {
    // Create as a DRAFT (held off the feed) and record a pending request — the
    // star owner approves or rejects it before it can go live.
    const post = await createContentPostForMember({
      body: postBody,
      contentImageUrls: [imageUrl],
      contentMaturityRating: "general",
      coverImageUrl: imageUrl,
      email: ownerEmail,
      priceType: "free",
      status: "draft",
      summary: title,
      title,
    });

    await recordSellerFeedPublication({
      contentId: post.contentId,
      imageUrl,
      ownerEmail,
      productUrl,
      shopName,
      starId,
      workspaceId: workspace.workspaceId,
    });

    return Response.json({
      contentId: post.contentId,
      ok: true,
      status: "pending",
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "피드 게시에 실패했습니다.",
      500,
    );
  }
}
