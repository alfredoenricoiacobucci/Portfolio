---
name: Alfredo Enrico Iacobucci
description: Portfolio of a multimedia artist. Warm paper, black ink and a single safelight red; the photograph is what emerges.
colors:
  darkroom-paper: "#f8f4ed"
  ink-black: "#0a0a0a"
  safelight-red: "#c8102e"
  safelight-red-lifted: "#e8364f"
  graphite: "#4a4a4a"
  ash: "#a3a3a3"
  error-ink: "#b00020"
  error-lifted: "#ff6b7f"
typography:
  display:
    fontFamily: "Archivo, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "7rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Archivo, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 1.1
  title:
    fontFamily: "Archivo, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  nav:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-narrow:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  none: "0px"
  focus: "2px"
  dot: "9999px"
spacing:
  gallery-gap: "6px"
  gutter-mobile: "24px"
  gutter-desktop: "48px"
  header-y: "2.2rem"
  field-y: "12px"
  side-margin: "8%"
  column-gap: "4%"
components:
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.none}"
    padding: "12px 0"
    width: "100%"
  button-outline-hover:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.darkroom-paper}"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.none}"
    padding: "12px 0"
    width: "100%"
  nav-mode-switch:
    textColor: "{colors.ink-black}"
    typography: "{typography.nav}"
  nav-mode-switch-active:
    textColor: "{colors.safelight-red}"
  dot-nav:
    backgroundColor: "{colors.ink-black}"
    rounded: "{rounded.dot}"
    size: "13px"
  dot-nav-hover:
    backgroundColor: "{colors.safelight-red}"
  marquee-row:
    backgroundColor: "{colors.darkroom-paper}"
    textColor: "{colors.ink-black}"
    typography: "{typography.display}"
  marquee-row-active:
    textColor: "{colors.darkroom-paper}"
---

# Design System: Alfredo Enrico Iacobucci

## Overview

**Creative North Star: "The Darkroom"**

The site is a developing room. Warm paper and black ink make up the whole interface, and one red, the safelight, marks what is active, hovered or important. The photograph is what comes up out of the bath: everything else stays in the half-dark so the image can come forward. The interface never decorates; it frames, separates with thick rules, and gives way.

Two registers live in the same room. **Artwork** is the paper: warm white `#f8f4ed`, black ink, 4px black rules. **Professional** is the same room with the light off: black background, paper-coloured text, thinner 2.5px rules and a lifted red to keep contrast. The switch between them is a full inversion of `--bg` and `--fg`, never a second palette.

Type is set like a poster: Archivo Extra Bold for titles and huge uppercase marquees, Inter for everything you read and use. Controls are silent and lean (text, thin lines, no fills) but react with small physical movements: a press at 0.97, the back triangle that stretches like rubber, the nav dot that grows. Never intrusive.

**Key Characteristics:**
- Three key colours: Darkroom Paper, Ink Black, Safelight Red. No other hues.
- Artwork / Professional as an inversion of the same tokens.
- Thick black rules as the only structure; no cards, no shadows for depth.
- Square corners everywhere; the only circle is the nav dot.
- Small, tactile motion with strong ease-out curves; everything collapses under `prefers-reduced-motion`.

## Colors

A darkroom palette: two neutrals with a warm cast and one saturated red used sparingly, like a safelight.

