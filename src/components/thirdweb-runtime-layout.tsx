import type { ReactNode } from "react";

import { MemberSessionProvider } from "@/components/member-session-provider";
import { ThirdwebAppProvider } from "@/components/thirdweb-app-provider";

export function ThirdwebRuntimeLayout({ children }: { children: ReactNode }) {
  return (
    <ThirdwebAppProvider>
      <MemberSessionProvider>{children}</MemberSessionProvider>
    </ThirdwebAppProvider>
  );
}
