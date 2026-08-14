import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./Button";
import { downloadTextFile } from "../../lib/download";

export function DownloadButton({
  filename,
  content,
  onDownload,
  label,
  variant = "ghost",
  size = "sm",
  children,
}) {
  const accessibleLabel = label || `Download ${filename || "file"}`;

  async function handleClick() {
    try {
      if (onDownload) await onDownload();
      else downloadTextFile(filename, content ?? "");
    } catch (error) {
      toast.error(error?.message || "Download failed");
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      <Download size={14} aria-hidden="true" />
      {children ?? <span className="hidden sm:inline">Download</span>}
    </Button>
  );
}
