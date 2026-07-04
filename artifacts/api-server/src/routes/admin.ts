import { Router } from "express";
import { db } from "@workspace/db";
import { staffTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { AdminLoginBody } from "@workspace/api-zod";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  parseAdminSessionToken,
  toAdminUser,
} from "../lib/admin-session";

const router = Router();
const ADMIN_ROLES = new Set(["supervisor"]);

function toAdminFromRow(row: typeof staffTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    employeeId: row.employeeId,
    role: row.role,
    phone: row.phone,
    hub: row.hub,
  };
}

router.post("/admin/login", async (req, res) => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "phone and password required" });
  }

  const { phone, password } = parsed.data;
  const [row] = await db
    .select()
    .from(staffTable)
    .where(eq(staffTable.phone, phone));

  if (!row || row.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (row.status !== "active") {
    return res.status(403).json({ error: "Account is inactive" });
  }

  if (!ADMIN_ROLES.has(row.role)) {
    return res.status(403).json({ error: "Not authorized for admin access" });
  }

  const token = createAdminSessionToken({
    staffId: row.id,
    name: row.name,
    employeeId: row.employeeId,
    role: row.role,
    phone: row.phone,
    hub: row.hub,
  });

  res.cookie(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions());
  return res.json({ admin: toAdminFromRow(row) });
});

router.post("/admin/logout", (_req, res) => {
  res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
  return res.status(204).send();
});

router.get("/admin/me", (req, res) => {
  const session = parseAdminSessionToken(req.cookies?.[ADMIN_SESSION_COOKIE]);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.json(toAdminUser(session));
});

export default router;
