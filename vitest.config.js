import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'tests/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/index.js'], // Entry point with side effects
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80
      }
    },
    testTimeout: 10000
  }
});
