# Contributing to Nach Yomi Bot

Thank you for your interest in contributing. This document provides guidelines for contributions.

## Code of Conduct

Be respectful. This project serves Torah learners worldwide.

## How to Contribute

### Reporting Issues

1. Search existing issues first
2. Use the issue template
3. Include reproduction steps
4. Attach relevant logs

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Write clean, documented code
4. Test your changes
5. Submit a pull request

### Commit Messages

Use clear, descriptive messages:

```
feat: add support for Tehillim shiurim
fix: handle network timeout gracefully
docs: update deployment instructions
```

## Development Setup

```bash
git clone https://github.com/naorbrown/nachyomi-bot.git
cd nachyomi-bot
npm install
cp .env.example .env
# Edit .env with your test bot token
npm run dev
```

## GitHub Actions Workflows

The bot runs on GitHub Actions (free). Key workflows:

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| `daily-broadcast.yml` | 3 AM + 4 AM UTC | Sends 6 AM Israel broadcast with 2 chapters (handles DST) |
| `ci.yml` | On push/PR | Runs lint, format, and tests |

### Testing Broadcasts Locally

```bash
# Force a broadcast (bypasses 6am check)
FORCE_BROADCAST=true node scripts/broadcast.js
```

### Manual Workflow Triggers

1. Go to **Actions** tab on GitHub
2. Select **Daily Broadcast**
3. Click **Run workflow**
4. For broadcasts, check **Force broadcast** to bypass time check

## Code Style

- ES modules (`import`/`export`)
- Async/await for asynchronous code
- Descriptive variable names
- Comments for complex logic
- Run `npm run format` before committing

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Test Requirements for PRs

All pull requests must:

1. **Pass all existing tests** — CI will reject PRs with failing tests
2. **Maintain 70% coverage** — Add tests for new functionality
3. **Pass linting** — Run `npm run lint` before submitting
4. **Pass formatting** — Run `npm run format:check`

### Writing Tests

- Place unit tests in `tests/unit/`
- Use descriptive test names that explain the expected behavior
- Mock external dependencies using `vi.mock()`
- Test edge cases and error conditions

### Manual Testing

Before submitting:

1. Run the bot locally with a test token
2. Test `/start` command
3. Verify audio embedding and video links work
4. Check error handling

## Questions

Open an issue for questions about contributing.
