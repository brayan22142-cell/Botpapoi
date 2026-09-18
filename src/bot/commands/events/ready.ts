import { Events, type Client } from "discord.js";
import { loadConfig } from "../config.js";
import { logger } from "../utils/logger.js";
import { startTikTokPoller } from "../utils/tiktok.js";
import type { BotEvent } from "./index.js";

const event: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,

  execute(client: Client<true>): void {
    const { storage } = loadConfig();
    client.user.setActivity("Built with VybeBot.ai");
    startTikTokPoller();
    logger.info("Bot is online.", {
      tag: client.user.tag,
      dataDir: storage.dir,
      durableStorage: storage.durable,
    });
  },
};

export default event;
