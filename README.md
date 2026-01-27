<div align="center">

# Nach Yomi Bot

**Daily Nach chapter with Rav Breitowitz's shiurim, delivered to Telegram.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://t.me/NachYomi_Bot)

[**Try the Bot**](https://t.me/NachYomi_Bot) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## Overview

Nach Yomi Bot delivers the daily Nach Yomi chapter directly to Telegram with **embedded video and audio** shiurim by Harav Yitzchok Breitowitz from Kol Halashon. One chapter of Nevi'im or Kesuvim, every day.

### Features

| Feature | Description |
|---------|-------------|
| **Embedded Video** | Watch shiurim directly in Telegram (requires FFmpeg) |
| **Embedded Audio** | Listen to shiurim without leaving Telegram |
| **Bilingual Text** | Hebrew verses with English translation |
| **Daily Schedule** | Follows the Hebcal Nach Yomi calendar |
| **Channel Support** | Scheduled posts at 6:00 AM Israel time |

## Quick Start

```bash
git clone https://github.com/yourusername/nachyomi-bot.git
cd nachyomi-bot
npm install
export TELEGRAM_BOT_TOKEN="your-token"
npm start
```

### Video Mode (Optional)

To enable video embedding, install FFmpeg:

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
| `/today` | Today's chapter |
| `/tomorrow` | Tomorrow's chapter |
| `/video` | Force video mode |
| `/about` | About the bot |

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHANNEL_ID` | No | Channel for scheduled posts |
| `ADMIN_CHAT_ID` | No | Error notifications |
| `ENABLE_VIDEO` | No | Enable video mode (default: true) |

## Architecture

```
src/
├── index.js              # Bot entry point
├── hebcalService.js      # Nach Yomi schedule API
├── sefariaService.js     # Chapter text API
├── messageBuilder.js     # Message formatting
├── videoService.js       # HLS to MP4 conversion
└── data/
    └── shiurMapping.js   # Kol Halashon shiur IDs
```

## How Video Embedding Works

The bot converts HLS video streams from Kol Halashon to MP4 format using FFmpeg:

1. Fetches HLS playlist from `media2.kolhalashon.com`
2. Converts stream to MP4 (no re-encoding, just remuxing)
3. Sends MP4 to Telegram (supports streaming)
4. Falls back to audio if video exceeds 50MB limit

## Deployment

### Docker (Recommended)

The Docker image includes FFmpeg for video support:

```bash
docker build -t nachyomi .
docker run -e TELEGRAM_BOT_TOKEN="token" nachyomi
```

### Docker Compose

```bash
cp .env.example .env
# Edit .env with your token
docker-compose up -d
```

### Railway / Render / Fly.io

1. Connect repository
2. Set environment variables
3. Add FFmpeg buildpack (if available)
4. Deploy

## Data Sources

| Source | Purpose | Format |
|--------|---------|--------|
| [Hebcal](https://hebcal.com) | Nach Yomi schedule | REST API |
| [Kol Halashon](https://kolhalashon.com) | Video/Audio shiurim | HLS/MP3 |
| [Sefaria](https://sefaria.org) | Chapter text | REST API |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

[MIT](LICENSE)

## Acknowledgments

- Harav Yitzchok Breitowitz שליט״א for his shiurim
- [Kol Halashon](https://kolhalashon.com) for hosting the shiurim
- [Hebcal](https://hebcal.com) for the schedule API
- [Sefaria](https://sefaria.org) for the text and translations

---

<div align="center">

_לעילוי נשמת כל לומדי התורה_

</div>
