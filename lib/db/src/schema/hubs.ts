import { pgTable, text, serial, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hubsTable = pgTable("hubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  radiusMeters: integer("radius_meters").notNull().default(200),
});

export const insertHubSchema = createInsertSchema(hubsTable).omit({ id: true });
export type InsertHub = z.infer<typeof insertHubSchema>;
export type HubRow = typeof hubsTable.$inferSelect;
