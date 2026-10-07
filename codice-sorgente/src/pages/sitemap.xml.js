// pages/sitemap.xml.js
// Sitemap generata dai progetti reali in contenuti.json.
// I progetti vivono su ?p=<slug>, quindi le URL seguono quello schema.

import { readJSON } from "@/lib/contenuti";
import { SITE_URL } from "@/lib/seo";

const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function getServerSideProps({ res }) {
  const contenuti = readJSON("contenuti.json", { projects: [] });
  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    { loc: SITE_URL, priority: "1.0" },
    { loc: `${SITE_URL}/artwork`, priority: "0.9" },
    { loc: `${SITE_URL}/professional`, priority: "0.9" },
    { loc: `${SITE_URL}/artwork?p=about`, priority: "0.6" },
    { loc: `${SITE_URL}/professional?p=about`, priority: "0.6" },
  ];

  for (const p of contenuti.projects || []) {
    const base = p.section === "art" ? "artwork" : "professional";
    const title = (p.titolo || "").trim().split("\n")[0].trim();
    const slug = slugify(title || p.slug);
    if (slug) urls.push({ loc: `${SITE_URL}/${base}?p=${slug}`, priority: "0.8" });
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc.replace(/&/g, "&amp;")}</loc>` +
          `<lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`
      )
      .join("\n") +
    "\n</urlset>\n";

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function Sitemap() {
  return null;
}
