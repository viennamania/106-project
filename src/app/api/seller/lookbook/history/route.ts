import {
  authorizeSellerWorkspace,
  getSellerGenerations,
} from "@/lib/seller-workspace";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspace = await authorizeSellerWorkspace({
    workspaceId: url.searchParams.get("workspaceId"),
    workspaceKey: url.searchParams.get("workspaceKey"),
  });

  if (!workspace) {
    return jsonError("Workspace not found or unauthorized.", 401);
  }

  const generations = await getSellerGenerations(workspace.workspaceId);

  return Response.json({ generations });
}
