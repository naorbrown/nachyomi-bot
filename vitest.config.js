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
        lines: 70,
        branches: 65,
        functions: 70,
        statements: 70
      }
    },
    testTimeout: 10000
  }
});
