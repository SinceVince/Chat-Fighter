import { db } from "./db";
import {
  fighters,
  streamSelections,
  type Fighter,
  type InsertFighter,
  type FighterResponse,
  type StreamSelection,
  type InsertSelection,
  type SelectionResponse,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getFighters(): Promise<FighterResponse[]>;
  createFighter(fighter: InsertFighter): Promise<FighterResponse>;
  deleteFighter(id: number): Promise<void>;
  saveSelection(channel: string, p1FighterId: number | null, p2FighterId: number | null): Promise<SelectionResponse>;
  getSelection(channel: string): Promise<SelectionResponse | null>;
}

export class DatabaseStorage implements IStorage {
  async getFighters(): Promise<FighterResponse[]> {
    return await db.select().from(fighters);
  }

  async createFighter(insertFighter: InsertFighter): Promise<FighterResponse> {
    const [fighter] = await db
      .insert(fighters)
      .values(insertFighter)
      .returning();
    return fighter;
  }

  async deleteFighter(id: number): Promise<void> {
    await db.delete(fighters).where(eq(fighters.id, id));
  }

  async saveSelection(channel: string, p1FighterId: number | null, p2FighterId: number | null): Promise<SelectionResponse> {
    const existing = await db
      .select()
      .from(streamSelections)
      .where(eq(streamSelections.channel, channel));

    if (existing.length > 0) {
      const [updated] = await db
        .update(streamSelections)
        .set({ p1FighterId, p2FighterId, updatedAt: new Date() })
        .where(eq(streamSelections.channel, channel))
        .returning();
      return await this.enrichSelection(updated);
    } else {
      const [created] = await db
        .insert(streamSelections)
        .values({ channel, p1FighterId, p2FighterId, updatedAt: new Date() })
        .returning();
      return await this.enrichSelection(created);
    }
  }

  async getSelection(channel: string): Promise<SelectionResponse | null> {
    const result = await db
      .select()
      .from(streamSelections)
      .where(eq(streamSelections.channel, channel));

    if (result.length === 0) return null;
    return await this.enrichSelection(result[0]);
  }

  private async enrichSelection(selection: StreamSelection): Promise<SelectionResponse> {
    let p1Fighter: Fighter | undefined;
    let p2Fighter: Fighter | undefined;

    if (selection.p1FighterId) {
      const fighters_result = await db
        .select()
        .from(fighters)
        .where(eq(fighters.id, selection.p1FighterId));
      p1Fighter = fighters_result[0];
    }

    if (selection.p2FighterId) {
      const fighters_result = await db
        .select()
        .from(fighters)
        .where(eq(fighters.id, selection.p2FighterId));
      p2Fighter = fighters_result[0];
    }

    return { ...selection, p1Fighter, p2Fighter };
  }
}

export const storage = new DatabaseStorage();
