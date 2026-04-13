import { ImageResponse } from "next/og";

import { renderPwaIcon } from "@/lib/pwa-icon";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(renderPwaIcon(), {
    width: 192,
    height: 192,
  });
}
