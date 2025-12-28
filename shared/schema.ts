import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const fighters = pgTable("fighters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
});

export const insertFighterSchema = createInsertSchema(fighters).omit({ id: true });

export type Fighter = typeof fighters.$inferSelect;
export type InsertFighter = z.infer<typeof insertFighterSchema>;

export type FighterResponse = Fighter;
export type FightersListResponse = Fighter[];
