// Editor templates (PLAN §3): the input is already read into variables and the solver only writes solve().
// Problems without an InputSpec get a generic template with a fast reader built in.
//
// Conventions (the statement must match them):
//   - input is whitespace-separated tokens; strings are single tokens (ASCII, no spaces)
//   - `bool` returns print YES / NO
//   - array returns print one element per line, or space-separated on one line with `join: spaces`
//   - `multi`: first token T, then T cases; each case's result is printed in order
//   - `void`: solve() prints its own output (C++ cout, Java `out`, Python print)
import type { InputSpec, InputVar, ReturnType } from "./problem.js";
import type { Lang } from "./lang.js";

/** Names the templates use themselves, plus keywords/builtins in any of the three languages. */
export const RESERVED_NAMES: ReadonlySet<string> = new Set([
  "solve", "main", "in", "out", "args", "res", "Main", "FastReader", "sys",
  // C++
  "int", "long", "bool", "char", "double", "float", "string", "vector", "auto", "return", "new", "delete", "class",
  "struct", "this", "true", "false", "if", "else", "for", "while", "do", "switch", "case", "default", "break",
  "continue", "const", "static", "void", "using", "namespace", "std", "cin", "cout", "endl", "signed", "unsigned",
  "short", "template", "typename", "public", "private", "protected", "try", "catch", "throw", "and", "or", "not",
  // Java
  "String", "boolean", "byte", "final", "import", "package", "extends", "implements", "interface", "abstract",
  "native", "super", "synchronized", "throws", "transient", "volatile", "instanceof", "enum", "assert", "var",
  "record", "null", "goto",
  // Python
  "def", "lambda", "None", "True", "False", "is", "pass", "with", "as", "from", "global", "nonlocal", "yield",
  "raise", "except", "finally", "del", "elif", "async", "await", "print", "range", "len", "list", "str", "map",
  "iter", "next", "sum", "min", "max", "sorted", "input", "open", "type", "id", "dict", "set", "tuple", "object",
]);

/** Optional extra on InputSpec: how array returns are printed. */
export type ArrayJoin = "lines" | "spaces";

export function editorTemplate(lang: Lang, spec?: InputSpec, body?: string): string {
  if (!spec) return GENERIC[lang](body);
  return { cpp, java, py }[lang](spec, body);
}

/**
 * Does `code` keep the editor template's shape? Reference solutions are shown on the Solutions
 * tab next to the solver's own code, so they must look like the editor: the line that opens the
 * solver's part (the `solve` signature, or `main` for the generic template) is there unchanged,
 * and everything after that part (main, input reading, the fast reader) is exactly the template's.
 * Extra includes, imports and helpers above it are fine. Returns the problem, or null if it fits.
 */
export function templateMismatch(lang: Lang, spec: InputSpec | undefined, code: string): string | null {
  const MARK = "\u0000body\u0000";
  const t = editorTemplate(lang, spec, MARK);
  const at = t.indexOf(MARK);
  const head = t.slice(0, t.lastIndexOf("\n", at));
  const opener = head.slice(head.lastIndexOf("\n") + 1);
  const tail = t.slice(at + MARK.length).trimEnd();
  const src = code.replace(/\r\n/g, "\n").trimEnd();
  if (!src.split("\n").includes(opener)) return `the line \`${opener.trim()}\` from the template is missing or changed`;
  if (!src.endsWith(tail)) return "everything after the solver's part (main, input reading) must stay exactly as the template has it";
  return null;
}

// ── helpers ──

const isArray = (r: ReturnType) => r === "int[]" || r === "long[]";
const indent = (code: string, n: number) =>
  code.replace(/\r\n/g, "\n").replace(/\n+$/, "").split("\n").map((l) => (l.trim() ? " ".repeat(n) + l : "")).join("\n");
const dim = (d: string | number) => String(d);
const joinOf = (spec: InputSpec): ArrayJoin => spec.join ?? "lines";

