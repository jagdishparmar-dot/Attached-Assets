import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, deliveriesTable, customersTable, driversTable, vehiclesTable, activityTable } from "@workspace/db";
import {
  CreateDeliveryBody,
  UpdateDeliveryBody,
  GetDeliveryParams,
  UpdateDeliveryParams,
  DeleteDeliveryParams,
  ListDeliveriesQueryParams,
  BulkCreateDeliveriesBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getNextDeliveryNumber(): Promise<string> {
  const date = new Date();
  const yyyymmdd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const prefix = `CV-DEL-${yyyymmdd}-`;
  // Derive the next sequence from existing numbers so it survives restarts and
  // stays unique within a bulk loop (each prior insert is reflected here).
  const existing = await db.select({ deliveryNumber: deliveriesTable.deliveryNumber }).from(deliveriesTable);
  let max = 0;
  for (const r of existing) {
    if (r.deliveryNumber.startsWith(prefix)) {
      const seq = parseInt(r.deliveryNumber.slice(prefix.length), 10);
      if (Number.isInteger(seq) && seq > max) max = seq;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function formatDelivery(d: typeof deliveriesTable.$inferSelect) {
  return {
    id: d.id,
    deliveryNumber: d.deliveryNumber,
    orderNumber: d.orderNumber,
    invoiceNumber: d.invoiceNumber ?? null,
    status: d.status,
    priority: d.priority,
    customerId: d.customerId,
    customerName: d.customerName,
    customerPhone: d.customerPhone ?? null,
    deliveryAddress: d.deliveryAddress,
    deliveryArea: d.deliveryArea ?? null,
    deliveryCity: d.deliveryCity,
    deliveryDate: d.deliveryDate,
    deliveryWindow: d.deliveryWindow,
    totalWeight: d.totalWeight,
    specialHandling: d.specialHandling ?? null,
    remarks: d.remarks ?? null,
    products: (d.products as Array<{ name: string; quantity: number; weight?: string; temperature?: string; amount?: number | null }>) ?? [],
    assignedDriverId: d.assignedDriverId ?? null,
    assignedDriverName: d.assignedDriverName ?? null,
    assignedVehicleId: d.assignedVehicleId ?? null,
    assignedVehicleNumber: d.assignedVehicleNumber ?? null,
    failureReason: d.failureReason ?? null,
    completedAt: d.completedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  };
}

router.get("/deliveries/next-dc-number", async (req, res): Promise<void> => {
  const all = await db.select({ id: deliveriesTable.id }).from(deliveriesTable);
  const year = new Date().getFullYear();
  const seq = String(all.length + 1).padStart(4, "0");
  res.json({ orderNumber: `DC-${year}-${seq}` });
});

router.get("/deliveries", async (req, res): Promise<void> => {
  const query = ListDeliveriesQueryParams.safeParse(req.query);
  let deliveries = await db.select().from(deliveriesTable).orderBy(deliveriesTable.createdAt);

  if (query.success) {
    if (query.data.status) {
      deliveries = deliveries.filter((d) => d.status === query.data.status);
    }
    if (query.data.date) {
      deliveries = deliveries.filter((d) => d.deliveryDate === query.data.date);
    }
  }

  res.json(deliveries.reverse().map(formatDelivery));
});

router.post("/deliveries", async (req, res): Promise<void> => {
  const parsed = CreateDeliveryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const customer = parsed.data.customerId
    ? await db.select().from(customersTable).where(eq(customersTable.id, parsed.data.customerId)).then((r) => r[0])
    : null;

  const deliveryNumber = await getNextDeliveryNumber();

  const totalWeight = Array.isArray(parsed.data.products)
    ? `${parsed.data.products.reduce((sum: number, p: { quantity: number }) => sum + p.quantity, 0)} units`
    : "0 units";

  const [delivery] = await db
    .insert(deliveriesTable)
    .values({
      deliveryNumber,
      orderNumber: parsed.data.orderNumber,
      invoiceNumber: parsed.data.invoiceNumber ?? null,
      status: "pending",
      priority: parsed.data.priority,
      customerId: parsed.data.customerId,
      customerName: customer?.companyName ?? "Unknown",
      customerPhone: customer?.phone ?? null,
      deliveryAddress: parsed.data.deliveryAddress,
      deliveryArea: parsed.data.deliveryArea ?? null,
      deliveryCity: parsed.data.deliveryCity,
      deliveryDate: parsed.data.deliveryDate,
      deliveryWindow: parsed.data.deliveryWindow,
      totalWeight,
      specialHandling: parsed.data.specialHandling ?? null,
      remarks: parsed.data.remarks ?? null,
      products: parsed.data.products ?? [],
    })
    .returning();

  await db.insert(activityTable).values({
    type: "delivery_created",
    message: `New delivery ${deliveryNumber} created for ${customer?.companyName ?? "Unknown"}`,
    status: "info",
    deliveryNumber,
    driverName: null,
  });

  if (customer) {
    await db
      .update(customersTable)
      .set({ totalDeliveries: (customer.totalDeliveries ?? 0) + 1 })
      .where(eq(customersTable.id, customer.id));
  }

  res.status(201).json(formatDelivery(delivery));
});

// POST /deliveries/bulk  (must be before /deliveries/:id)
router.post("/deliveries/bulk", async (req, res): Promise<void> => {
  const parsed = BulkCreateDeliveriesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const errors: { row: number; message: string }[] = [];
  let created = 0;

  for (let i = 0; i < parsed.data.deliveries.length; i++) {
    const d = parsed.data.deliveries[i];
    try {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, d.customerId));
      if (!customer) {
        errors.push({ row: i + 1, message: `Customer ID ${d.customerId} not found` });
        continue;
      }

      const totalWeight = Array.isArray(d.products)
        ? `${d.products.reduce((sum: number, p: { quantity: number }) => sum + p.quantity, 0)} units`
        : "0 units";

      // delivery_number is server-generated and is the only unique column. Under
      // concurrency two requests can compute the same next number, so run each row's
      // writes in one transaction and retry with a freshly generated number on a
      // unique-violation (a re-scan then reflects the other request's committed row).
      let attempt = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const deliveryNumber = await getNextDeliveryNumber();
        try {
          await db.transaction(async (tx) => {
            await tx.insert(deliveriesTable).values({
              deliveryNumber,
              orderNumber: d.orderNumber,
              invoiceNumber: d.invoiceNumber ?? null,
              status: "pending",
              priority: d.priority,
              customerId: d.customerId,
              customerName: customer.companyName,
              customerPhone: customer.phone ?? null,
              deliveryAddress: d.deliveryAddress,
              deliveryArea: d.deliveryArea ?? null,
              deliveryCity: d.deliveryCity,
              deliveryDate: d.deliveryDate,
              deliveryWindow: d.deliveryWindow,
              totalWeight,
              specialHandling: d.specialHandling ?? null,
              remarks: d.remarks ?? null,
              products: d.products ?? [],
            });

            await tx.insert(activityTable).values({
              type: "delivery_created",
              message: `New delivery ${deliveryNumber} created for ${customer.companyName}`,
              status: "info",
              deliveryNumber,
              driverName: null,
            });

            await tx
              .update(customersTable)
              .set({ totalDeliveries: sql`${customersTable.totalDeliveries} + 1` })
              .where(eq(customersTable.id, customer.id));
          });
          break;
        } catch (err) {
          const cause = err instanceof Error ? (err.cause as { code?: string; message?: string } | undefined) : undefined;
          const text = `${err instanceof Error ? err.message : ""} ${cause?.message ?? ""}`;
          const isDuplicate = cause?.code === "23505" || /unique|duplicate/i.test(text);
          if (isDuplicate && attempt < 5) {
            attempt++;
            continue;
          }
          throw err;
        }
      }

      created++;
    } catch {
      errors.push({ row: i + 1, message: "Could not import this row" });
    }
  }

  res.json({ created, failed: errors.length, errors });
});

router.get("/deliveries/:id", async (req, res): Promise<void> => {
  const params = GetDeliveryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, params.data.id));
  if (!delivery) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  res.json(formatDelivery(delivery));
});

