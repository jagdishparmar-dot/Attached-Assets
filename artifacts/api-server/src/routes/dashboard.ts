import { Router, type IRouter } from "express";
import { eq, count, and, isNotNull } from "drizzle-orm";
import {
  db,
  driversTable,
  vehiclesTable,
  customersTable,
  deliveriesTable,
  activityTable,
  staffTable,
  attendanceRecords,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  const [
    totalDeliveries,
    pendingDeliveries,
    assignedDeliveries,
    inTransitDeliveries,
    deliveredToday,
    failedToday,
    totalDrivers,
    activeDrivers,
    totalVehicles,
    availableVehicles,
    totalCustomers,
    allStaffRows,
  ] = await Promise.all([
    db.select({ count: count() }).from(deliveriesTable),
    db.select({ count: count() }).from(deliveriesTable).where(eq(deliveriesTable.status, "pending")),
    db.select({ count: count() }).from(deliveriesTable).where(eq(deliveriesTable.status, "assigned")),
    db.select({ count: count() }).from(deliveriesTable).where(eq(deliveriesTable.status, "in_transit")),
    db.select({ count: count() }).from(deliveriesTable).where(
      and(eq(deliveriesTable.status, "delivered"), eq(deliveriesTable.deliveryDate, date))
    ),
    db.select({ count: count() }).from(deliveriesTable).where(
      and(eq(deliveriesTable.status, "failed"), eq(deliveriesTable.deliveryDate, date))
    ),
    db.select({ count: count() }).from(driversTable),
    db.select({ count: count() }).from(driversTable).where(eq(driversTable.status, "active")),
    db.select({ count: count() }).from(vehiclesTable),
    db.select({ count: count() }).from(vehiclesTable).where(eq(vehiclesTable.status, "available")),
    db.select({ count: count() }).from(customersTable),
    db.select({ count: count() }).from(staffTable).where(eq(staffTable.status, "active")),
  ]);

  const attendanceRows = await db
    .select()
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.date, date), isNotNull(attendanceRecords.checkIn)));
  const staffPresent = attendanceRows.length;
  const totalStaff = Number(allStaffRows[0]?.count ?? 0);
  const staffAbsent = Math.max(0, totalStaff - staffPresent);

  const deliveredRows = await db
    .select({ products: deliveriesTable.products })
    .from(deliveriesTable)
    .where(and(eq(deliveriesTable.status, "delivered"), eq(deliveriesTable.deliveryDate, date)));

  const totalDeliveredValue = deliveredRows.reduce((sum, row) => {
    const prods = (row.products as Array<{ quantity?: number; amount?: number }>) ?? [];
    return sum + prods.reduce((s, p) => s + (p.quantity ?? 0) * (p.amount ?? 0), 0);
  }, 0);

  res.json({
    totalDeliveries: Number(totalDeliveries[0]?.count ?? 0),
    pendingDeliveries: Number(pendingDeliveries[0]?.count ?? 0),
    assignedDeliveries: Number(assignedDeliveries[0]?.count ?? 0),
    inTransitDeliveries: Number(inTransitDeliveries[0]?.count ?? 0),
    deliveredToday: Number(deliveredToday[0]?.count ?? 0),
    failedToday: Number(failedToday[0]?.count ?? 0),
    totalDrivers: Number(totalDrivers[0]?.count ?? 0),
    activeDrivers: Number(activeDrivers[0]?.count ?? 0),
    totalVehicles: Number(totalVehicles[0]?.count ?? 0),
    availableVehicles: Number(availableVehicles[0]?.count ?? 0),
    totalCustomers: Number(totalCustomers[0]?.count ?? 0),
    staffPresent,
    staffAbsent,
    totalDeliveredValue,
  });
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const items = await db
    .select()
    .from(activityTable)
    .orderBy(activityTable.createdAt)
    .limit(20);

  res.json(
    items.reverse().map((item) => ({
      id: item.id,
      type: item.type,
      message: item.message,
      time: item.createdAt.toISOString(),
      status: item.status,
      deliveryNumber: item.deliveryNumber,
      driverName: item.driverName,
    }))
  );
});

export default router;
