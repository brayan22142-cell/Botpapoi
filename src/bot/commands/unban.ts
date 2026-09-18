import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, sanitize, userMention } from "../utils/common.js";
import { sendLog, appendLogFile } from "../utils/logging.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Remove a ban from a user")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((o) =>
      o.setName("user_id").setDescription("ID of the banned user").setRequired(true),
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return;
    const id = interaction.options.getString("user_id", true);
    if (!/^\d{15,21}$/.test(id)) {
      await interaction.reply({
        embeds: [embed(Colors.danger).setDescription("That doesn't look like a valid user ID.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await guild.bans.remove(id);
    } catch {
      await interaction.editReply({
        embeds: [embed(Colors.danger).setDescription("That user doesn't appear to be banned, or I lack permissions.")],
      });
      return;
    }
    await interaction.editReply({
      embeds: [
        embed(Colors.success).setDescription(`Unbanned <@${id}> (${id}).`),
      ],
    });
    await sendLog(guild, "moderation", embed(Colors.success)
      .setTitle("♻️ Unban")
      .setDescription(`<@${id}> was unbanned by ${userMention(interaction.user)}.`));
    await appendLogFile(guild.id, "moderation", `UNBAN ${id} by ${interaction.user.id}`);
  },
};

export default command;
