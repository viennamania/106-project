import { ImageResponse } from "next/og";

import { renderFanletterPwaIcon } from "@/lib/fanletter-pwa-icon";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(renderFanletterPwaIcon(), {
    height: 512,
    width: 512,
  });
}
