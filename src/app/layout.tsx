import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Noto_Sans_KR, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { PwaServiceWorker } from "@/components/pwa-service-worker";
import type { ReactNode } from "react";
import { preconnect, prefetchDNS } from "react-dom";

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
  applicationName: "AIAVpark",
  title: "AIAVpark",
  description:
    "AIAVpark is an AI character content platform for vlogs, fan requests, news reports, and creator monetization.",
  metadataBase,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AIAVpark",
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
  // Resource hints: the thirdweb wallet SDK connects to these origins early in
  // the page lifecycle (measured first hit ~664ms). Preconnecting runs DNS+TLS
  // in parallel with the initial JS download, trimming wallet connection
  // latency on mobile. Emitted on every route since the wallet provider mounts
  // in the locale layout.
  preconnect("https://embedded-wallet.thirdweb.com");
  preconnect("https://api.thirdweb.com", { crossOrigin: "anonymous" });
  prefetchDNS("https://56.rpc.thirdweb.com");
  prefetchDNS("https://c.thirdweb.com");

  return (
    <html
      lang="ko"
      data-scroll-behavior="smooth"
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
