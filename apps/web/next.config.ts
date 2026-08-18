import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // `@tabellone/core` ships as TypeScript source (`exports` points at `src/index.ts`);
  // Next transpiles it in place instead of the package needing its own build step.
  transpilePackages: ['@tabellone/core'],
  // This repo already has a hand-written CLAUDE.md; don't let dev overwrite it with a
  // generated one on every `next dev`.
  agentRules: false,
}

export default nextConfig
