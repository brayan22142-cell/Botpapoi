import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, userMention, sanitize, relative } from "../utils/common.js";
import { warnsStore } from "../utils/data.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("List a member's warnings")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("User to inspect").setRequired(true),
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return;
    const user = interaction.options.getUser("user", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const list = (await warnsStore.read(guild.id)) ?? [];
    const warns = list.filter((w) => w.userId === user.id);
    if (warns.length === 0) {
      await interaction.editReply({
        embeds: [embed(Colors.success).setDescription(`${userMention(user)} has **no** warnings. ✅`)],
      });
      return;
    }
    const desc = warns
      .map(
        (w, i) =>
          `**${i + 1}.** ${sanitize(w.reason)}\n└ by <@${w.moderatorId}> · ${relative(w.date)}`,
      )
      .join("\n");
    await interaction.editReply({
      embeds: [
        embed(Colors.warn)
          .setTitle(`Warnings for ${user.tag}`)
          .setDescription(desc.slice(0, 4000))
          .addFields({ name: "Total", value: String(warns.length) }),
      ],
    });
  },
};

export default command;
