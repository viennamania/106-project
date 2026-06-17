"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Locks body scroll, moves focus into the dialog, traps Tab focus inside it,
 * closes on Escape, and restores focus to the previously focused element on
 * close. Shared by the responsive action panel and the creator launch confirm
 * dialog so modal accessibility stays consistent in one place.
 */
export function useDialogFocusTrap({
  containerRef,
  onClose,
  open,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  open: boolean;
}) {
  // Keep the latest onClose without making the trap effect depend on its
  // identity, otherwise an inline arrow callback would re-run the effect (and
  // steal focus) on every parent render while the dialog is open.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const container = containerRef.current;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    document.body.style.overflow = "hidden";

    function getFocusable() {
      if (!container) {
        return [] as HTMLElement[];
      }

      return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");
    }

    const initialFocusable = getFocusable();
    (initialFocusable[0] ?? container)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !container) {
        return;
      }

      const focusable = getFocusable();

      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (event.shiftKey) {
        if (!active || active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }

        return;
      }

      if (!active || active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [containerRef, open]);
}
