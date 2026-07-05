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
  if (!session) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  next();
}
