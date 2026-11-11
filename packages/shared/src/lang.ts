export const LANGS = ["cpp", "java", "py"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABEL: Record<Lang, string> = { cpp: "C++17", java: "Java 21", py: "Python 3" };
export const LANG_FILE: Record<Lang, string> = { cpp: "main.cpp", java: "Main.java", py: "main.py" };
