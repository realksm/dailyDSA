import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { isStaff, useAuth, useMe } from "./auth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BrandMark, Spinner } from "./components/ui";
import { Link, match, NavLink, useRouter } from "./router";
import { Account } from "./pages/Account";
import { Admin } from "./pages/admin/Admin";
import { Archive } from "./pages/Archive";
import { ForgotPassword, Login, ResetPassword, Signup } from "./pages/AuthPages";
import { HistoryPage } from "./pages/History";
import { ProblemPage } from "./pages/Problem";
import { SubmissionPage } from "./pages/Submission";
import { Today } from "./pages/Today";
import { TrackPage, TracksPage } from "./pages/Tracks";

/** Pages reachable without an account. "/" is the landing page while signed out. */
const PUBLIC = ["/welcome", "/login", "/signup", "/forgot-password", "/reset-password"];

// Its own chunk: GSAP and Lenis are only downloaded by people who see the landing page.
const Landing = lazy(() => import("./landing/Landing"));

export function App() {
  const { user, bootError } = useAuth();
  const { path, search, navigate } = useRouter();
  const isPublic = PUBLIC.includes(path);
  const isLanding = path === "/welcome" || (path === "/" && user === null);

  // Signed out on a private page: go to login and come back afterwards.
  useEffect(() => {
    if (user === null && !isPublic && path !== "/") {
      navigate(`/login?next=${encodeURIComponent(path + window.location.search)}`, { replace: true });
    }
    // Signed in on login/signup: nothing to do there.
    if (user && (path === "/login" || path === "/signup")) navigate(safeNext(search.get("next")), { replace: true });
  }, [user, isPublic, path, search, navigate]);

  if (user === undefined) {
    return (
      <div className="auth-wrap">
        <Spinner label="Loading…" />
      </div>
    );
  }

  if (isLanding) {
    return (
      <Suspense fallback={<div className="auth-wrap"><Spinner label="Loading…" /></div>}>
        <Landing />
      </Suspense>
    );
  }

  if (isPublic || !user) {
    return (
      <>
        {bootError && <div className="notice notice-bad" style={{ borderRadius: 0 }}>{bootError}</div>}
        {path === "/signup" ? <Signup /> : path === "/forgot-password" ? <ForgotPassword /> : path === "/reset-password" ? <ResetPassword /> : <Login />}
      </>
    );
  }

  return (
    <>
      <TopBar />
      <ErrorBoundary resetKey={path}>
        <Routes />
      </ErrorBoundary>
    </>
  );
}

/** Only same-site paths, so ?next= can't send anyone off-site. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function Routes(): ReactNode {
  const { path } = useRouter();
  const me = useMe();
  let m: Record<string, string> | null;
  if (match("/", path)) return <Today />;
  if (match("/archive", path)) return <Archive />;
  if ((m = match("/p/:slug", path))) return <ProblemPage key={m.slug} slug={m.slug!} />;
  if (match("/tracks", path)) return <TracksPage />;
  if ((m = match("/tracks/:pattern", path))) return <TrackPage key={m.pattern} pattern={m.pattern!} />;
  if (match("/history", path)) return <HistoryPage />;
  if ((m = match("/submissions/:id", path)) && /^\d+$/.test(m.id!)) return <SubmissionPage id={Number(m.id)} />;
  if (match("/account", path)) return <Account />;
  if (isStaff(me) && (path === "/admin" || path.startsWith("/admin/"))) return <Admin />;
  return (
    <main className="page">
      <div className="empty">
        <h3>Page not found</h3>
        <p>
          There's nothing at this address. <Link to="/">Go to today's problem</Link>.
        </p>
      </div>
    </main>
  );
}

function TopBar() {
  const me = useMe();
  const { logout } = useAuth();
  const [leaving, setLeaving] = useState(false);
  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="dailyDSA home">
        <BrandMark />
        <span>daily<b>DSA</b></span>
      </Link>
      <nav className="nav" aria-label="Main">
        <NavLink to="/" exact>Today</NavLink>
        <NavLink to="/archive">Archive</NavLink>
        <NavLink to="/tracks">Tracks</NavLink>
        <NavLink to="/history">History</NavLink>
        {isStaff(me) && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="spacer" />
      <div className="who">
        <Link to="/account" title={me.email}>{me.name}</Link>
        <button
          className="logout"
          disabled={leaving}
          onClick={() => {
            setLeaving(true);
            void logout().finally(() => setLeaving(false));
          }}
        >
          {leaving ? "Logging out…" : "Log out"}
          <svg viewBox="0 0 16 16" aria-hidden>
            <path d="M6 2.75H3.75a1 1 0 0 0-1 1v8.5a1 1 0 0 0 1 1H6M10 5l3 3-3 3M13 8H6.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
