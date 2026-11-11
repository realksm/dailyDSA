// The auth pages' side panel, shown on wide screens only: one piece of the product, always on ink.
// Lazy-loaded from AuthPages.tsx, so GSAP stays out of the app bundle (it shares its chunk with the landing page).
//
// Art direction follows the landing: the same Streak pieces (day squares, ladder bars, coral on ink), no photos
// or illustrations, and example data labelled as an example. Login shows a month waiting for today's square;
// signup shows the first week. Motion: a short GSAP intro (headline words rise, then the month or the week
// fills in) and, after a successful signup, today's column gets stamped before the app opens. No smooth
// scroll (the page fits one screen) and no Three.js (depth adds nothing to a flat ink look). Under
// prefers-reduced-motion nothing animates: the markup already is the final state.
import { Fragment, useLayoutEffect, useRef, type MutableRefObject } from "react";
import { gsap } from "gsap";
import "./auth-aside.css";
import { Countdown, IST_OFFSET_MS } from "../../landing/countdown";
import { AuthIcon as Icon } from "./AuthIcon";

export type Celebrate = MutableRefObject<(() => Promise<void>) | null>;

const GITHUB = "https://github.com/realksm";

/** A heading whose words rise one by one. Screen readers get the unsplit text. */
function Split({ text }: { text: string }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span className="aa-words" aria-hidden="true">
        {text.split(" ").map((w, i) => (
          <Fragment key={i}>
            <span className="w"><span className="wi">{w}</span></span>{" "}
          </Fragment>
        ))}
      </span>
    </>
  );
}

/** Example month: s solved, m missed, r review (solved), o today, still open. Ends on a 2-day streak. */
const MONTH = "sssssmsssssrsssssssmsssrssmsso".split("");
const MONTH_LABEL: Record<string, string> = { s: "solved", m: "missed", r: "review, solved", o: "today, still open" };

