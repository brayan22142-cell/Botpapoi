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
    .setName("slowmode")
    .setDescription("Set the slowmode for this channel")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((o) =>
      o.setName("seconds").setDescription("Slowmode in seconds (0 to disable)").setRequired(true).setMinValue(0).setMaxValue(21600),
    ),

  async execute(interaction) {
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Use this in a text channel.", flags: MessageFlags.Ephemeral });
      return;
    }
    const seconds = interaction.options.getInteger("seconds", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await channel.setRateLimitPerUser(seconds, `By ${interaction.user.tag}`);
    } catch {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription("I couldn't set the slowmode.")] });
      return;
    }
    await interaction.editReply({
      embeds: [
        embed(Colors.success).setDescription(
          `Slowmode set to **${seconds}**s in <#${channel.id}>.`,
        ),
      ],
    });
    await sendLog(interaction.guild!, "moderation", embed(Colors.info)
      .setTitle("🐢 Slowmode")
      .setDescription(`<#${channel.id}> set to ${seconds}s by <@${interaction.user.id}>.`));
    await appendLogFile(interaction.guild!.id, "moderation", `SLOWMODE ${channel.id} ${seconds}s by ${interaction.user.id}`);
  },
};

export default command;
