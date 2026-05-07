/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1200, 1920, 2560],
    imageSizes: [256, 384, 640, 1024],
    minimumCacheTTL: 31536000,
  },
  // Compressione gzip automatica
  compress: true,
  // Le immagini sono servite come file statici da public/projects (symlink → contenuti/)
};

module.exports = nextConfig;
