import { useLayoutEffect, useRef } from "react";

/**
 * The sliding underline of a `.tabs` bar. Put it last inside the tablist: it follows whichever tab has
 * aria-selected="true" (watched with a MutationObserver, so no props), and fades out when none has
 * (the closed console). It appears in place, without sliding, on first paint and after being hidden.
 */
export function TabInk() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const ink = ref.current;
    const bar = ink?.parentElement;
    if (!ink || !bar) return;
    bar.dataset.ink = ""; // the CSS hides the tabs' own underline only when the ink is there
    let shown = false;
    const tabs = () => bar.querySelectorAll<HTMLElement>(':scope > [role="tab"]');
    const ro = new ResizeObserver(() => place());
    const place = () => {
      const tab = bar.querySelector<HTMLElement>(':scope > [role="tab"][aria-selected="true"]');
      if (!tab) {
        ink.style.opacity = "0";
        shown = false;
        return;
      }
      if (!shown) delete ink.dataset.slide; // jump into place, then slide from the next change on
      ink.style.width = `${tab.offsetWidth}px`;
      ink.style.transform = `translateX(${tab.offsetLeft}px)`;
      ink.style.opacity = "1";
      if (!shown) {
        shown = true;
        void ink.offsetWidth; // commit the jump before turning the transition back on
        ink.dataset.slide = "";
      }
    };
    const mo = new MutationObserver(() => {
      tabs().forEach((t) => ro.observe(t)); // tabs can come and go
      place();
    });
    mo.observe(bar, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected"] });
    ro.observe(bar);
    tabs().forEach((t) => ro.observe(t));
    place();
    return () => {
      mo.disconnect();
      ro.disconnect();
      delete bar.dataset.ink;
    };
  }, []);
  return <span ref={ref} className="tab-ink" aria-hidden />;
}
