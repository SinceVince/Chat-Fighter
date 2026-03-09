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

  // Selection endpoints for TTS bot integration
  app.post("/api/selections/:channel", async (req, res) => {
    try {
      const { channel } = req.params;
      const { p1FighterId, p2FighterId } = req.body;
      const selection = await storage.saveSelection(
        channel,
        p1FighterId ? Number(p1FighterId) : null,
        p2FighterId ? Number(p2FighterId) : null
      );
      res.json(selection);
    } catch (err) {
      res.status(500).json({ message: "Failed to save selection" });
    }
  });

  app.get("/api/selections/:channel", async (req, res) => {
    try {
      const { channel } = req.params;
      const selection = await storage.getSelection(channel);
      if (!selection) {
        return res.status(404).json({ message: "No selection found for channel" });
      }
      res.json(selection);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch selection" });
    }
  });

  // Seed data if empty
  const existing = await storage.getFighters();
  if (existing.length === 0 || existing.some(f => f.imageUrl.includes('discordapp'))) {
    // Clear existing if they have broken discord links
    if (existing.length > 0) {
      for (const f of existing) {
        await storage.deleteFighter(f.id);
      }
    }
    const seedFighters = [
      { name: "Ashcoat", imageUrl: "/images/ashcoat.png", description: "Ready to fight." },
      { name: "Astronaut Teemo", imageUrl: "/images/asto.png", description: "From the stars." },
      { name: "Astronaut Kennen", imageUrl: "/images/astro.png", description: "Lightning in space." },
      { name: "Azure Beastbinder", imageUrl: "/images/azure.png", description: "Beast master." },
      { name: "Badger Teemo", imageUrl: "/images/badger.png", description: "Aggressive scout." },
      { name: "Bloodmoon Kennen", imageUrl: "/images/bloodmoon.png", description: "Crimson fury." },
      { name: "Cheddar Chief Twitch", imageUrl: "/images/cheddar.png", description: "Cheese master." },
      { name: "Cheeky House Mouse", imageUrl: "/images/cheeky.png", description: "Mischievous rogue." },
      { name: "Coda", imageUrl: "/images/coda.png", description: "The final note." },
      { name: "Cottonball Teemo", imageUrl: "/images/cotton.png", description: "Soft but deadly." },
      { name: "Cruelclaw", imageUrl: "/images/cruel.png", description: "Vicious hunter." },
      { name: "Devil Teemo", imageUrl: "/images/devil.png", description: "Pure evil." },
      { name: "Dragaux", imageUrl: "/images/drag.png", description: "Dragon warrior." },
      { name: "Dragonslayer Twitch", imageUrl: "/images/dragonslay.png", description: "Slayer of dragons." },
      { name: "Happy Elf Teemo", imageUrl: "/images/elf.png", description: "Jolly adventurer." },
      { name: "Firecracker Teemo", imageUrl: "/images/firecracker.png", description: "Explosive personality." },
      { name: "Gangster Twitch", imageUrl: "/images/gang.png", description: "Crime lord." },
      { name: "Goodra", imageUrl: "/images/goodra.png", description: "Gentle giant." },
      { name: "Resourceful Rat", imageUrl: "/images/gungrat.png", description: "Tactical survivor." },
      { name: "High Noon Twitch", imageUrl: "/images/highnoon.png", description: "Western outlaw." },
      { name: "Hisuian Zoroark", imageUrl: "/images/hisuian.png", description: "Ancient phantom." },
      { name: "Howitzer", imageUrl: "/images/howitzer.png", description: "Explosive weapon." },
      { name: "Ice King Twitch", imageUrl: "/images/iceking.png", description: "Frozen monarch." },
      { name: "Infernal Kennen", imageUrl: "/images/infernal.png", description: "Hell's fury." },
      { name: "Kennen", imageUrl: "/images/kennen.png", description: "Heart of tempest." },
      { name: "Kingpin Twitch", imageUrl: "/images/kingpin.png", description: "Underworld boss." },
      { name: "Koraidon", imageUrl: "/images/koraidon.png", description: "Legendary beast." },
      { name: "Medieval Twitch", imageUrl: "/images/medieval.png", description: "Knight of old." },
      { name: "Mind Drill Assailant", imageUrl: "/images/minddrill.png", description: "Psychic terror." },
      { name: "Fortissmole 1", imageUrl: "/images/mole.png", description: "Underground dweller." },
      { name: "Fortissmole 2", imageUrl: "/images/mole2.png", description: "Subterranean twin." },
      { name: "Nashi", imageUrl: "/images/nashi.png", description: "Water warrior." },
      { name: "Omega Squad Teemo", imageUrl: "/images/omega.png", description: "Elite soldier." },
      { name: "Omega Squad Twitch", imageUrl: "/images/omegatwitch.png", description: "Tactical operative." },
      { name: "Pickpocket Twitch", imageUrl: "/images/pickpocket.png", description: "Master thief." },
      { name: "Pikachu", imageUrl: "/images/pika.png", description: "Electric mouse." },
      { name: "Plague Rat Twitch", imageUrl: "/images/plague.png", description: "Pestilent scourge." },
      { name: "Prestige Spirit Blossom Teemo", imageUrl: "/images/prestige.png", description: "Ethereal guardian." },
      { name: "Rats", imageUrl: "/images/ratsjacket.png", description: "Swarm master." },
      { name: "Recon Teemo", imageUrl: "/images/recon.png", description: "Scout specialist." },
      { name: "Shadowfoot Twitch", imageUrl: "/images/shadowfoot.png", description: "Silent assassin." },
      { name: "Shoreline Looter", imageUrl: "/images/shore.png", description: "Beach pirate." },
      { name: "Space Groove Teemo", imageUrl: "/images/space.png", description: "Cosmic dancer." },
      { name: "Spirit Blossom Teemo", imageUrl: "/images/spirit.png", description: "Spiritual essence." },
      { name: "SSW Twitch", imageUrl: "/images/ssw.png", description: "Tournament champion." },
      { name: "Teemo", imageUrl: "/images/teemo.png", description: "Scout extraordinaire." },
      { name: "Vandal Twitch", imageUrl: "/images/vandal.png", description: "Rebel fighter." },
      { name: "Vren The Relentless", imageUrl: "/images/vren.png", description: "Unstoppable force." },
      { name: "Whistler Village Twitch", imageUrl: "/images/whistle.png", description: "Mountain explorer." },
      { name: "Zarus", imageUrl: "/images/zarus.png", description: "Ancient ruler." },
      { name: "Zoroark", imageUrl: "/images/zoroark.png", description: "Master illusionist." },
    ];
    for (const f of seedFighters) {
      await storage.createFighter(f);
    }
  }

  return httpServer;
}
