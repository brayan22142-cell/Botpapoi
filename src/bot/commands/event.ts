import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, sanitize, newId } from "../utils/common.js";
import { eventStore, type GuildEvent } from "../utils/data.js";
import { appendLogFile } from "../utils/logging.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("event")
    .setDescription("Create and manage server events")
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((s) => s.setName("create").setDescription("Create an event with an RSVP button"))
    .addSubcommand((s) => s.setName("list").setDescription("List upcoming events"))
    .addSubcommand((s) => s.setName("end").setDescription("End an event")),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;
    const sub = interaction.options.getSubcommand();

    if (sub === "create") {
      const modal = new ModalBuilder()
        .setCustomId("event:create")
        .setTitle("Create Event")
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("Event name")
            .setTextInputComponent(
              new TextInputBuilder().setCustomId("name").setMaxLength(80).setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Description")
            .setTextInputComponent(
              new TextInputBuilder().setCustomId("description").setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true),
            ),
          new LabelBuilder()
            .setLabel("Date / time (optional)")
            .setDescription("e.g. 2024-12-31 20:00")
            .setTextInputComponent(
              new TextInputBuilder().setCustomId("date").setRequired(false),
            ),
        );
      await interaction.showModal(modal);
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const events = (await eventStore.read(guild.id)) ?? [];

    if (sub === "list") {
      if (events.length === 0) {
        await interaction.editReply({ embeds: [embed(Colors.warn).setDescription("No events scheduled.")] });
        return;
      }
      await interaction.editReply({
        embeds: [
          embed(Colors.primary)
            .setTitle("📅 Events")
            .setDescription(
              events
                .map((e) => `**${sanitize(e.name)}** — ${e.attendees.length} attending`)
                .join("\n"),
            ),
        ],
      });
      return;
    }

    if (sub === "end") {
      if (events.length === 0) {
        await interaction.editReply({ embeds: [embed(Colors.warn).setDescription("No events to end.")] });
        return;
      }
      await interaction.editReply({
        content: "Pick an event to end:",
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("event:end")
              .setPlaceholder("Select event")
              .addOptions(
                events.slice(0, 25).map((e) =>
                  new StringSelectMenuOptionBuilder()
                    .setLabel(e.name.slice(0, 100))
                    .setValue(e.id)
                    .setDescription(`${e.attendees.length} attending`),
                ),
              ),
          ),
        ],
      });
    }
  },

  async button(interaction: ButtonInteraction) {
    const [cmd, action, id] = interaction.customId.split(":");
    if (cmd !== "event" || action !== "rsvp") return;
    const guild = interaction.guild!;
    const events = (await eventStore.read(guild.id)) ?? [];
    const ev = events.find((e) => e.id === id);
    if (!ev) {
      await interaction.reply({ content: "This event no longer exists.", flags: MessageFlags.Ephemeral });
      return;
    }
    const idx = ev.attendees.indexOf(interaction.user.id);
    if (idx >= 0) {
      ev.attendees.splice(idx, 1);
    } else {
      ev.attendees.push(interaction.user.id);
    }
    await eventStore.write(guild.id, events);

    if (ev.messageId) {
      const channel = (await guild.channels.fetch(ev.channelId).catch(() => null));
      if (channel?.isTextBased()) {
        await channel.messages
          .fetch(ev.messageId)
          .then((m) => m.edit({ embeds: [eventEmbed(ev)] }))
          .catch(() => undefined);
      }
    }
    await interaction.reply({
      content: idx >= 0 ? "You're no longer attending." : "You're attending! 🎉",
      flags: MessageFlags.Ephemeral,
    });
  },

  async stringSelectMenu(interaction: StringSelectMenuInteraction) {
    const [cmd, action] = interaction.customId.split(":");
    if (cmd !== "event" || action !== "end") return;
    const guild = interaction.guild!;
    const id = interaction.values[0];
    const events = (await eventStore.read(guild.id)) ?? [];
    const ev = events.find((e) => e.id === id);
    if (!ev) {
      await interaction.update({ content: "Event not found.", components: [] });
      return;
    }
    await eventStore.write(guild.id, events.filter((e) => e.id !== id));
    await appendLogFile(guild.id, "events", `END ${ev.name} attendees=${ev.attendees.length}`);
    await interaction.update({
      content: `**${ev.name}** ended with ${ev.attendees.length} attendees. Thanks for joining!`,
      components: [],
    });
  },

  async modal(interaction: ModalSubmitInteraction) {
    const [cmd, action] = interaction.customId.split(":");
    if (cmd !== "event" || action !== "create") return;
    const guild = interaction.guild!;
    const name = interaction.fields.getTextInputValue("name");
    const description = interaction.fields.getTextInputValue("description");
    const dateRaw = interaction.fields.fields.has("date") ? interaction.fields.getTextInputValue("date") : "";
    const parsedDate = dateRaw ? Date.parse(dateRaw) : undefined;
    if (dateRaw && Number.isNaN(parsedDate)) {
      await interaction.reply({ content: "That date wasn't recognized. Use a format like `2024-12-31 20:00`.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (!interaction.channel?.isTextBased() || interaction.channel.isDMBased()) {
      await interaction.reply({ content: "Please run this in a text channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const ev: GuildEvent = {
      id: newId(8),
      name,
      description,
      date: parsedDate || undefined,
      channelId: interaction.channel.id,
      creatorId: interaction.user.id,
      attendees: [],
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`event:rsvp:${ev.id}`)
        .setLabel("🎟️ RSVP")
        .setStyle(ButtonStyle.Success),
    );
    const msg = await interaction.channel.send({ embeds: [eventEmbed(ev)], components: [row] });
    ev.messageId = msg.id;

    const events = (await eventStore.read(guild.id)) ?? [];
    events.push(ev);
    await eventStore.write(guild.id, events);

    await interaction.reply({ content: `Event **${ev.name}** created!`, flags: MessageFlags.Ephemeral });
    await appendLogFile(guild.id, "events", `CREATE ${ev.name} by ${interaction.user.id}`);
  },
};

function eventEmbed(ev: GuildEvent): import("discord.js").EmbedBuilder {
  const e = embed(Colors.primary)
    .setTitle(`🎉 ${ev.name}`)
    .setDescription(sanitize(ev.description))
    .addFields(
      { name: "👥 Attending", value: String(ev.attendees.length), inline: true },
      ...(ev.date ? [{ name: "📅 Date", value: `<t:${Math.floor(ev.date / 1000)}:f>`, inline: true }] : []),
    )
    .setFooter({ text: "Built with VybeBot.ai" });
  return e;
}

export default command;
