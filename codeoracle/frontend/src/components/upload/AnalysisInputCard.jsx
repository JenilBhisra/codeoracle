import { useState } from "react";
import { Sparkles, Loader2, GitBranch } from "lucide-react";
import { UploadDropZone } from "./UploadDropZone";
import { GithubUrlInput } from "./GithubUrlInput";
import { Button } from "../common/Button";
import { ErrorState } from "../common/States";
import { validateGithubUrl, validateZipFile } from "../../services/api";

export function AnalysisInputCard({ submitting, submitError, onSubmit, onDismissError }) {
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [urlError, setUrlError] = useState(null);

  const hasFile = Boolean(file);
  const hasUrl = repoUrl.trim().length > 0;

  function selectFile(selected) {
    setFileError(validateZipFile(selected));
    setFile(selected);
    setRepoUrl("");
    setUrlError(null);
  }

  function clearFile() {
    setFile(null);
    setFileError(null);
  }

  function changeUrl(next) {
    setRepoUrl(next);
    setUrlError(next.trim() ? validateGithubUrl(next) : null);
    if (next.trim()) clearFile();
  }

  const valid = (hasFile && !fileError) || (hasUrl && !urlError);

  function handleSubmit(event) {
    event.preventDefault();
    if (hasFile) {
      const error = validateZipFile(file);
      setFileError(error);
      if (!error) onSubmit({ kind: "zip", file });
      return;
    }
    const error = validateGithubUrl(repoUrl);
    setUrlError(error);
    if (!error) onSubmit({ kind: "github", repoUrl: repoUrl.trim() });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel relative overflow-hidden rounded-2xl p-5 sm:p-7"
      aria-label="Start a codebase analysis"
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-brand"
        aria-hidden="true"
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr]">
        <UploadDropZone
          file={file}
          error={fileError}
          disabled={submitting || hasUrl}
          onSelect={selectFile}
          onClear={clearFile}
        />

        <div className="flex items-center justify-center gap-3 lg:flex-col">
          <span className="h-px flex-1 bg-border lg:h-full lg:w-px lg:flex-none" aria-hidden="true" />
          <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            or
          </span>
          <span className="h-px flex-1 bg-border lg:h-full lg:w-px lg:flex-none" aria-hidden="true" />
        </div>

        <GithubUrlInput
          value={repoUrl}
          error={urlError}
          disabled={submitting || hasFile}
          onChange={changeUrl}
          onClear={() => changeUrl("")}
        />
      </div>

      {submitError ? (
        <ErrorState
          className="mt-5"
          title="Analysis could not be started"
          message={submitError}
          onRetry={onDismissError}
        />
      ) : null}

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <GitBranch size={14} aria-hidden="true" />
          Submit a ZIP archive or a repository URL — one source per analysis.
        </p>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!valid || submitting}
          className="w-full sm:w-auto"
        >
          {submitting ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles size={18} aria-hidden="true" />
          )}
          {submitting ? "Starting analysis…" : "Analyze Codebase"}
        </Button>
      </div>
    </form>
  );
}
