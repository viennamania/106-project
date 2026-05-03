import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Noto_Sans_KR, Space_Grotesk } from "next/font/google";
import "./globals.css";
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
  display: "swap",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  display: "swap",
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
      className={`${notoSansKr.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <PwaServiceWorker />
      </body>
    </html>
  );
}
