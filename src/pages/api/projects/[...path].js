import fs from "fs";
import path from "path";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

export default function handler(req, res) {
  const segments = req.query.path;
  if (!segments || segments.length === 0) return res.status(404).end();
  if (segments.some((s) => s.includes("..") || s.includes("\0")))
    return res.status(400).end();

  const filePath = path.join(process.cwd(), "contenuti", ...segments);
  if (!fs.existsSync(filePath)) return res.status(404).end();

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext];
  if (!contentType) return res.status(403).end();

  const stat = fs.statSync(filePath);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", stat.size);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  fs.createReadStream(filePath).pipe(res);
}

export const config = { api: { responseLimit: false } };