function lines(...parts: (string | false | undefined)[]): string {
  return parts.filter((p): p is string => typeof p === "string").join("\n");
}

// ── C++ ──

const CPP_TYPE: Record<InputVar["type"], string> = {
  int: "int", long: "long long", string: "string",
  "int[]": "vector<int>", "long[]": "vector<long long>", "string[]": "vector<string>", "int[][]": "vector<vector<int>>",
};
const CPP_RET: Record<ReturnType, string> = {
  int: "int", long: "long long", string: "string", bool: "bool", "int[]": "vector<int>", "long[]": "vector<long long>", void: "void",
};
const CPP_DEFAULT: Record<ReturnType, string> = {
  int: "return 0;", long: "return 0;", string: 'return "";', bool: "return false;", "int[]": "return {};", "long[]": "return {};", void: "",
};

function cppRead(v: InputVar): string {
  const t = CPP_TYPE[v.type];
  switch (v.type) {
    case "int": case "long": case "string":
      return `${t} ${v.name};\ncin >> ${v.name};`;
    case "int[]": case "long[]": case "string[]":
      return `${t} ${v.name}(${v.length});\nfor (auto& _x : ${v.name}) cin >> _x;`;
    case "int[][]":
      return `${t} ${v.name}(${v.rows}, vector<int>(${dim(v.cols)}));\nfor (auto& _row : ${v.name})\n    for (auto& _x : _row) cin >> _x;`;
  }
}

function cppPrint(spec: InputSpec): string {
  const call = `solve(${spec.vars.map((v) => v.name).join(", ")})`;
  switch (spec.returns) {
    case "void": return `${call};`;
    case "bool": return `cout << (${call} ? "YES" : "NO") << '\\n';`;
    case "int[]": case "long[]":
      return joinOf(spec) === "lines"
        ? `for (auto _v : ${call}) cout << _v << '\\n';`
        : `auto _res = ${call};\nfor (size_t _i = 0; _i < _res.size(); _i++) cout << (_i ? " " : "") << _res[_i];\ncout << '\\n';`;
    default: return `cout << ${call} << '\\n';`;
  }
}

function cpp(spec: InputSpec, body?: string): string {
  const params = spec.vars.map((v) => (v.type.endsWith("]") ? `${CPP_TYPE[v.type]}& ${v.name}` : `${CPP_TYPE[v.type]} ${v.name}`));
  const userBody = body ?? lines(spec.returns === "void" ? "// your code here — print the answer with cout" : "// your code here", CPP_DEFAULT[spec.returns] || undefined);
  const caseCode = lines(...spec.vars.map(cppRead), cppPrint(spec));
  return lines(
    "#include <bits/stdc++.h>",
    "using namespace std;",
    "",
    `${CPP_RET[spec.returns]} solve(${params.join(", ")}) {`,
    indent(userBody, 4),
    "}",
    "",
    "int main() {",
    "    ios::sync_with_stdio(false);",
    "    cin.tie(nullptr);",
    spec.multi ? lines("    int _t;", "    cin >> _t;", "    while (_t--) {", indent(caseCode, 8), "    }") : indent(caseCode, 4),
    "}",
    "",
  );
}

// ── Java ──

const JAVA_TYPE: Record<InputVar["type"], string> = {
  int: "int", long: "long", string: "String",
  "int[]": "int[]", "long[]": "long[]", "string[]": "String[]", "int[][]": "int[][]",
};
const JAVA_RET: Record<ReturnType, string> = {
  int: "int", long: "long", string: "String", bool: "boolean", "int[]": "int[]", "long[]": "long[]", void: "void",
};
const JAVA_DEFAULT: Record<ReturnType, string> = {
  int: "return 0;", long: "return 0;", string: 'return "";', bool: "return false;", "int[]": "return new int[0];", "long[]": "return new long[0];", void: "",
};
const JAVA_NEXT = { int: "in.nextInt()", long: "in.nextLong()", string: "in.next()" } as const;

