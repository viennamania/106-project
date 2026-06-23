import {
  authorizeSellerWorkspace,
  createSellerWorkspace,
  getSellerWorkspacePublic,
  SELLER_TRIAL_RATE_LIMIT_ERROR,
  updateSellerWorkspaceEmail,
} from "@/lib/seller-workspace";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// Prefer x-real-ip (set by Vercel's proxy to the connecting client) over the
// client-influenceable x-forwarded-for chain.
function clientIp(request: Request): string | null {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const xff = request.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0]?.trim() || null : null;
}

type WorkspaceRequest = {
  email?: string | null;
  workspaceId?: string | null;
  workspaceKey?: string | null;
};

// Create a new workspace, or resume an existing one when valid credentials are
// supplied. Only a newly created workspace returns the raw workspaceKey.
export async function POST(request: Request) {
  if (!process.env.MONGODB_DB_NAME?.trim()) {
    return jsonError("MONGODB_DB_NAME is not configured.", 500);
  }

  let body: WorkspaceRequest | null = null;

  try {
    body = (await request.json()) as WorkspaceRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (body?.workspaceId && body?.workspaceKey) {
    const existing = await authorizeSellerWorkspace({
      workspaceId: body.workspaceId,
      workspaceKey: body.workspaceKey,
    });

    if (existing) {
      // Resuming with an email attaches/updates the workspace's account email.
      const emailInput = body.email?.trim();
      if (emailInput && emailInput !== existing.email) {
        await updateSellerWorkspaceEmail(existing.workspaceId, emailInput);
      }
      return Response.json({
        workspace: {
          creditBalance: existing.creditBalance,
          email: emailInput || existing.email,
          workspaceId: existing.workspaceId,
        },
      });
    }
  }

  try {
    const created = await createSellerWorkspace({
      creatorIp: clientIp(request),
      email: body?.email ?? null,
    });

    return Response.json(
      { workspace: created.workspace, workspaceKey: created.workspaceKey },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === SELLER_TRIAL_RATE_LIMIT_ERROR
    ) {
      return jsonError(
        "무료 체험 워크스페이스 생성 한도를 초과했습니다. 잠시 후 다시 시도하거나 크레딧을 충전해 주세요.",
        429,
      );
    }

    return jsonError(
      error instanceof Error ? error.message : "워크스페이스 생성 실패",
      500,
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const workspaceKey = url.searchParams.get("workspaceKey");

  const authorized = await authorizeSellerWorkspace({
    workspaceId,
    workspaceKey,
  });

  if (!authorized) {
    return jsonError("Workspace not found or unauthorized.", 401);
  }

  const workspace = await getSellerWorkspacePublic(authorized.workspaceId);

  return Response.json({ workspace });
}
