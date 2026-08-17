import { defineConfig } from 'vitest/config'

// Two projects, because the domain and the UI have nothing in common at runtime:
// `@tabellone/core` must pass in plain node (ADR-002), the app needs a DOM.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          root: './packages/core',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'web',
          root: './apps/web',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
})
