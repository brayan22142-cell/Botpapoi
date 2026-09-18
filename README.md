# Bot de Discord (TypeScript)

Bot modular de Discord construido con **discord.js 14.27.0** y TypeScript.
Incluye moderación, tickets, bienvenidas/AFK, anti-scam (honeypot), logs,
economía virtual, eventos y publicador automático de TikTok.

**Built with VybeBot.ai**

## Funcionalidades

- 🛡️ **Moderación:** `ban`, `unban`, `kick`, `mute`, `unmute`, `warn`, `warnings`, `clear`, `slowmode`, `lock`, `unlock`, `role`, `nickname`
- 🎫 **Tickets:** panel, categorías, rol staff, transcripts, cierre confirmado
- 👋 **Comunidad:** `welcome`/`goodbye`, `afk`, `announce`, `poll`
- 🍯 **Anti-scam (honeypot):** canal señuelo, detección de enlaces, aviso y registro
- 📋 **Logs:** mensajes, moderación, entradas/salidas, roles y tickets
- 📊 **Información:** `serverinfo`, `userinfo`, `avatar`, `banner`, `roleinfo`, `channelinfo`, `botinfo`, `ping`, `help`
- 💰 **Economía virtual:** `balance`, `daily`, `work`, `give`, `shop`, `buy`
- 🎉 **Eventos:** `event` (crear/listar/finalizar) con RSVP
- 🎵 **TikTok:** `tiktok connect` publica automáticamente videos nuevos de un perfil público

## Requisitos

- Node.js 18+
- Un bot en el [Portal de Desarrolladores de Discord](https://discord.com/developers/applications) con sus intents activados (`Server Members`, `Message Content`).

## Configuración

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y rellena los valores:

   ```env
   DISCORD_TOKEN=
   DISCORD_CLIENT_ID=
   DISCORD_GUILD_ID=
   ```

3. Compila y ejecuta:

   ```bash
   npm run build
   npm start
   ```

Los comandos se registran automáticamente al iniciar.

## Scripts

- `npm run typecheck` — comprobación de tipos
- `npm run build` — compila a `dist/`
- `npm start` — ejecuta el bot
- `npm run deploy` — registra los comandos manualmente

## Estructura

```txt
src/
  index.ts            # Bootstrap
  config.ts           # Configuración desde variables de entorno
  deploy-commands.ts  # Registro de comandos
  bot/client.ts       # Cliente de Discord
  commands/           # Comandos (un archivo por comando)
  events/             # Eventos (un archivo por evento)
  utils/              # Helpers (storage, economy, logging, common)
```

Los datos (configuración, warns, tickets, economía, etc.) se guardan de forma
persistente bajo `PERSISTENT_DATA_DIR` (o `./.data` en desarrollo) y **no** deben
subirse a Git.

## Seguridad

- El token (`DISCORD_TOKEN`) y las claves **nunca** se incluyen en el repositorio.
- `.env`, `.data/`, `node_modules/` y `dist/` están excluidos en `.gitignore`.
