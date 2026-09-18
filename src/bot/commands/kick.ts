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
    .setName("kick")
    .setDescription("Kick a member from the server")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("Member to kick").setRequired(true),
    )
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the kick")),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return;
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const actor = interaction.member as import("discord.js").GuildMember | null;
    const target = await resolveMember(guild, user.id);

    const err =
      canModerate(actor, target, PermissionFlagsBits.KickMembers, guild.ownerId) ??
      (target ? botCanModerate(guild.members.me, target, guild.ownerId) : null);
    if (err) {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription(err)] });
      return;
    }

    try {
      await target!.kick(`By ${interaction.user.tag}: ${reason}`);
    } catch {
      await interaction.editReply({
        embeds: [embed(Colors.danger).setDescription("I couldn't kick that user. Check permissions and hierarchy.")],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        embed(Colors.success)
          .setTitle("Member Kicked")
          .setDescription(`${userMention(user)} was kicked.`)
          .addFields(
            { name: "Reason", value: sanitize(reason), inline: true },
            { name: "Moderator", value: userMention(interaction.user), inline: true },
          ),
      ],
    });
    await sendLog(guild, "moderation", embed(Colors.warn)
      .setTitle("👢 Kick")
      .setDescription(`${userMention(user)} was kicked by ${userMention(interaction.user)}`)
      .addFields({ name: "Reason", value: sanitize(reason) }));
    await appendLogFile(guild.id, "moderation", `KICK ${user.id} by ${interaction.user.id}: ${reason}`);
  },
};

export default command;
