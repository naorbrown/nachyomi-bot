# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
