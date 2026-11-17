import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorNoticeProps {
  message: string;
  code?: string;
  className?: string;
}

export function ErrorNotice({ message, code, className }: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
        <span className="truncate">{message}</span>
      </div>
      {code ? (
        <span className="font-mono text-xs text-red-700 shrink-0 tabular-nums">
          {code}
        </span>
      ) : null}
    </div>
  );
}
