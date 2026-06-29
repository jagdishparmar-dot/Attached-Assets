import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const driversTable = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  employeeId: text("employee_id").notNull().unique(),
  phone: text("phone").notNull(),
  licenseNumber: text("license_number").notNull(),
  licenseExpiry: date("license_expiry", { mode: "string" }),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  aadhaarNumber: text("aadhaar_number"),
  panNumber: text("pan_number"),
  hub: text("hub").notNull(),
  status: text("status").notNull().default("active"),
  joiningDate: date("joining_date", { mode: "string" }).notNull(),
  currentVehicleId: integer("current_vehicle_id"),
  deliveriesToday: integer("deliveries_today").notNull().default(0),
  deliveriesTotal: integer("deliveries_total").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof driversTable.$inferSelect;
