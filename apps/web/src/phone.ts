// Phones get a small, read-only app (2026-11-13): this week's progress and the track lessons. Solving,
// the archive and history need a laptop. The same width as the phone rules in styles.css.
import { useEffect, useState } from "react";

const QUERY = "(max-width: 760px)";

export function usePhone(): boolean {
  const [phone, setPhone] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const q = window.matchMedia(QUERY);
    const on = () => setPhone(q.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return phone;
}
