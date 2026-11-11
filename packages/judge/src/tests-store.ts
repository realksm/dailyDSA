// Generated tests live on disk, not in git or the DB: <DATA_DIR>/tests/<slug>/<testsHash>/NN.in|NN.ans.
// They are regenerable from gen.py + ref.cpp, so DB backups stay small (PROGRESS.md).
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredTest {
  input: string;
  answer: string;
}

export function hashTests(tests: StoredTest[]): string {
  const h = createHash("sha256");
  tests.forEach((t, i) => h.update(`${i}\0${t.input}\0${t.answer}\0`));
  return h.digest("hex").slice(0, 16);
}

export const testsDir = (dataDir: string, slug: string, hash: string) => path.join(dataDir, "tests", slug, hash);
const name = (i: number) => String(i + 1).padStart(2, "0");

export async function writeTests(dataDir: string, slug: string, tests: StoredTest[]): Promise<string> {
  const hash = hashTests(tests);
  const dir = testsDir(dataDir, slug, hash);
  const tmp = `${dir}.tmp-${process.pid}`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  for (const [i, t] of tests.entries()) {
    await writeFile(path.join(tmp, `${name(i)}.in`), t.input);
    await writeFile(path.join(tmp, `${name(i)}.ans`), t.answer);
  }
  await rm(dir, { recursive: true, force: true });
  await rename(tmp, dir); // atomic swap so readers never see half a test set
  return hash;
}

export async function readTests(dataDir: string, slug: string, hash: string, count: number): Promise<StoredTest[]> {
  const dir = testsDir(dataDir, slug, hash);
  const tests: StoredTest[] = [];
  for (let i = 0; i < count; i++) {
    tests.push({
      input: await readFile(path.join(dir, `${name(i)}.in`), "utf8"),
      answer: await readFile(path.join(dir, `${name(i)}.ans`), "utf8"),
    });
  }
  if (hashTests(tests) !== hash) throw new Error(`tests for ${slug} on disk don't match hash ${hash}; re-run validate`);
  return tests;
}

/**
 * The first `count` tests only (the samples shown on the problem page). No hash check: the hash
 * covers the whole set, and the hash-named folder is swapped in atomically, so it can't be partial.
 */
export async function readSamples(dataDir: string, slug: string, hash: string, count: number): Promise<StoredTest[]> {
  const dir = testsDir(dataDir, slug, hash);
  const out: StoredTest[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      input: await readFile(path.join(dir, `${name(i)}.in`), "utf8"),
      answer: await readFile(path.join(dir, `${name(i)}.ans`), "utf8"),
    });
  }
  return out;
}
