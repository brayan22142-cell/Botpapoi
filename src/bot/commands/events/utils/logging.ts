import { type EmbedBuilder, type Guild, type TextChannel } from "discord.js";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { getGuildConfig } from "./data.js";
import { logsPath } from "./data.js";
import { logger } from "./logger.js";

/** Send a log embed to the guild's configured log channel (if the type is on). */
export async function sendLog(
  guild: Guild,
  type: keyof GuildLogTypes,
  embed: EmbedBuilder,
): Promise<void> {
  try {
    const cfg = await getGuildConfig(guild.id);
    if (!cfg.logs.enabled || !cfg.logs.channelId) return;
    if (cfg.logs.types[type] === false) return;
    const channel = (await guild.channels.fetch(cfg.logs.channelId)) as
      | TextChannel
      | undefined;
    if (!channel?.isTextBased()) return;
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.warn("Failed to send log entry.", { guildId: guild.id, type, error: err });
  }
}

export interface GuildLogTypes {
  moderation: boolean;
  messages: boolean;
  members: boolean;
  roles: boolean;
  tickets: boolean;
  honeypot: boolean;
}

/** Append a plain-text line to a per-guild log file (transcripts, audits). */
export async function appendLogFile(
  guildId: string,
  kind: string,
  line: string,
): Promise<void> {
  const file = logsPath(guildId, kind);
  try {
    await mkdir(dirname(file), { recursive: true });
    await appendFile(file, `${new Date().toISOString()} ${line}\n`, "utf-8");
  } catch (err) {
    logger.warn("Failed to append log file.", { guildId, kind, error: err });
  }
}
