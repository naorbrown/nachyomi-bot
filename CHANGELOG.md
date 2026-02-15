# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-02-15

### Added

- Self-managed 2-chapter/day schedule starting from Isaiah 1
- 742 chapters across 34 books in a 371-day cycle that loops forever
- `scheduleService.js` — pure date-arithmetic, no external API dependency
- Day header with Hebrew book names and numerals
- Subscriber unit tests

### Changed

- Audio URL domain changed from `www2.kolhalashon.com` to `www.kolhalashon.com` (fixes Telegram embedding)
- Bot sends 2 chapters per broadcast instead of 1
- Rate limiting in index.js now uses the `rateLimiter.js` utility

### Removed

- Hebcal API integration (`hebcalService.js`) — schedule is now self-managed
- Sefaria API integration (`sefariaService.js`) — text content removed
- Video service (`videoService.js`) — video sent as links only
- FFmpeg dependency — no longer needed
- Broken utility scripts (`test-apis.js`, `test-video.js`, `get-chat-id.js`)
- `node-fetch` dependency

### Breaking

- Daily content no longer includes Hebrew/English text from Sefaria
- Schedule follows a custom 2-chapter/day cycle, not the traditional Nach Yomi calendar

## [2.1.0] - 2026-01-30

### Added

- **GitHub Actions deployment** — Bot runs entirely on GitHub Actions (free, no server required)
- **Daily broadcast workflow** — Automatic 6 AM Israel time posts with DST handling
- **Command polling workflow** — Responds to bot commands every 5 minutes
- **Israel timezone utilities** — DST-aware time checking for reliable scheduling
- **FORCE_BROADCAST option** — Manual trigger for testing broadcasts anytime
- **Comprehensive test suite** — 131 unit tests with 70%+ code coverage
- **Workflow regression tests** — Automated tests prevent workflow misconfiguration
- **Detailed broadcast logging** — Debug logs show exactly what's happening during broadcasts

### Changed

- Migrated from Railway to GitHub Actions for cost-free hosting
- Broadcast script no longer uses retry loop (prevents duplicate messages)
- Improved error handling — video/audio/text send independently (one failure doesn't stop others)

### Fixed

- **Duplicate messages bug** — Removed retry loop that caused video/audio to resend on text failure
- **6 AM delivery timing** — Fixed DST handling with dual UTC schedules (3 AM + 4 AM UTC)
- **Midnight edge case** — Fixed `getIsraelHour()` returning 24 instead of 0
- **Poll Commands workflow** — Added write permissions for state persistence
- **ESLint errors** — Removed unused imports and variables
- **Formatting issues** — Fixed Prettier code style violations

## [2.0.0] - 2026-01-27

### Added

- **Full video shiurim** — Complete video lectures embedded in Telegram (no more 2-min limit)
- **Automatic video splitting** — Videos over 50MB are split into ~45MB parts and sent sequentially
- Part labeling ("Part 1/3", "Part 2/3") with total duration shown
- dotenv support for environment configuration
- Unique timestamps in video filenames to bypass Telegram caching
- User notifications with Kol Halashon fallback links when video/audio fails
- **Jeremiah shiur ID mappings** — All 52 chapters mapped (100% coverage)

### Changed

- Video timeout increased to 10 minutes for full-length shiurim
- Improved Hebrew numerals conversion (fixed 500-999 range)
- Updated all messaging to reflect "full shiur" instead of "preview"

### Fixed

- Hebrew numerals bug causing undefined for numbers 500-999
- Telegram file_id caching causing old 2-min videos to persist
- Missing user feedback when video conversion fails

## [1.1.0] - 2026-01-27

### Added

- **Video embedding** — 2-minute shiur previews embedded directly in Telegram
- FFmpeg-based HLS-to-MP4 conversion for Telegram compatibility
- Full chapter text display with multi-message support for long chapters
- Haggai shiur ID mappings (chapters 1-2)
- `/video` command for explicit video requests
- `/help` command
- `get-chat-id.js` utility for discovering Telegram chat IDs
- `test-video.js` for testing video embedding functionality

### Changed

- Improved HTML entity decoding in text display
- Video duration limited to 2 minutes (ensures <50MB file size)
- Enhanced message formatting with Hebrew numerals

### Fixed

- Text encoding issues with special characters
- Video file size exceeding Telegram limits

## [1.0.0] - 2025-01-27

### Added

- Initial release
- Daily Nach Yomi with embedded audio shiurim
- Rav Breitowitz shiurim from Kol Halashon
- Full Hebrew + English text from Sefaria
- Commands: `/start`, `/today`, `/tomorrow`, `/about`
- Scheduled channel posts at 6:00 AM Israel time
- Docker support with FFmpeg included
- Shiur ID mappings for Joshua, Judges, and II Chronicles
- CI/CD workflows for testing and Docker builds
- Comprehensive documentation (README, CONTRIBUTING, SECURITY)
