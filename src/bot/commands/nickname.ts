import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, userMention, sanitize } from "../utils/common.js";
import { sendLog, appendLogFile } from "../utils/logging.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("nickname")
    .setDescription("Set or clear a member's nickname")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption((o) =>
      o.setName("user").setDescription("Member").setRequired(true),
    )
    .addStringOption((o) =>
      o.setName("nickname").setDescription("New nickname (leave empty to clear)").setMaxLength(32),
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return;
    const user = interaction.options.getUser("user", true);
    const nickname = interaction.options.getString("nickname");
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const target = await guild.members.fetch(user.id).catch(() => null);
    if (!target) {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription("User not found.")] });
      return;
    }
    const me = guild.members.me;
    if (!me) {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription("Couldn't verify my permissions.")] });
      return;
    }
    if (me.roles.highest.position <= target.roles.highest.position) {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription("My role is not high enough for that user.")] });
      return;
    }
    try {
      await target.setNickname(nickname ?? null, `By ${interaction.user.tag}`);
    } catch {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription("I couldn't change the nickname.")] });
      return;
    }
    await interaction.editReply({
      embeds: [
        embed(Colors.success).setDescription(
          nickname
            ? `Nickname set for ${userMention(user)}.`
            : `Nickname cleared for ${userMention(user)}.`,
        ),
      ],
    });
    if (nickname) {
      await sendLog(guild, "moderation", embed(Colors.info)
        .setTitle("✏️ Nickname")
        .setDescription(`${userMention(user)} nickname set by <@${interaction.user.id}>`));
      await appendLogFile(guild.id, "moderation", `NICK ${user.id} = ${sanitize(nickname)} by ${interaction.user.id}`);
    }
  },
};

export default command;
