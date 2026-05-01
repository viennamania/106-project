import type { ReactNode } from "react";

import { ThirdwebRuntimeLayout } from "@/components/thirdweb-runtime-layout";

export default function BrandingStudioLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <ThirdwebRuntimeLayout>{children}</ThirdwebRuntimeLayout>;
}
