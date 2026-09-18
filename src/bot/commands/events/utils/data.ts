import { loadConfig } from "../config.js";
import { createStorage } from "./storage.js";

export interface TicketCategory {
  id: string;
  label: string;
  emoji?: string;
  description?: string;
}

export interface GuildConfig {
  logChannelId?: string;
  ticket: {
    enabled: boolean;
    categoryId?: string;
    staffRoleId?: string;
    transcriptChannelId?: string;
    logChannelId?: string;
    title: string;
    description: string;
    color: number;
    imageUrl?: string;
    buttonLabel: string;
    buttonEmoji?: string;
    panelChannelId?: string;
    panelMessageId?: string;
    categories: TicketCategory[];
    counter: number;
  };
  welcome: { enabled: boolean; channelId?: string; message: string; color: number };
  goodbye: { enabled: boolean; channelId?: string; message: string; color: number };
  honeypot: {
    enabled: boolean;
    channelId?: string;
    staffRoleId?: string;
    incidentText: string;
  };
  logs: {
    enabled: boolean;
    channelId?: string;
    types: Record<string, boolean>;
  };
  economy: {
    enabled: boolean;
    daily: number;
    workMin: number;
    workMax: number;
    starting: number;
    shop: Array<{ id: string; name: string; price: number; description: string }>;
  };
  eventCategoryId?: string;
  tiktok: {
    enabled: boolean;
    channelId?: string;
    username?: string;
    lastVideoId?: string;
    seen: string[];
  };
  prefix?: string;
}

export function defaultGuildConfig(): GuildConfig {
  return {
    ticket: {
      enabled: false,
      title: "🎫 Support Tickets",
      description: "Open a ticket to get help from our team.",
      color: 0x5865f2,
      buttonLabel: "Open Ticket",
      buttonEmoji: "🎫",
      categories: [],
      counter: 0,
    },
    welcome: { enabled: false, message: "Welcome {user} to {server}! 🎉", color: 0x57f287 },
    goodbye: { enabled: false, message: "Goodbye {user}, we'll miss you!", color: 0xed4245 },
    honeypot: {
      enabled: false,
      incidentText:
        "⚠️ This user triggered the fake invite honeypot. They may be trying to scam members. Staff: review below.",
    },
    logs: {
      enabled: false,
      types: {
        moderation: true,
        messages: true,
        members: true,
        roles: true,
        tickets: true,
        honeypot: true,
      },
    },
    economy: {
      enabled: true,
      daily: 100,
      workMin: 50,
      workMax: 150,
      starting: 50,
      shop: [],
    },
    tiktok: { enabled: false, seen: [] },
  };
}

const guilds = createStorage<GuildConfig>(loadConfig(), "guilds");

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  const raw = await guilds.read(guildId);
  if (!raw) return defaultGuildConfig();
  const d = defaultGuildConfig();
  return {
    ...d,
    ...raw,
    ticket: { ...d.ticket, ...(raw.ticket ?? {}) },
    welcome: { ...d.welcome, ...(raw.welcome ?? {}) },
    goodbye: { ...d.goodbye, ...(raw.goodbye ?? {}) },
    honeypot: { ...d.honeypot, ...(raw.honeypot ?? {}) },
    logs: { ...d.logs, ...(raw.logs ?? {}), types: { ...d.logs.types, ...(raw.logs?.types ?? {}) } },
    economy: { ...d.economy, ...(raw.economy ?? {}), shop: raw.economy?.shop ?? [] },
    tiktok: { ...d.tiktok, ...(raw.tiktok ?? {}), seen: raw.tiktok?.seen ?? [] },
  };
}

export async function saveGuildConfig(guildId: string, cfg: GuildConfig): Promise<void> {
  await guilds.write(guildId, cfg);
}

export interface TicketRecord {
  id: string;
  guildId: string;
  userId: string;
  categoryId: string;
  categoryLabel: string;
  channelId: string;
  createdAt: number;
  claimedById?: string;
  closedAt?: number;
}

export interface Warn {
  id: string;
  userId: string;
  moderatorId: string;
  reason: string;
  date: number;
}

export interface GuildEvent {
  id: string;
  name: string;
  description: string;
  date?: number;
  channelId: string;
  messageId?: string;
  creatorId: string;
  attendees: string[];
}

export interface HoneypotIncident {
  id: string;
  userId: string;
  userName: string;
  content: string;
  date: number;
  reviewed: boolean;
}

export interface TikTokConfig {
  enabled: boolean;
  channelId?: string;
  username?: string;
  lastVideoId?: string;
  seen: string[];
}

export const ticketsStore = createStorage<TicketRecord>(loadConfig(), "tickets");
export const warnsStore = createStorage<Warn[]>(loadConfig(), "warns");

export interface EconomyState {
  balances: Record<string, number>;
  lastDaily: Record<string, number>;
  lastWork: Record<string, number>;
  inventory: Record<string, Record<string, number>>;
}
export const economyStore = createStorage<EconomyState>(loadConfig(), "economy");
export const afkStore = createStorage<Record<string, { reason: string; since: number }>>(
  loadConfig(),
  "afk",
);
export const eventStore = createStorage<GuildEvent[]>(loadConfig(), "events");
export const honeypotStore = createStorage<HoneypotIncident[]>(loadConfig(), "honeypot");
export const tiktokStore = createStorage<TikTokConfig>(loadConfig(), "tiktok");

const config = loadConfig();

export function transcriptPath(guildId: string, id: string): string {
  return `${config.storage.dir}/transcripts/${guildId}/${id}.txt`;
}

export function logsPath(guildId: string, kind: string): string {
  return `${config.storage.dir}/logs/${guildId}/${kind}.log`;
}
