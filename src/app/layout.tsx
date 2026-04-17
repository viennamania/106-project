import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThirdwebAppProvider } from "@/components/thirdweb-app-provider";
import { PwaServiceWorker } from "@/components/pwa-service-worker";
import type { ReactNode } from "react";

const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const metadataBase = (() => {
  if (!configuredAppUrl) {
    return undefined;
  }

  try {
    return new URL(configuredAppUrl);
  } catch {
    return undefined;
  }
})();
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Pocket Smart Wallet",
  title: "Pocket Smart Wallet",
  description:
    "Mobile-first smart wallet starter built with thirdweb and a v0-compatible Next.js setup.",
  metadataBase,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pocket Smart Wallet",
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#0a1325",
  viewportFit: "cover",
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThirdwebAppProvider>{children}</ThirdwebAppProvider>
        <PwaServiceWorker />
      </body>
    </html>
  );
}
