import { Events, type GuildMember } from "discord.js";
import type { BotEvent } from "./index.js";
import { embed, Colors } from "../utils/common.js";
import { getGuildConfig } from "../utils/data.js";
import { sendLog } from "../utils/logging.js";

const event: BotEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,

  async execute(member: GuildMember): Promise<void> {
    const guild = member.guild;
    const cfg = await getGuildConfig(guild.id);

    if (cfg.welcome.enabled && cfg.welcome.channelId) {
      const channel = (await guild.channels.fetch(cfg.welcome.channelId).catch(() => null));
      if (channel?.isTextBased()) {
        const text = cfg.welcome.message
          .split("{user}").join(`<@${member.id}>`)
          .split("{server}").join(guild.name)
          .split("{count}").join(String(guild.memberCount));
        await channel
          .send({
            embeds: [
              embed(cfg.welcome.color)
                .setTitle(`Welcome to ${guild.name}! 👋`)
                .setDescription(text)
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: `Member #${guild.memberCount} · Built with VybeBot.ai` }),
            ],
          })
          .catch(() => undefined);
      }
    }

    if (cfg.logs.enabled && cfg.logs.types.members !== false) {
      await sendLog(guild, "members", embed(Colors.success)
        .setTitle("🟢 Member Joined")
        .setDescription(`<@${member.id}> (${member.user.tag}) joined.`));
    }
  },
};

export default event;
