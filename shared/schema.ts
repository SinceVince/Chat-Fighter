import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const fighters = pgTable("fighters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
});

export const streamSelections = pgTable("stream_selections", {
  id: serial("id").primaryKey(),
  channel: text("channel").notNull().unique(),
  p1FighterId: integer("p1_fighter_id"),
  p2FighterId: integer("p2_fighter_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFighterSchema = createInsertSchema(fighters).omit({ id: true });
export const insertSelectionSchema = createInsertSchema(streamSelections).omit({ id: true });

export type Fighter = typeof fighters.$inferSelect;
export type InsertFighter = z.infer<typeof insertFighterSchema>;
export type StreamSelection = typeof streamSelections.$inferSelect;
export type InsertSelection = z.infer<typeof insertSelectionSchema>;

export type FighterResponse = Fighter;
export type FightersListResponse = Fighter[];
export type SelectionResponse = StreamSelection & {
  p1Fighter?: Fighter;
  p2Fighter?: Fighter;
};
