// The public landing page: "/" for signed-out visitors, "/welcome" for everyone.
// Lazy-loaded from App.tsx, so GSAP and Lenis never reach the app's own bundle.
//
// Art direction: the week is the hero. The page reads Monday to Sunday like the product runs, in the
// Streak look (ink outlines, hard shadows, coral fill, Bricolage Grotesque). Every visual is real
// interface or data (day squares, test squares, verdict badges); no photos, illustrations or proof we
// don't have. Motion: GSAP + ScrollTrigger, Lenis as the only smooth scroll, both skipped entirely under
// prefers-reduced-motion (the markup already is the final state). No Three.js: depth adds nothing to a
// flat ink-and-shadow look.
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import "./landing.css";
import { useAuth } from "../auth";
import { BrandMark, useTitle } from "../components/ui";
import { Link } from "../router";
import { SOLAR, type SolarName } from "./solar";

gsap.registerPlugin(ScrollTrigger);

function Icon({ name, className }: { name: SolarName; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? "lp-icon"} dangerouslySetInnerHTML={{ __html: SOLAR[name] }} />;
}

/** A heading whose words can rise one by one. Assistive tech reads the unsplit text; the split copy is
 *  decorative. Without JS or motion the split words simply sit there in their final place. */
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

const TRACKS = [
  { name: "Two pointers", ladder: ["Budget Pairs", "Nearest Readings", "Cable Cars", "Shared Free Time", "Even Stacks"] },
  { name: "Sliding window", ladder: ["Quiet Stretch", "Fuel Run", "Badge Scans", "Spice Road", "Steady Readings"] },
  { name: "Prefix sums", ladder: ["Fair Split", "Stage Lights", "Even Shares", "Orchard Plots", "Tiring Weeks"] },
  { name: "Binary search on the answer", ladder: ["Tanker Capacity", "Tent Spacing", "Widget Factory", "Kth Combo", "Median Stretch"] },
];
const PLANNED = ["Monotonic stack", "BFS / DFS", "Simple 1D DP", "Heaps / top-k"];

