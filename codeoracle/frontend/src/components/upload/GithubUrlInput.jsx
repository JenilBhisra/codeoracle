import { Github, Link2, X } from "lucide-react";
import { Button } from "../common/Button";
import { cn } from "../../lib/cn";

export function GithubUrlInput({ value, error, disabled, onChange, onClear }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Github size={18} className="text-purple" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Analyze a public GitHub repository</h3>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col justify-center rounded-xl border border-border bg-surface/50 p-4",
          disabled && "opacity-45",
        )}
      >
        <label htmlFor="codeoracle-repo-url" className="text-xs font-medium text-muted-foreground">
          Repository URL
        </label>
        <div className="relative mt-2">
          <Link2
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="codeoracle-repo-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck="false"
            disabled={disabled}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://github.com/username/repository"
            aria-invalid={Boolean(error)}
            aria-describedby="codeoracle-repo-help"
            className={cn(
              "h-11 w-full rounded-lg border bg-background/60 pl-9 pr-9 font-mono text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors",
              error ? "border-danger/60" : "border-input focus:border-purple/70",
            )}
          />
          {value ? (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear repository URL"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <p id="codeoracle-repo-help" className="mt-2 text-xs text-muted-foreground">
          Only public repositories are supported. Private repositories require credentials CodeOracle
          never stores.
        </p>

        {error ? (
          <p role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
