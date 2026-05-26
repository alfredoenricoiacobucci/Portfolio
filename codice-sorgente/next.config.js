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
  // Le immagini vengono copiate in public/projects/ durante il build (vedi vercel.json)
  // e servite direttamente dalla CDN come file statici.
  // Qui escludiamo esplicitamente le cartelle immagini da OGNI funzione serverless
  // per evitare che il file tracer le includa (causando funzioni da 440MB+).
  outputFileTracingExcludes: {
    "/": ["./contenuti/art/**/*", "./contenuti/pro/**/*", "./contenuti/about/**/*"],
    "/artwork": ["./contenuti/art/**/*", "./contenuti/pro/**/*", "./contenuti/about/**/*"],
    "/professional": ["./contenuti/art/**/*", "./contenuti/pro/**/*", "./contenuti/about/**/*"],
    "/api/analytics": ["./contenuti/art/**/*", "./contenuti/pro/**/*", "./contenuti/about/**/*"],
    "/api/contact": ["./contenuti/art/**/*", "./contenuti/pro/**/*", "./contenuti/about/**/*"],
    "/api/track": ["./contenuti/art/**/*", "./contenuti/pro/**/*", "./contenuti/about/**/*"],
    "/api/revalidate": ["./contenuti/art/**/*", "./contenuti/pro/**/*", "./contenuti/about/**/*"],
  },
};

module.exports = nextConfig;
