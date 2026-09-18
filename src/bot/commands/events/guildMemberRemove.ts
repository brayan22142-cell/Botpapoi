import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import type { BotEvent } from "./index.js";
import { embed, Colors } from "../utils/common.js";
import { getGuildConfig } from "../utils/data.js";
import { sendLog } from "../utils/logging.js";

const event: BotEvent<Events.GuildMemberRemove> = {
  name: Events.GuildMemberRemove,

  async execute(member: GuildMember | PartialGuildMember): Promise<void> {
    const guild = member.guild;
    const cfg = await getGuildConfig(guild.id);

    if (cfg.goodbye.enabled && cfg.goodbye.channelId) {
      const channel = (await guild.channels.fetch(cfg.goodbye.channelId).catch(() => null));
      if (channel?.isTextBased()) {
        const text = cfg.goodbye.message
          .split("{user}").join(`<@${member.id}>`)
          .split("{server}").join(guild.name)
          .split("{count}").join(String(guild.memberCount));
        await channel
          .send({
            embeds: [
              embed(cfg.goodbye.color)
                .setTitle("Goodbye 👋")
                .setDescription(text),
            ],
          })
          .catch(() => undefined);
      }
    }

    if (cfg.logs.enabled && cfg.logs.types.members !== false) {
      await sendLog(guild, "members", embed(Colors.warn)
        .setTitle("🔴 Member Left")
        .setDescription(`<@${member.id}> (${member.user.tag}) left.`));
    }
  },
};

export default event;
