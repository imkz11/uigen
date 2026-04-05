"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

function getToolLabel(toolName: string, args: Record<string, string>): string {
  if (toolName === "str_replace_editor") {
    const path = args?.path ?? "";
    switch (args?.command) {
      case "create": return `Creating ${path}`;
      case "str_replace": return `Editing ${path}`;
      case "insert": return `Editing ${path}`;
      case "view": return `Viewing ${path}`;
      default: return `Working on ${path}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args?.command) {
      case "rename": return `Renaming ${args?.path} → ${args?.new_path}`;
      case "delete": return `Deleting ${args?.path}`;
      case "list": return `Listing ${args?.path}`;
      default: return `Managing files`;
    }
  }

  return toolName;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const { toolName, args, state } = toolInvocation;
  const done = state === "result";
  const label = getToolLabel(toolName, args);

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