router.patch("/deliveries/:id", async (req, res): Promise<void> => {
  const params = UpdateDeliveryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const parsed = UpdateDeliveryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  const updates: Partial<typeof deliveriesTable.$inferInsert> = {};

  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
  if (parsed.data.deliveryDate !== undefined) updates.deliveryDate = parsed.data.deliveryDate;
  if (parsed.data.deliveryWindow !== undefined) updates.deliveryWindow = parsed.data.deliveryWindow;
  if (parsed.data.remarks !== undefined) updates.remarks = parsed.data.remarks;
  if (parsed.data.failureReason !== undefined) updates.failureReason = parsed.data.failureReason;

  if (parsed.data.assignedDriverId !== undefined) {
    if (parsed.data.assignedDriverId === null) {
      updates.assignedDriverId = null;
      updates.assignedDriverName = null;
    } else {
      const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, parsed.data.assignedDriverId));
      if (driver) {
        updates.assignedDriverId = driver.id;
        updates.assignedDriverName = driver.name;
        if (updates.status === undefined && existing.status === "pending") {
          updates.status = "assigned";
        }
        await db.insert(activityTable).values({
          type: "driver_assigned",
          message: `Driver ${driver.name} assigned to delivery ${existing.deliveryNumber}`,
          status: "success",
          deliveryNumber: existing.deliveryNumber,
          driverName: driver.name,
        });
      }
    }
  }

  if (parsed.data.assignedVehicleId !== undefined) {
    if (parsed.data.assignedVehicleId === null) {
      updates.assignedVehicleId = null;
      updates.assignedVehicleNumber = null;
    } else {
      const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, parsed.data.assignedVehicleId));
      if (vehicle) {
        updates.assignedVehicleId = vehicle.id;
        updates.assignedVehicleNumber = vehicle.vehicleNumber;
        await db.insert(activityTable).values({
          type: "vehicle_assigned",
          message: `Vehicle ${vehicle.vehicleNumber} assigned to delivery ${existing.deliveryNumber}`,
          status: "success",
          deliveryNumber: existing.deliveryNumber,
          driverName: null,
        });
        await db.update(vehiclesTable).set({ status: "in_use", currentDriverId: updates.assignedDriverId ?? existing.assignedDriverId ?? null }).where(eq(vehiclesTable.id, vehicle.id));
      }
    }
  }

  if (parsed.data.status === "delivered") {
    updates.completedAt = new Date();
    await db.insert(activityTable).values({
      type: "delivery_completed",
      message: `Delivery ${existing.deliveryNumber} completed`,
      status: "success",
      deliveryNumber: existing.deliveryNumber,
      driverName: existing.assignedDriverName ?? null,
    });
  } else if (parsed.data.status === "failed") {
    await db.insert(activityTable).values({
      type: "delivery_failed",
      message: `Delivery ${existing.deliveryNumber} failed: ${parsed.data.failureReason ?? "No reason given"}`,
      status: "error",
      deliveryNumber: existing.deliveryNumber,
      driverName: existing.assignedDriverName ?? null,
    });
  }

  const [updated] = await db
    .update(deliveriesTable)
    .set(updates)
    .where(eq(deliveriesTable.id, params.data.id))
    .returning();

  res.json(formatDelivery(updated));
});

router.delete("/deliveries/:id", async (req, res): Promise<void> => {
  const params = DeleteDeliveryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [deleted] = await db.delete(deliveriesTable).where(eq(deliveriesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
