import { useRef, useState } from "react";
import { CheckCircle2, FileArchive, FolderUp, X, AlertTriangle } from "lucide-react";
import { Button } from "../common/Button";
import { cn } from "../../lib/cn";
import { MAX_UPLOAD_BYTES, MAX_LINES } from "../../services/api";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function UploadDropZone({ file, error, disabled, onSelect, onClear }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onSelect(dropped);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <FileArchive size={18} className="text-cyan" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Upload a codebase</h3>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-all",
          dragActive
            ? "border-cyan bg-cyan/8"
            : "border-border bg-surface/50 hover:border-border-strong",
          disabled && "opacity-45",
        )}
      >
        <span
          className={cn(
            "mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-cyan",
            dragActive && "bg-cyan/15",
          )}
          aria-hidden="true"
        >
          <FolderUp size={22} />
        </span>
        <p className="text-sm font-medium">Drag and drop your .zip archive</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Max {MAX_UPLOAD_BYTES / 1024 / 1024} MB · up to {MAX_LINES.toLocaleString()} lines · .zip only
        </p>

        <input
          ref={inputRef}
          id="codeoracle-zip-input"
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) onSelect(selected);
            event.target.value = "";
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Browse files
        </Button>
      </div>

      {file ? (
        <div
          className={cn(
            "mt-3 flex items-center gap-3 rounded-lg border px-3 py-2.5",
            error ? "border-danger/45 bg-danger/8" : "border-success/40 bg-success/8",
          )}
        >
          {error ? (
            <AlertTriangle size={16} className="shrink-0 text-danger" aria-hidden="true" />
          ) : (
            <CheckCircle2 size={16} className="shrink-0 text-success" aria-hidden="true" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-xs">{file.name}</span>
            <span className="text-[0.7rem] text-muted-foreground">{formatSize(file.size)}</span>
          </span>
          <Button variant="ghost" size="icon" onClick={onClear} aria-label="Remove selected file">
            <X size={15} aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
