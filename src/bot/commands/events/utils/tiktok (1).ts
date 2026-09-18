import { getClientIfAvailable } from "../bot/client.js";
import { tiktokStore, type TikTokConfig } from "./data.js";
import { embed, Colors } from "./common.js";
import { logger } from "./logger.js";

let started = false;
const TICK = 5 * 60 * 1000; // check every 5 minutes

/** Start the background TikTok poller once. Safe to call multiple times. */
export function startTikTokPoller(): void {
  if (started) return;
  started = true;
  setInterval(() => void checkAll(), TICK);
  logger.info("TikTok poller started.");
}

interface VideoInfo {
  id: string;
  title?: string;
  thumb?: string;
}

/**
 * Fetch the newest public video id for a TikTok username (no login needed).
 * TikTok's public profile page embeds recent video ids; a single oEmbed call
 * resolves the title/thumbnail for that video. This relies on public pages and
 * may break if TikTok changes their markup — there is no stable public API for
 * this without an approved developer account.
 */
async function fetchLatestVideo(username: string): Promise<VideoInfo | null> {
  const res = await fetch(`https://www.tiktok.com/@${username}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; VybeBot)" },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/\/video\/(\d{10,})/);
  if (!m) return null;
  const id = m[1];

  let title: string | undefined;
  let thumb: string | undefined;
  try {
    const url = `https://www.tiktok.com/@${username}/video/${id}`;
    const o = (await (
      await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
    ).json()) as { title?: string; thumbnail_url?: string };
    title = o.title;
    thumb = o.thumbnail_url;
  } catch {
    // oEmbed is best-effort
  }
  return { id, title, thumb };
}

async function checkAll(): Promise<void> {
  const client = getClientIfAvailable();
  if (!client || !client.isReady()) return;

  const guildIds = await tiktokStore.keys();
  for (const guildId of guildIds) {
    const cfg: TikTokConfig | undefined = await tiktokStore.read(guildId);
    if (!cfg || !cfg.enabled || !cfg.channelId || !cfg.username) continue;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;

    try {
      const video = await fetchLatestVideo(cfg.username);
      if (!video) continue;
      if (cfg.lastVideoId === video.id || cfg.seen.includes(video.id)) continue;

      cfg.seen = [...cfg.seen.slice(-50), video.id];
      cfg.lastVideoId = video.id;
      await tiktokStore.write(guildId, cfg);

      const channel = await guild.channels.fetch(cfg.channelId).catch(() => null);
      if (!channel?.isTextBased()) continue;

      const videoUrl = `https://www.tiktok.com/@${cfg.username}/video/${video.id}`;
      const e = embed(Colors.primary)
        .setTitle("🎵 New TikTok")
        .setDescription(`@${cfg.username} just posted a new video!`)
        .setURL(videoUrl)
        .addFields({ name: "Watch", value: videoUrl });
      if (video.thumb) e.setImage(video.thumb);
      await channel.send({ embeds: [e] });
      logger.info("Posted new TikTok.", { guildId, videoId: video.id });
    } catch (err) {
      logger.warn("TikTok check failed.", { guildId, error: err });
    }
  }
}
