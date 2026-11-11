// Tracks in git: the ladder file decides each track problem's pattern and position, `track new|add`
// scaffold a whole track safely, `track check` reports what's missing, and the database ladder is
// rewritten from the file in one go (checked in a rolled-back transaction).
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@dailydsa/db";

// A scratch repo with only problems/_template; must be set before problem.ts is imported.
const scratch = await mkdtemp(path.join(tmpdir(), "dsa-track-"));
await cp(path.resolve("problems/_template"), path.join(scratch, "problems/_template"), { recursive: true });
process.env.DSA_ROOT = scratch;
process.env.DATA_DIR = path.join(scratch, ".data");
const { ladderYaml, loadProblem, readLadder } = await import("../src/problem.js");
const { checkTrack, createProblemFolder, scaffoldTrack } = await import("../src/track.js");
const { syncLadder } = await import("../src/importer.js");
afterAll(() => rm(scratch, { recursive: true, force: true }));

const ladderPath = (pattern: string) => path.join(scratch, "problems/_tracks", `${pattern}.yaml`);
const message = (p: Promise<unknown>) => p.then(() => "", (e: Error) => e.message);

describe("ladder file schema", () => {
  const errors = (y: unknown) => {
    const r = ladderYaml.safeParse(y);
    return r.success ? "" : r.error.issues.map((i) => i.message).join("\n");
  };
  it("takes 1 to 5 distinct slugs and nothing else", () => {
    expect(errors({ ladder: ["a", "b"] })).toBe("");
    expect(errors({ ladder: [] })).toContain("at least one");
    expect(errors({ ladder: ["a", "b", "c", "d", "e", "f"] })).toContain("at most 5");
    expect(errors({ ladder: ["a", "a"] })).toContain("only be in the ladder once");
    expect(errors({ ladder: ["Not A Slug"] })).toContain("must be a problem slug");
    expect(errors({ ladder: ["a"], title: "x" })).not.toBe("");
  });
});

describe("track new / add and where problems sit", () => {
  it("scaffolds the ladder, the lesson outline and loadable problem folders", async () => {
    const done = await scaffoldTrack("new", "two-pointers", ["tp-one", "tp-two", "tp-three"], ["tp-weekend"]);
    expect(done).toContain("created problems/_tracks/two-pointers.yaml (ladder 3/5)");
    expect(done).toContain("created problems/_tracks/two-pointers.md (lesson outline)");
    expect(await readLadder("two-pointers")).toEqual(["tp-one", "tp-two", "tp-three"]);

    const two = await loadProblem("tp-two");
    expect(two.meta.kind).toBe("track");
    expect(two.track).toEqual({ pattern: "two-pointers", position: 2 });
    expect(two.pattern).toBe("two-pointers");
    expect(two.meta.title).toBe("Tp Two");
    expect(two.meta.hints?.length).toBe(3);
    // The refs are the editor template, so the folder loads before anything is written.
    expect(two.refs.py).toContain("def solve(");

    const wk = await loadProblem("tp-weekend");
    expect([wk.meta.kind, wk.meta.pool, wk.pattern, wk.track]).toEqual(["daily", "weekend", "two-pointers", undefined]);
  });

  it("refuses anything that would leave the ladders inconsistent, before writing a file", async () => {
    expect(await message(scaffoldTrack("new", "two-pointers", ["tp-x"], []))).toContain("already exists: use pnpm dsa track add");
    expect(await message(scaffoldTrack("add", "sliding-window", ["sw-x"], []))).toContain("start with pnpm dsa track new");
    expect(await message(scaffoldTrack("add", "two-pointers", ["a-1", "a-2", "a-3"], []))).toContain("at most 5 problems; two-pointers would have 6");
    expect(await message(scaffoldTrack("add", "two-pointers", ["tp-one"], []))).toContain("already in the two-pointers ladder");
    expect(await message(scaffoldTrack("new", "sliding-window", ["tp-one"], []))).toContain("in the two-pointers ladder already");
    expect(await message(scaffoldTrack("add", "two-pointers", [], ["tp-two"]))).toContain("can't be a weekend problem");
    expect(await message(scaffoldTrack("add", "two-pointers", ["dup", "dup"], []))).toContain("listed twice");
    await createProblemFolder("plain-daily");
    expect(await message(scaffoldTrack("add", "two-pointers", ["plain-daily"], []))).toContain("isn't a track problem");
    expect(await message(scaffoldTrack("add", "two-pointers", [], ["plain-daily"]))).toContain("isn't a weekend problem");
    expect(await readLadder("two-pointers")).toEqual(["tp-one", "tp-two", "tp-three"]);
  });

  it("appends with track add, and the ladder file alone decides the order", async () => {
    await scaffoldTrack("add", "two-pointers", ["tp-four"], ["tp-weekend-2"]);
    expect(await readLadder("two-pointers")).toEqual(["tp-one", "tp-two", "tp-three", "tp-four"]);
    expect((await loadProblem("tp-four")).track?.position).toBe(4);

    await writeFile(ladderPath("two-pointers"), "ladder:\n  - tp-four\n  - tp-one\n  - tp-two\n  - tp-three\n");
    expect((await loadProblem("tp-four")).track?.position).toBe(1);
    expect((await loadProblem("tp-three")).track?.position).toBe(4);
  });

  it("a track problem must be in exactly one ladder, and nothing else in any", async () => {
    await writeFile(ladderPath("two-pointers"), "ladder:\n  - tp-one\n  - tp-two\n  - tp-three\n  - plain-daily\n");
    expect(await message(loadProblem("tp-four"))).toContain("a track problem must be in a ladder");
    expect(await message(loadProblem("plain-daily"))).toContain("needs `kind: track`");
    await writeFile(ladderPath("sliding-window"), "ladder:\n  - tp-one\n");
    expect(await message(loadProblem("tp-one"))).toContain("more than one ladder");
    await rm(ladderPath("sliding-window"));
    await writeFile(ladderPath("two-pointers"), "ladder:\n  - tp-one\n  - tp-two\n  - tp-three\n  - tp-four\n");
    expect((await loadProblem("tp-four")).track?.position).toBe(4);
  });

  it("track check counts the ladder and weekend problems and lists what's missing", async () => {
    const r = await checkTrack("two-pointers");
    expect([r.ladderSize, r.weekendCount]).toEqual([4, 2]);
    expect(r.warnings).toContain("the ladder has 4 of 5 problems");
    expect(r.warnings).toContain("tp-one: not validated");
    expect(r.warnings).toContain("tp-one: hints still say TODO:");
    expect(r.lesson.ok).toBe(false); // the outline has no template code yet
    expect(r.rows.map((x) => x.label)).toEqual(["#1", "#2", "#3", "#4", "weekend", "weekend"]);
    expect(await readFile(path.join(scratch, "problems/tp-one/problem.yaml"), "utf8")).toContain("kind: track");
  });
});

