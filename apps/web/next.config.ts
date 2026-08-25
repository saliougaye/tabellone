import { withSerwist } from '@serwist/turbopack'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // `@tabellone/core` ships as TypeScript source (`exports` points at `src/index.ts`);
  // Next transpiles it in place instead of the package needing its own build step.
  transpilePackages: ['@tabellone/core'],
  // One icon family for the whole UI (`components/ui/icon.tsx`), imported from the
  // package root. Without this every icon import pulls the barrel file; with it Next
  // rewrites each named import to its own module, so a screen ships the four glyphs it
  // actually draws.
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  // This repo already has a hand-written CLAUDE.md; don't let dev overwrite it with a
  // generated one on every `next dev`.
  agentRules: false,
}

export default withSerwist(nextConfig)
