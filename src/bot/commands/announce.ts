import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType,
} from "discord.js";
import type { BotCommand } from "./index.js";
import { embed, Colors, sanitize } from "../utils/common.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Send an announcement to this channel (or a chosen one)")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) =>
      o.setName("title").setDescription("Announcement title").setRequired(true).setMaxLength(200),
    )
    .addStringOption((o) =>
      o.setName("message").setDescription("Announcement body").setRequired(true).setMaxLength(2000),
    )
    .addChannelOption((o) =>
      o.setName("channel").setDescription("Where to post (defaults to this channel)"),
    )
    .addBooleanOption((o) =>
      o.setName("ping").setDescription("Ping @everyone"),
    ),

  async execute(interaction) {
    const title = interaction.options.getString("title", true);
    const message = interaction.options.getString("message", true);
    const ping = interaction.options.getBoolean("ping") ?? false;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const targetId =
      interaction.options.getChannel("channel")?.id ?? interaction.channelId;
    const target = await interaction.guild!.channels
      .fetch(targetId)
      .catch(() => null);
    if (!target?.isTextBased() || target.isDMBased()) {
      await interaction.editReply({ content: "Please pick a text channel." });
      return;
    }
    const e = embed(Colors.primary)
      .setTitle(sanitize(title))
      .setDescription(message)
      .setTimestamp()
      .setFooter({ text: `Announced by ${interaction.user.tag} · Built with VybeBot.ai` });
    await target.send({ content: ping ? "@everyone" : undefined, embeds: [e] });
    await interaction.editReply({ content: `Announcement posted to <#${target.id}>.` });
  },
};

export default command;
