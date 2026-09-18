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
    .setName("ban")
    .setDescription("Ban a member from the server")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("Member to ban").setRequired(true),
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason for the ban"),
    )
    .addBooleanOption((o) =>
      o.setName("delete_messages").setDescription("Delete their recent messages"),
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return;
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const deleteMessages = interaction.options.getBoolean("delete_messages") ?? false;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const actor = interaction.member as import("discord.js").GuildMember | null;
    const target = await resolveMember(guild, user.id);

    const err =
      canModerate(actor, target, PermissionFlagsBits.BanMembers, guild.ownerId) ??
      (target
        ? botCanModerate(guild.members.me, target, guild.ownerId)
        : null);
    if (err) {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription(err)] });
      return;
    }

    try {
      await guild.bans.create(user, {
        reason: `By ${interaction.user.tag}: ${reason}`,
        deleteMessageSeconds: deleteMessages ? 604800 : undefined,
      });
    } catch (e) {
      await interaction.editReply({
        embeds: [
          embed(Colors.danger).setDescription("I couldn't ban that user. Check my permissions and role hierarchy."),
        ],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        embed(Colors.success)
          .setTitle("Member Banned")
          .setDescription(`${userMention(user)} was banned.`)
          .addFields(
            { name: "Reason", value: sanitize(reason), inline: true },
            { name: "Moderator", value: userMention(interaction.user), inline: true },
          ),
      ],
    });

    await sendLog(guild, "moderation", embed(Colors.danger)
      .setTitle("🔨 Ban")
      .setDescription(`${userMention(user)} was banned by ${userMention(interaction.user)}`)
      .addFields({ name: "Reason", value: sanitize(reason) }));
    await appendLogFile(guild.id, "moderation", `BAN ${user.id} by ${interaction.user.id}: ${reason}`);
  },
};

export default command;
