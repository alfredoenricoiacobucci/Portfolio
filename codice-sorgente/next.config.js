/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/webp"],
    deviceSizes: [640, 828, 1200, 1920, 2560],
    imageSizes: [256, 384, 640, 1024],
    minimumCacheTTL: 31536000,
  },
  compress: true,
  // Escludi esplicitamente tutte le immagini da ogni funzione serverless.
  // Le immagini vengono copiate in public/projects/ durante il build (vedi vercel.json)
  // e servite direttamente dalla CDN come file statici.
  outputFileTracingExcludes: {
    "*": [
      "./contenuti/art/**",
      "./contenuti/pro/**",
      "./contenuti/about/**",
    ],
  },
};

module.exports = nextConfig;
