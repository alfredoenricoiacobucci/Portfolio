import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="it">
      <Head>
        {/* I font arrivano da next/font (self-hosted, vedi _app.js): niente più
            <link> a fonts.googleapis.com, che bloccava il primo render e
            scaricava 6 pesi di Inter di cui ne servono 4. */}
        {/* viewport sta in _app.js via next/head per evitare il warning Next.js */}
        <meta name="theme-color" content="#f8f4ed" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
