import { fileURLToPath } from 'node:url'
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
        // The app's tsconfig leaves JSX to Next (`jsx: preserve`), so the test transformer
        // has to be told how to compile it; without this a `.tsx` test fails to parse.
        oxc: { jsx: { runtime: 'automatic' } },
        // The app imports itself through `@/…` (its tsconfig `paths`); Vite needs the same
        // mapping to resolve those specifiers outside Next.
        resolve: {
          alias: { '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)) },
        },
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
