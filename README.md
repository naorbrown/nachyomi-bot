<div align="center">

# Nach Yomi Bot

**Two chapters of Nach. Every day. With Rav Breitowitz.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://t.me/NachYomi_Bot)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](Dockerfile)

[**Start Learning**](https://t.me/NachYomi_Bot) · [Report Bug](https://github.com/naorbrown/nachyomi-bot/issues) · [Request Feature](https://github.com/naorbrown/nachyomi-bot/issues)

</div>

---

## Quick Start

1. Open Telegram
2. Search for **@NachYomi_Bot** or [click here](https://t.me/NachYomi_Bot)
3. Press **Start**
4. You're subscribed! Receive daily shiurim at 3 AM Israel time

---

## What is Nach Yomi?

Nach Yomi is the daily study of Nevi'im (Prophets) and Ketuvim (Writings) — two chapters per day, covering all 742 chapters across 34 books in a 371-day cycle starting from Isaiah. This bot delivers each day's chapters with **audio shiurim** by Harav Yitzchok Breitowitz שליט״א embedded directly in Telegram, plus links to watch the full video.

### Why Use This Bot?

- **Listen** — Complete audio shiurim embedded directly in Telegram (primary content)
- **Watch** — Links to full video shiurim on Kol Halashon
- **Daily** — Self-managed 2-chapter/day schedule, posts at 3 AM Israel time
- **742 chapters** — 100% shiur coverage for all of Nach

## Deploy Your Own

### Option 1: GitHub Actions (Daily Broadcasts)

Schedule daily broadcasts via GitHub Actions — no server required for channel posts!

1. Fork this repository
2. Go to **Settings → Secrets and variables → Actions**
3. Add these secrets:
   - `TELEGRAM_BOT_TOKEN` — Get from [@BotFather](https://t.me/BotFather)
   - `TELEGRAM_CHANNEL_ID` — Your channel ID (e.g., `@YourChannel` or `-100123456789`)
   - `TELEGRAM_CHAT_ID` — Your personal user ID for receiving broadcasts (get from [@userinfobot](https://t.me/userinfobot))
4. Enable GitHub Actions in your fork

**What runs automatically:**
- **Daily broadcast** at 3:00 AM Israel time (handles DST)

**Note:** The `/start` command subscribes users to daily broadcasts.

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

## How It Works

Send `/start` to the bot. You'll receive:

1. **Audio shiur** — Embedded MP3 by Rav Breitowitz
2. **Video link** — Watch on Kol Halashon

You're automatically subscribed for daily broadcasts at 3 AM Israel time.

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHANNEL_ID` | No | Channel ID for scheduled daily posts |
| `TELEGRAM_CHAT_ID` | No | Your personal chat ID for receiving daily broadcasts |

### Getting Your Chat ID

To receive daily broadcasts in your private chat with the bot:

1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. It will reply with your user ID (a positive number like `123456789`)
3. Add this as `TELEGRAM_CHAT_ID` in your GitHub secrets

**Note:** Your chat ID is a positive number. Channel/group IDs start with `-100`.

### Environment File

```bash
cp .env.example .env
# Edit .env with your values
```

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                       Nach Yomi Bot                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │ schedule      │  │ shiurMapping  │  │ message       │    │
│  │ Service       │  │ (Kol Halashon │  │ Builder       │    │
│  │ (2-chapter    │  │  shiur IDs)   │  │ (formatting)  │    │
│  │  schedule)    │  │               │  │               │    │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘    │
│          │                  │                   │            │
│          └──────────────────┼───────────────────┘            │
│                             ▼                                │
│                    ┌─────────────────┐                       │
│                    │   index.js      │                       │
│                    │  Bot Commands   │                       │
│                    │  & Scheduler    │                       │
│                    └────────┬────────┘                       │
│                             │                                │
└─────────────────────────────┼────────────────────────────────┘
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
│   ├── index.js              # Bot entry, commands, scheduler
│   ├── scheduleService.js    # Self-managed 2-chapter schedule
│   ├── messageBuilder.js     # Message formatting
│   ├── unified/              # Unified broadcast logic
│   │   └── index.js
│   ├── utils/
│   │   ├── subscribers.js    # Subscriber management
│   │   ├── broadcastState.js # Broadcast state tracking
│   │   ├── commandParser.js  # Command parsing
│   │   ├── israelTime.js     # Israel timezone utilities
│   │   └── rateLimiter.js    # Rate limiting
│   └── data/
│       └── shiurMapping.js   # 742 shiur ID mappings
├── scripts/
│   └── broadcast.js          # Daily broadcast (GitHub Actions)
├── tests/
│   └── unit/                 # Unit tests (vitest)
├── .github/
│   ├── workflows/            # CI/CD and daily broadcast
│   └── state/                # Subscribers + broadcast tracking
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

### Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 18+ | ES modules, async/await |
| Bot Framework | node-telegram-bot-api | Telegram integration |
| Scheduler | GitHub Actions / node-cron | Daily 3 AM posts |
| Containerization | Docker | Alternative deployment |
| CI/CD | GitHub Actions | Automated builds and bot operation |
| Testing | Vitest | Unit tests with coverage |
| Linting | ESLint + Prettier | Code quality |

### Data Flow

1. **Schedule**: Self-managed 2-chapter/day cycle (371 days, starting from Isaiah)
2. **Content Assembly**:
   - Audio: Direct MP3 URL from Kol Halashon (embedded in Telegram)
   - Video: Link to Kol Halashon video page
3. **Delivery**: Telegram Bot API → User/Channel (audio shiur + video link)

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
      - TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
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

**Total: 742 chapters with embedded audio shiurim and video links**

## Data Sources

| Source | Purpose | API |
|--------|---------|-----|
| [Kol Halashon](https://kolhalashon.com) | Video/Audio shiurim | HLS/MP3 |

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

---

<div align="center">

_לעילוי נשמת כל לומדי התורה_

**[Start learning with @NachYomi_Bot](https://t.me/NachYomi_Bot)**

</div>
