<div align="center">

# Nach Yomi Bot

**One chapter of Nach. Every day. With Rav Breitowitz.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://t.me/NachYomi_Bot)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](Dockerfile)

[**Start Learning**](https://t.me/NachYomi_Bot) · [Report Bug](https://github.com/naorbrown/nachyomi-bot/issues) · [Request Feature](https://github.com/naorbrown/nachyomi-bot/issues)

</div>

---

## What is Nach Yomi?

Nach Yomi is the daily study of Nevi'im (Prophets) and Ketuvim (Writings) — one chapter per day, completing all 929 chapters in about 2.5 years. This bot delivers each day's chapter with **full video and audio shiurim** by Harav Yitzchok Breitowitz שליט״א embedded directly in Telegram.

### Why Use This Bot?

- **Watch** — Full video shiurim embedded in Telegram (auto-split if over 50MB)
- **Listen** — Complete audio shiurim without leaving the app
- **Read** — Full Hebrew text with English translation (Sefaria)
- **Daily** — Follows the official Nach Yomi calendar, posts at 6 AM Israel time
- **929 chapters** — 100% shiur coverage for all of Nach

## Deploy Your Own

### Option 1: Railway (Free, Recommended)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/nachyomi?referralCode=nachyomi)

1. Click the button above
2. Add your `TELEGRAM_BOT_TOKEN` (get one from [@BotFather](https://t.me/BotFather))
3. Deploy — that's it!

Railway's free tier (500 hours/month) is plenty for this bot.

### Option 2: Docker

```bash
docker run -d \
  --name nachyomi-bot \
  --restart unless-stopped \
  -e TELEGRAM_BOT_TOKEN="your-token" \
  ghcr.io/naorbrown/nachyomi-bot:latest
```

### Option 3: Node.js

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
| `/start` | Get today's shiur (video + audio + text) |
| `/video` | Watch the video shiur |
| `/audio` | Listen to the audio shiur |
| `/text` | Read the chapter |

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

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            Nach Yomi Bot                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                │
│  │   Hebcal    │     │ Kol Halashon│     │   Sefaria   │                │
│  │    API      │     │  HLS/MP3    │     │    API      │                │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                │
│         │                   │                   │                        │
│         ▼                   ▼                   ▼                        │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                │
│  │  hebcal     │     │   video     │     │  sefaria    │                │
│  │  Service    │     │  Service    │     │  Service    │                │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                │
│         │                   │                   │                        │
│         └───────────────────┼───────────────────┘                        │
│                             ▼                                            │
│                    ┌─────────────────┐                                   │
│                    │   index.js      │                                   │
│                    │  Bot Commands   │                                   │
│                    │  & Scheduler    │                                   │
│                    └────────┬────────┘                                   │
│                             │                                            │
│                             ▼                                            │
│                    ┌─────────────────┐                                   │
│                    │ messageBuilder  │                                   │
│                    │  & Keyboards    │                                   │
│                    └────────┬────────┘                                   │
│                             │                                            │
└─────────────────────────────┼────────────────────────────────────────────┘
                              ▼
                     ┌─────────────────┐
                     │    Telegram     │
                     │    Bot API      │
                     └─────────────────┘
```

### Directory Structure

```
nachyomi-bot/
├── src/
│   ├── index.js              # Bot entry, commands, cron scheduler
│   ├── hebcalService.js      # Nach Yomi calendar API integration
│   ├── sefariaService.js     # Hebrew/English text fetching
│   ├── messageBuilder.js     # Telegram message formatting
│   ├── videoService.js       # HLS→MP4 conversion & splitting
│   └── data/
│       └── shiurMapping.js   # 929 shiur ID mappings (100% Nach coverage)
├── .github/workflows/        # CI/CD pipelines
├── Dockerfile                # Multi-stage production build
├── docker-compose.yml        # Container orchestration
└── .env.example              # Environment template
```

### Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 18+ | ES modules, async/await |
| Bot Framework | node-telegram-bot-api | Telegram integration |
| Scheduler | node-cron | Daily 6 AM posts |
| Video Processing | FFmpeg | HLS stream conversion |
| Containerization | Docker | Production deployment |
| CI/CD | GitHub Actions | Automated builds |

### Data Flow

1. **Schedule Fetch**: Hebcal API → Today's book/chapter
2. **Content Assembly**:
   - Video: Kol Halashon HLS → FFmpeg → MP4 (split if >50MB)
   - Audio: Direct MP3 URL from Kol Halashon
   - Text: Sefaria API → Hebrew + English verses
3. **Delivery**: Telegram Bot API → User/Channel

## How Video Embedding Works

```
┌─────────────────┐    ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  Kol Halashon   │───►│   FFmpeg    │───►│  Size Check  │───►│   Telegram   │
│  HLS Stream     │    │  Remuxing   │    │  & Splitter  │    │   Embedded   │
└─────────────────┘    └─────────────┘    └──────────────┘    └──────────────┘
```

1. Fetches full HLS playlist from `media2.kolhalashon.com`
2. Converts to MP4 with FFmpeg (stream copy, no quality loss)
3. Checks file size against Telegram's 50MB limit
4. **Under 50MB**: Sends as single embedded video
5. **Over 50MB**: Automatically splits into ~45MB parts and sends sequentially
6. Each part labeled "Part 1/3", "Part 2/3", etc. with total duration shown
7. Full audio always included as backup

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

Video/audio embedding is available for **all books** with complete shiur ID mappings:

### Nevi'im Rishonim (Former Prophets)
| Book | Chapters | Coverage |
|------|----------|----------|
| Joshua | 1-24 | ✅ 100% |
| Judges | 1-21 | ✅ 100% |
| I Samuel | 1-31 | ✅ 100% |
| II Samuel | 1-24 | ✅ 100% |
| I Kings | 1-22 | ✅ 100% |
| II Kings | 1-25 | ✅ 100% |

### Nevi'im Acharonim (Later Prophets)
| Book | Chapters | Coverage |
|------|----------|----------|
| Isaiah | 1-66 | ✅ 100% |
| Jeremiah | 1-52 | ✅ 100% |
| Ezekiel | 1-48 | ✅ 100% |

### Trei Asar (Twelve Minor Prophets)
| Book | Chapters | Coverage |
|------|----------|----------|
| Hosea | 1-14 | ✅ 100% |
| Joel | 1-4 | ✅ 100% |
| Amos | 1-9 | ✅ 100% |
| Obadiah | 1 | ✅ 100% |
| Jonah | 1-4 | ✅ 100% |
| Micah | 1-7 | ✅ 100% |
| Nahum | 1-3 | ✅ 100% |
| Habakkuk | 1-3 | ✅ 100% |
| Zephaniah | 1-3 | ✅ 100% |
| Haggai | 1-2 | ✅ 100% |
| Zechariah | 1-14 | ✅ 100% |
| Malachi | 1-3 | ✅ 100% |

### Ketuvim (Writings)
| Book | Chapters | Coverage |
|------|----------|----------|
| Psalms | 1-150 | ✅ 100% |
| Proverbs | 1-31 | ✅ 100% |
| Job | 1-42 | ✅ 100% |
| Song of Songs | 1-8 | ✅ 100% |
| Ruth | 1-4 | ✅ 100% |
| Lamentations | 1-5 | ✅ 100% |
| Ecclesiastes | 1-12 | ✅ 100% |
| Esther | 1-10 | ✅ 100% |
| Daniel | 1-12 | ✅ 100% |
| Ezra | 1-10 | ✅ 100% |
| Nehemiah | 1-13 | ✅ 100% |
| I Chronicles | 1-29 | ✅ 100% |
| II Chronicles | 1-36 | ✅ 100% |

**Total: 929 chapters mapped with full video/audio shiurim**

## Data Sources

| Source | Purpose | API |
|--------|---------|-----|
| [Hebcal](https://hebcal.com) | Nach Yomi daily schedule | REST |
| [Kol Halashon](https://kolhalashon.com) | Video/Audio shiurim | HLS/MP3 |
| [Sefaria](https://sefaria.org) | Hebrew + English text | REST |

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Priority Areas

- 🐛 **Bug fixes** — Report or fix issues
- 📖 **Documentation** — Improve guides and examples
- ✨ **Feature requests** — New capabilities and improvements

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

[MIT](LICENSE) — Free to use, modify, and distribute.

## Acknowledgments

- **Harav Yitzchok Breitowitz שליט״א** — The shiurim that make this bot possible
- **[Kol Halashon](https://kolhalashon.com)** — Preserving and sharing Torah worldwide
- **[Hebcal](https://hebcal.com)** — Nach Yomi calendar API
- **[Sefaria](https://sefaria.org)** — Open-source texts and translations

---

<div align="center">

_לעילוי נשמת כל לומדי התורה_

**[Start learning with @NachYomi_Bot](https://t.me/NachYomi_Bot)**

</div>
