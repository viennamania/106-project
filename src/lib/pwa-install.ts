export type RelatedWebApp = {
  id?: string;
  platform?: string;
  url?: string;
};

type NavigatorWithPwaDetection = Navigator & {
  getInstalledRelatedApps?: () => Promise<RelatedWebApp[]>;
  standalone?: boolean;
};

export function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const pwaNavigator = navigator as NavigatorWithPwaDetection;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    pwaNavigator.standalone === true
  );
}

export async function detectInstalledPwa() {
  if (typeof window === "undefined") {
    return false;
  }

  if (isStandaloneDisplayMode()) {
    return true;
  }

  const pwaNavigator = navigator as NavigatorWithPwaDetection;

  if (typeof pwaNavigator.getInstalledRelatedApps !== "function") {
    return false;
  }

  try {
    const relatedApps = await pwaNavigator.getInstalledRelatedApps();
    const manifestHref = new URL("/manifest.webmanifest", window.location.origin).href;

    return relatedApps.some((app) => {
      if (app.platform !== "webapp") {
        return false;
      }

      return app.id === "/" || app.url === manifestHref;
    });
  } catch {
    return false;
  }
}
