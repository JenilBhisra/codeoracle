import { Highlight } from "prism-react-renderer";
import { cn } from "../../lib/cn";
import { CopyButton } from "./CopyButton";
import { DownloadButton } from "./DownloadButton";

const theme = {
  plain: { color: "oklch(0.3 0.02 262)", backgroundColor: "transparent" },
  styles: [
    { types: ["comment", "prolog", "cdata"], style: { color: "oklch(0.6 0.02 260)", fontStyle: "italic" } },
    { types: ["punctuation", "operator"], style: { color: "oklch(0.48 0.02 260)" } },
    { types: ["keyword", "builtin", "boolean"], style: { color: "oklch(0.5 0.19 300)" } },
    { types: ["string", "char", "attr-value"], style: { color: "oklch(0.48 0.13 160)" } },
    { types: ["number", "constant", "symbol"], style: { color: "oklch(0.52 0.15 60)" } },
    { types: ["function", "class-name", "maybe-class-name"], style: { color: "oklch(0.5 0.13 225)" } },
    { types: ["variable", "attr-name", "property"], style: { color: "oklch(0.48 0.14 262)" } },
    { types: ["decorator", "tag"], style: { color: "oklch(0.52 0.18 330)" } },
    { types: ["deleted"], style: { color: "oklch(0.53 0.2 25)" } },
  ],
};

const languageMap = { python: "python", javascript: "jsx", json: "json" };

export function CodeBlock({
  code = "",
  language = "python",
  filename,
  downloadName,
  maxHeight = "28rem",
  className,
}) {
  const lines = code.split("\n").length;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-[var(--code-surface)]", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface/70 px-3 py-2">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </span>
        <span className="ml-1 truncate font-mono text-xs text-muted-foreground">
          {filename || language}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="hidden font-mono text-[0.68rem] text-muted-foreground sm:inline">
            {lines} lines
          </span>
          <CopyButton value={code} label={`Copy ${filename || "code"}`} />
          {downloadName ? <DownloadButton filename={downloadName} content={code} /> : null}
        </span>
      </div>
      <div className="overflow-auto scrollbar-thin-custom" style={{ maxHeight }}>
        <Highlight code={code.replace(/\n$/, "")} language={languageMap[language] || "jsx"} theme={theme}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre className="min-w-full p-3 font-mono text-[0.78rem] leading-6">
              {tokens.map((line, i) => {
                const lineProps = getLineProps({ line });
                return (
                  <div key={i} {...lineProps} className={cn("flex", lineProps.className)}>
                    <span className="mr-4 w-8 shrink-0 select-none text-right text-muted-foreground/60">
                      {i + 1}
                    </span>
                    <span className="whitespace-pre">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
