import type { ReactNode } from "react";

export default function ThirdwebRouteGroupLayout({
  children,
  contentModal,
}: Readonly<{ children: ReactNode; contentModal: ReactNode }>) {
  return (
    <>
      {children}
      {contentModal}
    </>
  );
}
