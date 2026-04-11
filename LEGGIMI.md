# Portfolio AEI — Istruzioni rapide

## Per modificare il sito

**Apri `Manager sito AEI.html`** (doppio clic dal Finder). È l'unico file che devi toccare.

Da qui puoi:
- Modificare testi di tutti i progetti (artwork + professional)
- Modificare la pagina About
- Aggiungere nuovi progetti
- Caricare/eliminare foto
- Impostare la foto di copertina (banner)
- **Salvare e pubblicare** online con un solo click

## Setup iniziale (una sola volta)

1. **Riordina la cartella**: doppio clic su `Riordina cartella.command`. Nasconde dal Finder tutti i file tecnici di Next.js. Lo fai una volta sola.
2. Apri `Manager sito AEI.html` nel browser
3. Clicca in alto a destra su **"Impostazioni GitHub"**
4. Vai su https://github.com/settings/tokens/new?scopes=repo (è un link anche nel modal)
5. Dai un nome al token (es. "Manager portfolio"), conferma, e copia il token che inizia con `ghp_...`
6. Incollalo nel Manager e clicca **Salva**

Il token resta salvato nel tuo browser: non lo dovrai più reinserire.

## Come si usa

1. Apri `Manager sito AEI.html`
2. Scegli un progetto dalla barra laterale (o clicca "+ Nuovo progetto")
3. Modifica titolo, descrizione, dati tecnici, ecc.
4. Nella sezione Foto: trascina le immagini per caricarle, clicca una foto per impostarla come banner
5. Clicca **"Salva e pubblica"** in alto a destra
6. In ~1 minuto il sito online si aggiorna (auto-deploy)

## Come è organizzata la cartella

Dopo aver lanciato `Riordina cartella.command`, nel Finder vedi solo:

```
Portfolio AEI/
├── Manager sito AEI.html   ← APRI QUESTO per modificare
├── LEGGIMI.md              ← questo file
└── contenuti/              ← tutti i tuoi contenuti (foto + testi)
    ├── contenuti.json      ← testi di tutti i progetti + about (gestito dal Manager)
    ├── stringhe.txt        ← etichette del sito (menu, ecc.)
    ├── art/<progetto>/foto ← foto artwork
    ├── pro/<progetto>/foto ← foto professional
    └── about/media         ← foto/video pagina About
```

**`contenuti/` è l'unica cartella con cui interagisci.** Tutto il resto è infrastruttura del sito ed è nascosto.

### Cosa c'è di nascosto e perché

Next.js (il motore del sito) richiede obbligatoriamente al livello principale: `package.json`, `package-lock.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `jsconfig.json`, le cartelle `public/`, `src/`, `node_modules/`, `.next/` e `.git/`. Se li sposti il sito non si compila più. Lo script `Riordina cartella.command` non li elimina: usa `chflags hidden` per nasconderli solo dalla vista del Finder. Sotto c'è anche un symlink `public/projects → contenuti` che permette a Next.js di servire le foto.

Per rimostrarli (se mai ti servisse): apri Terminale nella cartella e scrivi `chflags nohidden <nome>`.

## Aggiungere nuovi progetti

Nella barra laterale del Manager ci sono due pulsanti `+ Nuovo progetto` (uno per Artwork, uno per Professional). Ti chiede titolo, luogo/anno e slug (nome cartella), crea il progetto e poi carichi le foto con drag-and-drop dall'interfaccia stessa. Al primo Salva, tutto viene pubblicato online.

## Portare il progetto su SSD esterno

**Sì, si può, ma con attenzione al formato dell'SSD:**

- **APFS / HFS+ (formato Mac)**: nessun problema. È il formato consigliato se l'SSD lo usi solo da Mac. Supporta perfettamente i symlink (`public/projects` → `contenuti`) e tutti i file di `node_modules`.
- **exFAT**: funziona ma ha limiti — **non supporta i symlink**, quindi `public/projects` smetterebbe di funzionare e il sito non troverebbe le foto. Sconsigliato.
- **NTFS (Windows)**: su Mac è in sola lettura di default, quindi non puoi modificare nulla. Sconsigliato.
- **FAT32**: vecchio, non supporta file >4 GB e nessun symlink. Non usare.

**Consiglio**: se compri un SSD nuovo, formattalo in APFS con Utility Disco (Applicazioni → Utility) prima di copiarci dentro il progetto. Evita di usare l'SSD su Windows se vuoi poi rimetterlo su Mac: APFS non è leggibile da Windows senza software terzo.

Velocità: un SSD esterno USB 3+ è veloce abbastanza per sviluppare e lavorare. `npm install` sarà leggermente più lento che su disco interno ma perfettamente usabile.
