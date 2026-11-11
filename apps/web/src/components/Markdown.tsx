// Statements and lessons: Markdown + GFM + KaTeX maths. react-markdown never renders raw HTML
// (no rehype-raw), so the output is safe without a separate sanitiser; links get rel=noopener.
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
        components={{ a: ({ node: _n, ...p }) => <a {...p} target="_blank" rel="noopener noreferrer" /> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
