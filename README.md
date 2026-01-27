<div align="center">

# Nach Yomi Bot

**Daily Nach chapter with Rav Breitowitz's shiurim, delivered to Telegram.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://t.me/NachYomi_Bot)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://github.com/naorbrown/nachyomi-bot/pkgs/container/nachyomi-bot)

[**Try the Bot**](https://t.me/NachYomi_Bot) · [Report Bug](https://github.com/naorbrown/nachyomi-bot/issues) · [Request Feature](https://github.com/naorbrown/nachyomi-bot/issues)

</div>

---

## Overview

Nach Yomi Bot delivers the daily Nach Yomi chapter directly to Telegram with **embedded video and audio** shiurim by Harav Yitzchok Breitowitz שליט״א from Kol Halashon. One chapter of Nevi'im or Kesuvim, every day.

### Features

| Feature | Description |
|---------|-------------|
| **Embedded Video** | Watch 2-minute shiur previews directly in Telegram |
| **Embedded Audio** | Listen to full shiurim without leaving Telegram |
| **Full Text** | Complete Hebrew verses with English translation |
| **Daily Schedule** | Follows the official Hebcal Nach Yomi calendar |
| **Channel Support** | Scheduled posts at 6:00 AM Israel time |

## Quick Start

```bash
git clone https://github.com/naorbrown/nachyomi-bot.git
cd nachyomi-bot
npm install
export TELEGRAM_BOT_TOKEN="your-token"
npm start
```

### Video Mode (Recommended)

Video embedding requires FFmpeg for HLS-to-MP4 conversion:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Alpine (Docker)
apk add ffmpeg
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message + today's chapter |
| `/today` | Today's Nach Yomi chapter |
| `/tomorrow` | Tomorrow's chapter (preview) |
| `/video` | Request video shiur explicitly |
| `/about` | About the bot and sources |
| `/help` | Show available commands |

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHANNEL_ID` | No | Channel ID for scheduled daily posts |
| `ADMIN_CHAT_ID` | No | Chat ID for error notifications |

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

The bot converts HLS video streams from Kol Halashon to MP4 format:

```
┌─────────────────┐    ┌─────────────┐    ┌──────────────┐
│  Kol Halashon   │───►│   FFmpeg    │───►│   Telegram   │
│  HLS Stream     │    │  Remuxing   │    │   Embedded   │
└─────────────────┘    └─────────────┘    └──────────────┘
```

1. Fetches HLS playlist from `media2.kolhalashon.com`
2. Remuxes to MP4 (no re-encoding, preserves quality)
3. Limits to 2 minutes (under Telegram's 50MB limit)
4. Falls back to audio if video unavailable

## Deployment

### Docker (Recommended)

The Docker image includes FFmpeg for full video support:

```bash
docker pull ghcr.io/naorbrown/nachyomi-bot:latest
docker run -e TELEGRAM_BOT_TOKEN="your-token" ghcr.io/naorbrown/nachyomi-bot
```

### Docker Compose

```bash
cp .env.example .env
# Edit .env with your token
docker-compose up -d
```

### Build from Source

```bash
docker build -t nachyomi-bot .
docker run -e TELEGRAM_BOT_TOKEN="token" nachyomi-bot
```

### Cloud Platforms

| Platform | Instructions |
|----------|--------------|
| Railway | Connect repo, set `TELEGRAM_BOT_TOKEN`, deploy |
| Render | Use Docker runtime, set environment variables |
| Fly.io | `fly launch`, set secrets, deploy |

## Data Sources

| Source | Purpose | API |
|--------|---------|-----|
| [Hebcal](https://hebcal.com) | Nach Yomi daily schedule | REST |
| [Kol Halashon](https://kolhalashon.com) | Video/Audio shiurim | HLS/MP3 |
| [Sefaria](https://sefaria.org) | Hebrew + English text | REST |

## Shiur Coverage

Video/audio embedding is available for chapters with mapped shiur IDs:

| Book | Chapters | Status |
|------|----------|--------|
| Joshua | 1-24 | ✅ Complete |
| Judges | 1-21 | ✅ Complete |
| Haggai | 1-2 | ✅ Complete |
| II Chronicles | 1-36 | ✅ Complete |
| Other books | — | 📝 Text only |

Want to help map more shiurim? See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Priority Areas

- 🎬 **Shiur ID mapping** — Help map unmapped books
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
