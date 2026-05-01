import type { ReactNode } from "react";

import { ThirdwebRuntimeLayout } from "@/components/thirdweb-runtime-layout";

export default function ThirdwebRouteGroupLayout({
  children,
  contentModal,
}: Readonly<{ children: ReactNode; contentModal: ReactNode }>) {
  return (
    <ThirdwebRuntimeLayout>
      {children}
      {contentModal}
    </ThirdwebRuntimeLayout>
  );
}
