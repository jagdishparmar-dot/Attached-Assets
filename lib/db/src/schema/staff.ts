import { pgTable, text, serial, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const staffTable = pgTable("staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  employeeId: text("employee_id").notNull().unique(),
  role: text("role").notNull(), // driver | picker | sorter | loader | supervisor | security
  phone: text("phone").notNull(),
  hub: text("hub").notNull(),
  status: text("status").notNull().default("active"),
  password: text("password").notNull(),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  aadhaarNumber: text("aadhaar_number"),
  panNumber: text("pan_number"),
  licenseNumber: text("license_number"),
  licenseExpiry: text("license_expiry"),
  shiftStart: text("shift_start"),
  shiftEnd: text("shift_end"),
  joiningDate: text("joining_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStaffSchema = createInsertSchema(staffTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type StaffRow = typeof staffTable.$inferSelect;
