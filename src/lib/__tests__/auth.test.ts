// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(cookieStore)),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";

const WRONG_SECRET = new TextEncoder().encode("wrong-secret");

async function makeExpiredToken(userId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode("development-secret-key");
  return new SignJWT({ userId, email, expiresAt: new Date() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("-1s")
    .setIssuedAt()
    .sign(secret);
}

async function makeWrongSecretToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email, expiresAt: new Date() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(WRONG_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets an httpOnly cookie named auth-token", async () => {
    await createSession("user-123", "test@example.com");

    expect(cookieStore.set).toHaveBeenCalledOnce();
    const [name, , options] = cookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
    expect(options.sameSite).toBe("lax");
  });

  test("token is a valid signed JWT containing userId and email", async () => {
    await createSession("user-123", "test@example.com");
    const [, token] = cookieStore.set.mock.calls[0];

    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    // Decode payload (middle segment) without verifying signature
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    expect(payload.userId).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
  });

  test("cookie expires in ~7 days", async () => {
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const [, , options] = cookieStore.set.mock.calls[0];
    const expiresMs = options.expires.getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDays + 1000);
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    cookieStore.get.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns null for a malformed token", async () => {
    cookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });
    expect(await getSession()).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await makeExpiredToken("user-123", "test@example.com");
    cookieStore.get.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });

  test("returns null for a token signed with the wrong secret", async () => {
    const token = await makeWrongSecretToken("user-123", "test@example.com");
    cookieStore.get.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    await createSession("user-123", "test@example.com");
    const token = cookieStore.set.mock.calls[0][1];
    cookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session?.userId).toBe("user-123");
    expect(session?.email).toBe("test@example.com");
    expect(session?.expiresAt).toBeDefined();
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(cookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  function makeRequest(token?: string): NextRequest {
    const req = new NextRequest("http://localhost/api/test");
    if (token) req.cookies.set("auth-token", token);
    return req;
  }

  test("returns null when no cookie is present", async () => {
    expect(await verifySession(makeRequest())).toBeNull();
  });

  test("returns null for a malformed token", async () => {
    expect(await verifySession(makeRequest("bad.token.value"))).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await makeExpiredToken("user-123", "test@example.com");
    expect(await verifySession(makeRequest(token))).toBeNull();
  });

  test("returns null for a token signed with the wrong secret", async () => {
    const token = await makeWrongSecretToken("user-123", "test@example.com");
    expect(await verifySession(makeRequest(token))).toBeNull();
  });

  test("returns session payload with userId, email, and expiresAt for a valid token", async () => {
    await createSession("user-456", "verify@example.com");
    const token = cookieStore.set.mock.calls[0][1];

    const session = await verifySession(makeRequest(token));

    expect(session?.userId).toBe("user-456");
    expect(session?.email).toBe("verify@example.com");
    expect(session?.expiresAt).toBeDefined();
  });
});
