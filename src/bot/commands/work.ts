import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, relative } from "../utils/common.js";
import { getEconomy, saveEconomy, addBalance } from "../utils/economy.js";
import { getGuildConfig } from "../utils/data.js";

const HOUR = 60 * 60 * 1000;

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work to earn virtual coins (once per hour)")
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const guild = interaction.guild!;
    const userId = interaction.user.id;
    const cfg = await getGuildConfig(guild.id);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const st = await getEconomy(guild.id);
    const last = st.lastWork[userId] ?? 0;
    const now = Date.now();
    if (now - last < HOUR) {
      await interaction.editReply({
        embeds: [
          embed(Colors.warn).setDescription(
            `You're tired. Come back ${relative(last + HOUR)} to work again.`,
          ),
        ],
      });
      return;
    }
    st.lastWork[userId] = now;
    await saveEconomy(guild.id, st);

    const min = cfg.economy.workMin;
    const max = Math.max(min, cfg.economy.workMax);
    const earned = Math.floor(min + Math.random() * (max - min + 1));
    const balance = await addBalance(guild.id, userId, earned);

    await interaction.editReply({
      embeds: [
        embed(Colors.success).setDescription(
          `You worked hard and earned **${earned}** 🪙! New balance: **${balance.toLocaleString()}**.`,
        ),
      ],
    });
  },
};

export default command;