const WEEK: { day: string; tone: "weekday" | "weekend"; items: ReactNode[] }[] = [
  { day: "Mon", tone: "weekday", items: [<><Icon name="lesson" />The week's lesson goes up</>, "Ladder #1 opens", "Weekday daily"] },
  { day: "Tue", tone: "weekday", items: ["Ladder #2 opens", "Weekday daily"] },
  { day: "Wed", tone: "weekday", items: ["Ladder #3 opens", "Weekday daily"] },
  { day: "Thu", tone: "weekday", items: ["Ladder #4 opens", "Weekday daily"] },
  { day: "Fri", tone: "weekday", items: ["Ladder #5 opens", "Weekday daily"] },
  { day: "Sat", tone: "weekend", items: ["A harder problem from the week's pattern", "Catch up on the ladder"] },
  { day: "Sun", tone: "weekend", items: ["Another one, tag still hidden", "Catch up on the ladder"] },
];

const STEPS: { icon: SolarName; title: string; body: string }[] = [
  {
    icon: "read",
    title: "Read it cold",
    body: "The problem lands at midnight IST with its pattern hidden. Working out which idea it needs is half the exercise.",
  },
  {
    icon: "run",
    title: "Run on the samples",
    body: "The editor opens with the input already read into variables; you write solve(). Run checks the samples and anything you type in.",
  },
  {
    icon: "submit",
    title: "Submit to every test",
    body: "Hidden tests included, with the time and memory of each. If a hidden test fails, you see its input.",
  },
  {
    icon: "unlock",
    title: "See how others did it",
    body: "Solve it and the pattern is revealed, with a link to its track. Solutions open too: the official ones and everyone's accepted code.",
  },
];

const VERDICTS: { code: string; label: string; tone: "ok" | "bad" | "warn" | "info" }[] = [
  { code: "AC", label: "Accepted", tone: "ok" },
  { code: "WA", label: "Wrong Answer", tone: "bad" },
  { code: "RE", label: "Runtime Error", tone: "bad" },
  { code: "TLE", label: "Time Limit Exceeded", tone: "warn" },
  { code: "MLE", label: "Memory Limit Exceeded", tone: "warn" },
  { code: "OLE", label: "Output Limit Exceeded", tone: "warn" },
  { code: "CE", label: "Compile Error", tone: "info" },
];

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
        An example day: an invented problem, Still Water, solved in C++ with all {tests} tests passing, and the week's streak growing to 12 days.
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
          <span><b data-streak>12</b>-day streak</span>
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

export default function Landing() {
  useTitle("");
  const { user } = useAuth();
  const signedIn = !!user;
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
      if (lenis) lenis.scrollTo(target, { offset: -72 });
      else target.scrollIntoView({ block: "start" });
      target.focus({ preventScroll: true });
      history.replaceState(null, "", a.hash);
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
        streak.textContent = "11";
        tl.call(() => { streak.textContent = "12"; }, undefined, "<");
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

      // Fonts change line breaks: re-measure once they're in.
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());

      return () => {
        delete el.dataset.motion;
        if (streak) streak.textContent = "12";
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(500, 33);
        lenis?.destroy();
        lenis = null;
      };
    });

    // Wide screens: the day's four steps light up along a rail scrubbed by the scroll.
    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 900px)", () => {
      el.dataset.rail = "on";
      const list = el.querySelector(".lp-steps")!;
      gsap.fromTo(".lp-rail-fill", { scaleY: 0 }, {
        scaleY: 1, ease: "none",
        scrollTrigger: { trigger: list, start: "top 65%", end: "bottom 65%", scrub: 0.4 },
      });
      el.querySelectorAll(".lp-step").forEach((step) =>
        ScrollTrigger.create({ trigger: step, start: "top 65%", toggleClass: { targets: step, className: "is-on" } }),
      );
      return () => delete el.dataset.rail;
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

  const primary = signedIn
    ? { to: "/", label: "Open today's problem" }
    : { to: "/login", label: "Log in" };

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
          {!signedIn && <Link to="/signup" className="lp-nav-invite"><Icon name="invite" />I have an invite</Link>}
        </nav>
        <div className="lp-nav-end">
          <Link to={primary.to} className="btn btn-primary">{signedIn ? "Today" : "Log in"}</Link>
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
            <p className="lp-kicker" data-settle><Icon name="calendar" /><Countdown /></p>
            <h1 id="lp-hero-title" className="lp-display">
              <Split text="One problem a day." />
              <Split text="One pattern a week." className="lp-accent" />
            </h1>
            <p className="lp-lede" data-settle>
              Data structures and algorithms practice for a small, invite-only group. Every problem is original, the pattern
              stays hidden until you solve it, and each week one pattern gets a proper lesson and a five-step ladder.
            </p>
            <div className="lp-cta" data-settle>
              <Link to={primary.to} className="btn btn-primary btn-lg">
                {primary.label}<Icon name="arrow" className="lp-icon lp-arrow" />
              </Link>
              {!signedIn && <Link to="/signup" className="btn btn-lg">I have an invite code</Link>}
            </div>
            <p className="lp-fine" data-settle>C++, Java and Python, judged in a sandbox.</p>
          </div>
          <HeroScene />
        </section>

        {/* 2 · A day */}
        <section id="day" className="lp-section" tabIndex={-1} aria-labelledby="day-title">
          <div className="lp-section-head">
            <p className="lp-eyebrow">01 · The daily</p>
            <h2 id="day-title" data-split-reveal><Split text="Four steps, every day." /></h2>
            <p className="lp-section-lede">
              Monday to Friday the daily is a mixed, easier problem of any pattern. The point is recognising what it needs before you
              start typing.
            </p>
          </div>
          <div className="lp-steps-wrap">
            <div className="lp-rail" aria-hidden="true"><span className="lp-rail-fill" /></div>
            <ol className="lp-steps">
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

        {/* 3 · The week */}
        <section id="week" className="lp-section lp-section-sunk" tabIndex={-1} aria-labelledby="week-title">
          <div className="lp-section-head">
            <p className="lp-eyebrow">02 · The week</p>
            <h2 id="week-title" data-split-reveal><Split text="Monday teaches. The weekend tests." /></h2>
            <p className="lp-section-lede">
              Weeks run Monday to Sunday in IST. A ladder problem opens each weekday so the group stays in step, and once a problem
              opens it never closes.
            </p>
          </div>
          <ol className="lp-week" data-reveal-group>
            {WEEK.map((d) => (
              <li key={d.day} className={`lp-day lp-day-${d.tone}`}>
                <span className="lp-day-name">{d.day}</span>
                <ul>
                  {d.items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        {/* 4 · Tracks */}
        <section id="tracks" className="lp-section" tabIndex={-1} aria-labelledby="tracks-title">
          <div className="lp-section-head">
            <p className="lp-eyebrow">03 · Tracks</p>
            <h2 id="tracks-title" data-split-reveal><Split text="Learn the pattern, then climb it." /></h2>
            <p className="lp-section-lede">
              Each track is a lesson (how to spot the pattern, the core idea, template code in all three languages, the usual
              mistakes) and five problems from easy to hard. Every ladder problem has three hints that go from a nudge to the key
              idea. Tracks stay open afterwards, so joining late is fine.
            </p>
          </div>
          <div className="lp-tracks" data-reveal-group>
            {TRACKS.map((t) => (
              <article key={t.name} className="lp-track">
                <h3>{t.name}</h3>
                <ol>
                  {t.ladder.map((p, i) => (
                    <li key={p}><span className="mono" aria-hidden="true">{i + 1}</span>{p}</li>
                  ))}
                </ol>
                <p className="lp-track-meta"><Icon name="lesson" />Lesson<span aria-hidden="true">·</span><Icon name="hint" />3 hints each<span aria-hidden="true">·</span>2 weekend problems</p>
              </article>
            ))}
          </div>
          <p className="lp-planned">
            <span className="lp-eyebrow">Planned next</span>
            {PLANNED.map((p) => <span key={p} className="lp-chip lp-chip-muted">{p}</span>)}
          </p>
        </section>

        {/* 5 · Judge */}
        <section id="judge" className="lp-section lp-section-ink" tabIndex={-1} aria-labelledby="judge-title">
          <div className="lp-judge">
            <div className="lp-section-head">
              <p className="lp-eyebrow">04 · The judge</p>
              <h2 id="judge-title" data-split-reveal><Split text="Real verdicts, not vibes." /></h2>
              <p className="lp-section-lede">
                Code runs in a sandbox against hidden tests. Time limits are set from the reference solutions in each language,
                so Python isn't punished for being Python.
              </p>
            </div>
            <div className="lp-judge-grid" data-reveal-group>
              <div className="lp-langs">
                {["C++", "Java", "Python"].map((l) => <span key={l} className="lp-lang">{l}</span>)}
              </div>
              <ul className="lp-verdicts" aria-label="Verdicts">
                {VERDICTS.map((v) => (
                  <li key={v.code}>
                    <span className={`lp-badge lp-tone-${v.tone} mono`}>{v.code}</span>
                    {v.label}
                  </li>
                ))}
              </ul>
              <ul className="lp-facts">
                <li><Icon name="limits" />Time and memory for every test</li>
                <li><Icon name="judge" />The template reads the input; you write solve()</li>
                <li><Icon name="read" />A failed hidden test shows you its input</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 6 · Streak and archive */}
        <section id="streak" className="lp-section" tabIndex={-1} aria-labelledby="streak-title">
          <div className="lp-streak-grid">
            <div className="lp-section-head">
              <p className="lp-eyebrow">05 · The habit</p>
              <h2 id="streak-title" data-split-reveal><Split text="Keep the squares coloured." /></h2>
            </div>
            <div className="lp-rules" data-reveal-group>
              <div className="lp-rule">
                <Icon name="streak" />
                <h3>The streak</h3>
                <p>A day counts when you solve its daily before that day ends in IST. Solving a missed day later doesn't mend the streak.</p>
              </div>
              <div className="lp-rule">
                <Icon name="archive" />
                <h3>The archive</h3>
                <p>Every past daily stays open, so a missed day is still there to solve. When a problem comes round again, it's marked as review.</p>
              </div>
              <div className="lp-rule">
                <Icon name="hint" />
                <h3>Honest history</h3>
                <p>Stuck? You can open the solutions after a real submit. Hints and early peeks are recorded, so your history stays honest.</p>
              </div>
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
            ) : (
              <>
                <h2 id="final-title">Have an invite code?</h2>
                <p>Create your account and today's problem is yours. No code yet? dailyDSA is invite-only; ask the admin who runs your group.</p>
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
