export const LANGS = ["cpp", "java", "py"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABEL: Record<Lang, string> = { cpp: "C++17", java: "Java 21", py: "Python 3" };
export const LANG_FILE: Record<Lang, string> = { cpp: "main.cpp", java: "Main.java", py: "main.py" };

/**
 * Java code is compiled as Main.java and run as `Main` (packages/judge LANG_SPEC), so it needs a
 * class Main. Comments are ignored, so a commented-out `class Main` doesn't count. A heuristic
 * (string literals aren't parsed); it only exists to give a friendlier message than javac's.
 */
export function javaHasMainClass(code: string): boolean {
  const noComments = code.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  return /\bclass\s+Main\b/.test(noComments);
}

export const JAVA_MAIN_CLASS_MESSAGE =
  "Java code must have a class named Main (e.g. `public class Main { ... }`) — it is compiled as Main.java.";
