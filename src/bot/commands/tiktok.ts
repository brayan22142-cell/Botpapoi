import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
  ChannelType,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  ChannelSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors } from "../utils/common.js";
import { tiktokStore } from "../utils/data.js";
import { startTikTokPoller } from "../utils/tiktok.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription("Auto-post new videos from a TikTok account")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName("connect").setDescription("Connect a TikTok username and channel"))
    .addSubcommand((s) => s.setName("status").setDescription("Show current TikTok connection"))
    .addSubcommand((s) => s.setName("disable").setDescription("Disable auto-posting")),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;
    const sub = interaction.options.getSubcommand();

    if (sub === "connect") {
      const modal = new ModalBuilder()
        .setCustomId("tiktok:connect")
        .setTitle("Connect TikTok")
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("TikTok username")
            .setDescription("Without the @ — e.g. tiktok")
            .setTextInputComponent(
              new TextInputBuilder().setCustomId("username").setMaxLength(50).setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Posting channel")
            .setChannelSelectMenuComponent(
              new ChannelSelectMenuBuilder()
                .setCustomId("channel")
                .setChannelTypes(ChannelType.GuildText)
                .setRequired(true),
            ),
        );
      await interaction.showModal(modal);
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const cfg = await tiktokStore.read(guild.id);

    if (sub === "status") {
      if (!cfg || !cfg.enabled) {
        await interaction.editReply({
          embeds: [embed(Colors.warn).setDescription("TikTok auto-posting is not configured. Use `/tiktok connect`.")],
        });
        return;
      }
      await interaction.editReply({
        embeds: [
          embed(Colors.success)
            .setTitle("🎵 TikTok Auto-Post")
            .setDescription(`Username: **@${cfg.username}**\nChannel: <#${cfg.channelId}>`),
        ],
      });
      return;
    }

    if (sub === "disable") {
      if (cfg) {
        cfg.enabled = false;
        await tiktokStore.write(guild.id, cfg);
      }
      await interaction.editReply({
        embeds: [embed(Colors.success).setDescription("TikTok auto-posting disabled.")],
      });
      return;
    }
  },

  async modal(interaction: ModalSubmitInteraction) {
    const [cmd, action] = interaction.customId.split(":");
    if (cmd !== "tiktok" || action !== "connect") return;
    const guild = interaction.guild!;
    const username = interaction.fields
      .getTextInputValue("username")
      .replace(/^@/, "")
      .trim();
    const channel = interaction.fields.getSelectedChannels("channel", true).first();
    if (!username || !channel) {
      await interaction.reply({ content: "Missing username or channel.", flags: MessageFlags.Ephemeral });
      return;
    }
    const cfg = (await tiktokStore.read(guild.id)) ?? {
      enabled: false,
      username: undefined,
      channelId: undefined,
      seen: [],
    };
    cfg.enabled = true;
    cfg.username = username;
    cfg.channelId = channel.id;
    cfg.lastVideoId = undefined;
    await tiktokStore.write(guild.id, cfg);
    startTikTokPoller();

    await interaction.reply({
      embeds: [
        embed(Colors.success)
          .setTitle("🎵 TikTok Connected")
          .setDescription(
            `Watching **@${username}**. New videos will be posted to <#${channel.id}> (checked every 5 min).\n\n_Note: this monitors the public profile; no login is required._`,
          ),
      ],
    });
  },
};

export default command;
