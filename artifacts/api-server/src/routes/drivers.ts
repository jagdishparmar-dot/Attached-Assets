import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, driversTable, staffTable } from "@workspace/db";
import {
  CreateDriverBody,
  UpdateDriverBody,
  GetDriverParams,
  UpdateDriverParams,
  ListDriversQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/drivers", async (req, res): Promise<void> => {
  const query = ListDriversQueryParams.safeParse(req.query);
  const drivers = await db.select().from(driversTable).orderBy(driversTable.name);

  let result = drivers;
  if (query.success && query.data.status) {
    result = drivers.filter((d) => d.status === query.data.status);
  }

  res.json(result.map((d) => ({
    id: d.id,
    name: d.name,
    employeeId: d.employeeId,
    phone: d.phone,
    licenseNumber: d.licenseNumber,
    licenseExpiry: d.licenseExpiry ?? null,
    address: d.address ?? null,
    emergencyContact: d.emergencyContact ?? null,
    aadhaarNumber: d.aadhaarNumber ?? null,
    panNumber: d.panNumber ?? null,
    hub: d.hub,
    status: d.status,
    joiningDate: d.joiningDate,
    currentVehicleId: d.currentVehicleId ?? null,
    deliveriesToday: d.deliveriesToday,
    deliveriesTotal: d.deliveriesTotal,
  })));
});

router.post("/drivers", async (req, res): Promise<void> => {
  const parsed = CreateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Insert the driver and mirror it into the workforce (staff) table atomically
  // so a driver added under Operations also shows under Workforce > Staff.
  // Mirrored drivers can log in to the mobile app with the default password.
  const driver = await db.transaction(async (tx) => {
    const [d] = await tx.insert(driversTable).values(parsed.data).returning();
    await tx
      .insert(staffTable)
      .values({
        name: d.name,
        employeeId: d.employeeId,
        role: "driver",
        phone: d.phone,
        hub: d.hub,
        joiningDate: d.joiningDate,
        password: "cold@123",
        address: d.address ?? null,
        emergencyContact: d.emergencyContact ?? null,
        aadhaarNumber: d.aadhaarNumber ?? null,
        panNumber: d.panNumber ?? null,
        licenseNumber: d.licenseNumber ?? null,
        licenseExpiry: d.licenseExpiry ?? null,
        status: d.status,
      })
      .onConflictDoNothing({ target: staffTable.employeeId });
    return d;
  });

  res.status(201).json({
    id: driver.id,
    name: driver.name,
    employeeId: driver.employeeId,
    phone: driver.phone,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry ?? null,
    address: driver.address ?? null,
    emergencyContact: driver.emergencyContact ?? null,
    aadhaarNumber: driver.aadhaarNumber ?? null,
    panNumber: driver.panNumber ?? null,
    hub: driver.hub,
    status: driver.status,
    joiningDate: driver.joiningDate,
    currentVehicleId: driver.currentVehicleId ?? null,
    deliveriesToday: driver.deliveriesToday,
    deliveriesTotal: driver.deliveriesTotal,
  });
});

router.get("/drivers/:id", async (req, res): Promise<void> => {
  const params = GetDriverParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, params.data.id));
  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  res.json({
    id: driver.id,
    name: driver.name,
    employeeId: driver.employeeId,
    phone: driver.phone,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry ?? null,
    address: driver.address ?? null,
    emergencyContact: driver.emergencyContact ?? null,
    aadhaarNumber: driver.aadhaarNumber ?? null,
    panNumber: driver.panNumber ?? null,
    hub: driver.hub,
    status: driver.status,
    joiningDate: driver.joiningDate,
    currentVehicleId: driver.currentVehicleId ?? null,
    deliveriesToday: driver.deliveriesToday,
    deliveriesTotal: driver.deliveriesTotal,
  });
});

router.patch("/drivers/:id", async (req, res): Promise<void> => {
  const params = UpdateDriverParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const parsed = UpdateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const driver = await db.transaction(async (tx) => {
    const [d] = await tx
      .update(driversTable)
      .set(parsed.data)
      .where(eq(driversTable.id, params.data.id))
      .returning();

    if (!d) return undefined;

    // Keep the mirrored workforce (staff) record in sync with driver edits.
    await tx
      .update(staffTable)
      .set({
        name: d.name,
        phone: d.phone,
        hub: d.hub,
        status: d.status,
        address: d.address ?? null,
        emergencyContact: d.emergencyContact ?? null,
        aadhaarNumber: d.aadhaarNumber ?? null,
        panNumber: d.panNumber ?? null,
        licenseNumber: d.licenseNumber ?? null,
        licenseExpiry: d.licenseExpiry ?? null,
      })
      .where(eq(staffTable.employeeId, d.employeeId));

    return d;
  });

  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  res.json({
    id: driver.id,
    name: driver.name,
    employeeId: driver.employeeId,
    phone: driver.phone,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry ?? null,
    address: driver.address ?? null,
    emergencyContact: driver.emergencyContact ?? null,
    aadhaarNumber: driver.aadhaarNumber ?? null,
    panNumber: driver.panNumber ?? null,
    hub: driver.hub,
    status: driver.status,
    joiningDate: driver.joiningDate,
    currentVehicleId: driver.currentVehicleId ?? null,
    deliveriesToday: driver.deliveriesToday,
    deliveriesTotal: driver.deliveriesTotal,
  });
});

export default router;
