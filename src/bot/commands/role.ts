import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, userMention } from "../utils/common.js";
import { sendLog, appendLogFile } from "../utils/logging.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage a member's roles")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Add a role to a member")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
        .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Remove a role from a member")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
        .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true)),
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return;
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user", true);
    const role = interaction.options.getRole("role", true);
    if (!role) {
      await interaction.reply({ content: "Invalid role.", flags: MessageFlags.Ephemeral });
      return;
    }
    const me = guild.members.me;
    if (!me || me.roles.highest.position <= role.position) {
      await interaction.reply({ content: "My highest role is below that role, so I can't manage it.", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const target = await guild.members.fetch(user.id).catch(() => null);
    if (!target) {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription("User not found in the server.")] });
      return;
    }
    try {
      if (sub === "add") {
        await target.roles.add(role.id, `By ${interaction.user.tag}`);
      } else {
        await target.roles.remove(role.id, `By ${interaction.user.tag}`);
      }
    } catch {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription("I couldn't modify that role.")] });
      return;
    }
    await interaction.editReply({
      embeds: [
        embed(Colors.success).setDescription(
          `${sub === "add" ? "Added" : "Removed"} <@&${role.id}> ${sub === "add" ? "to" : "from"} ${userMention(user)}.`,
        ),
      ],
    });
    await sendLog(guild, "roles", embed(Colors.info)
      .setTitle(sub === "add" ? "➕ Role Added" : "➖ Role Removed")
      .setDescription(`${userMention(user)} ${sub === "add" ? "got" : "lost"} <@&${role.id}> · by <@${interaction.user.id}>.`));
    await appendLogFile(guild.id, "moderation", `ROLE ${sub.toUpperCase()} ${user.id} ${role.id} by ${interaction.user.id}`);
  },
};

export default command;
