// Solar icons (via Iconify, see scripts/solar-icons.mjs) for the auth pages. Decorative: always aria-hidden.
import { SOLAR, type SolarName } from "../../landing/solar";

export function AuthIcon({ name, className }: { name: SolarName; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? "a-icon"} dangerouslySetInnerHTML={{ __html: SOLAR[name] }} />;
}
