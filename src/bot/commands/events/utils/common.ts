import {
  EmbedBuilder,
  MessageFlags,
  type InteractionReplyOptions,
  type ChatInputCommandInteraction,
  type GuildMember,
  type Interaction,
  type User,
} from "discord.js";
import { randomBytes } from "node:crypto";

export function newId(len = 8): string {
  return randomBytes(Math.ceil(len / 2))
    .toString("hex")
    .slice(0, len);
}

export const Colors = {
  primary: 0x5865f2,
  success: 0x57f287,
  danger: 0xed4245,
  warn: 0xfee75c,
  info: 0x00b0f4,
};

/** Mandatory, unobtrusive attribution footer. Kept leading per platform rules. */
export function footer(text?: string): { text: string } {
  return { text: text ? `Built with VybeBot.ai | ${text}` : "Built with VybeBot.ai" };
}

/** Build an embed with the shared footer applied by default. */
export function embed(color = Colors.primary, footerText?: string): EmbedBuilder {
  return new EmbedBuilder().setColor(color).setFooter(footer(footerText));
}

export function sanitize(text: string): string {
  return text
    .replace(/@/g, "@\u200b")
    .replace(/`/g, "`\u200b")
    .slice(0, 1024);
}

export async function ephemeral(
  interaction: Interaction,
  content: string,
  color = Colors.primary,
): Promise<void> {
  const msg = embed(color).setDescription(content);
  const payload: InteractionReplyOptions = {
    embeds: [msg],
    flags: MessageFlags.Ephemeral,
  };
  if (interaction.isRepliable()) {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
}

export async function confirmFields(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
}

export function formatDate(ts: number): string {
  return `<t:${Math.floor(ts / 1000)}:f>`;
}

export function relative(ts: number): string {
  return `<t:${Math.floor(ts / 1000)}:R>`;
}

/** Resolve a guild member by id, returning null when not found. */
export async function resolveMember(
  guild: import("discord.js").Guild,
  userId: string,
): Promise<GuildMember | null> {
  try {
    return await guild.members.fetch(userId);
  } catch {
    return null;
  }
}

/**
 * Guard for moderation actions. Returns a user-facing error string when the
 * action is not allowed, or null when it may proceed.
 */
export function canModerate(
  actor: GuildMember | null,
  target: GuildMember | null,
  requiredPerm: bigint | null,
  guildOwnerId: string | undefined,
): string | null {
  if (!actor) return "You must be in the server to do this.";
  if (!target) return "That user could not be found in this server.";

  if (requiredPerm && !actor.permissions.has(requiredPerm)) {
    return "You don't have permission to do that in this server.";
  }
  if (target.id === actor.id) return "You cannot take that action on yourself.";
  if (target.id === guildOwnerId) return "You cannot take that action on the server owner.";
  if (target.permissions.has(0x8n)) return "You cannot take that action on an administrator.";

  // Hierarchy: the actor must outrank the target.
  const actorTop = actor.roles.highest.position;
  const targetTop = target.roles.highest.position;
  if (actorTop <= targetTop) {
    return "That user is at or above your role hierarchy, so you can't do that.";
  }
  return null;
}

/** Whether the bot itself can act on the target (bot outranks + has perms). */
export function botCanModerate(
  bot: GuildMember | null,
  target: GuildMember | null,
  guildOwnerId: string | undefined,
): string | null {
  if (!bot) return "I couldn't verify my own permissions.";
  if (!target) return "That user could not be found.";
  if (target.id === guildOwnerId) return "I cannot act on the server owner.";
  if (target.permissions.has(0x8n)) return "I cannot act on an administrator.";
  if (bot.roles.highest.position <= target.roles.highest.position) {
    return "My role is not high enough to act on that user.";
  }
  return null;
}

export function userMention(u: User): string {
  return `<@${u.id}>`;
}

export function parseHexColor(input: string): number | null {
  const m = input.replace("#", "").match(/^[0-9a-fA-F]{6}$/);
  return m ? parseInt(m[0], 16) : null;
}
