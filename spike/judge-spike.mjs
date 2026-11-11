// go-judge spike: proves compile-once/run-per-test, every verdict, checkers,
// network isolation, and measures CPU-time noise (incl. Java JVM startup).
// Usage: docker compose up -d --build judge && node spike/judge-spike.mjs
const JUDGE = process.env.JUDGE_URL ?? "http://127.0.0.1:5050";
const MB = 1024 * 1024;
const MS = 1_000_000; // go-judge uses nanoseconds
const ENV = ["PATH=/usr/local/bin:/usr/bin:/bin", "HOME=/tmp"];

async function run(cmd) {
  const res = await fetch(`${JUDGE}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cmd: [cmd] }),
  });
  if (!res.ok) throw new Error(`go-judge ${res.status}: ${await res.text()}`);
  return (await res.json())[0];
}
const delFile = (id) => fetch(`${JUDGE}/file/${id}`, { method: "DELETE" });

// ---------- languages ----------
const LANGS = {
  cpp: {
    src: "main.cpp",
    compile: ["/usr/bin/g++", "-O2", "-std=c++17", "-pipe", "-o", "main", "main.cpp"],
    artifact: "main",
    runArgs: () => ["./main"],
  },
  java: {
    src: "Main.java",
    // Build a jar so multi-class solutions are a single cached file.
    compile: ["/bin/sh", "-c", "javac -J-Xshare:auto -d out Main.java && jar cfe main.jar Main -C out ."],
    artifact: "main.jar",
    runArgs: (memMB) => [
      "/usr/bin/java", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1", "-Xshare:auto",
      `-Xmx${Math.floor(memMB * 0.8)}m`, "-Xss64m", "-jar", "main.jar",
    ],
  },
  py: {
    src: "main.py",
    compile: null,
    artifact: "main.py",
    runArgs: () => ["/usr/bin/python3", "-S", "main.py"],
  },
};

const VERDICT = {
  Accepted: "OK",
  "Time Limit Exceeded": "TLE",
  "Memory Limit Exceeded": "MLE",
  "Output Limit Exceeded": "OLE",
  "Nonzero Exit Status": "RE",
  Signalled: "RE",
};

async function compile(lang, code) {
  const L = LANGS[lang];
  if (!L.compile) return { ok: true, copyIn: { [L.artifact]: { content: code } }, cleanup: [] };
  const r = await run({
    args: L.compile, env: ENV,
    files: [{ content: "" }, { name: "stdout", max: 64 * 1024 }, { name: "stderr", max: 64 * 1024 }],
    cpuLimit: 10_000 * MS, clockLimit: 20_000 * MS, memoryLimit: 1024 * MB, procLimit: 64,
    copyIn: { [L.src]: { content: code } },
    copyOut: ["stderr"], copyOutCached: [L.artifact],
  });
  if (r.status !== "Accepted") return { ok: false, verdict: "CE", log: r.files?.stderr ?? r.error };
  const id = r.fileIds[L.artifact];
  return { ok: true, copyIn: { [L.artifact]: { fileId: id } }, cleanup: [id], compileMs: r.time / MS };
}

async function runTest(lang, prog, input, { timeMs = 1000, memMB = 256, outMB = 64 } = {}) {
  const r = await run({
    args: LANGS[lang].runArgs(memMB), env: ENV,
    files: [{ content: input }, { name: "stdout", max: outMB * MB }, { name: "stderr", max: 64 * 1024 }],
    cpuLimit: timeMs * MS, clockLimit: timeMs * 3 * MS,
    // Java reserves address space beyond -Xmx; give the cgroup headroom over the problem limit.
    memoryLimit: (lang === "java" ? memMB + 128 : memMB) * MB,
    stackLimit: memMB * MB, procLimit: lang === "java" ? 64 : 1,
    copyIn: prog.copyIn, copyOut: ["stdout", "stderr"],
  });
  // go-judge truncates stdout at `max`; the program then usually dies on the closed pipe
  // (non-zero exit), so "output reached the cap" must win over RE.
  const hitCap = Buffer.byteLength(r.files?.stdout ?? "") >= outMB * MB;
  // The JVM hits -Xmx before the cgroup limit and exits cleanly with OutOfMemoryError.
  const javaOOM = lang === "java" && r.status !== "Accepted" && /java\.lang\.OutOfMemoryError/.test(r.files?.stderr ?? "");
  return {
    verdict: hitCap ? "OLE" : javaOOM ? "MLE" : VERDICT[r.status] ?? `?${r.status}`,
    status: r.status, cpuMs: r.time / MS, wallMs: r.runTime / MS, memMB: +(r.memory / MB).toFixed(1),
    stdout: r.files?.stdout ?? "", stderr: r.files?.stderr ?? "",
  };
}

async function judge(lang, code, tests, limits) {
  const prog = await compile(lang, code);
  if (!prog.ok) return [{ verdict: "CE", log: prog.log }];
  try {
    const results = [];
    for (const t of tests) {
      const r = await runTest(lang, prog, t.input, limits);
      if (r.verdict === "OK" && t.expected !== undefined && r.stdout.trimEnd() !== t.expected.trimEnd()) r.verdict = "WA";
      results.push(r);
    }
    return results;
  } finally {
    for (const id of prog.cleanup) await delFile(id); // step 3: delete cached binary
  }
}

// ---------- programs ----------
const APLUSB = {
  cpp: `#include <bits/stdc++.h>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}`,
  java: `import java.util.*;\npublic class Main{public static void main(String[] x){Scanner s=new Scanner(System.in);long a=s.nextLong(),b=s.nextLong();System.out.println(a+b);}}`,
  py: `a,b=map(int,input().split())\nprint(a+b)`,
};
const ABTESTS = [
  { input: "1 2\n", expected: "3" },
  { input: "-5 5\n", expected: "0" },
  { input: "1000000000000 1\n", expected: "1000000000001" },
];
const BAD = {
  WA: { lang: "cpp", code: `#include <cstdio>\nint main(){puts("42");}` },
  TLE: { lang: "cpp", code: `int main(){volatile long x=0;for(;;)x++;}` },
  MLE: { lang: "cpp", code: `#include <vector>\n#include <cstdio>\nint main(){std::vector<char> v(512u<<20,1);printf("%d",v[12345]);}` },
  OLE: { lang: "py", code: `import sys\nwhile True: sys.stdout.write("x"*65536)` },
  RE: { lang: "cpp", code: `int main(){int* p=nullptr; return *p;}` },
  CE: { lang: "cpp", code: `int main(){ this is not c++ }` },
  RE_java: { lang: "java", code: `public class Main{public static void main(String[] a){throw new RuntimeException("boom");}}` },
  MLE_java: { lang: "java", code: `public class Main{public static void main(String[] a){long[][] x=new long[1000][];for(int i=0;i<1000;i++)x[i]=new long[1<<20];System.out.println(x.length);}}` },
  MLE_py: { lang: "py", code: `x=bytearray(512*1024*1024)\nprint(len(x))` },
};
const NET = `import socket\ns=socket.socket()\ns.settimeout(2)\ntry:\n  s.connect(("1.1.1.1",80)); print("NETWORK OPEN")\nexcept Exception as e:\n  print("blocked:", type(e).__name__)`;

// Checker: "print any two indices i<j with a[i]+a[j]=target".
const CHECKER = `import sys
inp, out, ans = (open(p).read().split() for p in sys.argv[1:4])
n, t = int(inp[0]), int(inp[1]); a = list(map(int, inp[2:2+n]))
try:
    i, j = map(int, out[:2]); ok = len(out) == 2 and 0 <= i < j < n and a[i] + a[j] == t
except Exception:
    ok = False
sys.exit(0 if ok else 1)`;

async function runChecker(input, output, answer) {
  const r = await run({
    args: ["/usr/bin/python3", "-S", "checker.py", "input.txt", "output.txt", "answer.txt"], env: ENV,
    files: [{ content: "" }, { name: "stdout", max: 64 * 1024 }, { name: "stderr", max: 64 * 1024 }],
    cpuLimit: 5000 * MS, clockLimit: 10_000 * MS, memoryLimit: 512 * MB, procLimit: 1,
    copyIn: {
      "checker.py": { content: CHECKER }, "input.txt": { content: input },
      "output.txt": { content: output }, "answer.txt": { content: answer },
    },
  });
  return r.status === "Accepted" ? "pass" : r.status === "Nonzero Exit Status" ? "fail" : `checker-error(${r.status})`;
}

// ---------- report ----------
let failures = 0;
function expect(name, got, want) {
  const ok = got === want;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(34)} got=${got}${ok ? "" : `  want=${want}`}`);
}
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b), mean = s.reduce((a, b) => a + b, 0) / s.length;
  const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length);
  return `min=${s[0].toFixed(1)} median=${s[s.length >> 1].toFixed(1)} max=${s.at(-1).toFixed(1)} sd=${sd.toFixed(1)} ms`;
};

console.log("== Accepted on all tests, per language (compile once, run per test) ==");
for (const lang of Object.keys(LANGS)) {
  const rs = await judge(lang, APLUSB[lang], ABTESTS, { timeMs: 3000 });
  expect(`A+B ${lang}`, rs.map((r) => r.verdict).join(","), "OK,OK,OK");
  if (rs[0].verdict !== "OK") console.log(rs[0]);
}

console.log("\n== Verdicts ==");
for (const [want, { lang, code }] of Object.entries(BAD)) {
  const rs = await judge(lang, code, [{ input: "1 2\n", expected: "3" }], { timeMs: lang === "java" ? 3000 : 1000, outMB: 1 });
  const got = rs[0].verdict;
  expect(`${want} (${lang})`, got, want.split("_")[0]);
  if (got !== want.split("_")[0]) console.log("   ", { ...rs[0], stdout: rs[0].stdout?.slice(0, 200), stderr: rs[0].stderr?.slice(0, 300) });
}

console.log("\n== Cached binary is deleted after the submission ==");
{
  const prog = await compile("cpp", APLUSB.cpp);
  await delFile(prog.cleanup[0]);
  const list = await (await fetch(`${JUDGE}/file`)).json();
  expect("cached file removed", Object.hasOwn(list, prog.cleanup[0]), false);
}

console.log("\n== Isolation ==");
{
  const [r] = await judge("py", NET, [{ input: "" }], { timeMs: 3000 });
  expect("no network", r.stdout.trim().startsWith("blocked"), true);
}

console.log("\n== Checker ==");
{
  const input = "4 9\n2 7 11 15\n";
  expect("checker accepts valid answer", await runChecker(input, "0 1\n", "0 1\n"), "pass");
  expect("checker rejects wrong answer", await runChecker(input, "0 2\n", "0 1\n"), "fail");
}

console.log("\n== Timing noise (20 runs each; CPU time is what we judge on) ==");
const busy = `#include <cstdio>\nint main(){volatile unsigned long long s=0;for(unsigned long long i=0;i<300000000ULL;i++)s+=i^(i>>3);printf("%llu",(unsigned long long)s);}`;
for (const [label, lang, code] of [
  ["C++ ~busy loop", "cpp", busy],
  ["Java hello (JVM startup)", "java", `public class Main{public static void main(String[] a){System.out.println(1);}}`],
  ["Python hello (startup)", "py", "print(1)"],
]) {
  const prog = await compile(lang, code);
  if (!prog.ok) { failures++; console.log(`FAIL  ${label}: compile error\n${prog.log}`); continue; }
  const cpu = [], wall = [], mem = [];
  for (let i = 0; i < 20; i++) {
    const r = await runTest(lang, prog, "", { timeMs: 10_000 });
    cpu.push(r.cpuMs); wall.push(r.wallMs); mem.push(r.memMB);
  }
  for (const id of prog.cleanup) await delFile(id);
  console.log(`${label.padEnd(26)} cpu: ${stats(cpu)}\n${"".padEnd(26)} wall: ${stats(wall)}  mem≈${Math.max(...mem)} MB`);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures ? 1 : 0);
