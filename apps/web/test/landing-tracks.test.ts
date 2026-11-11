import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import landingTracks, { plainClue } from "../scripts/landing-tracks.js";

type Data = { TRACKS: { slug: string; name: string; clue: string; ladder: string[]; weekend: number }[]; PLANNED: string[] };

/** Runs the plugin's load() for the virtual module and evaluates the code it returns. */
async function build(problemsDir: string): Promise<Data> {
  const plugin = landingTracks(problemsDir);
  const load = plugin.load as (this: unknown, id: string) => Promise<string>;
  const code = await load.call({ addWatchFile() {} }, "\0virtual:landing-tracks");
  return import(`data:text/javascript,${encodeURIComponent(code)}`) as Promise<Data>;
}

describe("plainClue", () => {
  it("turns lesson Markdown into plain text", () => {
    expect(plainClue("Pairs with sum $\\le B$")).toBe("Pairs with sum ≤ B");
    expect(plainClue("$n$ up to $2 \\cdot 10^{5}$, *not* `sorted`")).toBe("n up to 2 · 10^5, not sorted");
  });
});

describe("landing tracks", () => {
  const dirs: string[] = [];
  afterAll(() => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))));

  it("shows ready tracks with their first clue and lists the rest as planned", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "landing-tracks-"));
    dirs.push(dir);
    const put = async (rel: string, text: string) => {
      await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
      await writeFile(path.join(dir, rel), text);
    };
    await put("_tracks/two-pointers.yaml", "ladder:\n  - alpha\n  - beta\n");
    await put("_tracks/two-pointers.md", "# Two pointers\n\n## How to spot it\n\n- **Pairs with sum $\\le B$** → sort.\n- **Second**\n\n## Core idea\n");
    await put("alpha/problem.yaml", "title: Alpha One\nkind: track\n");
    await put("beta/problem.yaml", "title: Beta Two\nkind: track\n");
    await put("gamma/problem.yaml", "title: Gamma\nkind: daily\npool: weekend\npattern: two-pointers\n");
    // A ladder problem that doesn't exist yet keeps the track off the page.
    await put("_tracks/sliding-window.yaml", "ladder:\n  - missing\n");
    await put("_tracks/sliding-window.md", "# Sliding window\n\n## How to spot it\n\n- **Stretches**\n");

    const { TRACKS, PLANNED } = await build(dir);
    expect(TRACKS).toEqual([{ slug: "two-pointers", name: "Two pointers", clue: "Pairs with sum ≤ B", ladder: ["Alpha One", "Beta Two"], weekend: 1 }]);
    expect(PLANNED[0]).toBe("Sliding window");
    expect(PLANNED).not.toContain("Two pointers");
  });

  it("shows every track in problems/_tracks with a full ladder and a clue", async () => {
    const problems = fileURLToPath(new URL("../../../problems", import.meta.url));
    const files = (await readdir(path.join(problems, "_tracks"))).filter((f) => f.endsWith(".yaml"));
    const { TRACKS } = await build(problems);
    expect(TRACKS.map((t) => t.slug).sort()).toEqual(files.map((f) => f.replace(/\.yaml$/, "")).sort());
    for (const t of TRACKS) {
      expect(t.ladder).toHaveLength(5);
      expect(t.clue).not.toMatch(/[$\\*`]/);
    }
  });
});
