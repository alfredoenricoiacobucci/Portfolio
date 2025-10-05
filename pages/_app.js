// pages/_app.js
import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const root = document.documentElement;
    const isProfessional = router.pathname.startsWith("/professional");
    const isArtwork = router.pathname.startsWith("/artwork");
    root.classList.toggle("mode-professional", isProfessional);
    root.classList.toggle("mode-artwork", isArtwork && !isProfessional);
  }, [router.pathname]);

  return <Component {...pageProps} />;
}
