"use client";

import { Loader2 } from "lucide-react";
import type { DynamicToolUIPart } from "ai";

function getToolLabel(toolName: string, input: Record<string, any>): string {
  if (toolName === "str_replace_editor") {
    const path = input?.path ?? "";
    switch (input?.command) {
      case "create": return `Creating ${path}`;
      case "str_replace": return `Editing ${path}`;
      case "insert": return `Editing ${path}`;
      case "view": return `Viewing ${path}`;
      default: return `Working on ${path}`;
    }
  }

  if (toolName === "file_manager") {
    switch (input?.command) {
      case "rename": return `Renaming ${input?.path} → ${input?.new_path}`;
      case "delete": return `Deleting ${input?.path}`;
      case "list": return `Listing ${input?.path}`;
      default: return `Managing files`;
    }
  }

  return toolName;
}

interface ToolCallBadgeProps {
  part: DynamicToolUIPart;
}

export function ToolCallBadge({ part }: ToolCallBadgeProps) {
  const { toolName, input, state } = part;
  const done = state === "result" || state === "output-available";
  const label = getToolLabel(toolName, (input as Record<string, any>) ?? {});

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}

export { getToolLabel };
