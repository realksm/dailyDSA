// The public landing page: "/" for signed-out visitors, "/welcome" for everyone, and
// "/welcome?code=…" (the admin's invite link) in an "you're invited" mode.
// Lazy-loaded from App.tsx, so GSAP and Lenis never reach the app's own bundle.
//
// Art direction: the week is the hero. The page reads Monday to Sunday like the product runs, in the
// Streak look (ink outlines, hard shadows, coral fill, Bricolage Grotesque). Every visual is real
// interface or data (day squares, test squares, verdict badges); no photos, illustrations or proof we
// don't have. Motion: GSAP + ScrollTrigger, Lenis as the only smooth scroll, both skipped entirely under
// prefers-reduced-motion (the markup already is the final state). One pinned, scrubbed scene: the week.
// No Three.js: depth adds nothing to a flat ink-and-shadow look.
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import "./landing.css";
import { useAuth } from "../auth";
import { BrandMark, useTitle } from "../components/ui";
import { Link, useRouter } from "../router";
import { SOLAR, type SolarName } from "./solar";
// Each track's ladder titles, first "How to spot it" clue and weekend count, read from problems/_tracks/ at build time.
import { PLANNED, TRACKS } from "virtual:landing-tracks";

gsap.registerPlugin(ScrollTrigger);

function Icon({ name, className }: { name: SolarName; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? "lp-icon"} dangerouslySetInnerHTML={{ __html: SOLAR[name] }} />;
}

/** A heading whose words can rise one by one. Assistive tech reads the unsplit text; the split copy is
 *  decorative. Without JS or motion the split words simply sit there in their final place.
 *  Use a non-breaking space ( ) to keep two words on one line. */
function Split({ text, className }: { text: string; className?: string }) {
  return (
    <>
      <span className="sr-only">{text} </span>
      <span className={`lp-words${className ? ` ${className}` : ""}`} aria-hidden="true">
        {text.split(" ").map((w, i) => (
          <Fragment key={i}>
            <span className="w"><span className="wi">{w}</span></span>{" "}
          </Fragment>
        ))}
      </span>
    </>
  );
}

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 19_800_000; // UTC+5:30, no daylight saving

