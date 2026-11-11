// editor.main.js ships without its own .d.ts; it exports the same API as the package root.
declare module "monaco-editor/editor/editor.main.js" {
  export * from "monaco-editor";
}
