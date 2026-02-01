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

## Quick Start (Users)

**Just want to learn Nach Yomi?** No setup required!

1. Open Telegram
2. Search for **@NachYomi_Bot** or [click here](https://t.me/NachYomi_Bot)
3. Press **Start** or send `/start`
4. Receive today's chapter with video, audio, and text

**Want daily posts in your channel?** Subscribe to [@TorahYomiChannelBot](https://t.me/TorahYomiChannelBot) for automatic 6 AM Israel time broadcasts.

---

## What is Nach Yomi?

Nach Yomi is the daily study of Nevi'im (Prophets) and Ketuvim (Writings) — one chapter per day, completing all 929 chapters in about 2.5 years. This bot delivers each day's chapter with **audio shiurim** by Harav Yitzchok Breitowitz שליט״א embedded directly in Telegram, plus links to watch the full video.

### Why Use This Bot?

- **Listen** — Complete audio shiurim embedded directly in Telegram (primary content)
- **Watch** — Links to full video shiurim on Kol Halashon
- **Read** — Full Hebrew text with English translation (Sefaria)
- **Daily** — Follows the official Nach Yomi calendar, posts at 6 AM Israel time
- **929 chapters** — 100% shiur coverage for all of Nach

## Deploy Your Own

### Option 1: GitHub Actions (Free, Recommended)

The bot runs entirely on GitHub Actions — no server required!

1. Fork this repository
2. Go to **Settings → Secrets and variables → Actions**
3. Add these secrets:
   - `TELEGRAM_BOT_TOKEN` — Get from [@BotFather](https://t.me/BotFather)
   - `TELEGRAM_CHANNEL_ID` — Your channel ID (e.g., `@YourChannel` or `-100123456789`)
   - `ADMIN_CHAT_ID` — Your chat ID for error notifications (optional)
4. Enable GitHub Actions in your fork

**What runs automatically:**
- **Daily broadcast** at 6:00 AM Israel time (handles DST)
- **Command polling** every 5 minutes

**Note:** Commands have up to 5-minute response latency due to the polling interval. For real-time responses, use Docker or Node.js deployment instead.

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

### No FFmpeg Required

This bot sends audio embedded directly and video as links — no video conversion needed. The bot works without FFmpeg.

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Today's shiur (audio + video link + text) |
| `/today` | Same as /start |
| `/audio` | Listen to the audio shiur (embedded) |
| `/video` | Get video shiur link |
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
│   ├── videoService.js       # Video utilities (legacy, not used in main flow)
│   ├── utils/
│   │   ├── commandParser.js  # Telegram command parsing
│   │   └── rateLimiter.js    # Request rate limiting
│   └── data/
│       └── shiurMapping.js   # 929 shiur ID mappings (100% Nach coverage)
├── scripts/
│   ├── broadcast.js          # Standalone daily broadcast (GitHub Actions)
│   └── poll-commands.js      # Command polling script (GitHub Actions)
├── tests/
│   ├── unit/                 # Unit tests (vitest)
│   └── fixtures/             # Mock API responses
├── .github/
│   ├── workflows/            # CI/CD and bot automation
│   └── state/                # Bot state persistence
├── Dockerfile                # Production build
├── docker-compose.yml        # Container orchestration
└── .env.example              # Environment template
```

### Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 18+ | ES modules, async/await |
| Bot Framework | node-telegram-bot-api | Telegram integration |
| Scheduler | GitHub Actions | Daily 6 AM posts, command polling |
| Containerization | Docker | Alternative deployment |
| CI/CD | GitHub Actions | Automated builds and bot operation |
| Testing | Vitest | Unit tests with coverage |
| Linting | ESLint + Prettier | Code quality |

### Data Flow

1. **Schedule Fetch**: Hebcal API → Today's book/chapter
2. **Content Assembly**:
   - Audio: Direct MP3 URL from Kol Halashon (embedded in Telegram)
   - Video: Link to Kol Halashon video page
   - Text: Sefaria API → Hebrew + English verses
3. **Delivery**: Telegram Bot API → User/Channel (audio first, then video link, then text)

## How Content Delivery Works

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Kol Halashon  │───►│   Telegram Bot  │───►│     User     │
│   Audio/Video   │    │   (sends link)  │    │   Channel    │
└─────────────────┘    └─────────────────┘    └──────────────┘
```

**Audio-First Approach:**
1. **Audio (Primary)**: Embedded MP3 shiur plays directly in Telegram
2. **Video (Link)**: Direct link to watch on Kol Halashon
3. **Text**: Full Hebrew + English chapter from Sefaria

This approach provides:
- Fast delivery (no video processing)
- Reliable playback (audio embedded, video on source)
- No duplicate content
- Works without FFmpeg

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
| **GitHub Actions** | Fork repo, add secrets, enable Actions (recommended, free) |
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

Audio shiurim (embedded) and video links are available for **all books** with complete shiur ID mappings:

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

**Total: 929 chapters with embedded audio shiurim and video links**

## Data Sources

| Source | Purpose | API |
|--------|---------|-----|
| [Hebcal](https://hebcal.com) | Nach Yomi daily schedule | REST |
| [Kol Halashon](https://kolhalashon.com) | Video/Audio shiurim | HLS/MP3 |
| [Sefaria](https://sefaria.org) | Hebrew + English text | REST |

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Format code
npm run format
```

### Coverage Targets

The project maintains **70% code coverage** thresholds for:
- Lines
- Functions
- Branches
- Statements

Coverage reports are generated in the `coverage/` directory.

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
