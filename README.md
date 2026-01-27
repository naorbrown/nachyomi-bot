<div align="center">

# Nach Yomi Bot

**Daily Nach chapter with Rav Breitowitz's full shiurim, delivered to Telegram.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://t.me/NachYomi_Bot)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](Dockerfile)

[**Try the Bot**](https://t.me/NachYomi_Bot) · [Report Bug](https://github.com/naorbrown/nachyomi-bot/issues) · [Request Feature](https://github.com/naorbrown/nachyomi-bot/issues)

</div>

---

## Overview

Nach Yomi Bot delivers the daily Nach Yomi chapter directly to Telegram with **full embedded video and audio** shiurim by Harav Yitzchok Breitowitz שליט״א from Kol Halashon. One chapter of Nevi'im or Kesuvim, every day.

### Features

| Feature | Description |
|---------|-------------|
| **Full Video Shiurim** | Complete video lectures embedded in Telegram (when under 50MB) |
| **Full Audio Shiurim** | Complete audio shiurim without leaving Telegram |
| **Full Text** | Complete Hebrew verses with English translation |
| **Daily Schedule** | Follows the official Hebcal Nach Yomi calendar |
| **Channel Support** | Scheduled posts at 6:00 AM Israel time |

## Quick Start

### Option 1: Docker (Recommended)

```bash
docker run -d \
  --name nachyomi-bot \
  --restart unless-stopped \
  -e TELEGRAM_BOT_TOKEN="your-token" \
  ghcr.io/naorbrown/nachyomi-bot:latest
```

### Option 2: Node.js

```bash
git clone https://github.com/naorbrown/nachyomi-bot.git
cd nachyomi-bot
npm install
export TELEGRAM_BOT_TOKEN="your-token"
npm start
```

### FFmpeg Requirement

Video embedding requires FFmpeg for HLS-to-MP4 conversion:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Alpine (Docker)
apk add ffmpeg
```

The Docker image includes FFmpeg automatically.

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message + today's chapter |
| `/today` | Today's Nach Yomi (video + audio + text) |
| `/tomorrow` | Tomorrow's chapter preview |
| `/video` | Video shiur only |
| `/audio` | Audio shiur only |
| `/text` | Text only (no media) |
| `/help` | Show all commands |
| `/about` | About the bot and sources |

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHANNEL_ID` | No | Channel ID for scheduled daily posts |
| `ADMIN_CHAT_ID` | No | Chat ID for error notifications |

### Environment File

```bash
cp .env.example .env
# Edit .env with your values
```

## Architecture

```
src/
├── index.js              # Bot entry point & command handlers
├── hebcalService.js      # Nach Yomi schedule from Hebcal API
├── sefariaService.js     # Chapter text from Sefaria API
├── messageBuilder.js     # Telegram message formatting
├── videoService.js       # FFmpeg HLS-to-MP4 conversion
└── data/
    └── shiurMapping.js   # Kol Halashon shiur ID mappings
```

## How Video Embedding Works

```
┌─────────────────┐    ┌─────────────┐    ┌──────────────┐
│  Kol Halashon   │───►│   FFmpeg    │───►│   Telegram   │
│  HLS Stream     │    │  Remuxing   │    │   Embedded   │
└─────────────────┘    └─────────────┘    └──────────────┘
```

1. Fetches HLS playlist from `media2.kolhalashon.com`
2. Remuxes to MP4 (no re-encoding, preserves quality)
3. If under 50MB: embeds directly in Telegram
4. If over 50MB: provides link to Kol Halashon
5. Always includes full audio as backup

## Deployment

### Docker Compose (Production)

```yaml
# docker-compose.yml
version: '3.8'
services:
  nachyomi-bot:
    image: ghcr.io/naorbrown/nachyomi-bot:latest
    restart: unless-stopped
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_CHANNEL_ID=${TELEGRAM_CHANNEL_ID}
      - ADMIN_CHAT_ID=${ADMIN_CHAT_ID}
```

```bash
docker-compose up -d
```

### Build from Source

```bash
docker build -t nachyomi-bot .
docker run -d -e TELEGRAM_BOT_TOKEN="token" nachyomi-bot
```

### Cloud Platforms

| Platform | Instructions |
|----------|--------------|
| **Railway** | Connect repo, set `TELEGRAM_BOT_TOKEN`, deploy |
| **Render** | Use Docker runtime, set environment variables |
| **Fly.io** | `fly launch`, set secrets with `fly secrets set` |
| **DigitalOcean** | App Platform with Docker, set env vars |

### Process Manager (PM2)

```bash
npm install -g pm2
pm2 start src/index.js --name nachyomi-bot
pm2 save
pm2 startup
```

## Shiur Coverage

Video/audio embedding is available for chapters with mapped shiur IDs:

| Book | Chapters | Coverage |
|------|----------|----------|
| Joshua | 1-24 | ✅ 100% |
| Judges | 1-21 | ✅ 100% |
| I Samuel | 8-31 | ✅ 77% |
| II Samuel | 1-24 | ✅ 100% |
| I Kings | 1-22 | ✅ 100% |
| II Kings | 2-25 | ✅ 96% |
| Haggai | 1-2 | ✅ 100% |
| II Chronicles | 1-36 | ✅ 100% |
| Other books | — | 📝 Text + link to Kol Halashon |

**Total: 200+ shiurim mapped**

## Data Sources

| Source | Purpose | API |
|--------|---------|-----|
| [Hebcal](https://hebcal.com) | Nach Yomi daily schedule | REST |
| [Kol Halashon](https://kolhalashon.com) | Video/Audio shiurim | HLS/MP3 |
| [Sefaria](https://sefaria.org) | Hebrew + English text | REST |

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Priority Areas

- 🎬 **Shiur ID mapping** — Help map unmapped books (Isaiah, Jeremiah, etc.)
- 🐛 **Bug fixes** — Report or fix issues
- 📖 **Documentation** — Improve guides and examples

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

[MIT](LICENSE) — Free to use, modify, and distribute.

## Acknowledgments

- **Harav Yitzchok Breitowitz שליט״א** for his inspiring shiurim
- [Kol Halashon](https://kolhalashon.com) for hosting Torah content
- [Hebcal](https://hebcal.com) for the Nach Yomi schedule API
- [Sefaria](https://sefaria.org) for text and translations

---

<div align="center">

_לעילוי נשמת כל לומדי התורה_

**[Try @NachYomi_Bot on Telegram](https://t.me/NachYomi_Bot)**

</div>
