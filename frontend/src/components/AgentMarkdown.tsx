import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AgentMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="pl-0.5">{children}</li>,
        h1: ({ children }) => <h1 className="mb-2 text-base font-semibold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 text-sm font-semibold">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 font-semibold">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-foreground/75">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.92em]">
            {children}
          </code>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline underline-offset-2"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
