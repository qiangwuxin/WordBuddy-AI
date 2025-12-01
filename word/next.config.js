// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // 如果你用了 Prisma Client 输出到 app/generated/prisma
  // 可能需要添加：
  // experimental: {
  //   serverComponentsExternalPackages: ['@prisma/client'],
  // },
};

module.exports = nextConfig;