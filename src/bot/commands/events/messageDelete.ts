import { Events, type Message, type PartialMessage } from "discord.js";
import type { BotEvent } from "./index.js";
import { embed, Colors, sanitize } from "../utils/common.js";
import { getGuildConfig } from "../utils/data.js";
import { sendLog } from "../utils/logging.js";

const event: BotEvent<Events.MessageDelete> = {
  name: Events.MessageDelete,

  async execute(message: Message | PartialMessage): Promise<void> {
    if (!message.guild || message.author?.bot) return;
    const cfg = await getGuildConfig(message.guild.id);
    if (!cfg.logs.enabled || !cfg.logs.channelId || cfg.logs.types.messages === false) return;

    await sendLog(
      message.guild,
      "messages",
      embed(Colors.danger)
        .setTitle("🗑️ Message Deleted")
        .setDescription(`<@${message.author!.id}> in <#${message.channelId}>`)
        .addFields({
          name: "Content",
          value: sanitize(message.content?.slice(0, 1000) || "*no content*"),
        })
        .setTimestamp(),
    );
  },
};

export default event;
