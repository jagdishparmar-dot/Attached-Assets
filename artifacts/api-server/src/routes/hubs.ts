import { Router } from "express";
import { db } from "@workspace/db";
import { hubsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /hubs
router.get("/hubs", async (_req, res) => {
  const rows = await db.select().from(hubsTable);
  return res.json(rows);
});

// POST /hubs
router.post("/hubs", async (req, res) => {
  const { name, city, address, lat, lng, radiusMeters } = req.body as {
    name: string; city: string; address?: string; lat: number; lng: number; radiusMeters: number;
  };
  if (!name || !city || lat == null || lng == null || !radiusMeters) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const [row] = await db.insert(hubsTable).values({
    name, city, address: address ?? null, lat, lng, radiusMeters,
  }).returning();
  return res.status(201).json(row);
});

export default router;
