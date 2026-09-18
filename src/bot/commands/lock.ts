import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
  ChannelType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors } from "../utils/common.js";
import { sendLog, appendLogFile } from "../utils/logging.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock this channel (members can't send messages)")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addRoleOption((o) =>
      o.setName("role").setDescription("Role to lock (defaults to everyone)"),
    ),

  async execute(interaction) {
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Use this in a text channel.", flags: MessageFlags.Ephemeral });
      return;
    }
    const roleId =
      interaction.options.getRole("role")?.id ?? interaction.guild!.roles.everyone.id;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await channel.permissionOverwrites.create(roleId, { SendMessages: false });
    } catch {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription("I couldn't lock this channel.")] });
      return;
    }
    await interaction.editReply({
      embeds: [embed(Colors.success).setDescription(`🔒 <#${channel.id}> is now locked.`)],
    });
    await sendLog(interaction.guild!, "moderation", embed(Colors.warn)
      .setTitle("🔒 Lock")
      .setDescription(`<#${channel.id}> locked by <@${interaction.user.id}>.`));
    await appendLogFile(interaction.guild!.id, "moderation", `LOCK ${channel.id} by ${interaction.user.id}`);
  },
};

export default command;
