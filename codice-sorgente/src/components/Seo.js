// components/Seo.js
import Head from "next/head";
import { SITE_NAME, meta } from "@/lib/seo";

/**
 * Tag <head> per pagina: title, description, canonical, Open Graph e Twitter.
 * Senza questi, un link condiviso non mostra né titolo né immagine.
 */
export default function Seo({ title, description, image, path }) {
  const m = meta({ title, description, image, path });
  return (
    <Head>
      <title>{m.title}</title>
      <meta name="description" content={m.description} />
      <link rel="canonical" href={m.url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={m.title} />
      <meta property="og:description" content={m.description} />
      <meta property="og:image" content={m.image} />
      <meta property="og:url" content={m.url} />
      <meta property="og:locale" content="it_IT" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={m.title} />
      <meta name="twitter:description" content={m.description} />
      <meta name="twitter:image" content={m.image} />

      <meta name="author" content={SITE_NAME} />
    </Head>
  );
}
