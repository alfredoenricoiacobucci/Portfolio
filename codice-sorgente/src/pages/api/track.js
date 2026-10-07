// pages/api/track.js
// Analytics tracking: salva i dati su un branch separato "data" per non interferire con main.

const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || "alfredoenricoiacobucci/Portfolio";
const DATA_BRANCH = "data";
const FILE_PATH = "analytics.json";
const GH_API = `https://api.github.com/repos/${REPO}`;

function str2b64(str) { return Buffer.from(str, "utf-8").toString("base64"); }
function b64decode(b64) { return Buffer.from(b64, "base64").toString("utf-8"); }

const headers = () => ({
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "Content-Type": "application/json",
});

async function ensureDataBranch() {
  const check = await fetch(`${GH_API}/git/ref/heads/${DATA_BRANCH}`, { headers: headers() });
  if (check.ok) return true;

  const mainRef = await fetch(`${GH_API}/git/ref/heads/main`, { headers: headers() });
  if (!mainRef.ok) return false;
  const mainData = await mainRef.json();
  const mainSha = mainData.object.sha;

  const emptyData = JSON.stringify(emptyAnalytics(), null, 2) + "\n";
  const blobRes = await fetch(`${GH_API}/git/blobs`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ content: emptyData, encoding: "utf-8" }),
  });
  if (!blobRes.ok) return false;
  const blob = await blobRes.json();

  const treeRes = await fetch(`${GH_API}/git/trees`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ tree: [{ path: FILE_PATH, mode: "100644", type: "blob", sha: blob.sha }] }),
  });
  if (!treeRes.ok) return false;
  const tree = await treeRes.json();

  const commitRes = await fetch(`${GH_API}/git/commits`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ message: "analytics: init", tree: tree.sha }),
  });
  if (!commitRes.ok) return false;
  const commit = await commitRes.json();

  const refRes = await fetch(`${GH_API}/git/refs`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ ref: `refs/heads/${DATA_BRANCH}`, sha: commit.sha }),
  });
  return refRes.ok;
}

async function ghGet() {
  const res = await fetch(`${GH_API}/contents/${FILE_PATH}?ref=${DATA_BRANCH}`, { headers: headers() });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[track] ghGet error:", res.status, errText.slice(0, 200));
    return null;
  }
  return res.json();
}

async function ghPut(content, sha, message) {
  const body = { message, content: str2b64(content), branch: DATA_BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(`${GH_API}/contents/${FILE_PATH}`, {
    method: "PUT", headers: headers(), body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[track] ghPut error:", res.status, errText.slice(0, 200));
  }
  return res.ok;
}

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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!GITHUB_TOKEN) {
    console.error("[track] GITHUB_TOKEN not configured. GH_PAT:", !!process.env.GH_PAT, "GITHUB_TOKEN:", !!process.env.GITHUB_TOKEN);
    return res.status(500).json({ error: "GITHUB_TOKEN not configured" });
  }

  const { page, project, photo, type, referrer, device } = req.body || {};
  const isContact = type === "contact";

  const country = (req.headers["x-vercel-ip-country"] || "").toUpperCase() || null;

  // Comune (geolocalizzazione approssimativa di Vercel dall'IP; l'IP non viene salvato)
  let city = null;
  try { city = decodeURIComponent(req.headers["x-vercel-ip-city"] || "").trim() || null; }
  catch { city = (req.headers["x-vercel-ip-city"] || "").trim() || null; }
  const region = String(req.headers["x-vercel-ip-country-region"] || "").slice(0, 8) || null;
  const lat = parseFloat(req.headers["x-vercel-ip-latitude"]);
  const lon = parseFloat(req.headers["x-vercel-ip-longitude"]);

  try {
    await ensureDataBranch();

    const remote = await ghGet();
    let analytics = emptyAnalytics();
    let sha = null;

    if (remote && remote.content) {
      sha = remote.sha;
      try { analytics = JSON.parse(b64decode(remote.content.replace(/\n/g, ""))); }
      catch { analytics = emptyAnalytics(); }
    } else {
      console.error("[track] ghGet returned null or no content, sha will be null");
    }

    // Ensure fields
    if (!analytics.views) analytics.views = { total: 0, art: 0, pro: 0, landing: 0, about: 0 };
    if (!analytics.projects) analytics.projects = {};
    if (!analytics.photos) analytics.photos = {};
    if (!analytics.daily) analytics.daily = {};
    if (typeof analytics.contacts !== "number") analytics.contacts = 0;
    if (!analytics.countries) analytics.countries = {};
    if (!analytics.cities) analytics.cities = {};
    if (!analytics.referrers) analytics.referrers = {};
    if (!analytics.devices) analytics.devices = { desktop: 0, mobile: 0, tablet: 0 };

    const today = new Date().toISOString().slice(0, 10);
    if (!analytics.daily[today]) analytics.daily[today] = { total: 0, art: 0, pro: 0 };

    if (isContact) {
      analytics.contacts++;
    } else {
      analytics.views.total++;
      analytics.daily[today].total++;
      if (page === "art" || page === "artwork") { analytics.views.art++; analytics.daily[today].art++; }
      else if (page === "pro" || page === "professional") { analytics.views.pro++; analytics.daily[today].pro++; }
      else if (page === "landing") { analytics.views.landing++; }
      else if (page === "about") { analytics.views.about = (analytics.views.about || 0) + 1; }
      if (project) analytics.projects[project] = (analytics.projects[project] || 0) + 1;
      if (photo) analytics.photos[photo] = (analytics.photos[photo] || 0) + 1;

      if (country && country.length === 2) {
        analytics.countries[country] = (analytics.countries[country] || 0) + 1;
        if (city && Number.isFinite(lat) && Number.isFinite(lon)) {
          const key = `${country}|${city}`.slice(0, 80);
          const c = analytics.cities[key] || {
            n: 0, city: city.slice(0, 60), region, cc: country,
            lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100,
          };
          c.n++;
          analytics.cities[key] = c;
        }
      }
      if (referrer && typeof referrer === "string" && referrer.length < 200) {
        const ref = referrer.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
        if (ref && ref !== "alfredoenricoiacobucci.art") {
          analytics.referrers[ref] = (analytics.referrers[ref] || 0) + 1;
        }
      }
      if (device === "mobile") analytics.devices.mobile++;
      else if (device === "tablet") analytics.devices.tablet++;
      else analytics.devices.desktop++;
    }

    // Prune daily > 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    for (const d of Object.keys(analytics.daily)) {
      if (d < cutoffStr) delete analytics.daily[d];
    }

    const msg = isContact ? "analytics: contatto" : `analytics: ${page || "view"}`;
    const writeOk = await ghPut(JSON.stringify(analytics, null, 2) + "\n", sha, msg);

    if (!writeOk) {
      return res.status(500).json({ error: "Failed to write analytics" });
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[track] Exception:", e.message);
    res.status(500).json({ error: e.message });
  }
}
