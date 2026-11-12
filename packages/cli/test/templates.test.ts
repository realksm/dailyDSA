// Editor templates must read every real problem's input correctly and stay within its calibrated limits:
// each problem's reference logic, written as a solve() body, is spliced into the generated template and judged
// against the stored tests. Needs go-judge and the generated tests (`pnpm dsa validate --all`).
import { stat } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { GoJudge, judge, readTests, testsDir } from "@dailydsa/judge";
import { LANGS, editorTemplate, type InputSpec, type Lang } from "@dailydsa/shared";
import { DATA_DIR, loadProblem } from "../src/problem.js";

const BODIES: Record<string, Record<Lang, string>> = {
  "budget-pairs": {
    cpp: `sort(price.begin(), price.end());
long long count = 0;
int l = 0, r = n - 1;
while (l < r) {
    if (price[l] + price[r] <= budget) { count += r - l; l++; }
    else r--;
}
return count;`,
    java: `Arrays.sort(price);
long count = 0;
int l = 0, r = n - 1;
while (l < r) {
    if (price[l] + price[r] <= budget) { count += r - l; l++; }
    else r--;
}
return count;`,
    py: `price.sort()
count = 0
l, r = 0, n - 1
while l < r:
    if price[l] + price[r] <= budget:
        count += r - l
        l += 1
    else:
        r -= 1
return count`,
  },
  "exact-gap": {
    cpp: `vector<int> idx(n);
iota(idx.begin(), idx.end(), 0);
sort(idx.begin(), idx.end(), [&](int x, int y) { return a[x] < a[y]; });
int lo = 0, hi = 0;
while (hi < n) {
    if (lo == hi) { hi++; continue; }
    long long d = a[idx[hi]] - a[idx[lo]];
    if (d == k) { cout << idx[lo] + 1 << ' ' << idx[hi] + 1 << '\\n'; return; }
    if (d < k) hi++; else lo++;
}
cout << -1 << '\\n';`,
    java: `long[] p = new long[n];
for (int i = 0; i < n; i++) p[i] = ((a[i] + 1_000_000_000L) << 20) | (i + 1);
Arrays.sort(p);
int lo = 0, hi = 0;
while (hi < n) {
    if (lo == hi) { hi++; continue; }
    long d = (p[hi] >> 20) - (p[lo] >> 20);
    if (d == k) { out.println((p[lo] & 0xFFFFF) + " " + (p[hi] & 0xFFFFF)); return; }
    if (d < k) hi++; else lo++;
}
out.println(-1);`,
    py: `order = sorted(range(n), key=a.__getitem__)
lo = hi = 0
while hi < n:
    if lo == hi:
        hi += 1
        continue
    d = a[order[hi]] - a[order[lo]]
    if d == k:
        print(order[lo] + 1, order[hi] + 1)
        return
    if d < k:
        hi += 1
    else:
        lo += 1
print(-1)`,
  },
  "rainfall-ledger": {
    cpp: `vector<long long> prefix(n + 1, 0);
for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + rain[i];
vector<long long> res(q);
for (int i = 0; i < q; i++) res[i] = prefix[queries[i][1]] - prefix[queries[i][0] - 1];
return res;`,
    java: `long[] prefix = new long[n + 1];
for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + rain[i];
long[] res = new long[q];
for (int i = 0; i < q; i++) res[i] = prefix[queries[i][1]] - prefix[queries[i][0] - 1];
return res;`,
    py: `prefix = [0] * (n + 1)
for i in range(n):
    prefix[i + 1] = prefix[i] + rain[i]
return [prefix[r] - prefix[l - 1] for l, r in queries]`,
  },
  // int[] return with join: spaces
  "signal-towers": {
    cpp: `vector<int> to(n, 0), waiting;
for (int j = 0; j < n; j++) {
    while (!waiting.empty() && h[waiting.back()] < h[j]) { to[waiting.back()] = j + 1; waiting.pop_back(); }
    waiting.push_back(j);
}
return to;`,
    java: `int[] to = new int[n], waiting = new int[n];
int top = 0;
for (int j = 0; j < n; j++) {
    while (top > 0 && h[waiting[top - 1]] < h[j]) to[waiting[--top]] = j + 1;
    waiting[top++] = j;
}
return to;`,
    py: `to = [0] * n
waiting = []
for j in range(n):
    while waiting and h[waiting[-1]] < h[j]:
        to[waiting.pop()] = j + 1
    waiting.append(j)
return to`,
  },
  // string input after an int[]
  "river-crossing": {
    cpp: `const long long MOD = 1000000007;
vector<long long> ways(n + 1, 0);
ways[0] = 1;
long long total = 0;
for (int p = 0; p <= n; p++)
    for (int d : strides) {
        long long q = (long long)p + d;
        if (q > n) total = (total + ways[p]) % MOD;
        else if (s[q - 1] == 'o') ways[q] = (ways[q] + ways[p]) % MOD;
    }
return (int)total;`,
    java: `final long MOD = 1000000007L;
long[] ways = new long[n + 1];
ways[0] = 1;
long total = 0;
for (int p = 0; p <= n; p++)
    for (int d : strides) {
        long q = (long) p + d;
        if (q > n) total = (total + ways[p]) % MOD;
        else if (s.charAt((int) q - 1) == 'o') ways[(int) q] = (ways[(int) q] + ways[p]) % MOD;
    }
return (int) total;`,
    py: `MOD = 1000000007
ways = [0] * (n + 1)
ways[0] = 1
total = 0
for p in range(n + 1):
    if ways[p]:
        for d in strides:
            q = p + d
            if q > n:
                total += ways[p]
            elif s[q - 1] == "o":
                ways[q] = (ways[q] + ways[p]) % MOD
return total % MOD`,
  },
  // string[] input (grid rows)
  "warehouse-route": {
    cpp: `vector<int> dist(r * c, -1);
vector<int> q;
for (int i = 0; i < r * c; i++) if (grid[i / c][i % c] == 'S') { dist[i] = 0; q.push_back(i); }
for (size_t h = 0; h < q.size(); h++) {
    int y = q[h] / c, x = q[h] % c;
    if (grid[y][x] == 'E') return dist[q[h]];
    int ny[] = {y - 1, y + 1, y, y}, nx[] = {x, x, x - 1, x + 1};
    for (int d = 0; d < 4; d++)
        if (ny[d] >= 0 && ny[d] < r && nx[d] >= 0 && nx[d] < c && grid[ny[d]][nx[d]] != '#' && dist[ny[d] * c + nx[d]] < 0) {
            dist[ny[d] * c + nx[d]] = dist[q[h]] + 1;
            q.push_back(ny[d] * c + nx[d]);
        }
}
return -1;`,
    java: `int[] dist = new int[r * c], q = new int[r * c];
Arrays.fill(dist, -1);
int head = 0, tail = 0;
for (int i = 0; i < r * c; i++) if (grid[i / c].charAt(i % c) == 'S') { dist[i] = 0; q[tail++] = i; }
while (head < tail) {
    int cur = q[head++], y = cur / c, x = cur % c;
    if (grid[y].charAt(x) == 'E') return dist[cur];
    int[] ny = {y - 1, y + 1, y, y}, nx = {x, x, x - 1, x + 1};
    for (int d = 0; d < 4; d++)
        if (ny[d] >= 0 && ny[d] < r && nx[d] >= 0 && nx[d] < c && grid[ny[d]].charAt(nx[d]) != '#' && dist[ny[d] * c + nx[d]] < 0) {
            dist[ny[d] * c + nx[d]] = dist[cur] + 1;
            q[tail++] = ny[d] * c + nx[d];
        }
}
return -1;`,
    py: `start = next((y, row.index("S")) for y, row in enumerate(grid) if "S" in row)
seen = {start}
layer, steps = [start], 0
while layer:
    nxt = []
    for y, x in layer:
        if grid[y][x] == "E":
            return steps
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < r and 0 <= nx < c and grid[ny][nx] != "#" and (ny, nx) not in seen:
                seen.add((ny, nx))
                nxt.append((ny, nx))
    layer, steps = nxt, steps + 1
return -1`,
  },
};

