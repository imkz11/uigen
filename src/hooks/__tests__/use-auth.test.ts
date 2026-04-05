import { test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock actions
vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
});

// --- signIn ---

test("signIn returns result and sets isLoading false after completion", async () => {
  mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  let returnValue: any;
  await act(async () => {
    returnValue = await result.current.signIn("a@b.com", "wrongpass");
  });

  expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  expect(result.current.isLoading).toBe(false);
});

test("signIn sets isLoading true during async work", async () => {
  let resolveSignIn!: (v: any) => void;
  mockSignIn.mockReturnValue(new Promise((res) => { resolveSignIn = res; }));

  const { result } = renderHook(() => useAuth());

  act(() => {
    result.current.signIn("a@b.com", "pass");
  });

  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolveSignIn({ success: false, error: "err" });
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn navigates to existing project when no anon work", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([{ id: "proj-1", name: "P", createdAt: new Date(), updatedAt: new Date() }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "password123");
  });

  expect(mockPush).toHaveBeenCalledWith("/proj-1");
});

test("signIn creates new project when no anon work and no existing projects", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-proj" } as any);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "password123");
  });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({ messages: [], data: {} })
  );
  expect(mockPush).toHaveBeenCalledWith("/new-proj");
});

test("signIn migrates anon work and navigates to created project", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({
    messages: [{ role: "user", content: "hello" }],
    fileSystemData: { "/": { type: "directory" } },
  });
  mockCreateProject.mockResolvedValue({ id: "anon-proj" } as any);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "password123");
  });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [{ role: "user", content: "hello" }],
      data: { "/": { type: "directory" } },
    })
  );
  expect(mockClearAnonWork).toHaveBeenCalled();
  expect(mockGetProjects).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/anon-proj");
});

test("signIn does not navigate when result is not successful", async () => {
  mockSignIn.mockResolvedValue({ success: false, error: "Bad credentials" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "wrong");
  });

  expect(mockGetAnonWorkData).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

test("signIn skips anon work migration when messages array is empty", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
  mockGetProjects.mockResolvedValue([{ id: "p1", name: "P", createdAt: new Date(), updatedAt: new Date() }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "password123");
  });

  expect(mockCreateProject).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/p1");
});

test("signIn resets isLoading to false even when signInAction throws", async () => {
  mockSignIn.mockRejectedValue(new Error("network error"));

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    try {
      await result.current.signIn("a@b.com", "pass");
    } catch {
      // expected
    }
  });

  expect(result.current.isLoading).toBe(false);
});

// --- signUp ---

test("signUp returns result on failure", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

  const { result } = renderHook(() => useAuth());

  let returnValue: any;
  await act(async () => {
    returnValue = await result.current.signUp("existing@b.com", "password123");
  });

  expect(returnValue).toEqual({ success: false, error: "Email already registered" });
  expect(result.current.isLoading).toBe(false);
});

test("signUp navigates to existing project on success", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([{ id: "proj-2", name: "Q", createdAt: new Date(), updatedAt: new Date() }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@b.com", "password123");
  });

  expect(mockPush).toHaveBeenCalledWith("/proj-2");
});

test("signUp creates new project when no projects exist on success", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "fresh-proj" } as any);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@b.com", "password123");
  });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({ messages: [], data: {} })
  );
  expect(mockPush).toHaveBeenCalledWith("/fresh-proj");
});

test("signUp migrates anon work on success", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({
    messages: [{ role: "user", content: "hi" }],
    fileSystemData: { "/": {} },
  });
  mockCreateProject.mockResolvedValue({ id: "migrated-proj" } as any);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@b.com", "password123");
  });

  expect(mockClearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/migrated-proj");
});

test("signUp does not navigate when signUp fails", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "err" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("a@b.com", "pass");
  });

  expect(mockPush).not.toHaveBeenCalled();
});

test("signUp resets isLoading to false even when signUpAction throws", async () => {
  mockSignUp.mockRejectedValue(new Error("server down"));

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    try {
      await result.current.signUp("a@b.com", "pass");
    } catch {
      // expected
    }
  });

  expect(result.current.isLoading).toBe(false);
});

// --- initial state ---

test("isLoading starts as false", () => {
  const { result } = renderHook(() => useAuth());
  expect(result.current.isLoading).toBe(false);
});

test("hook exposes signIn, signUp, and isLoading", () => {
  const { result } = renderHook(() => useAuth());
  expect(typeof result.current.signIn).toBe("function");
  expect(typeof result.current.signUp).toBe("function");
  expect(typeof result.current.isLoading).toBe("boolean");
});
