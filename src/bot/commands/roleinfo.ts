import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, formatDate } from "../utils/common.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("roleinfo")
    .setDescription("Shows information about a role")
    .setContexts(InteractionContextType.Guild)
    .addRoleOption((o) => o.setName("role").setDescription("Role to inspect").setRequired(true)),

  async execute(interaction) {
    const roleOption = interaction.options.getRole("role", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const role = interaction.guild!.roles.cache.get(roleOption.id);
    if (!role) {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription("Role not found.")] });
      return;
    }
    const members = interaction.guild!.members.cache.filter((m) => m.roles.cache.has(role.id)).size;

    const perms = role.permissions
      .toArray()
      .map((p) => p.replace(/([A-Z])/g, " $1").trim())
      .slice(0, 12)
      .join(", ");

    const e = embed(Colors.primary)
      .setTitle(role.name)
      .addFields(
        { name: "🆔 ID", value: role.id, inline: true },
        { name: "🎨 Color", value: role.hexColor === "#000000" ? "None" : role.hexColor, inline: true },
        { name: "📅 Created", value: formatDate(role.createdTimestamp), inline: true },
        { name: "🐎 Position", value: String(role.position), inline: true },
        { name: "👥 Members", value: String(members), inline: true },
        { name: "📌 Mentionable", value: role.mentionable ? "Yes" : "No", inline: true },
        { name: "🔑 Key permissions", value: perms.slice(0, 1000) || "None" },
      )
      .setFooter({ text: `Requested by ${interaction.user.tag} · Built with VybeBot.ai` });
    await interaction.editReply({ embeds: [e] });
  },
};

export default command;
