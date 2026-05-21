import type { ReactNode } from "react";

import { FanletterCreatorNavigationBridge } from "@/components/fanletter-creator-navigation-bridge";

export default function FanletterCreatorLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <FanletterCreatorNavigationBridge />
      {children}
    </>
  );
}
