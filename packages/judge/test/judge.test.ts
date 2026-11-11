// Integration tests against a running go-judge (docker compose up -d judge).
import { describe, expect, it } from "vitest";
import { GoJudge, judge, normalizeOutput, runChecker } from "../src/index.js";

const gj = new GoJudge();
const up = await fetch(`${gj.url}/version`).then((r) => r.ok, () => false);
const limits = { cpuMs: 2000, memoryMb: 256, outputMb: 1 };
const tests = [
  { input: "1 2\n", answer: "3\n", visible: true },
  { input: "5 -5\n", answer: "0\n", visible: false },
];

describe("normalizeOutput", () => {
  it("ignores trailing whitespace and CRLF", () => {
    expect(normalizeOutput("1 2  \r\n3\n\n")).toBe("1 2\n3");
    expect(normalizeOutput("1  2")).not.toBe(normalizeOutput("1 2"));
  });
});

describe.skipIf(!up)("judge (needs go-judge)", () => {
  const ab = {
    cpp: `#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<'\\n';}`,
    java: `import java.util.*;public class Main{public static void main(String[] x){Scanner s=new Scanner(System.in);System.out.println(s.nextLong()+s.nextLong());}}`,
    py: `a,b=map(int,input().split())\nprint(a+b)`,
  } as const;

  for (const lang of ["cpp", "java", "py"] as const) {
    it(`accepts A+B in ${lang}`, async () => {
      const r = await judge(gj, { lang, code: ab[lang], tests, limits: { ...limits, cpuMs: 3000 }, stopOnFailure: true });
      expect(r.compileLog ?? r.verdict).toBe("AC");
      expect(r.tests).toHaveLength(2);
    });
  }

  it("reveals only the first failing hidden test", async () => {
    const r = await judge(gj, { lang: "py", code: "print(3)", tests, limits, stopOnFailure: true });
    expect(r.verdict).toBe("WA");
    expect(r.tests[1]?.input).toBe("5 -5\n");
  });

  it("reports compile errors", async () => {
    const r = await judge(gj, { lang: "cpp", code: "int main(){ nope }", tests, limits, stopOnFailure: true });
    expect(r.verdict).toBe("CE");
    expect(r.compileLog).toMatch(/error/);
  });

  it("runs a checker", async () => {
    const checker = `import sys\nout=open(sys.argv[2]).read().split()\nsys.exit(0 if out==['ok'] else 1)`;
    expect(await runChecker(gj, checker, "", "ok\n", "")).toBe("pass");
    expect(await runChecker(gj, checker, "", "no\n", "")).toBe("fail");
    expect(await runChecker(gj, "raise SystemExit(3)", "", "", "")).toBe("error");
  });
});
