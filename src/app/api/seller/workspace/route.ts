import {
  authorizeSellerWorkspace,
  createSellerWorkspace,
  getSellerWorkspacePublic,
} from "@/lib/seller-workspace";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
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
      return Response.json({
        workspace: {
          creditBalance: existing.creditBalance,
          email: existing.email,
          workspaceId: existing.workspaceId,
        },
      });
    }
  }

  const created = await createSellerWorkspace({ email: body?.email ?? null });

  return Response.json(
    { workspace: created.workspace, workspaceKey: created.workspaceKey },
    { status: 201 },
  );
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
