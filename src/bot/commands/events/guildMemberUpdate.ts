import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import type { BotEvent } from "./index.js";
import { embed, Colors } from "../utils/common.js";
import { getGuildConfig } from "../utils/data.js";
import { sendLog } from "../utils/logging.js";

const event: BotEvent<Events.GuildMemberUpdate> = {
  name: Events.GuildMemberUpdate,

  async execute(
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember,
  ): Promise<void> {
    if (newMember.user.bot) return;
    const guild = newMember.guild;
    const cfg = await getGuildConfig(guild.id);
    if (!cfg.logs.enabled || cfg.logs.types.roles === false) return;

    const added = newMember.roles.cache.filter(
      (r) => oldMember.roles.cache && !oldMember.roles.cache.has(r.id),
    );
    const removed = oldMember.roles.cache?.filter(
      (r) => !newMember.roles.cache.has(r.id),
    );

    const parts: string[] = [];
    added.forEach((r) => parts.push(`➕ ${r}`));
    removed?.forEach((r) => parts.push(`➖ ${r}`));
    if (parts.length === 0) return;

    await sendLog(
      guild,
      "roles",
      embed(Colors.info)
        .setTitle("🎭 Roles Updated")
        .setDescription(`<@${newMember.id}> · ${parts.join(" ")}`)
        .setTimestamp(),
    );
  },
};

export default event;
