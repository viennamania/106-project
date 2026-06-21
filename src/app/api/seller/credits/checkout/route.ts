import {
  createCreditCheckout,
  CREDIT_PACKS,
  getCreditPack,
} from "@/lib/seller-payment";
import { authorizeSellerWorkspace } from "@/lib/seller-workspace";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

type CheckoutRequest = {
  workspaceId?: string | null;
  workspaceKey?: string | null;
  packId?: string | null;
};

export function GET() {
  return Response.json({ packs: CREDIT_PACKS });
}

export async function POST(request: Request) {
  let body: CheckoutRequest | null = null;

  try {
    body = (await request.json()) as CheckoutRequest;
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

  const pack = getCreditPack(body?.packId ?? "");

  if (!pack) {
    return jsonError("Unknown credit pack.", 400);
  }

  const checkout = await createCreditCheckout({
    pack,
    workspaceId: workspace.workspaceId,
  });

  return Response.json({ checkout, pack });
}
