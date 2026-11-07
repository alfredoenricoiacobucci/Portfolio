/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/webp"],
    deviceSizes: [640, 828, 1200, 1920, 2560],
    imageSizes: [256, 384, 640, 1024],
    minimumCacheTTL: 31536000,
    // Next 16 accetta solo le qualità elencate: senza 80 e 85 galleria e
    // viewer venivano ricondotti in silenzio a 75.
    qualities: [75, 80, 85],
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
  poweredByHeader: false,
  // Intestazioni di sicurezza su tutte le pagine: connessione sempre cifrata,
  // nessun contenuto da siti esterni (tranne l'invio del modulo contatti),
  // il sito non può essere incorniciato in altri siti, niente accesso a
  // fotocamera, microfono o posizione.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.web3forms.com",
      "form-action 'self' https://api.web3forms.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  outputFileTracingExcludes: {
    "*": ["./contenuti/art/**/*", "./contenuti/pro/**/*", "./contenuti/about/**/*"],
  },
};

module.exports = nextConfig;
