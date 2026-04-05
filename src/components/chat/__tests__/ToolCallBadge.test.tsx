import { describe, test, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ToolCallBadge, getToolLabel } from "../ToolCallBadge";

describe("getToolLabel", () => {
  test("str_replace_editor create", () => {
    expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating /App.jsx");
  });

  test("str_replace_editor str_replace", () => {
    expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" })).toBe("Editing /App.jsx");
  });

  test("str_replace_editor insert", () => {
    expect(getToolLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })).toBe("Editing /App.jsx");
  });

  test("str_replace_editor view", () => {
    expect(getToolLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Viewing /App.jsx");
  });

  test("file_manager rename", () => {
    expect(getToolLabel("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })).toBe("Renaming /old.jsx → /new.jsx");
  });

  test("file_manager delete", () => {
    expect(getToolLabel("file_manager", { command: "delete", path: "/App.jsx" })).toBe("Deleting /App.jsx");
  });

  test("file_manager list", () => {
    expect(getToolLabel("file_manager", { command: "list", path: "/" })).toBe("Listing /");
  });

  test("unknown tool falls back to tool name", () => {
    expect(getToolLabel("some_tool", {})).toBe("some_tool");
  });
});

describe("ToolCallBadge", () => {
  test("shows spinner and label while in progress", () => {
    render(
      <ToolCallBadge
        toolInvocation={{ state: "call", toolCallId: "1", toolName: "str_replace_editor", args: { command: "create", path: "/App.jsx" } }}
      />
    );
    expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  });

  test("shows green dot when done", () => {
    const { container } = render(
      <ToolCallBadge
        toolInvocation={{ state: "result", toolCallId: "1", toolName: "str_replace_editor", args: { command: "create", path: "/App.jsx" }, result: "ok" }}
      />
    );
    expect(within(container).getByText("Creating /App.jsx")).toBeDefined();
    expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
  });

  test("shows file_manager delete label", () => {
    render(
      <ToolCallBadge
        toolInvocation={{ state: "call", toolCallId: "2", toolName: "file_manager", args: { command: "delete", path: "/old.jsx" } }}
      />
    );
    expect(screen.getByText("Deleting /old.jsx")).toBeDefined();
  });
});