function untilIstMidnight(now = Date.now()) {
  const left = DAY_MS - ((now + IST_OFFSET_MS) % DAY_MS);
  const s = Math.floor(left / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Time to the next problem. Ticks only while visible on screen and the tab is in front. */
function Countdown() {
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

/** Invite codes look like DSA-XXXX-XXXX; anything else in ?code= is ignored. */
function inviteCode(raw: string | null): string | null {
  const code = raw?.trim().toUpperCase() ?? "";
  return /^[A-Z0-9-]{4,40}$/.test(code) ? code : null;
}


const WEEK: { day: string; lead?: ReactNode; ladder?: number; items: ReactNode[] }[] = [
  { day: "Mon", lead: <><Icon name="lesson" />The lesson goes up</>, ladder: 1, items: ["Weekday daily"] },
  { day: "Tue", ladder: 2, items: ["Weekday daily"] },
  { day: "Wed", ladder: 3, items: ["Weekday daily"] },
  { day: "Thu", ladder: 4, items: ["Weekday daily"] },
  { day: "Fri", ladder: 5, items: ["Weekday daily"] },
  { day: "Sat", items: ["A harder problem from the week's pattern", "Catch up on the ladder"] },
  { day: "Sun", items: ["Another one, tag still hidden", "Catch up on the ladder"] },
];

const STEPS: { icon: SolarName; title: string; body: string }[] = [
  { icon: "read", title: "Read it cold", body: "It lands at midnight IST with its pattern hidden. Working out which idea it needs is half the exercise." },
  { icon: "run", title: "Run on the samples", body: "The input is already read into variables; you write solve(). Run checks the samples and your own input." },
  { icon: "submit", title: "Submit to every test", body: "Hidden tests included, with time and memory for each." },
  { icon: "unlock", title: "See how others did it", body: "Solve it and the pattern is revealed, with a link to its track, plus the official and everyone's accepted solutions." },
];

const VERDICTS: { code: string; label: string; tone: "ok" | "bad" | "warn" | "info" }[] = [
  { code: "AC", label: "Accepted", tone: "ok" },
  { code: "WA", label: "Wrong Answer", tone: "bad" },
  { code: "RE", label: "Runtime Error", tone: "bad" },
  { code: "TLE", label: "Time Limit", tone: "warn" },
  { code: "MLE", label: "Memory Limit", tone: "warn" },
  { code: "OLE", label: "Output Limit", tone: "warn" },
  { code: "CE", label: "Compile Error", tone: "info" },
];

/** An example month for the habit section: s solved, m missed, r review (solved), t today (solved).
 *  Ends on a 3-day streak, the same one as the hero's week strip. */
const MONTH = "sssssmsssssrsssssssmsssrssmsst".split(""); // 30 days
const MONTH_LABEL: Record<string, string> = { s: "solved", m: "missed", r: "review, solved", t: "today, solved" };

const NAV = [
  { href: "#day", label: "How a day works" },
  { href: "#week", label: "The week" },
  { href: "#tracks", label: "Tracks" },
  { href: "#judge", label: "The judge" },
];

/** The hero's focal scene: an example day, made of the app's own interface. The problem is invented
 *  for this page (not from the bank), so nothing here spoils a real daily. */
function HeroScene() {
  const tests = 12;
  return (
    <figure className="lp-scene" data-scene>
      <figcaption className="sr-only">
        An example day: an invented problem, Still Water, solved in C++ with all {tests} tests passing, and a 3-day streak.
      </figcaption>
      <div className="lp-scene-stack" aria-hidden="true">
        <div className="lp-layer lp-layer-problem" data-depth="0.6"><article className="lp-card lp-card-problem">
          <div className="lp-chips">
            <span className="lp-chip">Wed · weekday daily</span>
            <span className="lp-chip lp-chip-muted"><Icon name="hidden" />pattern hidden</span>
          </div>
          <h3>Still Water</h3>
          <p>A buoy logs <i>n</i> wave heights. Find the longest run of readings that are all at most <i>h</i>.</p>
          <p className="lp-limits mono">1 ≤ n ≤ 2·10⁵ · 1 s · 256 MB</p>
        </article></div>

        <div className="lp-layer lp-layer-code" data-depth="1"><article className="lp-card lp-card-code">
          <header>
            <span className="mono">solution.cpp</span>
            <span className="lp-fake-btn">Run</span>
            <span className="lp-fake-btn lp-fake-primary">Submit</span>
          </header>
          <pre className="mono" data-code>
            <span className="ln"><b className="k">int</b> <b className="f">solve</b>(<b className="k">int</b> n, <b className="k">int</b> h, <b className="t">vector</b>&lt;<b className="k">int</b>&gt;&amp; a) {"{"}</span>
            <span className="ln">    <b className="k">int</b> best = <b className="n">0</b>, run = <b className="n">0</b>;</span>
            <span className="ln">    <b className="k">for</b> (<b className="k">int</b> x : a) {"{"}</span>
            <span className="ln">        run = x &lt;= h ? run + <b className="n">1</b> : <b className="n">0</b>;</span>
            <span className="ln">        best = <b className="f">max</b>(best, run);</span>
            <span className="ln">    {"}"}</span>
            <span className="ln">    <b className="k">return</b> best;</span>
            <span className="ln">{"}"}</span>
          </pre>
        </article></div>

        <div className="lp-layer lp-layer-verdict" data-depth="1.5"><article className="lp-card lp-card-verdict">
          <div className="lp-verdict-head">
            <span className="lp-badge lp-tone-ok" data-verdict>Accepted</span>
            <span className="mono lp-muted">{tests}/{tests} tests</span>
          </div>
          <div className="lp-tests">
            {Array.from({ length: tests }, (_, i) => <span key={i} className="lp-sq"><i /></span>)}
          </div>
          <p className="lp-reveal-line" data-reveal-line><Icon name="unlock" />Pattern revealed · practise its track</p>
        </article></div>
      </div>

      <div className="lp-layer lp-layer-week" aria-hidden="true" data-depth="0.35"><div className="lp-week-strip">
        <div className="lp-streak">
          <Icon name="streak" />
          <span><b data-streak>3</b>-day streak</span>
        </div>
        <ol>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <li key={i} className={i < 2 ? "done" : i === 2 ? "done today" : ""}>
              <span>{d}</span>
            </li>
          ))}
        </ol>
      </div></div>
    </figure>
  );
}

