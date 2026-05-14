"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

type FanletterScrollRevealElement = "article" | "aside" | "div" | "section";

type FanletterScrollRevealProps = {
  as?: FanletterScrollRevealElement;
  children: ReactNode;
  className?: string;
  delayMs?: number;
  id?: string;
  once?: boolean;
};

const visibleClassNames = ["translate-y-0", "scale-100", "opacity-100"];
const hiddenClassNames = ["translate-y-5", "scale-[0.985]", "opacity-0"];

function setRevealState(
  node: HTMLElement,
  visible: boolean,
  delayMs: number,
) {
  node.classList.remove(...(visible ? hiddenClassNames : visibleClassNames));
  node.classList.add(...(visible ? visibleClassNames : hiddenClassNames));
  node.style.transitionDelay = visible && delayMs > 0 ? `${delayMs}ms` : "";
}

export function FanletterScrollReveal({
  as = "div",
  children,
  className = "",
  delayMs = 0,
  id,
  once = true,
}: FanletterScrollRevealProps) {
  const nodeRef = useRef<HTMLElement | null>(null);
  const setNode = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    const node = nodeRef.current;

    if (!node || !("IntersectionObserver" in window)) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealState(node, true, 0);
      return;
    }

    const rect = node.getBoundingClientRect();
    const startsInView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;

    setRevealState(node, startsInView, startsInView ? delayMs : 0);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealState(node, true, delayMs);

          if (once) {
            observer.disconnect();
          }

          return;
        }

        if (!once) {
          setRevealState(node, false, 0);
        }
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.12,
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [delayMs, once]);

  const revealClassName = [
    "transform-gpu transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
    ...visibleClassNames,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  if (as === "article") {
    return (
      <article className={revealClassName} id={id} ref={setNode}>
        {children}
      </article>
    );
  }

  if (as === "aside") {
    return (
      <aside className={revealClassName} id={id} ref={setNode}>
        {children}
      </aside>
    );
  }

  if (as === "section") {
    return (
      <section className={revealClassName} id={id} ref={setNode}>
        {children}
      </section>
    );
  }

  return (
    <div className={revealClassName} id={id} ref={setNode}>
      {children}
    </div>
  );
}
