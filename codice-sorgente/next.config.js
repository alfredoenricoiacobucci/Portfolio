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
  // Le immagini vengono preparate in public/projects/ dalla pipeline e servite
  // come file statici dalla CDN: nessuna funzione serverless deve includerle.
  // Un unico glob applicato a tutte le route, invece di sette liste identiche
  // da tenere allineate a mano (l'elenco era già fuori sincrono: citava
  // /api/contact, route rimossa, e non copriva /sitemap.xml).
  outputFileTracingExcludes: {
    "*": ["./contenuti/art/**/*", "./contenuti/pro/**/*", "./contenuti/about/**/*"],
  },
};

module.exports = nextConfig;
