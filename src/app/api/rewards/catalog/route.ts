import type { RewardCatalogResponse } from "@/lib/points";
import { getRewardCatalog } from "@/lib/points-service";

export async function GET() {
  const response: RewardCatalogResponse = getRewardCatalog();
  return Response.json(response);
}
