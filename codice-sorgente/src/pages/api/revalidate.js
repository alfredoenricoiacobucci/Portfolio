// On-demand ISR revalidation — chiamata dopo il deploy per aggiornare subito le pagine
export default async function handler(req, res) {
  try {
    await res.revalidate("/artwork");
    await res.revalidate("/professional");
    await res.revalidate("/");
    return res.json({ revalidated: true, timestamp: Date.now() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
