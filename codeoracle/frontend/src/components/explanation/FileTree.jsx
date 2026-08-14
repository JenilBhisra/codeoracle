import { useState } from "react";
import { ChevronRight, FileCode2, FileJson, Folder, FolderOpen, TestTube2, Braces } from "lucide-react";
import { cn } from "../../lib/cn";
import { EmptyState } from "../common/States";

function iconFor(node) {
  if (node.type === "folder") return null;
  if (/test/i.test(node.name)) return { Icon: TestTube2, color: "text-success" };
  if (node.language === "python") return { Icon: FileCode2, color: "text-py" };
  if (node.language === "javascript") return { Icon: Braces, color: "text-js" };
  return { Icon: FileJson, color: "text-muted-foreground" };
}

function TreeNode({ node, depth, path, onSelectFile, selectedPath }) {
  const [open, setOpen] = useState(depth < 1);
  const fullPath = path ? `${path}/${node.name}` : node.name;

  if (node.type === "folder") {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface-2"
          style={{ paddingLeft: depth * 14 + 8 }}
        >
          <ChevronRight
            size={13}
            className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
            aria-hidden="true"
          />
          {open ? (
            <FolderOpen size={15} className="shrink-0 text-cyan" aria-hidden="true" />
          ) : (
            <Folder size={15} className="shrink-0 text-cyan" aria-hidden="true" />
          )}
          <span className="truncate font-mono text-xs">{node.name}</span>
        </button>
        {open ? (
          <ul>
            {(node.children || []).map((child) => (
              <TreeNode
                key={child.name}
                node={child}
                depth={depth + 1}
                path={fullPath}
                onSelectFile={onSelectFile}
                selectedPath={selectedPath}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  const { Icon, color } = iconFor(node);
  const selectable = Boolean(node.moduleId);

  return (
    <li>
      <button
        type="button"
        disabled={!selectable}
        onClick={() => onSelectFile?.(node)}
        title={selectable ? `Open explanation for ${fullPath}` : `${fullPath} — no explanation available`}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2",
          selectedPath === node.moduleId && "bg-purple/12 text-foreground",
          !selectable && "cursor-default opacity-60 hover:bg-transparent",
        )}
        style={{ paddingLeft: depth * 14 + 22 }}
      >
        <Icon size={14} className={cn("shrink-0", color)} aria-hidden="true" />
        <span className="truncate font-mono text-xs">{node.name}</span>
      </button>
    </li>
  );
}

export function FileTree({ tree, onSelectFile, selectedPath }) {
  if (!tree?.length) {
    return <EmptyState title="No file tree available" description="The backend did not return a project structure for this analysis." />;
  }
  return (
    <ul className="max-h-[26rem] overflow-auto scrollbar-thin-custom pr-1">
      {tree.map((node) => (
        <TreeNode
          key={node.name}
          node={node}
          depth={0}
          path=""
          onSelectFile={onSelectFile}
          selectedPath={selectedPath}
        />
      ))}
    </ul>
  );
}
