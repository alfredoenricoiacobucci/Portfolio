// pages/privacy.js
// Privacy, cookie e note legali (italiano e inglese).
// Il sito non usa cookie: solo due memorie tecniche del browser e statistiche
// anonime e aggregate. Per questo non serve il banner dei cookie.
import { useEffect, useState } from "react";
import Link from "next/link";
import Seo from "@/components/Seo";

const EMAIL = "a.e.iacobucci@icloud.com";
const OWNER = "Alfredo Enrico Iacobucci";
const UPDATED = { it: "31 ottobre 2026", en: "31 October 2026" };
const NOTRACK_KEY = "aei-notrack";

const T = {
  it: {
    title: "Privacy, cookie e note legali",
    updated: "Ultimo aggiornamento",
    back: "Torna al sito",
    sections: [
      {
        h: "Chi tratta i dati",
        p: [
          `Titolare del trattamento è ${OWNER}, persona fisica, che gestisce questo sito come portfolio personale. Per qualsiasi domanda sui tuoi dati puoi scrivere a <a href="mailto:${EMAIL}">${EMAIL}</a>.`,
        ],
      },
      {
        h: "In breve",
        list: [
          "Il sito non usa cookie, né di profilazione né pubblicitari né di terze parti.",
          "Le statistiche sono anonime: contano le visite in forma aggregata, senza salvare il tuo indirizzo IP né creare un profilo.",
          "I dati che scrivi nel modulo contatti servono solo a risponderti.",
          "Nessun dato viene venduto o usato per pubblicità.",
        ],
      },
      {
        h: "Quali dati e perché",
        sub: [
          {
            h: "Navigazione",
            p: [
              "Quando visiti il sito, il servizio che lo ospita (Vercel Inc.) riceve come ogni server alcuni dati tecnici: indirizzo IP, tipo di browser, pagina richiesta, data e ora. Servono a mostrarti le pagine e a proteggere il sito da abusi; sono conservati da Vercel per periodi brevi e non sono usati per identificarti.",
              "Base giuridica: legittimo interesse a far funzionare il sito in modo sicuro (art. 6.1.f GDPR).",
            ],
          },
          {
            h: "Statistiche anonime",
            p: [
              "Il sito conta le visite con un sistema proprio, senza Google Analytics o servizi simili. Per ogni visita registra solo dati aggregati: la pagina, il progetto o la foto aperta, il tipo di dispositivo (computer, telefono, tablet), il sito di provenienza e, una volta per visita, paese e città approssimativa dedotti dal servizio di hosting. L’indirizzo IP non viene salvato e non viene creato alcun identificativo personale: i numeri finiscono in un unico file di totali, senza distinguere le singole persone.",
              "Base giuridica: legittimo interesse a capire quali lavori interessano (art. 6.1.f GDPR). Puoi comunque escludere le tue visite con il tasto qui sotto.",
            ],
            optout: true,
          },
          {
            h: "Modulo contatti ed email",
            p: [
              "Se mi scrivi dal modulo, invii nome, email (facoltativa) e messaggio. Il modulo è inoltrato alla mia casella email dal servizio Web3Forms; i messaggi restano nella mia posta per il tempo necessario a risponderti e a gestire un’eventuale collaborazione, poi vengono cancellati. Lo stesso vale se scrivi direttamente all’indirizzo email.",
              "Base giuridica: rispondere alla tua richiesta e alle eventuali trattative (art. 6.1.b GDPR).",
            ],
          },
        ],
      },
      {
        h: "Cookie e memorie del browser",
        p: [
          "Il sito non installa cookie. Usa soltanto due memorie tecniche del browser, che restano sul tuo dispositivo e non servono a riconoscerti:",
        ],
        list: [
          "<b>aei-tracked</b> e <b>aei-entry</b> (memoria di sessione): evitano di contare due volte la stessa pagina; si cancellano da sole alla chiusura della scheda.",
          "<b>aei-notrack</b> (memoria locale): c’è solo se scegli di escludere le tue visite dalle statistiche.",
        ],
        after: [
          "Trattandosi di strumenti tecnici e di statistiche anonime di prima parte, secondo le Linee guida del Garante privacy (10 giugno 2021) non è richiesto il consenso e quindi il sito non mostra un banner. I link a Instagram e ad altri siti esterni portano a pagine con le proprie regole sulla privacy.",
        ],
      },
      {
        h: "Chi riceve i dati",
        p: [
          "I dati sono trattati con l’aiuto di questi fornitori, che agiscono come responsabili o titolari autonomi per i propri servizi:",
        ],
        list: [
          "<b>Vercel Inc.</b> (Stati Uniti): hosting del sito.",
          "<b>Web3Forms</b> (Web3Creative, India; server anche nell’Unione Europea): inoltro dei messaggi del modulo, conservati dal servizio per un massimo di tre anni.",
          "<b>Apple</b> (iCloud Mail): casella email che riceve i messaggi.",
          "<b>GitHub Inc.</b> (Stati Uniti): archivio del sito e dei soli totali statistici, che non contengono dati personali.",
        ],
        after: [
          "Quando i dati escono dallo Spazio economico europeo, il trasferimento avviene con le garanzie previste dal GDPR (EU-U.S. Data Privacy Framework o clausole contrattuali standard della Commissione europea).",
        ],
      },
      {
        h: "I tuoi diritti",
        p: [
          `Puoi chiedere in qualsiasi momento di accedere ai tuoi dati, correggerli, cancellarli, limitarne l’uso, opporti al trattamento o riceverne una copia, scrivendo a <a href="mailto:${EMAIL}">${EMAIL}</a>. Rispondo entro 30 giorni. Se ritieni che i tuoi dati siano trattati in modo non corretto puoi presentare reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>).`,
        ],
      },
      {
        h: "Persone nelle fotografie",
        p: [
          `Molte foto ritraggono artisti e pubblico durante spettacoli ed eventi. Se ti riconosci in una fotografia e preferisci che venga tolta o modificata, scrivimi a <a href="mailto:${EMAIL}">${EMAIL}</a> indicando la pagina: provvederò al più presto.`,
        ],
      },
      {
        h: "Diritto d’autore",
        p: [
          `Tutte le fotografie, i video e i testi del sito sono opere di ${OWNER}, protette dalla legge sul diritto d’autore (L. 633/1941). Non possono essere copiati, scaricati, modificati o pubblicati altrove senza autorizzazione scritta. Per licenze e usi editoriali scrivi a <a href="mailto:${EMAIL}">${EMAIL}</a>.`,
        ],
      },
      {
        h: "Sicurezza e minori",
        p: [
          "Il sito è servito solo in modo cifrato (HTTPS) e limita ciò che le pagine possono caricare o fare, per proteggere i visitatori. Il sito non è rivolto a minori di 14 anni e non raccoglie consapevolmente i loro dati.",
          "Questa pagina può essere aggiornata: la data in alto indica l’ultima modifica.",
        ],
      },
    ],
    optOn: "Le tue visite non vengono contate",
    optOff: "Le tue visite vengono contate in forma anonima",
    optBtnOn: "Torna a contarle",
    optBtnOff: "Non contare le mie visite",
  },
  en: {
    title: "Privacy, cookies and legal notes",
    updated: "Last updated",
    back: "Back to the site",
    sections: [
      {
        h: "Who handles your data",
        p: [
          `The data controller is ${OWNER}, a private individual running this website as a personal portfolio. For any question about your data, write to <a href="mailto:${EMAIL}">${EMAIL}</a>.`,
        ],
      },
      {
        h: "In short",
        list: [
          "The site uses no cookies: no profiling, advertising or third-party cookies.",
          "Statistics are anonymous: visits are counted in aggregate, without storing your IP address or building a profile.",
          "What you write in the contact form is used only to reply to you.",
          "No data is sold or used for advertising.",
        ],
      },
      {
        h: "What data and why",
        sub: [
          {
            h: "Browsing",
            p: [
              "When you visit the site, the hosting provider (Vercel Inc.) receives, like any web server, some technical data: IP address, browser type, requested page, date and time. It is needed to deliver the pages and protect the site from abuse; Vercel keeps it for short periods and it is not used to identify you.",
              "Legal basis: legitimate interest in running the site securely (Art. 6(1)(f) GDPR).",
            ],
          },
          {
            h: "Anonymous statistics",
            p: [
              "The site counts visits with its own system, without Google Analytics or similar services. For each visit it records only aggregate data: the page, the project or photo opened, the device type (computer, phone, tablet), the referring site and, once per visit, the country and approximate city derived by the hosting provider. The IP address is not stored and no personal identifier is created: the figures end up in a single file of totals that does not distinguish individuals.",
              "Legal basis: legitimate interest in understanding which works people look at (Art. 6(1)(f) GDPR). You can exclude your visits with the button below.",
            ],
            optout: true,
          },
          {
            h: "Contact form and email",
            p: [
              "If you write through the form, you send your name, email (optional) and message. The form is forwarded to my mailbox by the Web3Forms service; messages stay in my mailbox for as long as needed to reply and handle any collaboration, then they are deleted. The same applies if you email me directly.",
              "Legal basis: replying to your request and any pre-contractual steps (Art. 6(1)(b) GDPR).",
            ],
          },
        ],
      },
      {
        h: "Cookies and browser storage",
        p: [
          "The site sets no cookies. It only uses two technical browser storage items, which stay on your device and are not used to recognise you:",
        ],
        list: [
          "<b>aei-tracked</b> and <b>aei-entry</b> (session storage): avoid counting the same page twice; they are deleted when you close the tab.",
          "<b>aei-notrack</b> (local storage): only present if you choose to exclude your visits from the statistics.",
        ],
        after: [
          "Since these are technical tools and anonymous first-party statistics, under the Italian Data Protection Authority guidelines of 10 June 2021 no consent is required, so the site shows no cookie banner. Links to Instagram and other external sites lead to pages with their own privacy rules.",
        ],
      },
      {
        h: "Who receives the data",
        p: [
          "Data is processed with the help of these providers, acting as processors or as independent controllers for their own services:",
        ],
        list: [
          "<b>Vercel Inc.</b> (United States): website hosting.",
          "<b>Web3Forms</b> (Web3Creative, India; servers also in the European Union): forwarding of contact form messages, kept by the service for up to three years.",
          "<b>Apple</b> (iCloud Mail): the mailbox that receives messages.",
          "<b>GitHub Inc.</b> (United States): repository of the site and of the statistical totals only, which contain no personal data.",
        ],
        after: [
          "When data leaves the European Economic Area, the transfer relies on the safeguards provided by the GDPR (EU-U.S. Data Privacy Framework or the European Commission’s standard contractual clauses).",
        ],
      },
      {
        h: "Your rights",
        p: [
          `You can ask at any time to access, correct or delete your data, restrict or object to its use, or receive a copy, by writing to <a href="mailto:${EMAIL}">${EMAIL}</a>. I reply within 30 days. If you believe your data is handled improperly, you can lodge a complaint with the Italian Data Protection Authority (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>) or the authority of your country.`,
        ],
      },
      {
        h: "People in the photographs",
        p: [
          `Many photos show performers and audiences at shows and events. If you recognise yourself in a photograph and would like it removed or changed, write to <a href="mailto:${EMAIL}">${EMAIL}</a> with the page link and I will take care of it as soon as possible.`,
        ],
      },
      {
        h: "Copyright",
        p: [
          `All photographs, videos and texts on this site are works by ${OWNER}, protected by Italian copyright law (L. 633/1941) and international treaties. They may not be copied, downloaded, altered or published elsewhere without written permission. For licensing and editorial use, write to <a href="mailto:${EMAIL}">${EMAIL}</a>.`,
        ],
      },
      {
        h: "Security and minors",
        p: [
          "The site is served only over an encrypted connection (HTTPS) and restricts what its pages can load or do, to protect visitors. It is not aimed at children under 14 and does not knowingly collect their data.",
          "This page may be updated: the date at the top shows the latest change.",
        ],
      },
    ],
    optOn: "Your visits are not being counted",
    optOff: "Your visits are counted anonymously",
    optBtnOn: "Count them again",
    optBtnOff: "Don’t count my visits",
  },
};

