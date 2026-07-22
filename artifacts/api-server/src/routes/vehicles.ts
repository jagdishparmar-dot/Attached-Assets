import { Router, type IRouter } from "express";
import { eq, and, or, ilike, asc, count } from "drizzle-orm";
import { db, vehiclesTable, driversTable } from "@workspace/db";
import { CreateVehicleBody, UpdateVehicleBody, UpdateVehicleParams } from "@workspace/api-zod";
import { parsePagination, toPaginated } from "../lib/pagination";

const router: IRouter = Router();

function formatVehicle(v: typeof vehiclesTable.$inferSelect, driverName?: string | null) {
  return {
    id: v.id,
    vehicleNumber: v.vehicleNumber,
    vehicleType: v.vehicleType,
    capacity: v.capacity,
    fuelType: v.fuelType,
    gpsDeviceId: v.gpsDeviceId ?? null,
    insuranceExpiry: v.insuranceExpiry ?? null,
    fitnessExpiry: v.fitnessExpiry ?? null,
    rcExpiry: v.rcExpiry ?? null,
    pucExpiry: v.pucExpiry ?? null,
    status: v.status,
    currentDriverId: v.currentDriverId ?? null,
    currentDriverName: driverName ?? null,
  };
}

router.get("/vehicles", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const pagination = parsePagination(req.query as Record<string, unknown>);

  const conditions = [];
  if (status) conditions.push(eq(vehiclesTable.status, status));
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(vehiclesTable.vehicleNumber, pattern),
        ilike(vehiclesTable.vehicleType, pattern),
        ilike(vehiclesTable.gpsDeviceId, pattern),
      )!,
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const drivers = await db.select().from(driversTable);
  const driverMap = new Map(drivers.map((d) => [d.id, d.name]));

  if (!pagination.paginate) {
    const vehicles = await db.select().from(vehiclesTable).where(whereClause).orderBy(asc(vehiclesTable.vehicleNumber));
    res.json(vehicles.map((v) => formatVehicle(v, v.currentDriverId ? driverMap.get(v.currentDriverId) : null)));
    return;
  }

  const [totalRow] = await db.select({ value: count() }).from(vehiclesTable).where(whereClause);
  const total = Number(totalRow?.value ?? 0);
  const rows = await db
    .select()
    .from(vehiclesTable)
    .where(whereClause)
    .orderBy(asc(vehiclesTable.vehicleNumber))
    .limit(pagination.pageSize)
    .offset(pagination.offset);

  res.json(
    toPaginated(
      rows.map((v) => formatVehicle(v, v.currentDriverId ? driverMap.get(v.currentDriverId) : null)),
      total,
      pagination.page,
      pagination.pageSize,
    ),
  );
});

router.post("/vehicles", async (req, res): Promise<void> => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [vehicle] = await db.insert(vehiclesTable).values(parsed.data).returning();
  res.status(201).json(formatVehicle(vehicle));
});

router.patch("/vehicles/:id", async (req, res): Promise<void> => {
  const params = UpdateVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const parsed = UpdateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [vehicle] = await db
    .update(vehiclesTable)
    .set(parsed.data)
    .where(eq(vehiclesTable.id, params.data.id))
    .returning();

  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  const driverName = vehicle.currentDriverId
    ? (await db.select().from(driversTable).where(eq(driversTable.id, vehicle.currentDriverId)))[0]?.name ?? null
    : null;

  res.json(formatVehicle(vehicle, driverName));
});

export default router;
