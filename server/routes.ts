import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.fighters.list.path, async (req, res) => {
    const fighters = await storage.getFighters();
    res.json(fighters);
  });

  app.post(api.fighters.create.path, async (req, res) => {
    try {
      const input = api.fighters.create.input.parse(req.body);
      const fighter = await storage.createFighter(input);
      res.status(201).json(fighter);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.fighters.delete.path, async (req, res) => {
    await storage.deleteFighter(Number(req.params.id));
    res.status(204).send();
  });

  // Seed data if empty
  const existing = await storage.getFighters();
  if (existing.length === 0) {
    const seedFighters = [
      { name: "Ryu", imageUrl: "https://upload.wikimedia.org/wikipedia/en/e/e5/Ryu_TvC.png", description: "The wandering warrior." },
      { name: "Ken", imageUrl: "https://upload.wikimedia.org/wikipedia/en/1/1b/Ken_Masters.png", description: "The fiery rival." },
      { name: "Chun-Li", imageUrl: "https://upload.wikimedia.org/wikipedia/en/1/12/Chun-Li_%28Street_Fighter_6%29.png", description: "The strongest woman in the world." },
      { name: "Guile", imageUrl: "https://upload.wikimedia.org/wikipedia/en/1/10/Guile_%28Street_Fighter%29.png", description: "Sonic Boom!" },
      { name: "Zangief", imageUrl: "https://upload.wikimedia.org/wikipedia/en/8/87/Zangief_%28Street_Fighter%29.png", description: "The Red Cyclone." },
      { name: "Dhalsim", imageUrl: "https://upload.wikimedia.org/wikipedia/en/e/e6/Dhalsim.png", description: "Yoga Flame!" },
      { name: "Blanka", imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c5/Blanka_SF6.png", description: "Electric beast." },
      { name: "E. Honda", imageUrl: "https://upload.wikimedia.org/wikipedia/en/a/a6/E._Honda.png", description: "Sumo wrestler." },
    ];
    for (const f of seedFighters) {
      await storage.createFighter(f);
    }
  }

  return httpServer;
}
