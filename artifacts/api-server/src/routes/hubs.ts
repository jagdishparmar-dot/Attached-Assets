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

// PATCH /hubs/:id
router.patch("/hubs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { name, city, address, lat, lng, radiusMeters } = req.body as {
    name?: string; city?: string; address?: string | null;
    lat?: number; lng?: number; radiusMeters?: number;
  };

  const updates: Partial<typeof hubsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (city !== undefined) updates.city = city;
  if (address !== undefined) updates.address = address;
  if (lat !== undefined) updates.lat = lat;
  if (lng !== undefined) updates.lng = lng;
  if (radiusMeters !== undefined) updates.radiusMeters = radiusMeters;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const [row] = await db.update(hubsTable).set(updates).where(eq(hubsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Hub not found" });
  return res.json(row);
});

export default router;