const gj = new GoJudge();
const up = await fetch(`${gj.url}/version`).then((r) => r.ok, () => false);

describe.skipIf(!up)("editor templates judge real problems (needs go-judge)", async () => {
  for (const slug of Object.keys(BODIES)) {
    const p = await loadProblem(slug);
    const v = p.validation;
    const haveTests = v && (await stat(testsDir(DATA_DIR, slug, v.testsHash)).then(() => true, () => false));
    for (const lang of LANGS) {
      it.skipIf(!haveTests)(`${slug} / ${lang}`, async () => {
        const tests = (await readTests(DATA_DIR, slug, v!.testsHash, v!.testCount)).map((t) => ({ ...t, visible: false }));
        const code = editorTemplate(lang, p.meta.input as InputSpec, BODIES[slug]![lang]);
        const r = await judge(gj, {
          lang,
          code,
          tests,
          limits: { cpuMs: v!.limitsMs[lang], memoryMb: p.meta.memory_mb, outputMb: p.meta.output_mb },
          ...(p.checker && { checker: p.checker }),
          stopOnFailure: true,
        });
        const failed = r.tests.find((t) => t.verdict !== "AC");
        expect(r.compileLog ?? `${r.verdict}${failed ? ` on test ${failed.index + 1}: ${failed.stderr ?? ""}` : ""}`).toBe("AC");
        // Template overhead must leave headroom under the calibrated limit.
        expect(r.maxCpuMs).toBeLessThan(v!.limitsMs[lang] * 0.6);
      });
    }
  }
});
