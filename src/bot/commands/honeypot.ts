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
  RoleSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, sanitize, relative } from "../utils/common.js";
import { getGuildConfig, saveGuildConfig, honeypotStore } from "../utils/data.js";

function isInvite(text: string): boolean {
  return /discord\.gg\/[a-zA-Z0-9]+|discord(?:app)?\.com\/invite\/[a-zA-Z0-9]+/i.test(text);
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("honeypot")
    .setDescription("Anti-scam honeypot channel setup & review")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName("setup").setDescription("Configure the honeypot channel and staff role"))
    .addSubcommand((s) =>
      s.setName("review").setDescription("Review a user's honeypot incidents")
        .addUserOption((o) => o.setName("user").setDescription("User to review").setRequired(true)),
    )
    .addSubcommand((s) => s.setName("incidents").setDescription("List recent honeypot incidents")),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;
    const sub = interaction.options.getSubcommand();

    if (sub === "setup") {
      const cfg = await getGuildConfig(guild.id);
      const modal = new ModalBuilder()
        .setCustomId("honeypot:setup")
        .setTitle("Honeypot Setup")
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("Honeypot channel")
            .setDescription("Messages posted here are treated as scam attempts.")
            .setChannelSelectMenuComponent(
              new ChannelSelectMenuBuilder()
                .setCustomId("channel")
                .setChannelTypes(ChannelType.GuildText)
                .setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Staff role")
            .setDescription("Notified when an incident is detected.")
            .setRoleSelectMenuComponent(
              new RoleSelectMenuBuilder().setCustomId("role").setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Incident message")
            .setDescription("Shown to staff when a trigger fires.")
            .setTextInputComponent(
              new TextInputBuilder()
                .setCustomId("incidentText")
                .setStyle(TextInputStyle.Paragraph)
                .setValue(cfg.honeypot.incidentText)
                .setMaxLength(1000)
                .setRequired(true),
            ),
        );
      await interaction.showModal(modal);
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (sub === "review") {
      const user = interaction.options.getUser("user", true);
      const list = (await honeypotStore.read(guild.id)) ?? [];
      const mine = list.filter((i) => i.userId === user.id);
      if (mine.length === 0) {
        await interaction.editReply({
          embeds: [embed(Colors.success).setDescription(`No honeypot incidents for <@${user.id}>. ✅`)],
        });
        return;
      }
      await interaction.editReply({
        embeds: [
          embed(Colors.warn)
            .setTitle(`Incidents for ${user.tag}`)
            .setDescription(
              mine
                .slice(-10)
                .map((i) => `• ${sanitize(i.content.slice(0, 100))} · ${relative(i.date)}${i.reviewed ? " · ✅ reviewed" : ""}`)
                .join("\n"),
            ),
        ],
      });
      return;
    }

    if (sub === "incidents") {
      const list = (await honeypotStore.read(guild.id)) ?? [];
      if (list.length === 0) {
        await interaction.editReply({
          embeds: [embed(Colors.success).setDescription("No honeypot incidents recorded. 🎉")],
        });
        return;
      }
      await interaction.editReply({
        embeds: [
          embed(Colors.warn)
            .setTitle("Honeypot Incidents")
            .setDescription(
              list
                .slice(-15)
                .map((i) => `• <@${i.userId}> · ${relative(i.date)}${i.reviewed ? " · ✅" : " · ⏳"}`)
                .join("\n"),
            ),
        ],
      });
      return;
    }
  },

  async modal(interaction: ModalSubmitInteraction) {
    const [cmd, action] = interaction.customId.split(":");
    if (cmd !== "honeypot" || action !== "setup") return;
    const guild = interaction.guild!;
    const channel = interaction.fields.getSelectedChannels("channel", true).first();
    const role = interaction.fields.getSelectedRoles("role", true).first();
    const incidentText = interaction.fields.getTextInputValue("incidentText");
    if (!channel || !role) {
      await interaction.reply({ content: "Missing channel or role selection.", flags: MessageFlags.Ephemeral });
      return;
    }
    const cfg = await getGuildConfig(guild.id);
    cfg.honeypot.enabled = true;
    cfg.honeypot.channelId = channel.id;
    cfg.honeypot.staffRoleId = role.id;
    cfg.honeypot.incidentText = incidentText;
    await saveGuildConfig(guild.id, cfg);
    await interaction.reply({
      content: `Honeypot enabled in <#${channel.id}>. Invite links posted there will be deleted and reported.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export { isInvite };
export default command;
