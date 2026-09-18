import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors } from "../utils/common.js";
import { getGuildConfig } from "../utils/data.js";
import { addInventoryItem, addBalance, getBalance } from "../utils/economy.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Buy an item from the shop")
    .setContexts(InteractionContextType.Guild),

  async execute(interaction: ChatInputCommandInteraction) {
    const cfg = await getGuildConfig(interaction.guild!.id);
    if (cfg.economy.shop.length === 0) {
      await interaction.reply({
        embeds: [embed(Colors.warn).setDescription("The shop is empty.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.reply({
      content: "Pick an item to buy:",
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("buy:pick")
            .setPlaceholder("Select item")
            .addOptions(
              cfg.economy.shop.map((s) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(s.name.slice(0, 100))
                  .setValue(s.id)
                  .setDescription(`${s.price.toLocaleString()} coins`),
              ),
            ),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },

  async stringSelectMenu(interaction: StringSelectMenuInteraction) {
    const [cmd, action] = interaction.customId.split(":");
    if (cmd !== "buy" || action !== "pick") return;
    const guild = interaction.guild!;
    const id = interaction.values[0];
    const cfg = await getGuildConfig(guild.id);
    const item = cfg.economy.shop.find((s) => s.id === id);
    if (!item) {
      await interaction.update({ content: "Item no longer exists.", components: [] });
      return;
    }

    const balance = await getBalance(guild.id, interaction.user.id);
    if (balance < item.price) {
      await interaction.update({
        content: `You don't have enough coins. Balance: **${balance.toLocaleString()}** 🪙.`,
        components: [],
      });
      return;
    }
    await addBalance(guild.id, interaction.user.id, -item.price);
    await addInventoryItem(guild.id, interaction.user.id, item.id, 1);
    await interaction.update({
      content: `You bought **${item.name}** for ${item.price.toLocaleString()} 🪙.`,
      components: [],
    });
  },
};

export default command;
