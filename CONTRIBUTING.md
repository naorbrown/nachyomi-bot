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
export TELEGRAM_BOT_TOKEN="your-test-token"
npm run dev
```

## Code Style

- ES modules (`import`/`export`)
- Async/await for asynchronous code
- Descriptive variable names
- Comments for complex logic

## Testing

Before submitting:

1. Run the bot locally
2. Test all commands
3. Verify audio embedding works
4. Check error handling

## Questions

Open an issue for questions about contributing.
