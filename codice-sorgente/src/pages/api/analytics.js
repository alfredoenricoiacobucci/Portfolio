// pages/api/analytics.js
// GET: legge analytics dal branch "data" via GitHub API.

const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || "alfredoenricoiacobucci/Portfolio";
const DATA_BRANCH = "data";
const FILE_PATH = "analytics.json";

function b64decode(b64) { return Buffer.from(b64, "base64").toString("utf-8"); }

function emptyAnalytics() {
  return {
    views: { total: 0, art: 0, pro: 0, landing: 0, about: 0 },
    projects: {},
    photos: {},
    daily: {},
    contacts: 0,
    countries: {},
    cities: {},
    referrers: {},
    devices: { desktop: 0, mobile: 0, tablet: 0 },
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (!GITHUB_TOKEN) {
    console.error("[analytics] GITHUB_TOKEN not configured. GH_PAT:", !!process.env.GH_PAT, "GITHUB_TOKEN:", !!process.env.GITHUB_TOKEN);
    return res.status(200).json(emptyAnalytics());
  }

  try {
    const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${DATA_BRANCH}`;
    const ghRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      console.error("[analytics] GitHub API error:", ghRes.status, errText.slice(0, 200));
      return res.status(200).json(emptyAnalytics());
    }

    const ghData = await ghRes.json();
    if (!ghData.content) {
      console.error("[analytics] No content in GitHub response, keys:", Object.keys(ghData));
      return res.status(200).json(emptyAnalytics());
    }

    const decoded = JSON.parse(b64decode(ghData.content.replace(/\n/g, "")));
    return res.status(200).json(decoded);
  } catch (e) {
    console.error("[analytics] Exception:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