function LoginPanel() {
  return (
    <>
      <div className="aa-head">
        <p className="aa-eyebrow" data-aa-settle>Welcome back</p>
        <h2><Split text="Today's square is still open." /></h2>
        <p className="aa-lede" data-aa-settle>A day counts when you solve its daily before midnight IST. Solving a missed day later doesn't mend it.</p>
      </div>
      <figure className="aa-month-fig">
        <figcaption className="aa-caption" data-aa-settle>An example month</figcaption>
        <ol className="aa-month" aria-label="An example month: 26 days solved, 3 missed, and today still open">
          {MONTH.map((s, i) => <li key={i} className={`m-${s}`} title={`Day ${i + 1}: ${MONTH_LABEL[s]}`} />)}
        </ol>
        <ul className="aa-key" aria-hidden="true" data-aa-settle>
          <li><i className="m-s" />Solved</li>
          <li><i className="m-m" />Missed</li>
          <li><i className="m-r" />Review</li>
          <li><i className="m-o" />Today</li>
        </ul>
      </figure>
    </>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday = 0, in IST, the timezone the dailies run on. */
function istWeekday(now = Date.now()) {
  return (new Date(now + IST_OFFSET_MS).getUTCDay() + 6) % 7;
}

function SignupPanel() {
  const today = istWeekday();
  return (
    <>
      <div className="aa-head">
        <p className="aa-eyebrow" data-aa-settle>Your first week</p>
        <h2><Split text="Seven days. One pattern." /></h2>
        <p className="aa-lede" data-aa-settle>A new problem lands every midnight IST, its pattern hidden. Each week also teaches one pattern: a lesson, then a five&#8209;step ladder.</p>
      </div>
      <figure className="aa-week-fig">
        <figcaption className="sr-only">
          A week: Monday the lesson goes up with ladder step 1, Tuesday to Friday ladder steps 2 to 5, easy to hard, and on
          Saturday and Sunday harder problems from the week's pattern. Today is {DAYS[today]}.
        </figcaption>
        <ol className="aa-week" aria-hidden="true">
          {DAYS.map((d, i) => (
            <li key={d} className={i >= 5 ? "we" : undefined} data-today={i === today || undefined}>
              {i === today && <span className="aa-today">Today</span>}
              <span className="aa-col">
                <i className="aa-bar" style={{ height: i < 5 ? `${28 + i * 18}%` : "100%" }}>{i < 5 ? i + 1 : ""}</i>
                {i === today && <b className="aa-stamp"><Icon name="check" />Day 1</b>}
              </span>
              <span className="aa-day">{d}</span>
            </li>
          ))}
        </ol>
        <ul className="aa-legend" data-aa-settle>
          <li><b>Mon</b>The lesson goes up, with ladder step 1</li>
          <li><b>Tue–Fri</b>Ladder steps 2 to 5, easy to hard</li>
          <li><b>Sat–Sun</b>Harder problems from the pattern, tag still hidden</li>
        </ul>
      </figure>
    </>
  );
}

export default function AuthAside({ kind, celebrate }: { kind: "login" | "signup"; celebrate?: Celebrate }) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(el.querySelectorAll(".wi"), { yPercent: 108, duration: 0.75, stagger: 0.055 }, 0.05)
        .from(el.querySelectorAll("[data-aa-settle]"), { y: 14, opacity: 0, duration: 0.6, stagger: 0.07 }, 0.25);
      if (kind === "login") {
        const squares = el.querySelectorAll(".aa-month li");
        tl.from(squares, { scale: 0.3, opacity: 0, duration: 0.32, stagger: 0.022, ease: "back.out(2)" }, 0.45);
        // Today's open square breathes twice, then rests.
        tl.to(el.querySelector(".aa-month .m-o"), { scale: 1.14, duration: 0.45, yoyo: true, repeat: 3, ease: "sine.inOut" }, ">0.1");
      } else {
        tl.from(el.querySelectorAll(".aa-week li"), { y: 18, opacity: 0, duration: 0.5, stagger: 0.06 }, 0.35)
          .from(el.querySelectorAll(".aa-bar"), { scaleY: 0, duration: 0.55, stagger: 0.07, ease: "back.out(1.6)" }, 0.5)
          .from(el.querySelector(".aa-today"), { y: -10, opacity: 0, duration: 0.4, ease: "back.out(3)" }, ">-0.1");
      }
      tl.from(el.querySelector(".aa-foot"), { opacity: 0, duration: 0.6 }, 0.6);
      return () => tl.revert();
    });
    return () => mm.revert();
  }, [kind]);

  // After a successful signup: today's column is stamped "Day 1" before the app opens.
  useLayoutEffect(() => {
    if (!celebrate) return;
    celebrate.current = () => {
      const el = root.current;
      const stamp = el?.querySelector<HTMLElement>(".aa-stamp");
      if (!el || !stamp || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
      return new Promise<void>((done) => {
        el.dataset.joined = "";
        gsap.timeline({ onComplete: () => done() })
          .fromTo(stamp, { scale: 0.2, rotate: -14, opacity: 0 }, { scale: 1, rotate: -6, opacity: 1, duration: 0.45, ease: "back.out(2.6)" })
          .to(el.querySelector("[data-today] .aa-bar"), { scaleY: 1.06, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }, 0.05)
          .to({}, { duration: 0.35 });
      });
    };
    return () => { celebrate.current = null; };
  }, [celebrate]);

  return (
    <aside className="auth-aside" ref={root} aria-label={kind === "login" ? "Your month on dailyDSA" : "How a week on dailyDSA runs"}>
      {kind === "login" ? <LoginPanel /> : <SignupPanel />}
      <footer className="aa-foot">
        <p className="aa-countdown"><Icon name="calendar" /><Countdown /></p>
        <p>Built by <a href={GITHUB} target="_blank" rel="noreferrer">realksm<span className="sr-only"> (opens GitHub in a new tab)</span></a></p>
      </footer>
    </aside>
  );
}

