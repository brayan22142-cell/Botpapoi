import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
  ChannelType,
  ContainerBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
  ModalBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder,
  type InteractionReplyOptions,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, sanitize, newId } from "../utils/common.js";
import {
  getGuildConfig,
  saveGuildConfig,
  ticketsStore,
  transcriptPath,
  type TicketRecord,
  type TicketCategory,
} from "../utils/data.js";
import { sendLog, appendLogFile } from "../utils/logging.js";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

function parseHex(input: string): number | null {
  const m = input.replace("#", "").match(/^[0-9a-fA-F]{6}$/);
  return m ? parseInt(m[0], 16) : null;
}

async function openTicketModal(
  interaction: ButtonInteraction | ChatInputCommandInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;
  const cfg = await getGuildConfig(guild.id);

  const modal = new ModalBuilder()
    .setCustomId("ticket:open")
    .setTitle(cfg.ticket.title || "Open a Ticket");

  const labels: LabelBuilder[] = [];

  if (cfg.ticket.categories.length > 0) {
    labels.push(
      new LabelBuilder()
        .setLabel("Category")
        .setDescription("Pick the topic of your ticket.")
        .setStringSelectMenuComponent(
          new StringSelectMenuBuilder()
            .setCustomId("category")
            .setRequired(true)
            .addOptions(
              cfg.ticket.categories.map((c) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(c.label.slice(0, 100))
                  .setValue(c.id)
                  .setDescription(c.description ? c.description.slice(0, 100) : "General support")
                  .setEmoji(c.emoji ?? "🎫"),
              ),
            ),
        ),
    );
  }

  labels.push(
    new LabelBuilder()
      .setLabel("Describe your issue")
      .setDescription("Tell us how we can help you.")
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId("reason")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Briefly describe your request…")
          .setMaxLength(1000)
          .setRequired(false),
      ),
  );

  modal.addLabelComponents(...labels.slice(0, 5));
  await interaction.showModal(modal);
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Professional support tickets")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s.setName("setup").setDescription("Configure the ticket panel text and colors"),
    )
    .addSubcommandGroup((g) =>
      g
        .setName("category")
        .setDescription("Manage ticket categories")
        .addSubcommand((s) => s.setName("add").setDescription("Add a category"))
        .addSubcommand((s) => s.setName("remove").setDescription("Remove a category")),
    )
    .addSubcommand((s) =>
      s.setName("panel").setDescription("Send the ticket panel to this channel"),
    )
    .addSubcommand((s) =>
      s.setName("config").setDescription("Set category, staff role, transcript & panel channels"),
    )
    .addSubcommand((s) =>
      s.setName("close").setDescription("Close the current ticket channel"),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "setup") {
      const cfg = await getGuildConfig(guild.id);
      const modal = new ModalBuilder()
        .setCustomId("ticket:setup")
        .setTitle("Ticket Panel Setup")
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("Title")
            .setDescription("Panel title, keep under 45 chars.")
            .setTextInputComponent(
              new TextInputBuilder()
                .setCustomId("title")
                .setValue(cfg.ticket.title.slice(0, 40))
                .setMaxLength(40)
                .setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Description")
            .setDescription("What members see on the panel.")
            .setTextInputComponent(
              new TextInputBuilder()
                .setCustomId("description")
                .setStyle(TextInputStyle.Paragraph)
                .setValue(cfg.ticket.description)
                .setMaxLength(1000)
                .setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Button label")
            .setDescription("Text on the open-ticket button.")
            .setTextInputComponent(
              new TextInputBuilder()
                .setCustomId("buttonLabel")
                .setValue(cfg.ticket.buttonLabel)
                .setMaxLength(40)
                .setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Color (hex)")
            .setDescription("e.g. 5865F2")
            .setTextInputComponent(
              new TextInputBuilder()
                .setCustomId("color")
                .setValue(cfg.ticket.color.toString(16))
                .setMaxLength(7)
                .setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Image URL")
            .setDescription("Optional banner for the panel.")
            .setTextInputComponent(
              new TextInputBuilder()
                .setCustomId("imageUrl")
                .setValue(cfg.ticket.imageUrl ?? "")
                .setMaxLength(300)
                .setRequired(false),
            ),
        );
      await interaction.showModal(modal);
      return;
    }

    if (interaction.options.getSubcommandGroup() === "category") {
      const cfg = await getGuildConfig(guild.id);
      const action = interaction.options.getSubcommand();
        if (action === "add") {
          const modal = new ModalBuilder()
            .setCustomId("ticket:catadd")
            .setTitle("Add Ticket Category")
            .addLabelComponents(
              new LabelBuilder()
                .setLabel("Category name")
                .setTextInputComponent(
                  new TextInputBuilder().setCustomId("catname").setMaxLength(40).setRequired(true),
                ),
              new LabelBuilder()
                .setLabel("Emoji (optional)")
                .setTextInputComponent(
                  new TextInputBuilder().setCustomId("catemoji").setMaxLength(8).setRequired(false),
                ),
              new LabelBuilder()
                .setLabel("Description (optional)")
                .setTextInputComponent(
                  new TextInputBuilder().setCustomId("catdesc").setMaxLength(200).setRequired(false),
                ),
            );
          await interaction.showModal(modal);
          return;
        }
        // remove
        if (cfg.ticket.categories.length === 0) {
          await interaction.reply({
            content: "No categories to remove. Add one with `/ticket category add`.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await interaction.reply({
          content: "Pick a category to remove:",
          components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId("ticket:catremove")
                .setPlaceholder("Select category")
                .addOptions(
                  cfg.ticket.categories.map((c) =>
                    new StringSelectMenuOptionBuilder()
                      .setLabel(c.label.slice(0, 100))
                      .setValue(c.id)
                      .setDescription(c.description?.slice(0, 100) ?? "Category"),
                  ),
                ),
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (sub === "panel") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const cfg = await getGuildConfig(guild.id);
      const channel = (interaction.channel?.type === ChannelType.GuildText
        ? interaction.channel
        : null) as import("discord.js").TextChannel | null;
      if (!channel) {
        await interaction.editReply({ content: "Run this in a text channel." });
        return;
      }
      const openButton = new ButtonBuilder()
        .setCustomId("ticket:open")
        .setLabel(cfg.ticket.buttonLabel)
        .setStyle(ButtonStyle.Primary)
        .setEmoji(cfg.ticket.buttonEmoji ?? "🎫");

      const panel = new ContainerBuilder()
        .setAccentColor(cfg.ticket.color)
        .addTextDisplayComponents((t) => t.setContent(`# ${cfg.ticket.title}`))
        .addTextDisplayComponents((t) => t.setContent(cfg.ticket.description))
        .addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(openButton),
        );

      const sent = await channel.send({
        components: [panel],
        flags: MessageFlags.IsComponentsV2,
      });
      cfg.ticket.panelChannelId = channel.id;
      cfg.ticket.panelMessageId = sent.id;
      await saveGuildConfig(guild.id, cfg);
      await interaction.editReply({ content: "Ticket panel sent." });
      return;
    }

    if (sub === "config") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const cfg = await getGuildConfig(guild.id);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("ticket:cfgcategory").setLabel("Category").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ticket:cfgstaff").setLabel("Staff Role").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ticket:cfgtranscript").setLabel("Transcript Ch.").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("ticket:cfgpanel").setLabel("Panel Ch.").setStyle(ButtonStyle.Secondary),
      );
      const status = [
        `**Category:** ${cfg.ticket.categoryId ? `<#${cfg.ticket.categoryId}>` : "not set"}`,
        `**Staff role:** ${cfg.ticket.staffRoleId ? `<@&${cfg.ticket.staffRoleId}>` : "not set"}`,
        `**Transcript channel:** ${cfg.ticket.transcriptChannelId ? `<#${cfg.ticket.transcriptChannelId}>` : "not set"}`,
        `**Panel channel:** ${cfg.ticket.panelChannelId ? `<#${cfg.ticket.panelChannelId}>` : "not set"}`,
      ].join("\n");
      await interaction.editReply({
        embeds: [embed(Colors.primary).setTitle("Ticket Configuration").setDescription(status)],
        components: [row],
      });
      return;
    }

    if (sub === "close") {
      const channel = interaction.channel;
      if (!channel || !channel.isTextBased()) {
        await interaction.reply({ content: "Run this in a ticket channel.", flags: MessageFlags.Ephemeral });
        return;
      }
      const rec = await ticketsStore.read(channel.id);
      if (!rec) {
        await interaction.reply({ content: "This isn't an open ticket channel.", flags: MessageFlags.Ephemeral });
        return;
      }
      await closeTicket(interaction, channel.id);
    }
  },

  // ---- Buttons ----
  async button(interaction) {
    const [cmd, action, ...rest] = interaction.customId.split(":");
    if (cmd !== "ticket") return;

    if (action === "open") {
      const cfg = await getGuildConfig(interaction.guild!.id);
      if (!cfg.ticket.enabled && !cfg.ticket.categoryId) {
        await interaction.reply({ content: "Tickets are not configured yet. Ask an admin to run `/ticket setup` and `/ticket config`.", flags: MessageFlags.Ephemeral });
        return;
      }
      await openTicketModal(interaction);
      return;
    }

    if (action === "close") {
      const id = rest.join(":");
      await interaction.reply(
        actionRowConfirm(
          "Are you sure you want to close this ticket?",
          `ticket:confirmclose:${id}`,
          `ticket:cancelclose:${id}`,
        ),
      );
      return;
    }
    if (action === "confirmclose") {
      const id = rest.join(":");
      await interaction.deferUpdate();
      await closeTicket(interaction, id);
      return;
    }
    if (action === "cancelclose") {
      await interaction.deferUpdate();
      await interaction.followUp({ content: "Close cancelled.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "claim") {
      const id = rest.join(":");
      const rec = await ticketsStore.read(id);
      if (!rec) {
        await interaction.reply({ content: "This ticket doesn't exist anymore.", flags: MessageFlags.Ephemeral });
        return;
      }
      rec.claimedById = interaction.user.id;
      await ticketsStore.write(id, rec);
      await interaction.reply({ content: `Claimed by <@${interaction.user.id}>.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "adduser") {
      const id = rest.join(":");
      const modal = new ModalBuilder()
        .setCustomId(`ticket:adduser:${id}`)
        .setTitle("Add a user to this ticket")
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("User")
            .setDescription("Pick who to invite into the ticket.")
            .setUserSelectMenuComponent(
              new UserSelectMenuBuilder().setCustomId("target").setRequired(true),
            ),
        );
      await interaction.showModal(modal);
      return;
    }

    if (action === "cfgcategory") {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId("ticket:cfg:category")
          .setTitle("Ticket Category")
          .addLabelComponents(
            new LabelBuilder()
              .setLabel("Category")
              .setDescription("Where new tickets are created.")
              .setChannelSelectMenuComponent(
                new ChannelSelectMenuBuilder()
                  .setCustomId("value")
                  .setChannelTypes(ChannelType.GuildCategory)
                  .setRequired(true),
              ),
          ),
      );
      return;
    }
    if (action === "cfgstaff") {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId("ticket:cfg:staff")
          .setTitle("Staff Role")
          .addLabelComponents(
            new LabelBuilder()
              .setLabel("Staff role")
              .setDescription("Role that can handle tickets.")
              .setRoleSelectMenuComponent(
                new RoleSelectMenuBuilder().setCustomId("value").setRequired(true),
              ),
          ),
      );
      return;
    }
    if (action === "cfgtranscript") {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId("ticket:cfg:transcript")
          .setTitle("Transcript Channel")
          .addLabelComponents(
            new LabelBuilder()
              .setLabel("Channel")
              .setDescription("Where transcripts are logged.")
              .setChannelSelectMenuComponent(
                new ChannelSelectMenuBuilder()
                  .setCustomId("value")
                  .setChannelTypes(ChannelType.GuildText)
                  .setRequired(true),
              ),
          ),
      );
      return;
    }
    if (action === "cfgpanel") {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId("ticket:cfg:panel")
          .setTitle("Panel Channel")
          .addLabelComponents(
            new LabelBuilder()
              .setLabel("Channel")
              .setDescription("Where the panel lives (optional).")
              .setChannelSelectMenuComponent(
                new ChannelSelectMenuBuilder()
                  .setCustomId("value")
                  .setChannelTypes(ChannelType.GuildText)
                  .setRequired(true),
              ),
          ),
      );
      return;
    }
  },

  async stringSelectMenu(interaction) {
    const [cmd, action] = interaction.customId.split(":");
    if (cmd !== "ticket") return;
    if (action === "catremove") {
      const id = interaction.values[0];
      const cfg = await getGuildConfig(interaction.guild!.id);
      cfg.ticket.categories = cfg.ticket.categories.filter((c) => c.id !== id);
      await saveGuildConfig(interaction.guild!.id, cfg);
      await interaction.update({ content: "Category removed.", components: [] });
    }
  },

  async modal(interaction) {
    const [cmd, action, ...rest] = interaction.customId.split(":");
    if (cmd !== "ticket") return;
    const guild = interaction.guild!;

    if (action === "setup") {
      const fields = interaction.fields;
      const title = fields.getTextInputValue("title");
      const description = fields.getTextInputValue("description");
      const buttonLabel = fields.getTextInputValue("buttonLabel");
      const colorRaw = fields.getTextInputValue("color");
      const color = parseHex(colorRaw) ?? Colors.primary;
      const imageUrl =
        fields.fields.has("imageUrl") ? fields.getTextInputValue("imageUrl") ?? "" : "";
      const cfg = await getGuildConfig(guild.id);
      cfg.ticket.title = title;
      cfg.ticket.description = description;
      cfg.ticket.buttonLabel = buttonLabel;
      cfg.ticket.color = color;
      cfg.ticket.enabled = true;
      cfg.ticket.imageUrl = imageUrl && /^https?:\/\//.test(imageUrl) ? imageUrl : undefined;
      await saveGuildConfig(guild.id, cfg);
      await interaction.reply({
        content: "Ticket panel configured! Send it with `/ticket panel`, then set category and staff role with `/ticket config`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === "catadd") {
      const fields = interaction.fields;
      const name = fields.getTextInputValue("catname");
      const emoji =
        fields.fields.has("catemoji") ? fields.getTextInputValue("catemoji") ?? "" : "";
      const desc =
        fields.fields.has("catdesc") ? fields.getTextInputValue("catdesc") ?? "" : "";
      const cfg = await getGuildConfig(guild.id);
      const cat: TicketCategory = {
        id: newId(6),
        label: name,
        emoji: emoji || undefined,
        description: desc || undefined,
      };
      cfg.ticket.categories.push(cat);
      await saveGuildConfig(guild.id, cfg);
      await interaction.reply({ content: `Category **${name}** added.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "open") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await createTicket(interaction, guild.id, interaction.user.id);
      return;
    }

    if (action === "adduser") {
      const id = rest.join(":");
      const target = interaction.fields.getSelectedUsers("value", true).first();
      if (!target) {
        await interaction.reply({ content: "No user selected.", flags: MessageFlags.Ephemeral });
        return;
      }
      const channel = (await guild.channels.fetch(id).catch(() => null));
      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.reply({ content: "Ticket channel not found.", flags: MessageFlags.Ephemeral });
        return;
      }
      await channel.permissionOverwrites.create(target, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
      await interaction.reply({ content: `Added <@${target.id}> to the ticket.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "cfg") {
      const key = rest.join(":");
      const cfg = await getGuildConfig(guild.id);
      if (key === "staff") {
        const role = interaction.fields.getSelectedRoles("value", true).first();
        if (role) cfg.ticket.staffRoleId = role.id;
      } else {
        const ch = interaction.fields.getSelectedChannels("value", true).first();
        if (!ch) {
          await interaction.reply({ content: "No channel selected.", flags: MessageFlags.Ephemeral });
          return;
        }
        if (key === "category") cfg.ticket.categoryId = ch.id;
        else if (key === "transcript") cfg.ticket.transcriptChannelId = ch.id;
        else if (key === "panel") cfg.ticket.panelChannelId = ch.id;
      }
      await saveGuildConfig(guild.id, cfg);
      await interaction.reply({ content: `Set **${key}**.`, flags: MessageFlags.Ephemeral });
      return;
    }
  },
};

function actionRowConfirm(
  message: string,
  confirmId: string,
  cancelId: string,
): InteractionReplyOptions {
  return {
    content: message,
    flags: MessageFlags.Ephemeral,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(confirmId).setLabel("Confirm Close").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(cancelId).setLabel("Cancel").setStyle(ButtonStyle.Secondary),
      ),
    ],
  };
}

async function createTicket(
  interaction: ButtonInteraction | ModalSubmitInteraction | ChatInputCommandInteraction,
  guildId: string,
  userId: string,
): Promise<void> {
  const guild = interaction.guild!;
  const cfg = await getGuildConfig(guildId);
  if (!cfg.ticket.categoryId) {
    await ephemeralReply(interaction, "Tickets aren't fully configured. Ask an admin to run `/ticket config`.");
    return;
  }
  cfg.ticket.counter += 1;
  const id = `ticket-${cfg.ticket.counter}`;
  await saveGuildConfig(guildId, cfg);

  const overwrites: Array<{ id: import("discord.js").Snowflake; allow?: bigint[]; deny?: bigint[] }> = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: userId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
  ];
  if (cfg.ticket.staffRoleId) {
    overwrites.push({
      id: cfg.ticket.staffRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
    });
  }

  const categoryId = cfg.ticket.categories.find(
    (c) => c.id === (interaction.isModalSubmit() && interaction.fields.fields.has("category")
      ? interaction.fields.getStringSelectValues("category")[0]
      : undefined),
  );

  const channel = await guild.channels.create({
    name: id,
    type: ChannelType.GuildText,
    parent: cfg.ticket.categoryId,
    permissionOverwrites: overwrites as never,
  });

  const record: TicketRecord = {
    id,
    guildId,
    userId,
    categoryId: categoryId?.id ?? "general",
    categoryLabel: categoryId?.label ?? "General",
    channelId: channel.id,
    createdAt: Date.now(),
  };
  await ticketsStore.write(channel.id, record);

  const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticket:claim:${channel.id}`).setLabel("Claim").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ticket:close:${channel.id}`).setLabel("Close").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ticket:adduser:${channel.id}`).setLabel("Add User").setStyle(ButtonStyle.Secondary),
  );

  await channel.send({
    embeds: [
      embed(cfg.ticket.color)
        .setTitle(record.categoryLabel)
        .setDescription(`Welcome <@${userId}>! A staff member will be with you shortly.\nTicket ID: **${record.id}**`),
    ],
    components: [controlRow],
  });

  await ephemeralReply(interaction, `Ticket created: <#${channel.id}>`);
  await appendLogFile(guildId, "tickets", `OPEN ${record.id} ${channel.id} user=${userId}`);
  await sendLog(guild, "tickets", embed(Colors.success)
    .setTitle("🎫 Ticket Opened")
    .setDescription(`<#${channel.id}> by <@${userId}>`));
}

async function closeTicket(interaction: ButtonInteraction | ChatInputCommandInteraction, channelId: string): Promise<void> {
  const guild = interaction.guild!;
  if (!guild) return;
  const rec = await ticketsStore.read(channelId);
  if (!rec) {
    await ephemeralReply(interaction, "This isn't an open ticket channel.");
    return;
  }
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  const cfg = await getGuildConfig(guild.id);

  // Build transcript
  let transcript = `Ticket ${rec.id} · ${rec.categoryLabel}\nOpened by <@${rec.userId}>\n\n`;
  if (channel?.isTextBased()) {
    let before: string | undefined;
    for (let i = 0; i < 10; i++) {
      const page = await channel.messages
        .fetch({ limit: 100, ...(before ? { before } : {}) })
        .catch(() => null);
      if (!page || page.size === 0) break;
      page.reverse().forEach((m) => {
        transcript += `${m.author.tag} [${new Date(m.createdTimestamp).toISOString()}]: ${m.content}\n`;
      });
      before = page.lastKey();
      if (page.size < 100) break;
    }
  }
  try {
    const file = transcriptPath(guild.id, rec.id);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, transcript, "utf-8");
    if (cfg.ticket.transcriptChannelId) {
      const tchan = (await guild.channels.fetch(cfg.ticket.transcriptChannelId).catch(() => null));
      if (tchan?.isTextBased()) {
        await tchan.send({
          content: `Transcript for **${rec.id}**`,
          files: [{ attachment: file, name: `${rec.id}.txt` }],
        });
      }
    }
  } catch (e) {
    // transcript best-effort
  }

  await ticketsStore.delete(channelId);
  await appendLogFile(guild.id, "tickets", `CLOSE ${rec.id} by ${interaction.user.id}`);
  await sendLog(guild, "tickets", embed(Colors.warn)
    .setTitle("🎫 Ticket Closed")
    .setDescription(`${rec.id} closed by <@${interaction.user.id}>`));

  await ephemeralReply(interaction, `Ticket **${rec.id}** closed.`);
  if (channel?.isTextBased()) {
    try {
      await channel.delete("Ticket closed");
    } catch {
      // channel already gone
    }
  }
}

async function ephemeralReply(interaction: ButtonInteraction | ModalSubmitInteraction | ChatInputCommandInteraction, content: string): Promise<void> {
  if ("deferred" in interaction && interaction.deferred) {
    await interaction.editReply({ content });
  } else {
    const payload: InteractionReplyOptions = { content, flags: MessageFlags.Ephemeral };
    if ("replied" in interaction && interaction.replied) {
      await interaction.followUp(payload);
    } else if (interaction.isRepliable()) {
      await interaction.reply(payload);
    }
  }
}

export default command;
