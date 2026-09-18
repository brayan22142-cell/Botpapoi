import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, sanitize } from "../utils/common.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a quick reaction-based poll")
    .setContexts(InteractionContextType.Guild)
    .addStringOption((o) =>
      o.setName("question").setDescription("Poll question").setRequired(true).setMaxLength(200),
    )
    .addStringOption((o) =>
      o.setName("option1").setDescription("Option 1").setRequired(true).setMaxLength(80),
    )
    .addStringOption((o) =>
      o.setName("option2").setDescription("Option 2 (or more, comma separated)").setRequired(true).setMaxLength(500),
    ),

  async execute(interaction) {
    const question = interaction.options.getString("question", true);
    const o1 = interaction.options.getString("option1", true);
    const rest = interaction.options
      .getString("option2", true)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const options = [o1, ...rest].slice(0, 9);
    const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

    const e = embed(Colors.primary)
      .setTitle("📊 " + sanitize(question))
      .setDescription(
        options
          .map((o, i) => `${emojis[i]} **${sanitize(o)}**`)
          .join("\n\n"),
      )
      .setFooter({ text: `Poll by ${interaction.user.tag} · Built with VybeBot.ai` });

    await interaction.reply({ embeds: [e] });
    const msg = await interaction.fetchReply();
    for (let i = 0; i < options.length; i++) {
      await msg.react(emojis[i]);
    }
  },
};

export default command;
