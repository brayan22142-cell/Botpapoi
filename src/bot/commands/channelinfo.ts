import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
  ChannelType,
  type GuildChannel,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, formatDate } from "../utils/common.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("channelinfo")
    .setDescription("Shows information about a channel")
    .setContexts(InteractionContextType.Guild)
    .addChannelOption((o) => o.setName("channel").setDescription("Channel to inspect").setRequired(true)),

  async execute(interaction) {
    const option = interaction.options.getChannel("channel", true) as GuildChannel;
    const channel =
      interaction.guild!.channels.cache.get(option.id) ?? option;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const e = embed(Colors.primary)
      .setTitle(`# ${channel.name}`)
      .addFields(
        { name: "🆔 ID", value: channel.id, inline: true },
        { name: "📂 Type", value: channel.type.toString(), inline: true },
        { name: "📅 Created", value: formatDate(channel.createdTimestamp ?? Date.now()), inline: true },
        { name: "📍 Category", value: channel.parent ? `<#${channel.parentId}>` : "None", inline: true },
        ...(channel.type === ChannelType.GuildText
          ? [{ name: "🔞 NSFW", value: (channel as import("discord.js").TextChannel).nsfw ? "Yes" : "No", inline: true }]
          : []),
      )
      .setFooter({ text: `Requested by ${interaction.user.tag} · Built with VybeBot.ai` });
    await interaction.editReply({ embeds: [e] });
  },
};

export default command;
