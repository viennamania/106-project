const TIKTOK_VERIFICATION_BODY =
  "tiktok-developers-site-verification=IVJ3TrC4ZpbG9TtHFWayIh37RRnQI1Jl\n";

export function GET() {
  return new Response(TIKTOK_VERIFICATION_BODY, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
