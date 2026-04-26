// pages/api/contact.js
// API route per inviare email di contatto via Web3Forms (gratuito, no signup iniziale)
// Per attivarlo: vai su https://web3forms.com, inserisci a.e.iacobucci@icloud.com,
// ricevi la access_key via email e sostituiscila qui sotto.

const ACCESS_KEY = process.env.WEB3FORMS_KEY || "6c54ffe5-dbe2-4109-af5b-ef65277506cb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, message } = req.body;

  if (!name || !message) {
    return res.status(400).json({ error: "Nome e messaggio sono obbligatori" });
  }

  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: ACCESS_KEY,
        subject: `Contatto dal portfolio — ${name}`,
        from_name: name,
        replyto: email || "",
        message: `Nome: ${name}\nEmail: ${email || "non fornita"}\n\n${message}`,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return res.status(200).json({ ok: true });
    } else {
      return res.status(500).json({ error: data.message || "Errore nell'invio" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Errore di rete" });
  }
}