function javaRead(v: InputVar): string {
  switch (v.type) {
    case "int": case "long": case "string":
      return `${JAVA_TYPE[v.type]} ${v.name} = ${JAVA_NEXT[v.type]};`;
    case "int[]": case "long[]": case "string[]": {
      const el = v.type.slice(0, -2) as "int" | "long" | "string";
      const jt = JAVA_TYPE[el];
      return `${jt}[] ${v.name} = new ${jt}[${v.length}];\nfor (int _i = 0; _i < ${v.name}.length; _i++) ${v.name}[_i] = ${JAVA_NEXT[el]};`;
    }
    case "int[][]":
      return `int[][] ${v.name} = new int[${v.rows}][${dim(v.cols)}];\nfor (int[] _row : ${v.name})\n    for (int _j = 0; _j < _row.length; _j++) _row[_j] = in.nextInt();`;
  }
}

function javaPrint(spec: InputSpec): string {
  const call = `solve(${spec.vars.map((v) => v.name).join(", ")})`;
  switch (spec.returns) {
    case "void": return `${call};`;
    case "bool": return `out.println(${call} ? "YES" : "NO");`;
    case "int[]": case "long[]": {
      const el = spec.returns.slice(0, -2);
      return joinOf(spec) === "lines"
        ? `for (${el} _v : ${call}) out.println(_v);`
        : `${el}[] _res = ${call};\nfor (int _i = 0; _i < _res.length; _i++) {\n    if (_i > 0) out.print(' ');\n    out.print(_res[_i]);\n}\nout.println();`;
    }
    default: return `out.println(${call});`;
  }
}

const JAVA_READER = `    static final PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out), 1 << 16));

    /** Fast whitespace-separated token reader. */
    static final class FastReader {
        private final InputStream in;
        private final byte[] buf = new byte[1 << 16];
        private int len = 0, ptr = 0;

        FastReader(InputStream in) { this.in = in; }

        private int read() throws IOException {
            if (ptr == len) { len = in.read(buf, 0, buf.length); ptr = 0; if (len <= 0) return -1; }
            return buf[ptr++] & 0xff;
        }

        private int skip() throws IOException {
            int c = read();
            while (c != -1 && c <= ' ') c = read();
            return c;
        }

        String next() throws IOException {
            StringBuilder sb = new StringBuilder();
            for (int c = skip(); c > ' '; c = read()) sb.append((char) c);
            return sb.toString();
        }

        long nextLong() throws IOException {
            int c = skip();
            boolean neg = c == '-';
            if (neg) c = read();
            long r = 0;
            while (c >= '0' && c <= '9') { r = r * 10 + (c - '0'); c = read(); }
            return neg ? -r : r;
        }

        int nextInt() throws IOException { return (int) nextLong(); }
    }`;

function java(spec: InputSpec, body?: string): string {
  const params = spec.vars.map((v) => `${JAVA_TYPE[v.type]} ${v.name}`);
  const userBody = body ?? lines(spec.returns === "void" ? "// your code here — print the answer with out.println(...)" : "// your code here", JAVA_DEFAULT[spec.returns] || undefined);
  const caseCode = lines(...spec.vars.map(javaRead), javaPrint(spec));
  return lines(
    "import java.io.*;",
    "import java.util.*;",
    "",
    "public class Main {",
    `    static ${JAVA_RET[spec.returns]} solve(${params.join(", ")}) {`,
    indent(userBody, 8),
    "    }",
    "",
    "    public static void main(String[] args) throws IOException {",
    "        FastReader in = new FastReader(System.in);",
    spec.multi ? lines("        int _t = in.nextInt();", "        while (_t-- > 0) {", indent(caseCode, 12), "        }") : indent(caseCode, 8),
    "        out.flush();",
    "    }",
    "",
    JAVA_READER,
    "}",
    "",
  );
}

// ── Python ──