/** The judge section's focal piece: a Submit that fails one hidden test and shows its input. */
function SubmitRun() {
  const tests = 12;
  const failAt = 8; // zero-based: test 9
  return (
    <figure className="lp-run" data-run>
      <figcaption className="sr-only">
        An example Submit in Python: tests 1 to 8 pass, hidden test 9 gets Wrong Answer and shows its input (6 3, then 1 4 2 3 5 1),
        the expected output 2 and the program's output 3.
      </figcaption>
      <div aria-hidden="true">
        <header className="lp-run-head">
          <span className="mono">Submit · solution.py</span>
          <span className="lp-badge lp-tone-bad" data-run-verdict>Wrong Answer</span>
        </header>
        <div className="lp-run-tests">
          {Array.from({ length: tests }, (_, i) => (
            <span key={i} className={`lp-sq${i === failAt ? " bad" : i > failAt ? " skip" : ""}`}><i /></span>
          ))}
        </div>
        <p className="lp-run-sum mono"><b>Test 9</b> · hidden · 18 ms · 9.4 MB</p>
        <div className="lp-run-detail" data-run-detail>
          <div><span>Input</span><pre className="mono">6 3{"\n"}1 4 2 3 5 1</pre></div>
          <div><span>Expected</span><pre className="mono">2</pre></div>
          <div className="lp-run-yours"><span>Your output</span><pre className="mono">3</pre></div>
        </div>
      </div>
    </figure>
  );
}

