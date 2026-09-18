import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, sanitize, newId } from "../utils/common.js";
import { getGuildConfig, saveGuildConfig } from "../utils/data.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Virtual currency shop")
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((s) => s.setName("list").setDescription("List shop items"))
    .addSubcommand((s) =>
      s.setName("add").setDescription("Add a shop item (admin)")
        .addStringOption((o) => o.setName("name").setDescription("Item name").setRequired(true).setMaxLength(60))
        .addIntegerOption((o) => o.setName("price").setDescription("Price in coins").setRequired(true).setMinValue(1))
        .addStringOption((o) => o.setName("description").setDescription("Short description").setMaxLength(200)),
    )
    .addSubcommand((s) =>
      s.setName("remove").setDescription("Remove a shop item (admin)"),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;
    const sub = interaction.options.getSubcommand();
    const cfg = await getGuildConfig(guild.id);

    if ((sub === "add" || sub === "remove") && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: "You need **Manage Server** permission to modify the shop.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === "list") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (cfg.economy.shop.length === 0) {
        await interaction.editReply({
          embeds: [embed(Colors.warn).setDescription("The shop is empty. Add items with `/shop add`.")],
        });
        return;
      }
      const e = embed(Colors.primary)
        .setTitle("🛒 Shop")
        .setDescription(
          cfg.economy.shop
            .map((s, i) => `${i + 1}. **${sanitize(s.name)}** — ${s.price.toLocaleString()} 🪙\n   ${sanitize(s.description ?? "")}`)
            .join("\n"),
        )
        .setFooter({ text: "Buy with /buy · Built with VybeBot.ai" });
      await interaction.editReply({ embeds: [e] });
      return;
    }

    if (sub === "add") {
      const name = interaction.options.getString("name", true);
      const price = interaction.options.getInteger("price", true);
      const description = interaction.options.getString("description") ?? "";
      cfg.economy.shop.push({ id: newId(8), name, price, description });
      await saveGuildConfig(guild.id, cfg);
      await interaction.reply({
        embeds: [embed(Colors.success).setDescription(`Added **${sanitize(name)}** to the shop for ${price.toLocaleString()} 🪙.`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === "remove") {
      if (cfg.economy.shop.length === 0) {
        await interaction.reply({ content: "No items to remove.", flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply({
        content: "Pick an item to remove:",
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("shop:remove")
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
    }
  },

  async stringSelectMenu(interaction: StringSelectMenuInteraction) {
    const [cmd, action] = interaction.customId.split(":");
    if (cmd !== "shop" || action !== "remove") return;
    const id = interaction.values[0];
    const cfg = await getGuildConfig(interaction.guild!.id);
    cfg.economy.shop = cfg.economy.shop.filter((s) => s.id !== id);
    await saveGuildConfig(interaction.guild!.id, cfg);
    await interaction.update({ content: "Item removed.", components: [] });
  },
};

export default command;
