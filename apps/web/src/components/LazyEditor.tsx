// Monaco is most of the bundle; load it only on pages that show code.
import { lazy, Suspense, type ComponentProps } from "react";

const Inner = lazy(() => import("./CodeEditor").then((m) => ({ default: m.CodeEditor })));

export function CodeEditor(props: ComponentProps<typeof Inner>) {
  return (
    <Suspense fallback={<span className="muted small" style={{ display: "block", padding: 16 }}>Loading editor…</span>}>
      <Inner {...props} />
    </Suspense>
  );
}

const InnerDiff = lazy(() => import("./CodeDiff").then((m) => ({ default: m.CodeDiff })));

export function CodeDiff(props: ComponentProps<typeof InnerDiff>) {
  return (
    <Suspense fallback={<span className="muted small" style={{ display: "block", padding: 16 }}>Loading the comparison…</span>}>
      <InnerDiff {...props} />
    </Suspense>
  );
}
