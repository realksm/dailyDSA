// Vite plugin: `virtual:landing-tracks`, the landing page's Tracks section, read from git at build
// time so it can't go stale. A track shows once its ladder file, lesson and every ladder problem
// exist; other starting patterns are listed as "planned". In dev, editing any of those files
// reloads the page.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { Plugin } from "vite";
import { lessonSpotIt } from "../../../packages/shared/src/lesson.js";
import { STARTING_PATTERNS } from "../../../packages/shared/src/problem.js";

const ID = "virtual:landing-tracks";
const RESOLVED = "\0" + ID;

export type LandingTrack = { slug: string; name: string; clue: string; ladder: string[]; weekend: number };

/** Lesson Markdown → plain text for the landing page, which doesn't load KaTeX: `$X \le B$` → "X ≤ B". */
export function plainClue(md: string): string {
  const tex: Record<string, string> = { le: "≤", ge: "≥", leq: "≤", geq: "≥", cdot: "·", times: "×", ne: "≠", to: "→", log: "log" };
  return md
    .replace(/\$([^$]+)\$/g, (_, m: string) => m.replace(/\\([a-z]+)/gi, (all, c: string) => tex[c] ?? all).replace(/[{}]/g, "").replace(/\s+/g, " ").trim())
    .replace(/\*\*?([^*]+)\*\*?/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

export default function landingTracks(problemsDir: string): Plugin {
  const read = async (watch: (f: string) => void, ...parts: string[]): Promise<string | null> => {
    const file = path.join(problemsDir, ...parts);
    watch(file);
    return readFile(file, "utf8").catch(() => null);
  };

  return {
    name: "dailydsa-landing-tracks",
    resolveId: (id) => (id === ID ? RESOLVED : null),
    async load(id) {
      if (id !== RESOLVED) return null;
      const watch = (f: string) => this.addWatchFile(f);

      // Weekend problems per pattern.
      const weekend = new Map<string, number>();
      for (const d of await readdir(problemsDir, { withFileTypes: true })) {
        if (!d.isDirectory() || d.name.startsWith("_")) continue;
        const y = await read(watch, d.name, "problem.yaml");
        const p = y ? (parseYaml(y) as { pool?: string; pattern?: string }) : null;
        if (p?.pool === "weekend" && p.pattern) weekend.set(p.pattern, (weekend.get(p.pattern) ?? 0) + 1);
      }

      const tracks: LandingTrack[] = [];
      const planned: string[] = [];
      for (const { slug, name } of STARTING_PATTERNS) {
        const track = await loadTrack(slug, name);
        if (track) tracks.push({ ...track, weekend: weekend.get(slug) ?? 0 });
        else planned.push(name);
      }
      return `export const TRACKS = ${JSON.stringify(tracks)};\nexport const PLANNED = ${JSON.stringify(planned)};\n`;

      async function loadTrack(slug: string, name: string): Promise<Omit<LandingTrack, "weekend"> | null> {
        const y = await read(watch, "_tracks", `${slug}.yaml`);
        const md = await read(watch, "_tracks", `${slug}.md`);
        if (!y || !md) return null;
        const ladderSlugs = (parseYaml(y) as { ladder?: string[] } | null)?.ladder ?? [];
        const clue = lessonSpotIt(md, 1)[0];
        if (ladderSlugs.length === 0 || !clue) return null;
        const ladder: string[] = [];
        for (const p of ladderSlugs) {
          const py = await read(watch, p, "problem.yaml");
          const title = py ? (parseYaml(py) as { title?: string }).title : undefined;
          if (!title) return null; // a ladder problem not written yet: the track isn't ready to show
          ladder.push(title);
        }
        return { slug, name, clue: plainClue(clue), ladder };
      }
    },
  };
}
