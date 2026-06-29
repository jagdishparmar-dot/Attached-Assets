import { pgTable, serial, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// One row per staff member — upserted on each GPS ping
export const staffLocations = pgTable("staff_locations", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().unique(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  accuracy: real("accuracy"),
  speed: real("speed"),
  heading: real("heading"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLocationSchema = createInsertSchema(staffLocations).omit({ id: true });
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type LocationRow = typeof staffLocations.$inferSelect;
