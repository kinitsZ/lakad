import { ViewTransition, type ReactNode } from "react";

/**
 * Wraps a page's content (not the layout — layouts persist, so they never enter or
 * exit). Links tagged "nav-forward"/"nav-back" slide the page that way; a page
 * arriving after its loading skeleton lifts in. Animations live in globals.css.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "reveal" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

/** Which way a tab change should slide: right-hand tabs come in from the right. */
export function directionTo(fromIndex: number, toIndex: number) {
  if (fromIndex < 0 || toIndex === fromIndex) return undefined;
  return [toIndex > fromIndex ? "nav-forward" : "nav-back"];
}
