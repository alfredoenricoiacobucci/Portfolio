// On-demand ISR revalidation — called by Manager Portfolio after deploy
export default async function handler(req, res) {
  try {
    await res.revalidate("/");
    await res.revalidate("/artwork");
    await res.revalidate("/professional");
    return res.json({ revalidated: true, timestamp: Date.now() });
  } catch (err) {
    return res.status(500).json({ error: "Revalidation failed", message: err.message });
  }
}
