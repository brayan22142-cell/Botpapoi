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
  botCanModerate,
  resolveMember,
  userMention,
  sanitize,
} from "../utils/common.js";
import { sendLog, appendLogFile } from "../utils/logging.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Timeout (mute) a member")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("Member to mute").setRequired(true),
    )
    .addIntegerOption((o) =>
      o.setName("minutes").setDescription("Duration in minutes").setRequired(true).setMinValue(1),
    )
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the mute")),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return;
    const user = interaction.options.getUser("user", true);
    const minutes = interaction.options.getInteger("minutes", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const ms = Math.min(minutes, 40320) * 60_000;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const actor = interaction.member as import("discord.js").GuildMember | null;
    const target = await resolveMember(guild, user.id);
    const err =
      canModerate(actor, target, PermissionFlagsBits.ModerateMembers, guild.ownerId) ??
      (target ? botCanModerate(guild.members.me, target, guild.ownerId) : null);
    if (err) {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription(err)] });
      return;
    }
    try {
      await target!.timeout(ms, `By ${interaction.user.tag}: ${reason}`);
    } catch {
      await interaction.editReply({
        embeds: [embed(Colors.danger).setDescription("I couldn't mute that user.")],
      });
      return;
    }
    await interaction.editReply({
      embeds: [
        embed(Colors.success)
          .setTitle("Member Muted")
          .setDescription(`${userMention(user)} muted for **${minutes}** min.`)
          .addFields(
            { name: "Reason", value: sanitize(reason) },
            { name: "Moderator", value: userMention(interaction.user) },
          ),
      ],
    });
    await sendLog(guild, "moderation", embed(Colors.warn)
      .setTitle("🔇 Mute")
      .setDescription(`${userMention(user)} muted for ${minutes} min by ${userMention(interaction.user)}`)
      .addFields({ name: "Reason", value: sanitize(reason) }));
    await appendLogFile(guild.id, "moderation", `MUTE ${user.id} ${minutes}m by ${interaction.user.id}: ${reason}`);
  },
};

export default command;
