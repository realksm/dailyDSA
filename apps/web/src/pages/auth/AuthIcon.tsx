// Lucide icons (via Iconify, see scripts/icons.mjs) for the auth pages. Decorative: always aria-hidden.
import { ICONS, type IconName } from "../../icons";

export function AuthIcon({ name, className }: { name: IconName; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? "a-icon"} dangerouslySetInnerHTML={{ __html: ICONS[name] }} />;
}
