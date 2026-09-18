import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, sanitize } from "../utils/common.js";
import { sendLog, appendLogFile } from "../utils/logging.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete a number of messages from this channel")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) =>
      o.setName("amount").setDescription("Messages to delete (1-100)").setRequired(true).setMinValue(1).setMaxValue(100),
    ),
  // Leave the ephemeral command message out of the bulk delete automatically.

  async execute(interaction) {
    const channel = interaction.channel;
    if (!channel?.isTextBased() || channel.isDMBased()) {
      await interaction.reply({ content: "This must be used in a text channel.", flags: MessageFlags.Ephemeral });
      return;
    }
    const amount = interaction.options.getInteger("amount", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const fetched = await channel.messages.fetch({ limit: Math.min(amount, 100) });
      const deletable = fetched.filter((m) => Date.now() - m.createdTimestamp < 14 * 86400_000);
      await channel.bulkDelete(deletable, true);
      await interaction.editReply({
        embeds: [
          embed(Colors.success).setDescription(`Deleted **${deletable.size}** message(s).`),
        ],
      });
      await sendLog(channel.guild, "moderation", embed(Colors.info)
        .setTitle("🧹 Bulk Delete")
        .setDescription(`${deletable.size} message(s) deleted in <#${channel.id}> by <@${interaction.user.id}>.`));
      await appendLogFile(channel.guild.id, "moderation", `CLEAR ${deletable.size} in ${channel.id} by ${interaction.user.id}`);
    } catch {
      await interaction.editReply({
        embeds: [embed(Colors.danger).setDescription("I couldn't delete messages (older than 14 days or missing permissions).")],
      });
    }
  },
};

export default command;
