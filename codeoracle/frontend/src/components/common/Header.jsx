import { BookOpen, Github } from "lucide-react";
import { LogoWordmark } from "./Logo";
import { Button } from "./Button";
import { ConnectionIndicator } from "./ConnectionIndicator";

export function Header({ connection, onReconnect, onHome }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onHome}
          className="rounded-xl text-left transition-opacity hover:opacity-90"
          aria-label="CodeOracle home"
        >
          <LogoWordmark />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <ConnectionIndicator connection={connection} onReconnect={onReconnect} />
          <a
            href="https://fastapi.tiangolo.com/"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden sm:inline-flex"
          >
            <Button variant="ghost" size="sm">
              <BookOpen size={15} aria-hidden="true" />
              Documentation
            </Button>
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Open the project repository on GitHub"
          >
            <Button variant="secondary" size="icon" aria-hidden="true" tabIndex={-1}>
              <Github size={16} />
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
