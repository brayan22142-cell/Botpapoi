import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, sanitize, userMention, newId } from "../utils/common.js";
import { warnsStore, type Warn } from "../utils/data.js";
import { sendLog, appendLogFile } from "../utils/logging.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member and record it")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("Member to warn").setRequired(true),
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason for the warning").setRequired(true),
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return;
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const warn: Warn = {
      id: newId(8),
      userId: user.id,
      moderatorId: interaction.user.id,
      reason,
      date: Date.now(),
    };
    const list = (await warnsStore.read(guild.id)) ?? [];
    list.push(warn);
    await warnsStore.write(guild.id, list);

    await interaction.editReply({
      embeds: [
        embed(Colors.warn)
          .setTitle("⚠️ Warning Issued")
          .setDescription(`${userMention(user)} was warned.`)
          .addFields(
            { name: "Reason", value: sanitize(reason) },
            { name: "Moderator", value: userMention(interaction.user), inline: true },
            { name: "Total warnings", value: String(list.length), inline: true },
          ),
      ],
    });
    await user
      .send({
        embeds: [
          embed(Colors.warn)
            .setTitle("You received a warning")
            .setDescription(`In **${guild.name}**: ${sanitize(reason)}`),
        ],
      })
      .catch(() => undefined);
    await sendLog(guild, "moderation", embed(Colors.warn)
      .setTitle("⚠️ Warn")
      .setDescription(`${userMention(user)} warned by ${userMention(interaction.user)}`)
      .addFields({ name: "Reason", value: sanitize(reason) }));
    await appendLogFile(guild.id, "moderation", `WARN ${user.id} by ${interaction.user.id}: ${reason}`);
  },
};

export default command;
