import { flushSync } from "react-dom";

export function withViewTransition(update: () => void) {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    try {
      document.startViewTransition(() => {
        flushSync(update);
      });
      return;
    } catch {
      update();
      return;
    }
  }
  update();
}
