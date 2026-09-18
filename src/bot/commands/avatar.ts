import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import type { BotCommand } from "./index.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Shows a user's avatar")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((o) => o.setName("user").setDescription("User whose avatar to show")),

  async execute(interaction) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const avatarURL = user.displayAvatarURL({ size: 1024, extension: "png" });
    await interaction.reply({
      content: `**${user.tag}**`,
      embeds: [
        new EmbedBuilder()
          .setImage(avatarURL)
          .setColor(0x5865f2)
          .setFooter({ text: "Built with VybeBot.ai" }),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("Open full size")
            .setStyle(ButtonStyle.Link)
            .setURL(avatarURL),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
