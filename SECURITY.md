# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |
| 1.x     | No        |

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Email security concerns to the repository maintainer with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

You will receive a response within 48 hours.

## Security Best Practices

### Bot Token

- Never commit your `TELEGRAM_BOT_TOKEN`
- Use environment variables
- Rotate tokens if exposed

### Environment Variables

```bash
# Correct: environment variable
export TELEGRAM_BOT_TOKEN="your-token"

# Wrong: hardcoded in code
const token = "your-token";  // Never do this
```

### Deployment

- Use HTTPS endpoints
- Keep dependencies updated
- Monitor for unusual activity

## Known Limitations

- Bot token provides full bot access
- No rate limiting implemented (relies on Telegram's limits)
- External API calls (Hebcal, Sefaria, Kol Halashon) are not authenticated
