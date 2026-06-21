import { getSellerStars } from "@/lib/seller-stars";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.MONGODB_DB_NAME?.trim()) {
    return Response.json({ error: "MONGODB_DB_NAME is not configured." }, {
      status: 500,
    });
  }

  try {
    const stars = await getSellerStars();
    return Response.json({ stars });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load AI stars.",
      },
      { status: 500 },
    );
  }
}
