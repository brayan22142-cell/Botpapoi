import { Events, type Message, type PartialMessage } from "discord.js";
import type { BotEvent } from "./index.js";
import { embed, Colors, sanitize } from "../utils/common.js";
import { getGuildConfig } from "../utils/data.js";
import { sendLog } from "../utils/logging.js";

const event: BotEvent<Events.MessageUpdate> = {
  name: Events.MessageUpdate,

  async execute(oldMsg: Message | PartialMessage, newMsg: Message | PartialMessage): Promise<void> {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    if (!newMsg.content) return;
    const cfg = await getGuildConfig(newMsg.guild.id);
    if (!cfg.logs.enabled || !cfg.logs.channelId || cfg.logs.types.messages === false) return;

    await sendLog(
      newMsg.guild,
      "messages",
      embed(Colors.warn)
        .setTitle("✏️ Message Edited")
        .setDescription(`<@${newMsg.author!.id}> in <#${newMsg.channelId}>`)
        .addFields(
          { name: "Before", value: sanitize(oldMsg.content?.slice(0, 500) || "*n/a*") },
          { name: "After", value: sanitize(newMsg.content.slice(0, 500)) },
        )
        .setTimestamp(),
    );
  },
};

export default event;