export default function Landing() {
  useTitle("");
  const { user } = useAuth();
  const { search } = useRouter();
  const signedIn = !!user;
  const code = signedIn ? null : inviteCode(search.get("code"));
  const signupTo = code ? `/signup?code=${encodeURIComponent(code)}` : "/signup";
  const root = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the small-screen menu on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    let lenis: Lenis | null = null;

    // In-page links: smooth with Lenis, native otherwise; focus always moves to the section.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const target = document.getElementById(a.hash.slice(1));
      if (!target) return;
      e.preventDefault();
      setMenuOpen(false);
      if (lenis) lenis.scrollTo(target, { offset: -64 });
      else target.scrollIntoView({ block: "start" });
      target.focus({ preventScroll: true });
      history.replaceState(null, "", a.hash + "");
    };
    el.addEventListener("click", onClick);

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      el.dataset.motion = "on";

      // One smooth-scroll engine, driven by GSAP's ticker so ScrollTrigger and Lenis share a frame.
      lenis = new Lenis({ autoRaf: false, anchors: false });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      // Hero intro. Nav, message and buttons stay readable and clickable throughout: the headline
      // words only rise into place, and the buttons only settle.
      const scene = el.querySelector("[data-scene]")!;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".lp-hero .wi", { yPercent: 105, duration: 0.7, stagger: 0.05 })
        .from(".lp-hero [data-settle]", { y: 10, duration: 0.6, stagger: 0.06 }, 0.15)
        .from(scene.querySelectorAll(".lp-card"), { y: 40, rotate: 0, opacity: 0, duration: 0.8, stagger: 0.12 }, 0.2)
        .from(scene.querySelectorAll("[data-code] .ln"), { clipPath: "inset(0 100% 0 0)", duration: 0.35, stagger: 0.07, ease: "none" }, 0.55)
        .from(scene.querySelectorAll(".lp-sq i"), { scale: 0, duration: 0.25, stagger: 0.04, ease: "back.out(2)" }, 1.2)
        .from(scene.querySelector("[data-verdict]"), { scale: 0.6, opacity: 0, duration: 0.4, ease: "back.out(2.4)" }, ">-0.05")
        .from(scene.querySelector("[data-reveal-line]"), { y: 8, opacity: 0, duration: 0.4 }, ">-0.1")
        .from(scene.querySelector(".lp-week-strip"), { y: 24, opacity: 0, duration: 0.6 }, 0.5)
        .from(scene.querySelector(".lp-week-strip .today span"), { scale: 0.4, duration: 0.45, ease: "back.out(3)" }, ">0.9");
      // Today's square pops and the streak ticks over with it.
      const streak = scene.querySelector<HTMLElement>("[data-streak]");
      if (streak) {
        streak.textContent = "2";
        tl.call(() => { streak.textContent = "3"; }, undefined, "<");
      }

      // Section choreography: heading words first, then the section's supporting pieces.
      gsap.utils.toArray<HTMLElement>("[data-split-reveal]").forEach((h) => {
        gsap.from(h.querySelectorAll(".wi"), {
          yPercent: 110, duration: 0.8, stagger: 0.045, ease: "power3.out",
          scrollTrigger: { trigger: h, start: "top 85%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((g) => {
        // Opacity only (not visibility), so links inside stay focusable before they're revealed.
        gsap.from(g.querySelectorAll(":scope > *"), {
          y: 28, opacity: 0, duration: 0.7, stagger: 0.08, ease: "power3.out",
          scrollTrigger: { trigger: g, start: "top 85%", once: true },
        });
      });

      // The judge: tests tick through, test 9 fails, its input opens.
      const run = el.querySelector("[data-run]")!;
      gsap.timeline({ scrollTrigger: { trigger: run, start: "top 75%", once: true }, defaults: { ease: "power3.out" } })
        .from(run.querySelectorAll(".lp-sq i"), { scale: 0, duration: 0.22, stagger: 0.07, ease: "back.out(2)" })
        .from(run.querySelector(".lp-sq.bad"), { x: -4, duration: 0.4, ease: "elastic.out(1.2, 0.3)" }, 0.56 + 0.22)
        .from(run.querySelector("[data-run-verdict]"), { scale: 0.6, opacity: 0, duration: 0.4, ease: "back.out(2.4)" }, ">-0.1")
        .from(run.querySelector("[data-run-detail]"), { y: 16, opacity: 0, duration: 0.6 }, ">");

      // The habit: the month fills in, day by day.
      const month = el.querySelector(".lp-month")!;
      gsap.from(month.querySelectorAll("li"), {
        scale: 0.3, opacity: 0, duration: 0.35, stagger: 0.025, ease: "back.out(2)",
        scrollTrigger: { trigger: month, start: "top 85%", once: true },
      });

      // Fonts change line breaks: re-measure once they're in.
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());

      return () => {
        delete el.dataset.motion;
        if (streak) streak.textContent = "3";
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(500, 33);
        lenis?.destroy();
        lenis = null;
      };
    });

    // Wide screens: the week is pinned and scrolling walks it from Monday to Sunday. The ladder bars
    // rise with the difficulty, and the weekend lands last.
    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 900px)", () => {
      const section = el.querySelector<HTMLElement>("#week")!;
      const days = gsap.utils.toArray<HTMLElement>(".lp-day", section);
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: section,
          // Pin with the whole section in view when it fits under the nav, else with its cards in view.
          start: () => (section.offsetHeight <= window.innerHeight - 64 ? "top 64px" : "bottom bottom"),
          end: "+=1500",
          pin: true,
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });
      tl.fromTo(".lp-week-progress i", { scaleX: 0 }, { scaleX: 1, ease: "none", duration: days.length }, 0);
      days.forEach((d, i) => {
        tl.fromTo(d, { opacity: 0.28, y: 18 }, { opacity: 1, y: 0, duration: 0.6 }, i);
        const bar = d.querySelector(".lp-day-bar i");
        if (bar) tl.fromTo(bar, { scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: "back.out(1.6)" }, i + 0.2);
      });
      tl.to({}, { duration: 0.6 }); // a beat on Sunday before the pin lets go
    });

    // Narrow screens: no pin; the days just arrive in order.
    mm.add("(prefers-reduced-motion: no-preference) and (max-width: 899px)", () => {
      gsap.from(".lp-day", {
        y: 24, opacity: 0, duration: 0.6, stagger: 0.07, ease: "power3.out",
        scrollTrigger: { trigger: ".lp-week", start: "top 85%", once: true },
      });
    });

    // Fine pointers: the hero cards drift a little with the pointer. Purely additive.
    mm.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)", () => {
      const hero = el.querySelector<HTMLElement>(".lp-hero")!;
      const layers = gsap.utils.toArray<HTMLElement>("[data-scene] [data-depth]").map((node) => ({
        depth: Number(node.dataset.depth),
        x: gsap.quickTo(node, "x", { duration: 0.6, ease: "power3.out" }),
        y: gsap.quickTo(node, "y", { duration: 0.6, ease: "power3.out" }),
      }));
      let frame = 0;
      let px = 0;
      let py = 0;
      const apply = () => {
        frame = 0;
        for (const l of layers) {
          l.x(px * 10 * l.depth);
          l.y(py * 8 * l.depth);
        }
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const r = hero.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width - 0.5;
        py = (e.clientY - r.top) / r.height - 0.5;
        if (!frame) frame = requestAnimationFrame(apply);
      };
      const reset = () => {
        px = 0;
        py = 0;
        if (!frame) frame = requestAnimationFrame(apply);
      };
      const onVis = () => document.hidden && reset();
      hero.addEventListener("pointermove", onMove);
      hero.addEventListener("pointerleave", reset);
      window.addEventListener("blur", reset);
      document.addEventListener("visibilitychange", onVis);
      return () => {
        cancelAnimationFrame(frame);
        hero.removeEventListener("pointermove", onMove);
        hero.removeEventListener("pointerleave", reset);
        window.removeEventListener("blur", reset);
        document.removeEventListener("visibilitychange", onVis);
      };
    });

    return () => {
      el.removeEventListener("click", onClick);
      mm.revert();
    };
  }, []);

  return (
    <div className="lp" ref={root}>
      <a className="lp-skip" href="#lp-main">Skip to content</a>

      <header className="lp-nav">
        <Link to={signedIn ? "/" : "/welcome"} className="brand" aria-label="dailyDSA home">
          <BrandMark />
          <span>daily<b>DSA</b></span>
        </Link>
        <nav aria-label="Sections" id="lp-menu" className={menuOpen ? "open" : undefined}>
          {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
          {!signedIn && !code && <Link to="/signup" className="lp-nav-invite"><Icon name="invite" />I have an invite</Link>}
        </nav>
        <div className="lp-nav-end">
          {signedIn ? (
            <Link to="/" className="btn btn-primary">Today</Link>
          ) : code ? (
            <Link to={signupTo} className="btn btn-primary">Claim your spot</Link>
          ) : (
            <Link to="/login" className="btn btn-primary">Log in</Link>
          )}
          <button
            type="button"
            className="lp-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="lp-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
      </header>

      <main id="lp-main" tabIndex={-1}>
        {/* 1 · Hero */}
        <section className="lp-hero" aria-labelledby="lp-hero-title">
          <div className="lp-hero-copy">
            {code ? (
              <p className="lp-kicker lp-kicker-invite" data-settle>
                <Icon name="invite" />You're invited<span className="lp-code mono">{code}</span>
              </p>
            ) : (
              <p className="lp-kicker" data-settle><Icon name="calendar" /><Countdown /></p>
            )}
            <h1 id="lp-hero-title" className="lp-display">
              <Split text={"One problem a day."} />
              <Split text={"One pattern a week."} className="lp-accent" />
            </h1>
            <p className="lp-lede" data-settle>
              Original DSA practice for a small, invite-only group. The pattern stays hidden until you solve it, and each week one
              pattern gets a lesson and a five-step ladder.
            </p>
            <div className="lp-cta" data-settle>
              {signedIn ? (
                <Link to="/" className="btn btn-primary btn-lg">Open today's problem<Icon name="arrow" className="lp-icon lp-arrow" /></Link>
              ) : code ? (
                <>
                  <Link to={signupTo} className="btn btn-primary btn-lg">Claim your spot<Icon name="arrow" className="lp-icon lp-arrow" /></Link>
                  <Link to="/login" className="btn btn-lg">I already have an account</Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-primary btn-lg">Log in<Icon name="arrow" className="lp-icon lp-arrow" /></Link>
                  <Link to="/signup" className="btn btn-lg">I have an invite code</Link>
                </>
              )}
            </div>
            <p className="lp-fine" data-settle>{code ? <Countdown /> : "C++, Java and Python, judged in a sandbox."}</p>
          </div>
          <HeroScene />
        </section>

        {/* 2 · A day */}
        <section id="day" className="lp-section" tabIndex={-1} aria-labelledby="day-title">
          <div className="lp-section-head">
            <p className="lp-eyebrow">01 · The daily</p>
            <h2 id="day-title" data-split-reveal><Split text="Four steps, every day." /></h2>
            <p className="lp-section-lede">Weekdays bring a mixed, easier problem of any pattern. Spotting what it needs is the point.</p>
          </div>
          <div className="lp-steps-wrap">
            <div className="lp-rail" aria-hidden="true" />
            <ol className="lp-steps" data-reveal-group>
              {STEPS.map((s, i) => (
                <li key={s.title} className="lp-step">
                  <span className="lp-step-num" aria-hidden="true">{i + 1}</span>
                  <div className="lp-step-body">
                    <h3><Icon name={s.icon} />{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 3 · The week (pinned and scrubbed on wide screens) */}
        <section id="week" className="lp-section lp-section-sunk" tabIndex={-1} aria-labelledby="week-title">
          <div className="lp-section-head">
            <p className="lp-eyebrow">02 · The week</p>
            <h2 id="week-title" data-split-reveal><Split text="Monday teaches. The weekend tests." /></h2>
            <p className="lp-section-lede">Weeks run Monday to Sunday, IST. One ladder problem opens each weekday, and nothing ever closes.</p>
          </div>
          <ol className="lp-week">
            {WEEK.map((d) => (
              <li key={d.day} className={`lp-day${d.ladder ? "" : " lp-day-weekend"}`}>
                <span className="lp-day-name">{d.day}</span>
                <ul>
                  {d.lead && <li>{d.lead}</li>}
                  {d.ladder && <li className="lp-day-ladder">Ladder #{d.ladder} opens</li>}
                  {d.items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
                {d.ladder ? (
                  <span className="lp-day-bar" aria-hidden="true"><i style={{ height: `${d.ladder * 20}%` }} /></span>
                ) : (
                  <span className="lp-day-hidden" aria-hidden="true"><Icon name="hidden" />tag hidden</span>
                )}
              </li>
            ))}
          </ol>
          <div className="lp-week-progress" aria-hidden="true"><i /></div>
        </section>

        {/* 4 · Tracks */}
        <section id="tracks" className="lp-section" tabIndex={-1} aria-labelledby="tracks-title">
          <div className="lp-section-head">
            <p className="lp-eyebrow">03 · Tracks</p>
            <h2 id="tracks-title" data-split-reveal><Split text="Learn the pattern, then climb it." /></h2>
            <p className="lp-section-lede">
              A lesson (how to spot it, the core idea, template code, common mistakes) and five problems from easy to hard, each with
              three hints. Tracks stay open, so joining late is fine.
            </p>
          </div>
          <div className="lp-tracks" data-reveal-group>
            {TRACKS.map((t) => (
              <article key={t.slug} className="lp-track">
                <h3>{t.name}</h3>
                <p className="lp-track-clue"><span className="lp-eyebrow">Spot it</span>{t.clue}</p>
                <ol aria-label={`${t.name} ladder, easiest first`}>
                  {t.ladder.map((p, i) => (
                    <li key={p}><span className="mono" aria-hidden="true">{i + 1}</span>{p}</li>
                  ))}
                </ol>
                <p className="lp-track-meta"><Icon name="lesson" />Lesson<span aria-hidden="true">·</span><Icon name="hint" />3 hints each{t.weekend > 0 && <><span aria-hidden="true">·</span>{t.weekend} weekend problem{t.weekend === 1 ? "" : "s"}</>}</p>
              </article>
            ))}
          </div>
          <p className="lp-planned">
            <span className="lp-eyebrow">Planned next</span>
            {PLANNED.map((p) => <span key={p} className="lp-chip lp-chip-muted">{p}</span>)}
          </p>
        </section>

        {/* 5 · Judge: heading on top, the run wide below */}
        <section id="judge" className="lp-section lp-section-ink" tabIndex={-1} aria-labelledby="judge-title">
          <div className="lp-judge-head">
            <div>
              <p className="lp-eyebrow">04 · The judge</p>
              <h2 id="judge-title" data-split-reveal><Split text="Real verdicts, not vibes." /></h2>
            </div>
            <div>
              <p className="lp-section-lede">
                Code runs in a sandbox against hidden tests. Time limits come from the reference solutions in each language, so
                Python isn't punished for being Python. When a hidden test fails, you see its input.
              </p>
              <div className="lp-langs">
                {["C++", "Java", "Python"].map((l) => <span key={l} className="lp-lang">{l}</span>)}
              </div>
            </div>
          </div>
          <SubmitRun />
          <ul className="lp-verdicts" aria-label="Verdicts">
            {VERDICTS.map((v) => (
              <li key={v.code}>
                <span className={`lp-badge lp-tone-${v.tone} mono`}>{v.code}</span>
                {v.label}
              </li>
            ))}
          </ul>
        </section>

        {/* 6 · The habit: an example month, then the rules */}
        <section id="streak" className="lp-section" tabIndex={-1} aria-labelledby="streak-title">
          <div className="lp-section-head">
            <p className="lp-eyebrow">05 · The habit</p>
            <h2 id="streak-title" data-split-reveal><Split text="Keep the squares coloured." /></h2>
          </div>
          <figure className="lp-month-fig">
            <figcaption className="sr-only">
              An example month: most days solved, three missed, two review days, ending on today with a 3-day streak.
            </figcaption>
            <ol className="lp-month" aria-hidden="true">
              {MONTH.map((s, i) => <li key={i} className={`m-${s}`} title={`Day ${i + 1}: ${MONTH_LABEL[s]}`} />)}
            </ol>
            <div className="lp-month-marks" aria-hidden="true">
              <span className="lp-month-streak">3-day streak</span>
            </div>
            <ul className="lp-month-key" aria-hidden="true">
              <li><i className="m-s" />Solved that day</li>
              <li><i className="m-m" />Missed: still open in the archive</li>
              <li><i className="m-r" />Review: it came round again</li>
              <li><i className="m-t" />Today</li>
            </ul>
          </figure>
          <div className="lp-rules" data-reveal-group>
            <div>
              <h3><Icon name="streak" />The streak</h3>
              <p>A day counts when you solve its daily before that day ends in IST. Solving a missed day later doesn't mend it.</p>
            </div>
            <div>
              <h3><Icon name="archive" />The archive</h3>
              <p>Every past daily stays open. When a problem comes round again, it's marked as review.</p>
            </div>
            <div>
              <h3><Icon name="hint" />Honest history</h3>
              <p>Stuck? Open the solutions after a real submit. Hints and early peeks are recorded.</p>
            </div>
          </div>
        </section>

        {/* 7 · Final call */}
        <section className="lp-final" aria-labelledby="final-title">
          <div className="lp-final-card" data-reveal-group>
            {signedIn ? (
              <>
                <h2 id="final-title">You're already in.</h2>
                <p>Today's problem is waiting, and so is the rest of this week's ladder.</p>
                <div className="lp-cta">
                  <Link to="/" className="btn btn-lg lp-btn-ink">Open today's problem<Icon name="arrow" className="lp-icon lp-arrow" /></Link>
                </div>
              </>
            ) : code ? (
              <>
                <h2 id="final-title">Your invite is ready.</h2>
                <p>Code <b className="mono">{code}</b> is filled in for you. Pick a name and a password and today's problem is yours.</p>
                <div className="lp-cta">
                  <Link to={signupTo} className="btn btn-lg lp-btn-ink"><Icon name="invite" />Claim your spot</Link>
                  <Link to="/login" className="btn btn-lg"><Icon name="login" />Log in</Link>
                </div>
              </>
            ) : (
              <>
                <h2 id="final-title">Have an invite code?</h2>
                <p>Create your account and today's problem is yours. No code yet? Ask the admin who runs your group.</p>
                <div className="lp-cta">
                  <Link to="/signup" className="btn btn-lg lp-btn-ink"><Icon name="invite" />Create your account</Link>
                  <Link to="/login" className="btn btn-lg"><Icon name="login" />Log in</Link>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="brand"><BrandMark /><span>daily<b>DSA</b></span></div>
        <p>One problem a day, one pattern a week. All problems are original.</p>
        <p className="lp-credit">
          Icons: <a href="https://www.figma.com/community/file/1166831539721848736" rel="noreferrer" target="_blank">Solar</a> by 480 Design,{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" rel="noreferrer" target="_blank">CC BY 4.0</a>.
        </p>
      </footer>
    </div>
  );
}
