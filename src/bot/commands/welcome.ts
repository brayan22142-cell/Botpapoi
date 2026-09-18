import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
  ChannelType,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, parseHexColor } from "../utils/common.js";
import { getGuildConfig, saveGuildConfig } from "../utils/data.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure welcome and goodbye messages")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName("setup").setDescription("Configure welcome message, channel and color"))
    .addSubcommand((s) => s.setName("goodbye").setDescription("Configure goodbye message and channel")),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const cfg = await getGuildConfig(interaction.guild!.id);

    if (sub === "setup") {
      const modal = new ModalBuilder()
        .setCustomId("welcome:setup")
        .setTitle("Welcome Message Setup")
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("Welcome channel")
            .setChannelSelectMenuComponent(
              new ChannelSelectMenuBuilder()
                .setCustomId("channel")
                .setChannelTypes(ChannelType.GuildText)
                .setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Message")
            .setDescription("Use {user} and {server}.")
            .setTextInputComponent(
              new TextInputBuilder()
                .setCustomId("message")
                .setStyle(TextInputStyle.Paragraph)
                .setValue(cfg.welcome.message)
                .setMaxLength(1000)
                .setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Color (hex)")
            .setTextInputComponent(
              new TextInputBuilder().setCustomId("color").setValue(cfg.welcome.color.toString(16)).setMaxLength(7).setRequired(true),
            ),
        );
      await interaction.showModal(modal);
      return;
    }

    if (sub === "goodbye") {
      const modal = new ModalBuilder()
        .setCustomId("welcome:goodbye")
        .setTitle("Goodbye Message Setup")
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("Goodbye channel")
            .setChannelSelectMenuComponent(
              new ChannelSelectMenuBuilder()
                .setCustomId("channel")
                .setChannelTypes(ChannelType.GuildText)
                .setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Message")
            .setDescription("Use {user} and {server}.")
            .setTextInputComponent(
              new TextInputBuilder()
                .setCustomId("message")
                .setStyle(TextInputStyle.Paragraph)
                .setValue(cfg.goodbye.message)
                .setMaxLength(1000)
                .setRequired(true),
            ),
        );
      await interaction.showModal(modal);
      return;
    }
  },

  async modal(interaction: ModalSubmitInteraction) {
    const [cmd, action] = interaction.customId.split(":");
    if (cmd !== "welcome") return;
    const guild = interaction.guild!;
    const cfg = await getGuildConfig(guild.id);

    if (action === "setup") {
      const channel = interaction.fields.getSelectedChannels("channel", true).first();
      const message = interaction.fields.getTextInputValue("message");
      const color = parseHexColor(interaction.fields.getTextInputValue("color")) ?? Colors.success;
      if (!channel) {
        await interaction.reply({ content: "No channel selected.", flags: MessageFlags.Ephemeral });
        return;
      }
      cfg.welcome.enabled = true;
      cfg.welcome.channelId = channel.id;
      cfg.welcome.message = message;
      cfg.welcome.color = color;
      await saveGuildConfig(guild.id, cfg);
      await interaction.reply({ content: "Welcome message configured. ✅", flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "goodbye") {
      const channel = interaction.fields.getSelectedChannels("channel", true).first();
      const message = interaction.fields.getTextInputValue("message");
      if (!channel) {
        await interaction.reply({ content: "No channel selected.", flags: MessageFlags.Ephemeral });
        return;
      }
      cfg.goodbye.enabled = true;
      cfg.goodbye.channelId = channel.id;
      cfg.goodbye.message = message;
      await saveGuildConfig(guild.id, cfg);
      await interaction.reply({ content: "Goodbye message configured. ✅", flags: MessageFlags.Ephemeral });
      return;
    }
  },
};

export default command;
