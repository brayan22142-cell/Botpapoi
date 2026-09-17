import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors } from "../utils/common.js";
import { afkStore } from "../utils/data.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Mark yourself as AFK")
    .setContexts(InteractionContextType.Guild)
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason (shown when mentioned)").setMaxLength(200),
    ),

  async execute(interaction) {
    const guild = interaction.guild!;
    const reason = interaction.options.getString("reason") ?? "AFK";
    const perGuild = (await afkStore.read(guild.id)) ?? {};
    perGuild[interaction.user.id] = { reason, since: Date.now() };
    await afkStore.write(guild.id, perGuild);

    // Keep the user's nickname if bot can, otherwise just reply.
    await interaction.reply({
      embeds: [
        embed(Colors.info).setDescription(`You're now AFK: **${reason}**`).setFooter({ text: "Built with VybeBot.ai" }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    const member = await interaction.guild!.members
      .fetch(interaction.user.id)
      .catch(() => null);
    if (member) {
      void member
        .setNickname(`[AFK] ${member.displayName}`.slice(0, 32))
        .catch(() => undefined);
    }
  },
};

export function buildAfkButton(userId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`afk:clear:${userId}`)
      .setLabel("I'm back!")
      .setStyle(ButtonStyle.Secondary),
  );
}

export default command;
