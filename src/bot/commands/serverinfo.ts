import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
  ChannelType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, formatDate } from "../utils/common.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Shows information about this server")
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const guild = interaction.guild!;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;

    const e = embed(Colors.primary)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: "🆔 ID", value: guild.id, inline: true },
        { name: "👑 Owner", value: `<@${guild.ownerId}>`, inline: true },
        { name: "📅 Created", value: formatDate(guild.createdTimestamp), inline: true },
        { name: "👥 Members", value: String(guild.memberCount), inline: true },
        { name: "💬 Channels", value: `${textChannels} text · ${voiceChannels} voice · ${categories} cat`, inline: true },
        { name: "🎭 Roles", value: String(guild.roles.cache.size), inline: true },
        { name: "🚀 Boost level", value: String(guild.premiumTier), inline: true },
        { name: "✨ Boosts", value: String(guild.premiumSubscriptionCount ?? 0), inline: true },
        { name: "🌐 Verification", value: guild.verificationLevel.toString(), inline: true },
      )
      .setFooter({ text: `Requested by ${interaction.user.tag} · Built with VybeBot.ai` });
    await interaction.editReply({ embeds: [e] });
  },
};

export default command;
