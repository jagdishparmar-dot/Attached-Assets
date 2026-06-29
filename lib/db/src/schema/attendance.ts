import { pgTable, text, serial, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  status: text("status").notNull().default("absent"), // present | absent | late | half_day
  checkIn: text("check_in"),    // ISO timestamp string
  checkOut: text("check_out"),  // ISO timestamp string
  checkInLat: real("check_in_lat"),
  checkInLng: real("check_in_lng"),
  checkOutLat: real("check_out_lat"),
  checkOutLng: real("check_out_lng"),
  withinGeofence: boolean("within_geofence"),
  geofenceDistance: real("geofence_distance"), // metres from hub
  workingHours: text("working_hours"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAttendanceSchema = createInsertSchema(attendanceRecords).omit({ id: true, createdAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type AttendanceRow = typeof attendanceRecords.$inferSelect;
