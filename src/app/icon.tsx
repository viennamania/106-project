import { ImageResponse } from "next/og";

import { renderPwaIcon } from "@/lib/pwa-icon";

export const contentType = "image/png";
export const size = {
  width: 256,
  height: 256,
};

export default function Icon() {
  return new ImageResponse(renderPwaIcon(), size);
}
