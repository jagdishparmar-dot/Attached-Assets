import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vehiclesTable = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull().unique(),
  vehicleType: text("vehicle_type").notNull(),
  capacity: text("capacity").notNull(),
  fuelType: text("fuel_type").notNull(),
  gpsDeviceId: text("gps_device_id"),
  insuranceExpiry: date("insurance_expiry", { mode: "string" }),
  fitnessExpiry: date("fitness_expiry", { mode: "string" }),
  rcExpiry: date("rc_expiry", { mode: "string" }),
  pucExpiry: date("puc_expiry", { mode: "string" }),
  status: text("status").notNull().default("available"),
  currentDriverId: integer("current_driver_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;
