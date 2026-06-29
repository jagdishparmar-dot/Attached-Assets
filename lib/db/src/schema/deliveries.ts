import { pgTable, text, serial, integer, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveriesTable = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  deliveryNumber: text("delivery_number").notNull().unique(),
  orderNumber: text("order_number").notNull(),
  invoiceNumber: text("invoice_number"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("normal"),
  customerId: integer("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryArea: text("delivery_area"),
  deliveryCity: text("delivery_city").notNull(),
  deliveryDate: date("delivery_date", { mode: "string" }).notNull(),
  deliveryWindow: text("delivery_window").notNull(),
  totalWeight: text("total_weight").notNull().default("0 kg"),
  specialHandling: text("special_handling"),
  remarks: text("remarks"),
  products: jsonb("products").notNull().default([]),
  assignedDriverId: integer("assigned_driver_id"),
  assignedDriverName: text("assigned_driver_name"),
  assignedVehicleId: integer("assigned_vehicle_id"),
  assignedVehicleNumber: text("assigned_vehicle_number"),
  failureReason: text("failure_reason"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;