const PY_TYPE: Record<InputVar["type"], string> = {
  int: "int", long: "int", string: "str",
  "int[]": "list[int]", "long[]": "list[int]", "string[]": "list[str]", "int[][]": "list[list[int]]",
};
const PY_RET: Record<ReturnType, string> = {
  int: "int", long: "int", string: "str", bool: "bool", "int[]": "list[int]", "long[]": "list[int]", void: "None",
};
const PY_DEFAULT: Record<ReturnType, string> = {
  int: "return 0", long: "return 0", string: 'return ""', bool: "return False", "int[]": "return []", "long[]": "return []", void: "pass",
};

function pyRead(v: InputVar): string {
  switch (v.type) {
    case "int": case "long": return `${v.name} = int(next(_it))`;
    case "string": return `${v.name} = next(_it).decode()`;
    case "int[]": case "long[]": return `${v.name} = [int(next(_it)) for _ in range(${v.length})]`;
    case "string[]": return `${v.name} = [next(_it).decode() for _ in range(${v.length})]`;
    case "int[][]": return `${v.name} = [[int(next(_it)) for _ in range(${dim(v.cols)})] for _ in range(${v.rows})]`;
  }
}

/** Python collects every printed line in _out and writes once at the end (print per line is slow). */
function pyPrint(spec: InputSpec): string {
  const call = `solve(${spec.vars.map((v) => v.name).join(", ")})`;
  switch (spec.returns) {
    case "void": return call;
    case "bool": return `_out.append("YES" if ${call} else "NO")`;
    case "int[]": case "long[]":
      return joinOf(spec) === "lines" ? `_out.extend(map(str, ${call}))` : `_out.append(" ".join(map(str, ${call})))`;
    default: return `_out.append(str(${call}))`;
  }
}

function py(spec: InputSpec, body?: string): string {
  const params = spec.vars.map((v) => `${v.name}: ${PY_TYPE[v.type]}`);
  const userBody = body ?? lines(spec.returns === "void" ? "# your code here — print the answer" : "# your code here", PY_DEFAULT[spec.returns]);
  const caseCode = lines(...spec.vars.map(pyRead), pyPrint(spec));
  const collects = spec.returns !== "void";
  return lines(
    "import sys",
    "",
    "",
    `def solve(${params.join(", ")}) -> ${PY_RET[spec.returns]}:`,
    indent(userBody, 4),
    "",
    "",
    "def main():",
    "    _it = iter(sys.stdin.buffer.read().split())",
    collects && "    _out = []",
    spec.multi ? lines("    for _ in range(int(next(_it))):", indent(caseCode, 8)) : indent(caseCode, 4),
    collects && '    sys.stdout.write("\\n".join(_out) + "\\n")',
    "",
    "",
    "main()",
    "",
  );
}

// ── generic (no InputSpec) ──

const GENERIC: Record<Lang, (body?: string) => string> = {
  cpp: (body) =>
    lines(
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "",
      "int main() {",
      "    ios::sync_with_stdio(false);",
      "    cin.tie(nullptr);",
      indent(body ?? "// read the input with cin >> ..., print with cout", 4),
      "}",
      "",
    ),
  java: (body) =>
    lines(
      "import java.io.*;",
      "import java.util.*;",
      "",
      "public class Main {",
      "    public static void main(String[] args) throws IOException {",
      "        FastReader in = new FastReader(System.in);",
      indent(body ?? "// read with in.nextInt() / in.nextLong() / in.next(), print with out.println(...)", 8),
      "        out.flush();",
      "    }",
      "",
      JAVA_READER,
      "}",
      "",
    ),
  py: (body) =>
    lines(
      "import sys",
      "",
      "",
      "def main():",
      "    data = sys.stdin.buffer.read().split()  # all tokens, as bytes; int(data[0]) etc.",
      indent(body ?? "pass", 4),
      "",
      "",
      "main()",
      "",
    ),
};
