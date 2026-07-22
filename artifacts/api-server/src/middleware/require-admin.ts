import type { Request, Response, NextFunction } from "express";
import {
  ADMIN_SESSION_COOKIE,
  parseAdminSessionToken,
} from "../lib/admin-session";

const PUBLIC_ROUTES = new Set([
  "GET /healthz",
  "GET /admin/me",
  "POST /admin/login",
  "POST /admin/logout",
  "POST /staff/login",
  "POST /attendance/checkin",
  "POST /attendance/checkout",
  "POST /locations/ping",
]);

/** Mobile staff tokens are issued as `cv-token-{staffId}-{timestamp}`. */
function parseStaffBearerToken(authHeader: string | undefined): number | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  const match = /^cv-token-(\d+)-\d+$/.exec(token);
  if (!match) return null;
  const staffId = parseInt(match[1], 10);
  return Number.isFinite(staffId) ? staffId : null;
}

export function requireAdminUnlessPublic(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const routeKey = `${req.method} ${req.path}`;
  if (PUBLIC_ROUTES.has(routeKey)) {
    next();
    return;
  }

  const session = parseAdminSessionToken(req.cookies?.[ADMIN_SESSION_COOKIE]);
  if (session) {
    next();
    return;
  }

  // Mobile app auth: accept staff bearer token from /staff/login
  const staffId = parseStaffBearerToken(req.headers.authorization);
  if (staffId != null) {
    (req as Request & { staffId?: number }).staffId = staffId;
    next();
    return;
  }

  res.status(401).json({ error: "Authentication required" });
}
