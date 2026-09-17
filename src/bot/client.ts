import { Client, Collection, GatewayIntentBits } from "discord.js";
import type { BotCommand } from "../commands/index.js";

declare module "discord.js" {
  export interface Client {
    commands: Collection<string, BotCommand>;
  }
}

export class BotClient extends Client {
  constructor() {
    // GuildMembers: welcome/goodbye & member logs. GuildMessages + MessageContent:
    // message deletion/edits logs and the Honeypot anti-scam keyword scanner.
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
    this.commands = new Collection<string, BotCommand>();
  }
}

let activeClient: BotClient | undefined;
export function setClient(client: BotClient): void {
  activeClient = client;
}
export function getClient(): BotClient {
  if (!activeClient) throw new Error("Discord client has not been registered.");
  return activeClient;
}
export function getClientIfAvailable(): BotClient | undefined {
  return activeClient;
}
export function isClientReady(): boolean {
  return activeClient?.isReady() === true;
}