export default function Privacy() {
  const [lang, setLang] = useState("it");
  const [noTrack, setNoTrack] = useState(false);

  useEffect(() => {
    try {
      if ((navigator.language || "").slice(0, 2) !== "it") setLang("en");
      setNoTrack(localStorage.getItem(NOTRACK_KEY) === "1");
    } catch {}
  }, []);

  const toggleTrack = () => {
    try {
      if (noTrack) localStorage.removeItem(NOTRACK_KEY);
      else localStorage.setItem(NOTRACK_KEY, "1");
      setNoTrack(!noTrack);
    } catch {}
  };

  const t = T[lang];
  const html = (s) => ({ __html: s });

  return (
    <div className="privacy-page" lang={lang}>
      <Seo title={t.title} path="/privacy" description="Informativa privacy, cookie e note legali del sito di Alfredo Enrico Iacobucci." />
      <header className="pv-top">
        <Link href="/" className="pv-back hover-red">← {t.back}</Link>
        <div className="pv-lang" role="group" aria-label="Lingua / Language">
          <button type="button" onClick={() => setLang("it")} aria-pressed={lang === "it"} className={lang === "it" ? "on" : ""}>IT</button>
          <span aria-hidden>/</span>
          <button type="button" onClick={() => setLang("en")} aria-pressed={lang === "en"} className={lang === "en" ? "on" : ""}>EN</button>
        </div>
      </header>

      <main className="pv-main">
        <h1>{t.title}</h1>
        <p className="pv-date">{t.updated}: {UPDATED[lang]}</p>

        {t.sections.map((sec, i) => (
          <section key={i}>
            <h2>{sec.h}</h2>
            {(sec.p || []).map((x, k) => <p key={k} dangerouslySetInnerHTML={html(x)} />)}
            {sec.list && <ul>{sec.list.map((x, k) => <li key={k} dangerouslySetInnerHTML={html(x)} />)}</ul>}
            {(sec.after || []).map((x, k) => <p key={"a" + k} dangerouslySetInnerHTML={html(x)} />)}
            {(sec.sub || []).map((sb, k) => (
              <div key={k} className="pv-sub">
                <h3>{sb.h}</h3>
                {sb.p.map((x, j) => <p key={j} dangerouslySetInnerHTML={html(x)} />)}
                {sb.optout && (
                  <div className="pv-opt">
                    <span><i className={noTrack ? "off" : ""} />{noTrack ? t.optOn : t.optOff}</span>
                    <button type="button" onClick={toggleTrack}>{noTrack ? t.optBtnOn : t.optBtnOff}</button>
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </main>

      <footer className="pv-foot">
        {OWNER} © {new Date().getFullYear()} · <a href={`mailto:${EMAIL}`} className="hover-red">{EMAIL}</a>
      </footer>

      <style jsx global>{`
        .privacy-page { min-height: 100vh; background: #f8f4ed; color: #0a0a0a; }
        @media print { body { display: block !important; } }
        .pv-top { display: flex; justify-content: space-between; align-items: center; padding: 2.2rem 1rem; border-bottom: 4px solid #0a0a0a; font-weight: 700; font-size: 15px; }
        .pv-back { transition: color 300ms ease; }
        .pv-lang { display: flex; gap: 6px; align-items: center; }
        .pv-lang button { font-weight: 700; color: rgba(10,10,10,0.4); transition: color 300ms ease; cursor: pointer; }
        .pv-lang button.on { color: #c8102e; }
        .pv-lang button:hover { color: #0a0a0a; }
        .pv-main { max-width: 46rem; margin: 0 auto; padding: 4rem 1.5rem 3rem; }
        .pv-main h1 { font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 800; line-height: 1.05; letter-spacing: -0.02em; }
        .pv-date { margin-top: 0.75rem; font-size: 13px; color: rgba(10,10,10,0.55); }
        .pv-main section { margin-top: 2.75rem; }
        .pv-main h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: #c8102e; margin-bottom: 0.9rem; }
        .pv-main h3 { font-size: 15px; font-weight: 700; margin: 1.4rem 0 0.4rem; }
        .pv-main p, .pv-main li { font-size: 15px; line-height: 1.65; color: rgba(10,10,10,0.82); }
        .pv-main p + p { margin-top: 0.6rem; }
        .pv-main ul { margin: 0.6rem 0; padding-left: 1.1rem; list-style: disc; }
        .pv-main li + li { margin-top: 0.35rem; }
        .pv-main a { text-decoration: underline; text-underline-offset: 2px; transition: color 300ms ease; }
        .pv-main a:hover { color: #c8102e; }
        .pv-opt { margin-top: 1rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid rgba(10,10,10,0.15); }
        .pv-opt span { display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; }
        .pv-opt i { width: 8px; height: 8px; border-radius: 50%; background: #2e9e5b; }
        .pv-opt i.off { background: #c8102e; }
        .pv-opt button { font-size: 13px; font-weight: 600; padding: 8px 14px; border: 1px solid #0a0a0a; cursor: pointer; transition: background-color 200ms ease, color 200ms ease; }
        .pv-opt button:hover { background: #0a0a0a; color: #f8f4ed; }
        .pv-foot { border-top: 4px solid #0a0a0a; padding: 2rem 1rem; text-align: center; font-size: 13px; font-weight: 700; }
      `}</style>
    </div>
  );
}
