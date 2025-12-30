/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@promptplay/ecs-core',
    '@promptplay/runtime-2d',
    '@promptplay/ai-prompt',
    '@promptplay/shared-types',
  ],
  webpack: (config) => {
    // Fix for PixiJS and Matter.js in Next.js
    config.externals = config.externals || [];
    config.externals.push({
      canvas: 'canvas',
    });
    return config;
  },
};

module.exports = nextConfig;
