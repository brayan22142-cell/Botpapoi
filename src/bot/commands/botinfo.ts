import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
  version,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors } from "../utils/common.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Shows bot information and status")
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const client = interaction.client;
    const e = embed(Colors.primary)
      .setTitle(client.user?.username ?? "Bot")
      .setThumbnail(client.user?.displayAvatarURL({ size: 256 }) ?? null)
      .addFields(
        { name: "📊 Servers", value: String(client.guilds.cache.size), inline: true },
        { name: "🏓 Latency", value: `${client.ws.ping}ms`, inline: true },
        { name: "⏱️ Uptime", value: `${Math.floor((client.uptime ?? 0) / 1000)}s`, inline: true },
        { name: "🛠️ Commands", value: String(client.commands.size), inline: true },
        { name: "📚 Library", value: `discord.js v${version}`, inline: true },
        { name: "🌐 Node", value: process.version, inline: true },
      )
      .setFooter({ text: "Built with VybeBot.ai" });
    await interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
  },
};

export default command;
