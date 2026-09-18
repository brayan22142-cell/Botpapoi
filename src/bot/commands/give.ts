import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors } from "../utils/common.js";
import { transferBalance, getBalance } from "../utils/economy.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("give")
    .setDescription("Give virtual coins to another user")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((o) => o.setName("user").setDescription("Recipient").setRequired(true))
    .addIntegerOption((o) => o.setName("amount").setDescription("Coins to give").setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const guild = interaction.guild!;
    const to = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (to.bot) {
      await interaction.editReply({ embeds: [embed(Colors.danger).setDescription("You can't give coins to a bot.")] });
      return;
    }
    const res = await transferBalance(guild.id, interaction.user.id, to.id, amount);
    if (!res.ok) {
      await interaction.editReply({
        embeds: [
          embed(Colors.danger).setDescription(
            `You don't have enough coins. Your balance: **${res.fromBalance?.toLocaleString() ?? 0}** 🪙.`,
          ),
        ],
      });
      return;
    }
    await interaction.editReply({
      embeds: [
        embed(Colors.success).setDescription(
          `You gave **${amount.toLocaleString()}** 🪙 to <@${to.id}>.`,
        ),
      ],
    });
  },
};

export default command;
