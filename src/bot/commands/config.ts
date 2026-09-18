import {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
  PermissionFlagsBits,
  ContainerBuilder,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { getGuildConfig } from "../utils/data.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("View this server's bot configuration dashboard")
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const guild = interaction.guild!;
    await interaction.deferReply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
    const cfg = await getGuildConfig(guild.id);

    const yes = (v: boolean) => (v ? "✅ Enabled" : "❌ Disabled");

    const panel = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents((t) => t.setContent("# ⚙️ Server Configuration"))
      .addTextDisplayComponents((t) =>
        t.setContent(
          `**🎫 Tickets** — ${cfg.ticket.categoryId ? "✅ ready" : "❌ needs setup"} (${cfg.ticket.categories.length} categories)\n**👋 Welcome** — ${yes(cfg.welcome.enabled)} · **Goodbye** — ${yes(cfg.goodbye.enabled)}\n**🍯 Honeypot** — ${cfg.honeypot.enabled ? "✅ active" : "❌ off"}\n**📋 Logs** — ${cfg.logs.enabled ? `✅ → <#${cfg.logs.channelId}>` : "❌ off"}\n**💰 Economy** — ${yes(cfg.economy.enabled)} · ${cfg.economy.shop.length} shop items\n**🎵 TikTok** — ${cfg.tiktok.enabled ? `✅ → @${cfg.tiktok.username}` : "❌ off"}`,
        ),
      )
      .addTextDisplayComponents((t) =>
        t.setContent(
          "**Configure each system with:**\n`/ticket setup` + `/ticket config` + `/ticket panel` · `/welcome setup` · `/welcome goodbye` · `/honeypot setup` · `/logs setup` · `/shop add` · `/tiktok connect`",
        ),
      );

    await interaction.editReply({
      components: [panel],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
};

export default command;