const pool = createPool();
const dbUp = await pool.query("SELECT 1 FROM tracks LIMIT 1").then(() => true, () => false);
afterAll(() => pool.end());

describe.skipIf(!dbUp)("syncLadder", () => {
  it("rewrites the whole ladder from the file, so reordering never collides", async () => {
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const ids: Record<string, number> = {};
      for (const slug of ["zz-sync-a", "zz-sync-b"]) {
        const r = await db.query<{ id: number }>(
          `INSERT INTO problems (slug, title, kind, pattern_slug, statement_md, time_limits, test_count, tests_hash, validated_at)
           VALUES ($1, $1, 'track', 'two-pointers', 'x', '{}', 2, 'h', now()) RETURNING id`,
          [slug],
        );
        ids[slug] = r.rows[0]!.id;
      }
      const ladder = async () =>
        (await db.query<{ slug: string; position: number }>(
          `SELECT pr.slug, tp.position FROM track_problems tp JOIN tracks t ON t.id = tp.track_id JOIN problems pr ON pr.id = tp.problem_id
           WHERE t.pattern_slug = 'two-pointers' ORDER BY tp.position`,
        )).rows.map((r) => `${r.position}:${r.slug}`);

      expect(await syncLadder(db, "two-pointers", ["zz-sync-a", "zz-sync-b"])).toEqual([]);
      expect(await ladder()).toEqual(["1:zz-sync-a", "2:zz-sync-b"]);
      expect(await syncLadder(db, "two-pointers", ["zz-sync-b", "zz-sync-a"])).toEqual([]);
      expect(await ladder()).toEqual(["1:zz-sync-b", "2:zz-sync-a"]);
      // Not imported yet → its slot stays empty and it's reported; dropped problems leave the ladder.
      expect(await syncLadder(db, "two-pointers", ["zz-sync-a", "zz-not-imported"])).toEqual(["zz-not-imported"]);
      expect(await ladder()).toEqual(["1:zz-sync-a"]);
      // Moving a problem to another track frees it from the old one.
      await syncLadder(db, "sliding-window", ["zz-sync-a"]);
      expect(await ladder()).toEqual([]);
      await expect(syncLadder(db, "no-such-pattern", [])).rejects.toThrow('unknown pattern "no-such-pattern"');
    } finally {
      await db.query("ROLLBACK");
      db.release();
    }
  });
});
