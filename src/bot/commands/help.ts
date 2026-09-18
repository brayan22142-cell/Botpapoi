import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors } from "../utils/common.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows all available commands")
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const cmds = interaction.client.commands;
    const groups: Array<{ name: string; cmds: string[] }> = [
      { name: "🛡️ Moderation", cmds: ["ban", "unban", "kick", "mute", "unmute", "warn", "warnings", "clear", "slowmode", "lock", "unlock", "role", "nickname"] },
      { name: "🎫 Tickets", cmds: ["ticket"] },
      { name: "👋 Community", cmds: ["welcome", "afk", "announce", "poll"] },
      { name: "🍯 Anti-Scam", cmds: ["honeypot"] },
      { name: "📋 Logs", cmds: ["logs"] },
      { name: "💰 Economy", cmds: ["balance", "daily", "work", "give", "shop", "buy"] },
      { name: "🎉 Events", cmds: ["event"] },
      { name: "🎵 TikTok", cmds: ["tiktok"] },
      { name: "⚙️ Config", cmds: ["config"] },
      { name: "📊 Information", cmds: ["serverinfo", "userinfo", "avatar", "banner", "roleinfo", "channelinfo", "botinfo", "ping", "help"] },
    ];

    const e = embed(Colors.primary)
      .setTitle(`${interaction.client.user?.username ?? "Bot"} — Help`)
      .setDescription(
        groups
          .map(
            (g) =>
              `**${g.name}**\n${g.cmds
                .filter((n) => cmds.has(n))
                .map((n) => `\`/${n}\``)
                .join(" ")}`,
          )
          .join("\n\n"),
      )
      .setFooter({ text: "Built with VybeBot.ai" });
    await interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
  },
};

export default command;
