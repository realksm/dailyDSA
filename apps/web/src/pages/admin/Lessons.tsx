// Admin → Tracks (admins and setters): every track, its ladder size and whether its lesson is in.
// Lessons are written in git (problems/_tracks/<pattern>.md) and imported with the CLI, like
// problems; staff can open any track page, released or not, to see an imported lesson.
import { api } from "../../api";
import { fmtStamp } from "../../format";
import { LoadError, SkeletonRows, useLoad } from "../../components/ui";
import { Link } from "../../router";

export function TracksTab() {
  const ts = useLoad(() => api.admin.tracks(), []);
  if (ts.error) return <LoadError error={ts.error} retry={ts.reload} />;
  if (!ts.data) return <SkeletonRows n={4} />;
  if (ts.data.length === 0) {
    return <div className="card empty"><h3>No tracks yet</h3><p>A track appears once its first ladder problem or its lesson is imported with <code>pnpm dsa import</code>.</p></div>;
  }
  return (
    <div className="stack">
      <p className="muted small">
        Tracks live in git: the ladder in <code>problems/_tracks/&lt;pattern&gt;.yaml</code>, the lesson in <code>problems/_tracks/&lt;pattern&gt;.md</code>: <code>pnpm dsa track new|add|check|import &lt;pattern&gt;</code>.
        Open a track to see its lesson as solvers will (you can open it before its week). Schedule weeks on the Schedule tab.
      </p>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Track</th><th>Lesson file</th><th className="r">Ladder</th><th>Lesson</th><th>Last imported</th></tr></thead>
          <tbody>
            {ts.data.map((t) => (
              <tr key={t.id}>
                <td><Link to={`/tracks/${t.pattern.slug}`}>{t.title}</Link></td>
                <td className="small muted mono">problems/_tracks/{t.pattern.slug}.md</td>
                <td className="r num">{t.ladder}/5</td>
                <td>{t.hasLesson ? <span className="badge badge-ok">Imported</span> : <span className="badge badge-warn">Missing</span>}</td>
                <td className="small muted nowrap">{t.hasLesson ? fmtStamp(t.updatedAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
