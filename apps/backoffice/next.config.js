const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@klyro/db'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
}

module.exports = nextConfig
