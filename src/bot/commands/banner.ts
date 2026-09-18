import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} from "discord.js";
import type { BotCommand } from "./index.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("banner")
    .setDescription("Shows a user's banner")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((o) => o.setName("user").setDescription("User whose banner to show")),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = interaction.options.getUser("user") ?? interaction.user;
    const fetched = await user.fetch();
    const bannerURL = fetched.bannerURL({ size: 1024, extension: "png" });
    if (!bannerURL) {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`${user.tag} has no banner.`).setFooter({ text: "Built with VybeBot.ai" })],
      });
      return;
    }
    await interaction.editReply({
      content: `**${user.tag}**`,
      embeds: [
        new EmbedBuilder().setImage(bannerURL).setColor(0x5865f2).setFooter({ text: "Built with VybeBot.ai" }),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setLabel("Open full size").setStyle(ButtonStyle.Link).setURL(bannerURL),
        ),
      ],
    });
  },
};

export default command;
