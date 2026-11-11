// A tiny history-API router: the app has a dozen routes and no nested layouts, so this is all it needs.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";

interface Loc {
  path: string;
  search: URLSearchParams;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterCtx = createContext<Loc | null>(null);

const current = () => ({ path: window.location.pathname, search: window.location.search });

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState(current);

  useEffect(() => {
    const on = () => setLoc(current());
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const before = window.location.pathname;
    window.history[opts?.replace ? "replaceState" : "pushState"](null, "", to);
    setLoc(current());
    if (window.location.pathname !== before) window.scrollTo(0, 0);
  }, []);

  const value = useMemo<Loc>(() => ({ path: loc.path, search: new URLSearchParams(loc.search), navigate }), [loc, navigate]);
  return <RouterCtx.Provider value={value}>{children}</RouterCtx.Provider>;
}

export function useRouter(): Loc {
  const r = useContext(RouterCtx);
  if (!r) throw new Error("useRouter outside RouterProvider");
  return r;
}

/** Matches "/p/:slug" against a path; returns the params or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split("/");
  const b = path.replace(/\/+$/, "").split("/");
  if (path === "/") b.splice(1, 1, "");
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    const p = a[i]!;
    const s = b[i]!;
    if (p.startsWith(":")) {
      if (!s) return null;
      params[p.slice(1)] = decodeURIComponent(s);
    } else if (p !== s) return null;
  }
  return params;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string };

export function Link({ to, onClick, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target && rest.target !== "_self") return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}

export function NavLink({ to, exact, className, ...rest }: LinkProps & { exact?: boolean }) {
  const { path } = useRouter();
  const active = exact ? path === to : path === to || path.startsWith(`${to}/`);
  return <Link to={to} aria-current={active ? "page" : undefined} className={className} {...rest} />;
}