### Primary
- **Safelight Red** (#c8102e): hover on every interactive element (`.hover-red`), the active Art/Pro mode, the date and place in the banner title, the nav dot on hover, the keyboard focus ring. 5.4:1 on Darkroom Paper.
- **Safelight Red, lifted** (#e8364f): the same role in Professional mode. On Ink Black the base red only reaches 3.4:1; this reaches 4.8:1 and stays the same red.

### Neutral
- **Darkroom Paper** (#f8f4ed): Artwork background, text on dark and on photos. Tailwind's `white` is redefined to this value, so `bg-white`/`text-white` are always warm.
- **Ink Black** (#0a0a0a): Artwork text, Professional background, rules, outline buttons. Never pure `#000` for surfaces (rules and overlays may use it).
- **Graphite** (#4a4a4a): secondary text in Artwork (`--muted`).
- **Ash** (#a3a3a3): secondary text in Professional.
- **Error Ink** (#b00020) / **Error, lifted** (#ff6b7f): form errors only, on paper and on black respectively.

### Named Rules
**The Safelight Rule.** Red is the only colour. It means "this responds" or "this is where you are"; it is never a background, a fill or decoration, and never takes up more than a handful of words on screen.

**The One Meaning Rule.** Error is a separate token from the accent. A colour that means active, hover and error at once means nothing.

**The Inversion Rule.** Professional does not get its own palette: it swaps `--bg` and `--fg` and lifts the red. Any new component must work in both by reading the variables, not by hardcoding hex values.

## Typography

**Display Font:** Archivo 600/700/800 (fallback Inter, system-ui)
**Body Font:** Inter 400/500/600/700 (fallback system-ui, -apple-system)

**Character:** Archivo carries the poster voice: compact, heavy, uppercase in the marquees. Inter carries the reading voice at small sizes, where Archivo would be too loud. Both are self-hosted via `next/font` as `--font-display` and `--font-body`.

### Hierarchy
- **Display** (Archivo 800, 7rem, uppercase, line-height 1): the project names in the marquee rows. 3.5rem in mobile landscape.
- **Headline** (Archivo 800, 2.25rem → 3.75rem from `md`, line-height 1.1): project titles over the banner, in paper white, with the date and place in red. Drop shadow `0 3px 8px rgba(0,0,0,.9)` for legibility over the photo.
- **Title** (Archivo 600, 1.5rem → 2rem, tracking-tight, line-height 1.05): the name on the landing.
- **Nav** (Inter 600, 20px; 28px on landing from `md`): Art / Pro, Artwork / Professional.
- **Body** (Inter 400, 16px, line-height 1.625): About texts, flush left with hyphenation (`hyphens: auto`, `lang="it"`).
- **Body narrow** (Inter 400, 14px): project texts in the narrow side column.
- **Label** (Inter 600, 11px, uppercase, `tracking-wider`): technical data (camera, lens, light) and micro labels. The 12px floor applies to running service text.

### Named Rules
**The Readable Floor Rule.** No text below 11px; the old 9px labels were unreadable. 11px only uppercase with tracking; service text starts at 12px.

**The Flush Left Rule.** Text is flush left with hyphenation, never justified and never centred, footer included. Only the landing is centred.

## Layout

Full-bleed, edge to edge. Photos and banners occupy the whole width; the banner is `100vh` minus the header. Text sits in columns with side margins as a percentage (default 8%) and a column gap of 4%, both editable from the Manager (`aspetto`). Horizontal gutters are `px-6` (24px) on mobile and `px-12` (48px) from `md`.

The gallery is a **justified mosaic** (`JustifiedGallery`): rows that always fill the width, at least two photos per row, a 6px gap, a target height of 360 / 500 / 640px under 640px / under 1024px / above. Proportions come from `contenuti.json`, so there is no layout shift.

Sections are separated by **4px black rules** (Artwork) or **2.5px paper rules** (Professional): the header bottom edge and the top and bottom of each marquee row. The header has 2.2rem of vertical padding.

Responsive: breakpoints are Tailwind defaults (`md` 768px). There is a dedicated layer for mobile landscape (`max-height: 500px`, coarse pointer) that scales marquee, header, footer and texts proportionally. Safe areas for the notch use `env(safe-area-inset-*)`. Text columns are pinned to `screen.width` to prevent reflow.

## Elevation & Depth

Flat. There is no shadow vocabulary for elevation: depth comes from the contrast between paper and ink, from photographs, and from the overlays that darken an image under text. Shadows exist only for **legibility over photos**: `drop-shadow(0 3px 8px rgba(0,0,0,.9))` on banner titles, `text-shadow 0 2px 8px rgba(0,0,0,.6)` on the active marquee, `drop-shadow(0 2px 4px rgba(0,0,0,.7))` on the viewer controls.

Photographic overlays: on the landing `rgba(248,244,237,.60–.72)` on paper and `rgba(0,0,0,.70–.82)` on black; on the marquee row `rgba(0,0,0,.45)`; on the banner, opacity is configurable (default 65%).

### Named Rules
**The Flat Room Rule.** Nothing floats. A shadow is only allowed where text sits on a photograph, and only to make it readable.

## Shapes

Square corners, without exception for surfaces, buttons, fields and images. The only round element is the **nav dot** (12–13px, `rounded-full`). The focus ring has a 2px radius only to soften the outline. Lines are full and thick (4px / 2.5px) for structure and 1px for fields and buttons. The **back triangle** (SVG polygon) is the signature icon: a geometric shape, not a chevron.

## Components

### Buttons
Silent and lean: no fill at rest, a 1px border, inversion on hover.
- **Shape:** square corners (0).
- **Outline (form):** transparent, 1px border in `--fg`, text in `--fg`, Inter 600, `py-3`, full width.
- **Hover:** full inversion (background `--fg`, text `--bg`) with `transition-colors`.
- **Press:** `scale(0.97)` on every `button`, `a`, `[role=button]`.
- **Text buttons** (nav, links, contacts): text only; on hover they turn Safelight Red (`.hover-red`, 300ms).

### Inputs / Fields
- **Style:** underline only. Transparent background, `border-b` 1px at 20% ink (30% paper in Professional), placeholder at 35–40%, `py-3`.
- **Focus:** the line becomes solid ink (or paper), with no glow. The keyboard focus ring is still the global one.
- **Error:** text in Error Ink / Error lifted, never in the accent.

### Navigation
- **Header:** full width, Art / Pro on the left (20px, the active mode in red), nav dot in the centre, section links on the right (15px bold). Bottom edge 4px ink or 2.5px paper.
- **Dot nav:** a 13px circle (12px in Professional); on hover red with `scale(1.3)`, on press `scale(1.1)`.
- **Back triangle:** on hover turns red and plays `rubberSnap` (400ms, a horizontal squeeze-and-release).
- **Landing:** the name centred, Artwork / Professional below; the hovered mode fades in its photo (crossfade 400ms) and the other mode drops to 40% opacity.

### Marquee Row (signature component)
The list of projects as an exhibition poster: each project is a full-width row with its name in Archivo 800 uppercase at 7rem, scrolling in a loop, between two 4px rules. On hover (fine pointer) or when active, the project banner appears behind it (opacity 0 → 1, 400ms), the text turns paper-coloured with a shadow, and the row opens with `padding: 4.5rem 0` (2.5rem on touch). On entry the rows arrive staggered (`marqueeStaggerIn`, 400ms, 8px from below).

### Project Banner
Full-viewport photo, title at the bottom left in Headline paper white with the date and place in red. Underneath, a bouncing chevron (3 bounces, then a 5s pause) opens the text with a `grid-template-rows 0fr → 1fr` reveal (500ms) instead of a max-height.

### Viewer
Full screen on a near-opaque background (95%), with white controls of 44×44px, outlined with a drop shadow, turning red with `scale(1.12)` on hover.

### Manager (private surface)
Separate tool, dark and dense: `--bg #0a0a0a`, panels `#141414`, borders `#222`/`#2a2a2a`, text at 85/55/35% white, the same red `#c8102e`, Inter, small radii (3–8px), 16px gaps. Unlike the public site, rounded corners and secondary surfaces are allowed here: it serves speed, not the image.

## Do's and Don'ts

### Do:
- **Do** read colours from `--bg`, `--fg`, `--muted`, `--border`, `--accent`, `--error`, so every component works in both Artwork and Professional.
- **Do** use Safelight Red only for hover, the active state, focus and the date/place in the banner.
- **Do** keep corners square (0); the only circle is the nav dot.
- **Do** separate sections with 4px ink rules (2.5px paper in Professional), not with cards or backgrounds.
- **Do** use the defined curves: `--ease-out cubic-bezier(0.23,1,0.32,1)` for entrances, `--ease-in-out cubic-bezier(0.77,0,0.175,1)` for reveals, `--ease-smooth cubic-bezier(0.2,0.9,0.2,1)` for crossfades; durations of 150–500ms.
- **Do** give every touch control a target of at least 44×44px.
- **Do** take every text, size and spacing that can be changed from `contenuti.json` / `stringhe.txt` / `aspetto`, with the default as a fallback.

### Don't:
- **Don't** add hues beyond paper, ink and red; don't use pure `#fff` for surfaces (Tailwind `white` is already `#f8f4ed`).
- **Don't** use the accent for errors, or the error colour as an accent.
- **Don't** add shadows for elevation; shadows only where text sits on a photo.
- **Don't** add rounded corners, cards or panels to the public site.
- **Don't** go below 11px for text or justify paragraphs.
- **Don't** crop images against the focal point chosen in the Manager, or cover them with interface.
- **Don't** add looping animations beyond the marquee and the chevron, or motion that ignores `prefers-reduced-motion`.
