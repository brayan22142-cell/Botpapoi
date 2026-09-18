import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors } from "../utils/common.js";
import { getBalance, getInventory } from "../utils/economy.js";
import { getGuildConfig } from "../utils/data.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Shows your virtual currency balance")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((o) => o.setName("user").setDescription("User to check")),

  async execute(interaction) {
    const guild = interaction.guild!;
    const user = interaction.options.getUser("user") ?? interaction.user;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const balance = await getBalance(guild.id, user.id);
    const cfg = await getGuildConfig(guild.id);
    const inv = await getInventory(guild.id, user.id);

    const invText =
      Object.keys(inv).length > 0
        ? Object.entries(inv)
            .map(([id, qty]) => {
              const item = cfg.economy.shop.find((s) => s.id === id);
              return `${item?.name ?? id} ×${qty}`;
            })
            .join(", ")
        : "None";

    const e = embed(Colors.primary)
      .setTitle(`${user.tag}'s Wallet`)
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: "🪙 Balance", value: `**${balance.toLocaleString()}** coins`, inline: true },
        { name: "🎒 Inventory", value: invText.slice(0, 900) },
      )
      .setFooter({ text: "Virtual currency · Built with VybeBot.ai" });
    await interaction.editReply({ embeds: [e] });
  },
};

export default command;
