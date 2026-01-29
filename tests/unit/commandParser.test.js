import { describe, it, expect } from 'vitest';
import { parseCommand } from '../../src/utils/commandParser.js';

describe('parseCommand', () => {
  describe('valid commands', () => {
    it('should parse /start', () => {
      const result = parseCommand('/start');
      expect(result).toEqual({ command: 'start', params: '' });
    });

    it('should parse /today', () => {
      const result = parseCommand('/today');
      expect(result).toEqual({ command: 'today', params: '' });
    });

    it('should parse /video', () => {
      const result = parseCommand('/video');
      expect(result).toEqual({ command: 'video', params: '' });
    });

    it('should parse /audio', () => {
      const result = parseCommand('/audio');
      expect(result).toEqual({ command: 'audio', params: '' });
    });

    it('should parse /text', () => {
      const result = parseCommand('/text');
      expect(result).toEqual({ command: 'text', params: '' });
    });

    it('should parse /broadcast', () => {
      const result = parseCommand('/broadcast');
      expect(result).toEqual({ command: 'broadcast', params: '' });
    });
  });

  describe('bot mention handling', () => {
    it('should strip @botname from /start@NachYomi_Bot', () => {
      const result = parseCommand('/start@NachYomi_Bot');
      expect(result).toEqual({ command: 'start', params: '' });
    });

    it('should strip @botname from /today@DailyNachBot', () => {
      const result = parseCommand('/today@DailyNachBot');
      expect(result).toEqual({ command: 'today', params: '' });
    });

    it('should handle any bot username', () => {
      const result = parseCommand('/video@SomeOtherBot123');
      expect(result).toEqual({ command: 'video', params: '' });
    });
  });

  describe('parameters', () => {
    it('should extract params from /command param1', () => {
      const result = parseCommand('/start param1');
      expect(result).toEqual({ command: 'start', params: 'param1' });
    });

    it('should extract multiple params', () => {
      const result = parseCommand('/broadcast param1 param2 param3');
      expect(result).toEqual({ command: 'broadcast', params: 'param1 param2 param3' });
    });

    it('should trim whitespace from params', () => {
      const result = parseCommand('/start   extra spaces  ');
      expect(result).toEqual({ command: 'start', params: 'extra spaces' });
    });

    it('should return empty string for no params', () => {
      const result = parseCommand('/today');
      expect(result.params).toBe('');
    });

    it('should handle @botname with params', () => {
      const result = parseCommand('/start@Bot hello world');
      expect(result).toEqual({ command: 'start', params: 'hello world' });
    });
  });

  describe('case handling', () => {
    it('should lowercase command names', () => {
      const result = parseCommand('/START');
      expect(result).toEqual({ command: 'start', params: '' });
    });

    it('should parse /Today as today', () => {
      const result = parseCommand('/Today');
      expect(result).toEqual({ command: 'today', params: '' });
    });

    it('should parse /TODAY@Bot as today', () => {
      const result = parseCommand('/TODAY@Bot');
      expect(result).toEqual({ command: 'today', params: '' });
    });
  });

  describe('invalid inputs', () => {
    it('should return null for null input', () => {
      expect(parseCommand(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(parseCommand(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseCommand('')).toBeNull();
    });

    it('should return null for non-string input', () => {
      expect(parseCommand(123)).toBeNull();
      expect(parseCommand({})).toBeNull();
      expect(parseCommand([])).toBeNull();
    });

    it('should return null for text not starting with /', () => {
      expect(parseCommand('hello')).toBeNull();
      expect(parseCommand('start')).toBeNull();
    });

    it('should return null for just "/" with no command', () => {
      expect(parseCommand('/')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle commands with leading whitespace', () => {
      const result = parseCommand('  /start');
      expect(result).toEqual({ command: 'start', params: '' });
    });

    it('should handle commands with trailing newlines', () => {
      const result = parseCommand('/start\n');
      expect(result).toEqual({ command: 'start', params: '' });
    });

    it('should handle commands with trailing spaces', () => {
      const result = parseCommand('/today   ');
      expect(result).toEqual({ command: 'today', params: '' });
    });

    it('should handle /command with multiple spaces before params', () => {
      const result = parseCommand('/start     param');
      expect(result).toEqual({ command: 'start', params: 'param' });
    });
  });
});
