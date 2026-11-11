// `dsa import <slug>` — upsert a validated problem into the database.
// Refuses unless validation.json matches the current sources and the tests are on disk.
import type pg from "pg";
import { LANGS } from "@dailydsa/shared";
import { DATA_DIR, ProblemError, type ProblemFolder } from "./problem.js";
import { readTests } from "./tests-store.js";

export async function importProblem(db: pg.Pool, p: ProblemFolder): Promise<{ id: number; created: boolean }> {
  const v = p.validation;
  if (!v) throw new ProblemError(`${p.slug}: not validated — run \`pnpm dsa validate ${p.slug}\``);
  if (v.sourceHash !== p.sourceHash) throw new ProblemError(`${p.slug}: files changed since validation — re-run \`pnpm dsa validate ${p.slug}\``);
  await readTests(DATA_DIR, p.slug, v.testsHash, v.testCount); // throws if missing/corrupt
  const m = p.meta;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    if (m.pattern) {
      const ok = await client.query("SELECT 1 FROM patterns WHERE slug = $1", [m.pattern]);
      if (!ok.rowCount) throw new ProblemError(`${p.slug}: unknown pattern "${m.pattern}" (add it to the patterns table first)`);
    }
    const res = await client.query<{ id: number; created: boolean }>(
      `INSERT INTO problems (slug, title, kind, pool, pattern_slug, statement_md, input_spec, time_limits, memory_mb, output_mb,
                             checker_py, sample_count, test_count, tests_hash, validated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title, kind = EXCLUDED.kind, pool = EXCLUDED.pool, pattern_slug = EXCLUDED.pattern_slug,
         statement_md = EXCLUDED.statement_md, input_spec = EXCLUDED.input_spec, time_limits = EXCLUDED.time_limits,
         memory_mb = EXCLUDED.memory_mb, output_mb = EXCLUDED.output_mb, checker_py = EXCLUDED.checker_py,
         sample_count = EXCLUDED.sample_count, test_count = EXCLUDED.test_count, tests_hash = EXCLUDED.tests_hash,
         validated_at = EXCLUDED.validated_at, updated_at = now()
       RETURNING id, (xmax = 0) AS created`,
      [
        p.slug, m.title, m.kind, m.pool ?? null, m.pattern ?? null, p.statement, m.input ? JSON.stringify(m.input) : null,
        JSON.stringify(v.limitsMs), m.memory_mb, m.output_mb, p.checker ?? null, m.samples, v.testCount, v.testsHash, v.validatedAt,
      ],
    );
    const { id, created } = res.rows[0]!;

    await client.query("DELETE FROM problem_solutions WHERE problem_id = $1", [id]);
    for (const lang of LANGS) {
      await client.query("INSERT INTO problem_solutions (problem_id, lang, code) VALUES ($1, $2, $3)", [id, lang, p.refs[lang]]);
    }
    await client.query("DELETE FROM problem_hints WHERE problem_id = $1", [id]);
    for (const [i, body] of (m.hints ?? []).entries()) {
      await client.query("INSERT INTO problem_hints (problem_id, level, body_md) VALUES ($1, $2, $3)", [id, i + 1, body]);
    }

    await client.query("DELETE FROM track_problems WHERE problem_id = $1", [id]);
    if (m.kind === "track") {
      // The track row is created on first use; its lesson is written later from the admin page.
      const t = await client.query<{ id: number }>(
        `INSERT INTO tracks (pattern_slug, title) SELECT slug, name FROM patterns WHERE slug = $1
         ON CONFLICT (pattern_slug) DO UPDATE SET pattern_slug = EXCLUDED.pattern_slug RETURNING id`,
        [m.pattern],
      );
      const trackId = t.rows[0]!.id;
      const clash = await client.query<{ slug: string }>(
        `SELECT pr.slug FROM track_problems tp JOIN problems pr ON pr.id = tp.problem_id WHERE tp.track_id = $1 AND tp.position = $2`,
        [trackId, m.position],
      );
      if (clash.rowCount) throw new ProblemError(`${p.slug}: position ${m.position} in the ${m.pattern} track is taken by ${clash.rows[0]!.slug}`);
      await client.query("INSERT INTO track_problems (track_id, position, problem_id) VALUES ($1, $2, $3)", [trackId, m.position, id]);
    }
    await client.query("COMMIT");
    return { id, created };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
