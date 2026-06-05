"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal, flushSync } from "react-dom";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";

type PlatformNavigationPendingCopy = {
  body: string;
  fallbackLabel: string;
  title: string;
};

type PlatformNavigationPendingContextValue = {
  copy: PlatformNavigationPendingCopy;
  startNavigation: (label?: string) => void;
};

type PlatformNavigationPendingState = {
  label: string;
  pathname: string;
};

const PlatformNavigationPendingContext =
  createContext<PlatformNavigationPendingContextValue | null>(null);

type PlatformNavigationPendingLinkProps = ComponentProps<typeof Link> & {
  pendingLabel?: string;
  suppressPending?: boolean;
};

function shouldStartNavigationPending({
  event,
  href,
  suppressPending,
  target,
}: {
  event: MouseEvent<HTMLAnchorElement>;
  href: ComponentProps<typeof Link>["href"];
  suppressPending?: boolean;
  target?: string;
}) {
  if (
    suppressPending ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }

  if (target && target !== "_self") {
    return false;
  }

  if (typeof href !== "string") {
    return true;
  }

  const trimmedHref = href.trim();

  if (
    !trimmedHref ||
    trimmedHref.startsWith("#") ||
    /^(mailto|tel|sms):/i.test(trimmedHref)
  ) {
    return false;
  }

  if (/^https?:\/\//i.test(trimmedHref)) {
    try {
      return new URL(trimmedHref).origin === window.location.origin;
    } catch {
      return false;
    }
  }

  return true;
}

function getClientNavigationHref(href: ComponentProps<typeof Link>["href"]) {
  if (typeof href !== "string") {
    return null;
  }

  const trimmedHref = href.trim();

  if (!trimmedHref || trimmedHref.startsWith("#")) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedHref)) {
    try {
      const url = new URL(trimmedHref);

      if (url.origin !== window.location.origin) {
        return null;
      }

      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  return trimmedHref;
}

function PlatformNavigationPendingOverlay({
  copy,
  pendingLabel,
}: {
  copy: PlatformNavigationPendingCopy;
  pendingLabel: string | null;
}) {
  if (!pendingLabel || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/42 px-5 text-white backdrop-blur-[6px]"
      data-platform-navigation-pending
      role="status"
    >
      <div className="w-full max-w-[20rem] rounded-[1.35rem] border border-[#44f26e]/24 bg-[#061008]/94 p-5 text-center shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[#44f26e] text-[#07110a] shadow-[0_18px_44px_rgba(68,242,110,0.24)]">
          <Loader2 className="size-6 animate-spin" />
        </span>
        <p className="mt-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#9bffad]">
          {copy.title}
        </p>
        <h2 className="mt-1 text-xl font-black leading-tight tracking-normal [word-break:keep-all]">
          {pendingLabel}
        </h2>
        <p className="mt-2 text-xs font-bold leading-5 text-white/58 [word-break:keep-all]">
          {copy.body}
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function FanletterNewsPlatformPendingProvider({
  children,
  copy,
}: {
  children: ReactNode;
  copy: PlatformNavigationPendingCopy;
}) {
  const pathname = usePathname();
  const [pendingNavigation, setPendingNavigation] =
    useState<PlatformNavigationPendingState | null>(null);
  const pendingLabel =
    pendingNavigation?.pathname === pathname ? pendingNavigation.label : null;
  const startNavigation = useCallback(
    (label?: string) => {
      setPendingNavigation({
        label: label?.trim() || copy.fallbackLabel,
        pathname,
      });
    },
    [copy.fallbackLabel, pathname],
  );
  const contextValue = useMemo(
    () => ({ copy, startNavigation }),
    [copy, startNavigation],
  );

  useEffect(() => {
    if (!pendingLabel) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPendingNavigation(null);
    }, 9000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pendingLabel]);

  useEffect(() => {
    const clearNavigationPending = () => {
      setPendingNavigation(null);
    };

    window.addEventListener("pageshow", clearNavigationPending);
    window.addEventListener("popstate", clearNavigationPending);

    return () => {
      window.removeEventListener("pageshow", clearNavigationPending);
      window.removeEventListener("popstate", clearNavigationPending);
    };
  }, []);

  return (
    <PlatformNavigationPendingContext.Provider value={contextValue}>
      {children}
      <PlatformNavigationPendingOverlay copy={copy} pendingLabel={pendingLabel} />
    </PlatformNavigationPendingContext.Provider>
  );
}

export function FanletterNewsPlatformPendingLink({
  href,
  onClick,
  pendingLabel,
  replace,
  scroll,
  suppressPending,
  target,
  ...props
}: PlatformNavigationPendingLinkProps) {
  const context = useContext(PlatformNavigationPendingContext);
  const router = useRouter();
  const ariaPendingLabel =
    typeof props["aria-label"] === "string" ? props["aria-label"] : undefined;

  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);

        if (
          context &&
          shouldStartNavigationPending({
            event,
            href,
            suppressPending,
            target,
          })
        ) {
          flushSync(() => {
            context.startNavigation(pendingLabel ?? ariaPendingLabel);
          });

          const clientNavigationHref = getClientNavigationHref(href);

          if (clientNavigationHref) {
            event.preventDefault();
            window.setTimeout(() => {
              if (replace) {
                router.replace(clientNavigationHref, { scroll });
                return;
              }

              router.push(clientNavigationHref, { scroll });
            }, 120);
          }
        }
      }}
      replace={replace}
      scroll={scroll}
      target={target}
    />
  );
}
