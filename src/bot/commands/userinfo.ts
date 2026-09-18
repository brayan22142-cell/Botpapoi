import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, formatDate, relative } from "../utils/common.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Shows information about a user")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((o) => o.setName("user").setDescription("User to inspect")),

  async execute(interaction) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const member = interaction.guild!.members.cache.get(user.id);

    const roles =
      member && member.roles.cache.size > 1
        ? member.roles.cache.filter((r) => r.id !== interaction.guild!.id).sort((a, b) => b.position - a.position).map((r) => `<@&${r.id}>`).join(" ")
        : "None";

    const e = embed(Colors.primary)
      .setTitle(user.tag)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "🆔 ID", value: user.id, inline: true },
        { name: "🤖 Bot", value: user.bot ? "Yes" : "No", inline: true },
        { name: "📅 Account created", value: formatDate(user.createdTimestamp), inline: true },
        ...(member
          ? [
              { name: "📥 Joined", value: member.joinedTimestamp ? formatDate(member.joinedTimestamp) : "unknown", inline: true },
              { name: "💤 Status", value: member.presence?.status ?? "offline", inline: true },
            ]
          : []),
        { name: "🎭 Roles", value: roles.slice(0, 1000) || "None" },
      )
      .setFooter({ text: `Requested by ${interaction.user.tag} · Built with VybeBot.ai` });
    await interaction.editReply({ embeds: [e] });
  },
};

export default command;
