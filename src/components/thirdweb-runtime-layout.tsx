import type { ReactNode } from "react";

import { ThirdwebAppProvider } from "@/components/thirdweb-app-provider";

export function ThirdwebRuntimeLayout({ children }: { children: ReactNode }) {
  return <ThirdwebAppProvider>{children}</ThirdwebAppProvider>;
}
