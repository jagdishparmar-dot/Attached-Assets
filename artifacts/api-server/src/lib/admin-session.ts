import crypto from "node:crypto";

export const ADMIN_SESSION_COOKIE = "cv_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AdminSessionPayload {
  staffId: number;
  name: string;
  employeeId: string;
  role: string;
  phone: string;
  hub: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET must be set. Add it to your .env for local development.",
    );
  }
  return secret;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createAdminSessionToken(
  payload: Omit<AdminSessionPayload, "exp">,
): string {
  const body: AdminSessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function parseAdminSessionToken(
  token: string | undefined,
): AdminSessionPayload | null {
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const data = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (sign(data) !== signature) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as AdminSessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    if (typeof payload.staffId !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

export function toAdminUser(payload: AdminSessionPayload) {
  return {
    id: payload.staffId,
    name: payload.name,
    employeeId: payload.employeeId,
    role: payload.role,
    phone: payload.phone,
    hub: payload.hub,
  };
}

export function adminSessionCookieOptions() {
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}
