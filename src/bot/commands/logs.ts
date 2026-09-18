import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
  ChannelType,
  LabelBuilder,
  ModalBuilder,
  CheckboxGroupBuilder,
  CheckboxGroupOptionBuilder,
  ChannelSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors } from "../utils/common.js";
import { getGuildConfig, saveGuildConfig } from "../utils/data.js";

const logTypes = [
  { key: "moderation", label: "Moderation", value: "moderation" },
  { key: "messages", label: "Messages (deleted/edited)", value: "messages" },
  { key: "members", label: "Members (joins/leaves)", value: "members" },
  { key: "roles", label: "Roles", value: "roles" },
  { key: "tickets", label: "Tickets", value: "tickets" },
  { key: "honeypot", label: "Honeypot", value: "honeypot" },
] as const;

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Configure the audit log channel and which events to log")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName("setup").setDescription("Set log channel and event types"))
    .addSubcommand((s) =>
      s.setName("toggle").setDescription("Enable/disable one event type")
        .addStringOption((o) =>
          o.setName("type").setDescription("Log type").setRequired(true)
            .addChoices(...logTypes.map((t) => ({ name: t.label, value: t.key }))),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;
    const sub = interaction.options.getSubcommand();

    if (sub === "setup") {
      const cfg = await getGuildConfig(guild.id);
      const modal = new ModalBuilder()
        .setCustomId("logs:setup")
        .setTitle("Log Channel Setup")
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("Log channel")
            .setChannelSelectMenuComponent(
              new ChannelSelectMenuBuilder()
                .setCustomId("channel")
                .setChannelTypes(ChannelType.GuildText)
                .setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Events to log")
            .setCheckboxGroupComponent(
              new CheckboxGroupBuilder()
                .setCustomId("types")
                .setRequired(false)
                .setMinValues(0)
                .setMaxValues(logTypes.length)
                .addOptions(
                  logTypes.map((t) =>
                    new CheckboxGroupOptionBuilder()
                      .setLabel(t.label.slice(0, 100))
                      .setValue(t.key)
                      .setDefault(cfg.logs.types[t.key] !== false),
                  ),
                ),
            ),
        );
      await interaction.showModal(modal);
      return;
    }

    const type = interaction.options.getString("type", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const cfg = await getGuildConfig(guild.id);
    cfg.logs.types[type] = cfg.logs.types[type] !== false ? false : true;
    await saveGuildConfig(guild.id, cfg);
    await interaction.editReply({
      embeds: [
        embed(Colors.success).setDescription(
          `**${logTypes.find((t) => t.key === type)?.label ?? type}** logging turned ${cfg.logs.types[type] ? "on ✅" : "off ❌"}.`,
        ),
      ],
    });
  },

  async modal(interaction: ModalSubmitInteraction) {
    const [cmd, action] = interaction.customId.split(":");
    if (cmd !== "logs" || action !== "setup") return;
    const guild = interaction.guild!;
    const channel = interaction.fields.getSelectedChannels("channel", true).first();
    const selected =
      interaction.fields.fields.has("types")
        ? interaction.fields.getCheckboxGroup("types")
        : [];
    const cfg = await getGuildConfig(guild.id);
    if (!channel) {
      await interaction.reply({ content: "No channel selected.", flags: MessageFlags.Ephemeral });
      return;
    }
    cfg.logs.enabled = true;
    cfg.logs.channelId = channel.id;
    for (const t of logTypes) {
      cfg.logs.types[t.key] = selected.includes(t.key);
    }
    await saveGuildConfig(guild.id, cfg);
    await interaction.reply({
      content: `Logs configured → <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
