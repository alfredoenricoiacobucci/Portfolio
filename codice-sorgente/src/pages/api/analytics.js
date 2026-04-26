// pages/api/analytics.js
// GET: legge analytics dal branch "data" via GitHub API.

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || "alfredoenricoiacobucci/Portfolio";
const DATA_BRANCH = "data";
const FILE_PATH = "analytics.json";

function b64decode(b64) { return Buffer.from(b64, "base64").toString("utf-8"); }

function emptyAnalytics() {
  return { views: { total: 0, art: 0, pro: 0, landing: 0 }, projects: {}, photos: {}, daily: {}, contacts: 0 };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (GITHUB_TOKEN) {
      const ghRes = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${DATA_BRANCH}`,
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
      );
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        if (ghData.content) {
          const decoded = JSON.parse(b64decode(ghData.content.replace(/\n/g, "")));
          return res.status(200).json(decoded);
        }
      }
    }
    return res.status(200).json(emptyAnalytics());
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
