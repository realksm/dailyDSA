// Statements and lessons: Markdown + GFM + KaTeX maths. react-markdown never renders raw HTML
// (no rehype-raw), so the output is safe without a separate sanitiser; links get rel=noopener.
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

/** "Worked example" → "worked-example": the id a `##`/`###` heading gets with `headingIds`. */
export const headingId = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type HastNode = { type: string; value?: string; children?: HastNode[] };
const textOf = (n: HastNode | undefined): string => (n?.type === "text" ? n.value ?? "" : (n?.children ?? []).map(textOf).join(""));

/**
 * `link`: renders in-page links (`#…`) itself when it returns something (lessons turn `#ladder-3`
 * into the ladder problem); other links open in a new tab. `headingIds`: `##`/`###` get ids.
 */
export function Markdown({ children, link, headingIds }: {
  children: string;
  link?: (href: string, children: ReactNode) => ReactNode | undefined;
  headingIds?: boolean;
}) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
        components={{
          a: ({ node: _n, href, children: c, ...p }) => {
            if (href?.startsWith("#")) {
              const own = link?.(href, c);
              if (own !== undefined) return <>{own}</>;
              return <a href={href} {...p}>{c}</a>;
            }
            return <a href={href} {...p} target="_blank" rel="noopener noreferrer">{c}</a>;
          },
          ...(headingIds
            ? {
                h2: ({ node, ...p }) => <h2 id={headingId(textOf(node as HastNode))} {...p} />,
                h3: ({ node, ...p }) => <h3 id={headingId(textOf(node as HastNode))} {...p} />,
              }
            : {}),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
