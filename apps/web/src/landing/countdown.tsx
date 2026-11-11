// The time left until the next daily (midnight IST). Shared by the landing page and the auth pages' side panel.
import { useEffect, useRef, useState } from "react";

export const DAY_MS = 86_400_000;
export const IST_OFFSET_MS = 19_800_000; // UTC+5:30, no daylight saving

export function untilIstMidnight(now = Date.now()) {
  const left = DAY_MS - ((now + IST_OFFSET_MS) % DAY_MS);
  const s = Math.floor(left / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Time to the next problem. Ticks only while visible on screen and the tab is in front. */
export function Countdown() {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    let onScreen = true;
    const start = () => {
      window.clearInterval(timer);
      if (!onScreen || document.hidden) return;
      setText(untilIstMidnight());
      timer = window.setInterval(() => setText(untilIstMidnight()), 1000);
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = !!e?.isIntersecting;
      start();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", start);
    start();
    return () => {
      window.clearInterval(timer);
      io.disconnect();
      document.removeEventListener("visibilitychange", start);
    };
  }, []);
  return (
    <span ref={ref}>
      {text ? <>Next problem in <b className="mono">{text}</b></> : "A new problem every midnight"} · IST
    </span>
  );
}

