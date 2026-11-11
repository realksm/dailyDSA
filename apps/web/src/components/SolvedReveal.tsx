// The moment a problem is solved (first Accepted). For a daily, the pattern was hidden until now: the
// card flips from "Pattern hidden" to the pattern and its diagram, and today's square fills in. For a
// ladder problem the pattern was known all along, so the card shows the rung instead. One second of
// motion, once per problem; under reduced motion everything is simply in its final state.
import type { ProblemView } from "@dailydsa/shared";
import { istDay } from "../format";
import { Icon } from "./Icon";
import { hasDiagram, PatternDiagram } from "./PatternDiagram";
import { Link } from "../router";

export function SolvedReveal({ p, onSolutions }: { p: ProblemView; onSolutions?: () => void }) {
  const today = istDay(new Date().toISOString());
  const todaysDaily = p.dailyDays.includes(today);
  const pattern = p.pattern;
  // A daily's pattern arrives with the refresh after the verdict; until then the card shows its back.
  const flipped = !!pattern;

  return (
    <section className="reveal" aria-live="polite" aria-label="Solved">
      {p.track ? (
        <div className="reveal-card" data-flipped>
          <div className="reveal-face reveal-back">
            <span className="reveal-k">Ladder {p.track.position} of 5</span>
            {/* Only this rung is known here (the others may or may not be solved), so only it is marked. */}
            <span className="reveal-rungs" aria-label={`Rung ${p.track.position} of 5 done`}>
              {[1, 2, 3, 4, 5].map((n) => <i key={n} data-new={n === p.track!.position || undefined} />)}
            </span>
          </div>
        </div>
      ) : (
        <div className="reveal-card" data-flipped={flipped || undefined}>
          <div className="reveal-face reveal-front" aria-hidden={flipped}>
            <Icon name="hidden" />
            <span>Pattern hidden</span>
          </div>
          <div className="reveal-face reveal-back" aria-hidden={!flipped}>
            <span className="reveal-k">The pattern</span>
            <b className="reveal-name">{pattern?.name ?? "…"}</b>
            {pattern && hasDiagram(pattern.slug) && <PatternDiagram pattern={pattern.slug} className="reveal-pd" />}
          </div>
        </div>
      )}

      <div className="reveal-text">
        <h3>Solved.</h3>
        {todaysDaily && (
          <p className="reveal-day"><span className="reveal-sq" aria-hidden />Today's square is filled. The streak holds.</p>
        )}
        {!p.track && pattern && <p className="muted small">It was a {pattern.name.toLowerCase()} problem.</p>}
        <div className="reveal-actions">
          {p.track && pattern ? (
            <Link to={`/tracks/${pattern.slug}`} className="btn btn-primary">Back to the ladder</Link>
          ) : pattern?.trackOpen ? (
            <Link to={`/tracks/${pattern.slug}`} className="btn btn-primary">Practise {pattern.name.toLowerCase()}</Link>
          ) : null}
          {onSolutions && <button type="button" className="btn" onClick={onSolutions}>See how others solved it</button>}
        </div>
        {!p.track && pattern && !pattern.trackOpen && <p className="muted small">A track for this pattern is coming.</p>}
      </div>
    </section>
  );
}
