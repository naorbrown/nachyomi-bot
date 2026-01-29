/**
 * Command Parser Utility
 * Parses Telegram bot commands from message text
 */

/**
 * Parse command from message text
 * Handles: /command, /command@botname, /command params
 * @param {string} text - Message text to parse
 * @returns {{ command: string, params: string } | null} Parsed command or null
 */
export function parseCommand(text) {
  if (!text || typeof text !== 'string') return null;

  // Trim whitespace and newlines
  const trimmed = text.trim();

  // Must start with /
  if (!trimmed.startsWith('/')) return null;

  // Extract command: /command or /command@botname
  const spaceIndex = trimmed.indexOf(' ');
  const commandPart = spaceIndex > 0 ? trimmed.slice(0, spaceIndex) : trimmed;
  const params = spaceIndex > 0 ? trimmed.slice(spaceIndex + 1).trim() : '';

  // Parse command name (remove / and optional @botname)
  const atIndex = commandPart.indexOf('@');
  const command =
    atIndex > 0 ? commandPart.slice(1, atIndex).toLowerCase() : commandPart.slice(1).toLowerCase();

  if (!command) return null;

  return { command, params };
}
