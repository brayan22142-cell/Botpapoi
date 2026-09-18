import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import {
  embed,
  Colors,
  canModerate,
  resolveMember,
  userMention,
} from "../utils/common.js";
import { sendLog, appendLogFile } from "../utils/logging.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Remove a timeout from a member")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("Member to unmute").setRequired(true),
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return;
    const user = interaction.options.getUser("user", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const actor = interaction.member as import("discord.js").GuildMember | null;
    const target = await resolveMember(guild, user.id);
    const err = canModerate(actor, target, PermissionFlagsBits.ModerateMembers, guild.ownerId);
    if (err || !target) {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription(err ?? "User not found.")] });
      return;
    }
    try {
      await target.timeout(null, `By ${interaction.user.tag}`);
    } catch {
      await interaction.editReply({
        embeds: [embed(Colors.danger).setDescription("I couldn't unmute that user.")],
      });
      return;
    }
    await interaction.editReply({
      embeds: [embed(Colors.success).setDescription(`${userMention(user)} is no longer muted.`)],
    });
    await sendLog(guild, "moderation", embed(Colors.success)
      .setTitle("🔊 Unmute")
      .setDescription(`${userMention(user)} was unmuted by ${userMention(interaction.user)}.`));
    await appendLogFile(guild.id, "moderation", `UNMUTE ${user.id} by ${interaction.user.id}`);
  },
};

export default command;
