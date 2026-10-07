# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The portfolio of Alfredo Enrico Iacobucci, a multimedia artist and photographer. It addresses four audiences, all confirmed as primary:

- **Professional clients**: companies, theatres, dance companies and brands that commission photography, post-production or creative direction. Their job is to judge reliability and fit, then get in touch.
- **Art world**: curators, galleries, festivals and calls for entries. Their job is to read the photographic series and installations as a coherent body of research.
- **Performing artists**: dancers, performers and choreographers looking for someone to document or co-create their work. Dance and performance are the author's main fields of interest.
- **Personal network**: people who already know the author or follow the author on Instagram and want to see the work in one place.

A second, private surface, the **Manager**, has a single user: the author, who uses it to edit content and read visit analytics.

## Product Purpose

The public site gathers the author's work into two sections, **Artwork** (personal photographic series and site-specific installations) and **Professional** (commissions and collaborations in editorial, performance and commercial work), plus an About page and a contact form. Success means a visitor understands who the author is and how the author works, and the right people get in touch (email, form, phone, Instagram).

The Manager (`manager.js`, `.Manager Portfolio.html`, a local macOS app built on WebKit) lets the author add and reorder projects, images, text and focal points without touching code, publish via git, and read the site's analytics (visits, sources, cities on a map, trends up to one year).

## Positioning

From the author's own copy: light is the instrument, used to "sculpt bodies and bring out their natural dramaturgy". The focus is not aesthetics but the *trace*: the imprint of character that stays first on the retina and then on the sensor. The work investigates the relationship between body, image and space through photography, installation and mixed languages, with a particular bond to dance and performance. It is an artist's practice that also accepts commissions, not a commercial studio with a personal side.

## Operating Context

- Artwork and Professional are **two distinct registers**: Artwork is poetic and contemplative; Professional is clearer and more oriented toward service and collaboration. Future work keeps them deliberately different, under the same author.
- Each project has: title with place and year, a descriptive text (for Artwork, often a long reflection), camera, lens, light, a banner, an ordered image sequence with known dimensions, a preview with a focal point, and exhibitions (Artwork).
- The About page exists in an Art and a Pro version, with fields that can be shared between the two (text, quote, photo, video).
- Visitors often arrive from links shared on Instagram and WhatsApp (Open Graph previews matter).
- The Manager is used at the desk, on a Mac, with the project SSD connected.

## Capabilities and Constraints

- Stack: Next.js (pages router) with ISR, Tailwind 3, React 19, sharp for image generation (`npm run gen:images`), deployed on Vercel. Domain: `alfredoenricoiacobucci.art`.
- Content lives in `codice-sorgente/contenuti/contenuti.json` and `codice-sorgente/contenuti/stringhe.txt`. **Every text and image must remain editable without code**, from the Manager or from `stringhe.txt`. New features must take their data from these sources, not from hardcoded strings.
- **The photos come first**: the interface must never crop against the author's choices, cover, or compete with the images. The focal point (`anteprimaPosizione`) chosen by the author is respected.
- Language: currently Italian (`lang="it"`). **An English version is planned**: new copy and structures should not make a future bilingual version difficult.
- In-house analytics (`/api/track`, `/api/analytics`), read only by the Manager.
- Respect for `prefers-reduced-motion` already exists (`useReducedMotion`).

## Brand Commitments

- Name: **Alfredo Enrico Iacobucci**. Instagram: `@alfredoenricoiacobucci`.
- About quote: "Quand'è meglio di adesso?"
- Section labels: Artwork, Professional, about, email, Insta.
- Every image is under copyright, as the footer disclaimer states.
- App icon: `icon_1024_squircle.png`, `Manager icon.icns`.

## Evidence on Hand

- Artwork: 6 series (Xylella, Gemelli Cosmici, Le radici ca tieni, Labirinto di cemento, Totem, Benzina senza piombo), 2024–2025, with texts and technical data.
- Professional: 9 published projects (workshops with Gioia Morisco, Paola Bianchi, Ivan Fantini; performances by Giovanni Comelli and Sofia Belletti; CULT Urbino; Artisti in Piazza Pennabilli; Benevierre Store), 2025.
- Bio and quote in `contenuti.json` (`aboutArt`, `aboutPro`).
- **Missing, and not to be fabricated**: exhibitions (all `esposizioni` are empty), About photo and video, testimonials, client lists, press, awards, prices.

## Product Principles

1. **The image is the content.** Every interface decision is measured by how well it serves the photographs.
2. **Two registers, one author.** Artwork invites contemplation; Professional makes collaboration easy. Neither borrows the other's tone.
3. **The author owns the content.** If it can't be edited from the Manager, it doesn't ship.
4. **The truth of the work.** Show only what exists: real projects, real data, real texts.
5. **The Manager serves speed.** It is a private work tool: clarity and reliability over expression.

## Accessibility & Inclusion

No specific requirement established beyond what exists: reduced motion, image alt text from the SEO/a11y pipeline. The future bilingual version is an inclusion goal.
