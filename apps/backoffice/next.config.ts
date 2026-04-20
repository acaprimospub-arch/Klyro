import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@klyro/db'],
  // Tells Next.js the monorepo root, fixes the lockfile detection warning
  outputFileTracingRoot: path.join(__dirname, '../../'),
}

export default nextConfig
