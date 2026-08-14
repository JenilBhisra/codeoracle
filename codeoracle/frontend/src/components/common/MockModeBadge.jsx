import { FlaskConical } from "lucide-react";
import { USE_MOCK_DATA } from "../../services/api";

export function MockModeBadge() {
  if (!USE_MOCK_DATA) return null;
  return (
    <p className="pointer-events-none fixed bottom-3 left-3 z-40 inline-flex items-center gap-1.5 rounded-full border border-purple/40 bg-purple/12 px-2.5 py-1 text-[0.65rem] font-medium text-purple">
      <FlaskConical size={11} aria-hidden="true" />
      Mock data mode
    </p>
  );
}
