import { ImageResponse } from "next/og";

import { renderPwaIcon } from "@/lib/pwa-icon";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(renderPwaIcon(), {
    width: 512,
    height: 512,
  });
}
