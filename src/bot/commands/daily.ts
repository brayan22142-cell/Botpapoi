import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, relative } from "../utils/common.js";
import { getEconomy, saveEconomy, addBalance } from "../utils/economy.js";
import { getGuildConfig } from "../utils/data.js";

const DAY = 24 * 60 * 60 * 1000;

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily virtual coins")
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const guild = interaction.guild!;
    const userId = interaction.user.id;
    const cfg = await getGuildConfig(guild.id);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const st = await getEconomy(guild.id);
    const last = st.lastDaily[userId] ?? 0;
    const now = Date.now();
    if (now - last < DAY) {
      await interaction.editReply({
        embeds: [
          embed(Colors.warn).setDescription(
            `You already claimed your daily reward. Come back ${relative(last + DAY)}.`,
          ),
        ],
      });
      return;
    }
    st.lastDaily[userId] = now;
    await saveEconomy(guild.id, st);
    const balance = await addBalance(guild.id, userId, cfg.economy.daily);

    await interaction.editReply({
      embeds: [
        embed(Colors.success).setDescription(
          `You claimed **${cfg.economy.daily}** 🪙! New balance: **${balance.toLocaleString()}**.`,
        ),
      ],
    });
  },
};

export default command;
