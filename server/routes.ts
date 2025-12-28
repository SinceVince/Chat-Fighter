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
      { name: "Ashcoat", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454808681081475217/ashcoat.png?ex=69526faa&is=69511e2a&hm=07da8a4050cd6931f40c202c9f9821ff623cced5426ad87e90d30a1405b87805&animated=true", description: "Ready to fight." },
      { name: "Astronaut Teemo", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454809396449378427/asto.png?ex=69527055&is=69511ed5&hm=2799f950e3e139ae21fe9d1261bbcd862ae7300786e8a2a61aab8612a34efaab&animated=true", description: "From the stars." },
      { name: "Astronaut Kennen", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454809396881395733/astro.png?ex=69527055&is=69511ed5&hm=d6f4e15551d3b4f9770b85ddb1a0b0b0365e1786b7fa375948afee003133bee1&animated=true", description: "Lightning in space." },
      { name: "Azure Beastbinder", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454809398122905620/azure.png?ex=69527055&is=69511ed5&hm=aed1a02a06a2d88488f8ef6e930923aa3026d26e58ce01b088f52e418a632e8f&animated=true", description: "Beast master." },
      { name: "Badger Teemo", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454809398777221228/badger.png?ex=69527055&is=69511ed5&hm=b9bf173f019dd36195ada84e9070046e5d8a9c34f2aa6be9992bea85bb0a746b&animated=true", description: "Aggressive scout." },
      { name: "Bloodmoon Kennen", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454809400081387614/bloodmoon.png?ex=69527056&is=69511ed6&hm=f8af4d5a102f7549260b180a14a7100321454df33e4d5f1340a7250af3c9cd5c&animated=true", description: "Crimson fury." },
      { name: "Cheddar Chief Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454809932254810162/cheddar.png?ex=695270d4&is=69511f54&hm=0462a7e835b457914b7632719fa68f9d6f483786cfc5cf0d5357fd39857c02c6&animated=true", description: "Cheese master." },
      { name: "Cheeky House Mouse", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454809932561125426/cheeky.png?ex=695270d4&is=69511f54&hm=6c0405ee72a637f4654a2d7c40850a35780f34811882cf863101db94d33654ad&animated=true", description: "Mischievous rogue." },
      { name: "Coda", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454809932875694100/coda.png?ex=695270d5&is=69511f55&hm=2aef1ff92a530dff3d50f211ab91bcfb45f00c79b972f2a676ac0ef1fe290614&animated=true", description: "The final note." },
      { name: "Cottonball Teemo", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454809933169168598/cotton.png?ex=695270d5&is=69511f55&hm=11c5e690a2235414c0ef6b41cb0d2f64d97aefc75d62e984b09e6106643bbc5d&animated=true", description: "Soft but deadly." },
      { name: "Cruelclaw", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454809933492260894/cruel.png?ex=695270d5&is=69511f55&hm=ae4f4abbd6722e6b09630ce5d6e3befd94ed747958643f3ab1895371abc8717f&animated=true", description: "Vicious hunter." },
      { name: "Devil Teemo", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454809933769080998/devil.png?ex=695270d5&is=69511f55&hm=d585bf581cd9a0fbf44d8a4c12b372449ef46670d42f0d3edd91e202a5ca3311&animated=true", description: "Pure evil." },
      { name: "Dragaux", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454809934083526780/drag.png?ex=695270d5&is=69511f55&hm=5e5fd086af5dac53c68b4df5a0b37b8fe41b0c39cad985ea5cd391bdac4e1deb&animated=true", description: "Dragon warrior." },
      { name: "Dragonslayer Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810379040456826/dragonslay.png?ex=6952713f&is=69511fbf&hm=9db3bb8485cdf7a6cec228419f6a59533540003ac925043398eedfac3c64bfea&animated=true", description: "Slayer of dragons." },
      { name: "Happy Elf Teemo", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810379350704271/elf.png?ex=6952713f&is=69511fbf&hm=38d58a183209b2372827d16ceaea3052c46f009ddc34e52a2ae3eeb46ef1a8d6&animated=true", description: "Jolly adventurer." },
      { name: "Firecracker Teemo", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810379824795658/firecracker.png?ex=6952713f&is=69511fbf&hm=c333c027c9ccd462dd7ccd50e82f7979b17a89f48f31f5b10d3c3f02bc3188ee&animated=true", description: "Explosive personality." },
      { name: "Gangster Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810380156276888/gang.png?ex=6952713f&is=69511fbf&hm=29d4a27f51c9f7446ca54c3724d1151934ff72c7ff3c7216f564f974c1fe7c33&animated=true", description: "Crime lord." },
      { name: "Goodra", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810380646879326/goodra.png?ex=6952713f&is=69511fbf&hm=90386f87b0bc037f2b0ea5e16191025d8340b2a064333dd83375bb64e20f6afd&animated=true", description: "Gentle giant." },
      { name: "Resourceful Rat", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810381053857925/gungrat.png?ex=6952713f&is=69511fbf&hm=dfbc01ec857c84ee6f153ca80df6f4a34b168d3070f6d2b2405ca40128a25a1b&animated=true", description: "Tactical survivor." },
      { name: "High Noon Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810381804634195/highnoon.png?ex=69527140&is=69511fc0&hm=ff3c2ddf0d253462c236407c72f4f702da8d8ba00d0cfbb04429d7e61a246bd4&animated=true", description: "Western outlaw." },
      { name: "Hisuian Zoroark", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810739972771932/hisuian.png?ex=69527195&is=69512015&hm=6a91e9fa7c4dad86de9db341eb5fbd28bd60502addd4b14076282b4a1b40ca13&animated=true", description: "Ancient phantom." },
      { name: "Howitzer", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810740300054695/howitzer.png?ex=69527195&is=69512015&hm=0861266b88584a513388a3689e1e0bff1d154817be2f80ce8662cc203b403c83&animated=true", description: "Explosive weapon." },
      { name: "Ice King Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810740602175508/iceking.png?ex=69527195&is=69512015&hm=bfe25df8247e32661c22815baeb70e25c6a819382fe097f92a93dd7dfbf6f4b8&animated=true", description: "Frozen monarch." },
      { name: "Infernal Kennen", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810740962627686/infernal.png?ex=69527195&is=69512015&hm=cae678072504eeb791c1de774cc5783a509c93680d9317a883a353ec469a9961&animated=true", description: "Hell's fury." },
      { name: "Kennen", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810741268938904/kennen.png?ex=69527195&is=69512015&hm=c7535f57f513a0b1281c11b457fdc44e4a0cb8daadf586893eb440558e225ed4&animated=true", description: "Heart of tempest." },
      { name: "Kingpin Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810741592031395/kingpin.png?ex=69527195&is=69512015&hm=512edfd5cd7596742ef6d93e784a10b1ab01988984fd6d87a730b981b7afbf8c&animated=true", description: "Underworld boss." },
      { name: "Koraidon", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810960542961806/koraidon.png?ex=695271ca&is=6951204a&hm=a7ec89ea6b06720f499a48cdd70e10c363525a991cd3d4263585fc8ea454e300&animated=true", description: "Legendary beast." },
      { name: "Medieval Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810961163714652/medieval.png?ex=695271ca&is=6951204a&hm=4bbfa920991b7c30105f0d3cebc5a3e8b09c9ba29e6c51f1eef43e1794635b13&animated=true", description: "Knight of old." },
      { name: "Mind Drill Assailant", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810961763631124/minddrill.png?ex=695271ca&is=6951204a&hm=2e32efc430d1cf15c5d71c0d353eb034085478c7f3bba5c4f07926e2a8ae5b23&animated=true", description: "Psychic terror." },
      { name: "Fortissmole 1", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810962216353944/mole.png?ex=695271ca&is=6951204a&hm=4eb2e6f5dde691a0eb840546c5a9de76c28fa7a6a49f369d1060091a03da215e&animated=true", description: "Underground dweller." },
      { name: "Fortissmole 2", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810962891903107/mole2.png?ex=695271ca&is=6951204a&hm=ba5b96c04745f911e252b05f2711fc56203e64d3b47802b59bc1ab6653168e00&animated=true", description: "Subterranean twin." },
      { name: "Nashi", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810963457998939/nashi.png?ex=695271ca&is=6951204a&hm=c3788bf29f8c1ff140a9885999bded3cf97e7e40e1ec2b644d1a5b4183350b36&animated=true", description: "Water warrior." },
      { name: "Omega Squad Teemo", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454810964057657519/omega.png?ex=695271ca&is=6951204a&hm=ce1b44b90226a3b91efb11408b7a2283709fa4ab8409d5e2757d206b5d21837d&animated=true", description: "Elite soldier." },
      { name: "Omega Squad Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811236435886130/omegatwitch.png?ex=6952720b&is=6951208b&hm=4cfaed19d99f8f1bd1eb251ddb6a13d36d8d9f93e4759ae99bda33902323e52b&animated=true", description: "Tactical operative." },
      { name: "Pickpocket Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811237203312832/pickpocket.png?ex=6952720c&is=6951208c&hm=a19c55ec16cdfdd3d50f74de58a213fb082d3b09716888a45989b7f41d9fced9&animated=true", description: "Master thief." },
      { name: "Pikachu", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811237853434071/pika.png?ex=6952720c&is=6951208c&hm=4841098b9413eee0883cc636b9bf176b575055c28db25446f490e7286e2c770b&animated=true", description: "Electric mouse." },
      { name: "Plague Rat Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811238151356621/plague.png?ex=6952720c&is=6951208c&hm=ee904e88fece04b21e8d7c475f98ac0292ce89b6f971dcee9ecfca9effe3df05&animated=true", description: "Pestilent scourge." },
      { name: "Prestige Spirit Blossom Teemo", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811238524522611/prestige.png?ex=6952720c&is=6951208c&hm=b9bd832a45641b42cc8c61673a32de383503bbbae9d384869e2b5b7316c9c5f6&animated=true", description: "Ethereal guardian." },
      { name: "Rats", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811238835028038/ratsjacket.png?ex=6952720c&is=6951208c&hm=f123d4618b7fed43e2c443da8e3d7060c95fddb725bba02b54bae89fd917eec0&animated=true", description: "Swarm master." },
      { name: "Recon Teemo", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811239212384347/recon.png?ex=6952720c&is=6951208c&hm=79f1f1b9f7bf528f5861dd17ea85f3ecf79a2c562049eb05b880349413ada933&animated=true", description: "Scout specialist." },
      { name: "Shadowfoot Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811527868579941/shadowfoot.png?ex=69527251&is=695120d1&hm=62fddc2d094b12f29acab0b2eb086919789b92b38a6826c9b4c4b3c46299969d&animated=true", description: "Silent assassin." },
      { name: "Shoreline Looter", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811528820953151/shore.png?ex=69527251&is=695120d1&hm=4a2066540aec0394e13c40c70824a035b692e062c0ce819ce68cb9743131a846&animated=true", description: "Beach pirate." },
      { name: "Space Groove Teemo", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811529101840467/space.png?ex=69527251&is=695120d1&hm=a283ac7ffd0eeadca73b63a74f21d24f61030a4814295314b7b071fbfec80869&animated=true", description: "Cosmic dancer." },
      { name: "Spirit Blossom Teemo", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811529429127233/spirit.png?ex=69527251&is=695120d1&hm=50b64496f36390e0ed86278b7711ee907b62cc36d0a632b82ebb7ae4e3b2c1a5&animated=true", description: "Spiritual essence." },
      { name: "SSW Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811529768599582/ssw.png?ex=69527251&is=695120d1&hm=22d5781270f6778624bfd68fda13625d5716cdf0b40eb0032938ac5bae4e3489&animated=true", description: "Tournament champion." },
      { name: "Teemo", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811530821374083/teemo.png?ex=69527252&is=695120d2&hm=d7b67681ac5886ca0ec2079c3b7538c45d297e9f23cf90924397275c76949fa1&animated=true", description: "Scout extraordinaire." },
      { name: "Vandal Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811531249455197/vandal.png?ex=69527252&is=695120d2&hm=3d6600ab0a722c4b095fcc49db366503acf32a6b54dde18a1dc8cf978dab85cc&animated=true", description: "Rebel fighter." },
      { name: "Vren The Relentless", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811774862758005/vren.png?ex=6952728c&is=6951210c&hm=2c38ed3a67a12aa8d69abcf3b845d1af90d1709a003477fef912f3a7d7caaadf&animated=true", description: "Unstoppable force." },
      { name: "Whistler Village Twitch", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811776033095680/whistle.png?ex=6952728c&is=6951210c&hm=935fbe20d09a1c611fc2a1595c3c7c3ac66e1b7da742bc167b27cb0fd6b66b57&animated=true", description: "Mountain explorer." },
      { name: "Zarus", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811777467420749/zarus.png?ex=6952728c&is=6951210c&hm=dca28457342eaaea636698d4383f79c2fd2617d1bc7d488fee2b35df1315ad3d&animated=true", description: "Ancient ruler." },
      { name: "Zoroark", imageUrl: "https://cdn.discordapp.com/attachments/833133514660642827/1454811778058948750/zoroark.png?ex=6952728c&is=6951210c&hm=0cb8f3ecc693e7fb97ff672d2be41587d903302921515a4282f8b6fd4371eee3&animated=true", description: "Master illusionist." },
    ];
    for (const f of seedFighters) {
      await storage.createFighter(f);
    }
  }

  return httpServer;
}
