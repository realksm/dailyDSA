import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GoJudge } from "@dailydsa/judge";

const scratch = await mkdtemp(path.join(tmpdir(), "dsa-validate-"));
process.env.DATA_DIR = scratch; // must be set before problem.ts is imported
const { problemYaml } = await import("../src/problem.js");
const { validate } = await import("../src/validate.js");
type Folder = import("../src/problem.js").ProblemFolder;

afterAll(() => rm(scratch, { recursive: true, force: true }));

describe("problem.yaml schema", () => {
  const base = { title: "Test", kind: "daily", pool: "weekday", tests: 5 };
  const errors = (y: object) => {
    const r = problemYaml.safeParse(y);
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };

  it("accepts a minimal weekday problem", () => expect(errors(base)).toEqual([]));
  it("weekend needs a pattern", () => expect(errors({ ...base, pool: "weekend" })).toContain("weekend and track problems need `pattern`"));
  it("track needs a position and no pool", () => {
    const e = errors({ ...base, kind: "track", pattern: "two-pointers" });
    expect(e).toContain("track problems have no pool");
    expect(e).toContain("track problems need `position` (1..5)");
  });
  it("needs hidden tests", () => expect(errors({ ...base, samples: 5 })).toContain("`samples` must be fewer than `tests` (some tests must be hidden)"));
  it("input vars may only refer to earlier vars", () => {
    const e = errors({ ...base, input: { vars: [{ name: "a", type: "int[]", length: "n" }, { name: "n", type: "int" }], returns: "int" } });
    expect(e.join()).toMatch(/refers to `n`/);
  });
  it("input var names can't clash with the editor template", () => {
    const e = errors({ ...base, input: { vars: [{ name: "out", type: "int" }, { name: "_n", type: "int" }], returns: "int" } }).join();
    expect(e).toMatch(/`out` clashes/);
    expect(e).toMatch(/`_n`: names starting with _/);
  });
  it("rejects unknown keys",() => expect(errors({ ...base, pol: "weekday" }).length).toBeGreaterThan(0));
});

// ── validation must say no (needs go-judge) ──
const gj = new GoJudge();
const up = await fetch(`${gj.url}/version`).then((r) => r.ok, () => false);

// Sum of n numbers. ref is O(n); "naive" variants decide which step should fail.
const gen = `import random, sys\ni=int(sys.argv[1])\nr=random.Random(i)\nn=200000 if i>2 else 3\nprint(n)\nprint(*[r.randint(1,10**9) for _ in range(n)])`;
const refs = {
  cpp: `#include <bits/stdc++.h>\nint main(){int n;std::scanf("%d",&n);long long s=0,x;for(int i=0;i<n;i++){std::scanf("%lld",&x);s+=x;}std::printf("%lld\\n",s);}`,
  java: `import java.io.*;import java.util.*;public class Main{public static void main(String[] a)throws IOException{StreamTokenizer t=new StreamTokenizer(new BufferedInputStream(System.in));t.nextToken();int n=(int)t.nval;long s=0;for(int i=0;i<n;i++){t.nextToken();s+=(long)t.nval;}System.out.println(s);}}`,
  py: `import sys\nd=sys.stdin.buffer.read().split()\nprint(sum(map(int,d[1:])))`,
};
// Quadratic busy-work so it TLEs on n = 2e5 but still prints the right sum.
const slowNaive = `#include <bits/stdc++.h>\nint main(){int n;std::scanf("%d",&n);std::vector<long long>a(n);for(auto&x:a)std::scanf("%lld",&x);long long s=0;volatile long long w=0;for(int i=0;i<n;i++){for(int j=0;j<n;j++)w+=a[j]&1;s+=a[i];}std::printf("%lld\\n",s);}`;

function folder(over: Partial<Folder> = {}): Folder {
  return {
    slug: "sum-test",
    dir: scratch,
    meta: problemYaml.parse({ title: "Sum", kind: "daily", pool: "weekday", tests: 3, samples: 1 }),
    statement: "",
    gen,
    refs,
    naive: slowNaive,
    sourceHash: "test",
    ...over,
  };
}
const quiet = { step: () => {}, info: () => {} };

describe.skipIf(!up)("validate (needs go-judge)", () => {
  it("passes a correct problem", async () => {
    const r = await validate(gj, folder(), quiet);
    expect(r.naive.tleTests).toEqual([3]);
    expect(r.limitsMs.cpp).toBeGreaterThanOrEqual(500);
  });

  it("rejects when brute force is fast enough", async () => {
    await expect(validate(gj, folder({ naive: refs.cpp }), quiet)).rejects.toThrow(/naive.cpp finished every test/);
  });

  it("rejects references that disagree", async () => {
    const off = refs.py.replace("print(sum(", "print(1+sum(");
    await expect(validate(gj, folder({ refs: { ...refs, py: off } }), quiet)).rejects.toThrow(/ref.py disagrees with ref.cpp on test 1/);
  });

  it("rejects a non-deterministic generator", async () => {
    const flaky = gen.replace("r=random.Random(i)", "r=random.Random()");
    await expect(validate(gj, folder({ gen: flaky }), quiet)).rejects.toThrow(/not deterministic/);
  });

  it("rejects a checker that accepts everything", async () => {
    const wrong = `#include <cstdio>\nint main(){std::puts("0");}`;
    await expect(validate(gj, folder({ checker: "import sys\nsys.exit(0)", wrong }), quiet)).rejects.toThrow(/can't say no/);
  });

  it("rejects a wrong naive solution", async () => {
    const bad = slowNaive.replace('"%lld\\n",s', '"%lld\\n",s+1');
    await expect(validate(gj, folder({ naive: bad }), quiet)).rejects.toThrow(/naive.cpp disagrees/);
  });
});
