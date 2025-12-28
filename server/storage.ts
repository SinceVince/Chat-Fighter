import { db } from "./db";
import {
  fighters,
  type Fighter,
  type InsertFighter,
  type FighterResponse,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getFighters(): Promise<FighterResponse[]>;
  createFighter(fighter: InsertFighter): Promise<FighterResponse>;
  deleteFighter(id: number): Promise<void>;
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
}

export const storage = new DatabaseStorage();
