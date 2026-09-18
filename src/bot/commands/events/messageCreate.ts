import { Events, type Message } from "discord.js";
import type { BotEvent } from "./index.js";
import { embed, Colors, relative, newId } from "../utils/common.js";
import {
  getGuildConfig,
  afkStore,
  honeypotStore,
  saveGuildConfig,
} from "../utils/data.js";
import { sendLog, appendLogFile } from "../utils/logging.js";
import { isInvite } from "../commands/honeypot.js";

const event: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,

  async execute(message: Message) {
    if (message.author.bot || !message.guild) return;
    const guild = message.guild;
    const cfg = await getGuildConfig(guild.id);

    // ---- Honeypot: invite link posted in the configured honeypot channel ----
    if (
      cfg.honeypot.enabled &&
      cfg.honeypot.channelId &&
      message.channel.id === cfg.honeypot.channelId &&
      isInvite(message.content)
    ) {
      const content = message.content.slice(0, 500);
      try {
        await message.delete();
      } catch {
        // already gone
      }

      const list = (await honeypotStore.read(guild.id)) ?? [];
      list.push({
        id: newId(6),
        userId: message.author.id,
        userName: message.author.tag,
        content,
        date: Date.now(),
        reviewed: false,
      });
      await honeypotStore.write(guild.id, list);

      await message.author
        .send({
          embeds: [
            embed(Colors.danger)
              .setTitle("⚠️ Anti-Scam Warning")
              .setDescription(
                "Posting invite links in our server triggered the anti-scam honeypot. Do not share invites here.",
              ),
          ],
        })
        .catch(() => undefined);

      await appendLogFile(guild.id, "honeypot", `DETECT ${message.author.id}: ${content}`);

      // Staff notification (role ping) in the configured log channel.
      if (cfg.honeypot.staffRoleId && cfg.logs.channelId) {
        const ch = (await guild.channels.fetch(cfg.logs.channelId).catch(() => null));
        if (ch?.isTextBased()) {
          await ch
            .send({
              content: `<@&${cfg.honeypot.staffRoleId}>`,
              embeds: [
                embed(Colors.danger)
                  .setTitle("🍯 Honeypot Trigger")
                  .setDescription(
                    `<@${message.author.id}> posted an invite in <#${message.channel.id}> and it was auto-deleted. Review with \`/honeypot review\`.`,
                  ),
              ],
            })
            .catch(() => undefined);
        }
      }
      await sendLog(guild, "honeypot", embed(Colors.danger)
        .setTitle("🍯 Honeypot Detected")
        .setDescription(`<@${message.author.id}> posted an invite in <#${message.channel.id}>. Auto-deleted.`));
      return;
    }

    // ---- AFK handling ----
    const perGuild = (await afkStore.read(guild.id)) ?? {};

    // Clear own AFK when the user is active again.
    if (perGuild[message.author.id]) {
      delete perGuild[message.author.id];
      await afkStore.write(guild.id, perGuild);
      await message.author
        .send({ content: `Welcome back, ${message.author.username}! Your AFK has been cleared. 🎉` })
        .catch(() => undefined);
    }

    // Notify when someone mentions an AFK user.
    if (message.mentions.users.size > 0) {
      for (const u of message.mentions.users.values()) {
        const afk = perGuild[u.id];
        if (afk && u.id !== message.author.id) {
          await message
            .reply(`<@${u.id}> is AFK: **${afk.reason}** (since ${relative(afk.since)})`)
            .catch(() => undefined);
          break;
        }
      }
    }
  },
};

export default event;
