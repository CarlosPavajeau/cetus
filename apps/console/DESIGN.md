---
name: Cetus Console
description: Monochrome ledger for issuing DIAN electronic documents; color only marks state.
colors:
  ink: "oklch(0.145 0 0)"
  ink-strong: "oklch(0.205 0 0)"
  paper: "oklch(1 0 0)"
  paper-off: "oklch(0.985 0 0)"
  wash: "oklch(0.97 0 0)"
  pencil: "oklch(0.556 0 0)"
  rule: "oklch(0.922 0 0)"
  ink-dark: "oklch(0.145 0 0)"
  card-dark: "oklch(0.205 0 0)"
  wash-dark: "oklch(0.269 0 0)"
  pencil-dark: "oklch(0.708 0 0)"
  primary-dark: "oklch(0.922 0 0)"
  info: "oklch(0.685 0.169 237.323)"
  info-text: "oklch(0.5 0.134 242.749)"
  success: "oklch(0.696 0.17 162.48)"
  success-text: "oklch(0.508 0.118 165.612)"
  warning: "oklch(0.769 0.188 70.08)"
  warning-text: "oklch(0.555 0.163 48.998)"
  destructive: "oklch(0.577 0.245 27.325)"
  destructive-text: "oklch(0.505 0.213 27.518)"
  impersonation: "oklch(0.828 0.189 84.429)"
typography:
  display:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.045em"
    fontFeature: '"cv11", "ss01", "ss03"'
  headline:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "3rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.5
  mono:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.625
rounded:
  sm: "3px"
  md: "4px"
  lg: "6px"
  xl: "8px"
  pill: "9999px"
spacing:
  card: "16px"
  card-sm: "12px"
  gutter: "16px"
  gutter-md: "24px"
  section: "clamp(4rem, 10vw, 8rem)"
components:
  button-primary:
    backgroundColor: "{colors.ink-strong}"
    textColor: "{colors.paper-off}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  button-destructive:
    textColor: "{colors.destructive}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "36px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card}"
  badge:
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
    height: "20px"
  code-block:
    backgroundColor: "{colors.paper}"
    typography: "{typography.mono}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: Cetus Console

## Overview

**Creative North Star: "The Ledger"**

The console is a well-kept accounting book: black ink on white paper, ruled lines, and entries that mean exactly
what they say. Every surface is achromatic (chroma 0 in OKLCH). Color is an entry in the ledger, not decoration:
it appears only when a document, an environment or the session has a state worth reading (pending, accepted,
needs attention, rejected, impersonating).

Density is operational. Body text sits at 13px, controls at 36px, labels at 11px, so a document list, its
status and its CUFE fit in one glance. The marketing pages live in the same app and the same tokens; they open
up the scale (a fluid display size, generous section bands) without leaving the book's palette. Light and dark
themes are equal citizens: the page follows the system until the user chooses, and never flashes the wrong one.

The feel is precise and restrained at rest, tactile in the hand: hairline rules and quiet surfaces, but every
press answers with a small, physical scale-down.

**Key Characteristics:**

- Achromatic neutral scale; hue reserved for state.
- Compact type scale anchored on 13px Inter, with Geist Mono for codes, keys, IDs and snippets.
- Flat surfaces separated by 1px rules and 10% ink rings, not shadows.
- Small, consistent radii (6px controls, 8px containers, pills for badges).
- Short ease-out transitions (150ms) and a 0.96 press scale, both motion-safe.

## Colors

Ink on paper, in two themes, with four state hues used sparingly and always with a label.

### Primary

- **Ledger Ink** (ink-strong): primary buttons, the Cetus mark, the `LIVE` environment badge. In dark it inverts
  to **Bone** (primary-dark), a near-white ink on charcoal.

### Neutral

- **Ink** (ink): body text and headings on light; also the dark-theme page background.
- **Paper** (paper) and **Off-white Paper** (paper-off): page and card surfaces; off-white for the sidebar and
  text on ink.
- **Wash** (wash): secondary buttons, muted fills, hover backgrounds, card footers at 50%.
- **Pencil** (pencil): secondary text, placeholders, line numbers, focus rings. **Soft Pencil** (pencil-dark) in
  dark.
- **Rule** (rule): borders and input strokes on light. In dark, rules are translucent white (10% borders, 15%
  inputs) rather than a solid grey.
- **Charcoal** (card-dark) and **Graphite** (wash-dark): dark-theme cards, popovers and muted fills.

### State hues

- **Sky** (info, info-text): neutral phases and work in flight (`pending` spins, `info` stays still). Surfaces
  use Sky at 10%; text uses the deeper shade.
- **Emerald** (success, success-text): accepted by the DIAN, done.
- **Amber** (warning, warning-text): needs attention; amber surfaces carry alerts.
- **Seal Red** (destructive, destructive-text): rejected, failed, destructive actions. Always a 10% tint with red
  text, never a solid red button.
- **Impersonation Amber** (impersonation): the admin impersonation banner, the one solid saturated surface in the
  product, so nobody forgets whose account they are in.

### Named Rules

**The Entry Rule.** Hue only marks state. If a color does not answer "what state is this in?", it is ink.

**The Tint-Not-Fill Rule.** State color reaches a surface at 10% (20% for errors in dark) with the deeper shade
for text; solid saturated fills are reserved for impersonation.

**The Label Rule.** Color is never the only cue: every status badge carries an icon and a word.

## Typography

**Display Font:** Inter Variable (with sans-serif)
**Body Font:** Inter Variable (with sans-serif)
**Label/Mono Font:** Geist Mono Variable (with ui-monospace, monospace)

**Character:** One neutral grotesque does all the talking, tightened at large sizes; the monospace is the
ledger's numerals column, for anything a person might copy or compare character by character.

### Hierarchy

- **Display** (500, `clamp(2.5rem, 6vw, 4.5rem)`, 1.1, -0.045em): the landing hero only, with Inter's
  single-storey a and open digits (`cv11`, `ss01`, `ss03`).
- **Headline** (500, 36px → 48px from md, -0.04em, balanced): marketing section titles.
- **Title** (400, 30px, tight tracking): the page title of every console screen, regular weight beside its count
  and status badges.
- **Body** (400, 13px, 1.5): the console's default; 14px and 16px for longer reading and leads (marketing leads
  at 18px/32px, muted).
- **Label** (500, 11px): badges, meta lines, the user's email; 10px for the smallest annotations.
- **Mono** (400, 12px, relaxed): CUFE/CUDE, API keys, IDs, code blocks, eyebrows (uppercase, wider tracking).

### Named Rules

**The Copyable Rule.** Anything a person copies, pastes or compares (keys, IDs, CUFE, NIT in technical context,
code) is set in Geist Mono.

**The Quiet Weight Rule.** Weight tops out at 500 for headings and 600 only for the wordmark; hierarchy comes from
size and tracking, not bold.

## Layout

The console is a collapsible left sidebar (off-white surface, icon-only when collapsed) beside a content column
with a 64px top bar holding the sidebar trigger, breadcrumbs, theme switch and help. Content gutters are 16px on
mobile and 40px from md. Each screen opens with a page header: title, count and status on one baseline, a muted
lead below, and the primary action to the right (stacked under it on small screens).

Marketing pages are a single column of full-width bands separated by a top rule, each capped at `max-w-6xl`
with 16px → 24px gutters and `section` vertical padding. Section heads hold an optional mono eyebrow, a headline
and a lead within `max-w-2xl`. Prose stays within `max-w-prose`.

Rhythm comes from Tailwind's 4px grid; cards use a 16px inner spacing (12px for the small size).

## Elevation & Depth

The system is flat. Depth comes from tonal layering (paper → off-white sidebar → wash) and hairlines: 1px
borders and a 10% ink ring around cards. Shadows are rare and small: `shadow-sm` lifts product screenshots and
some popovers, and the sidebar's scroll area shows a soft bottom shadow only while more content waits below it.

### Named Rules

**The Ruled-Not-Raised Rule.** Separate with a rule or a ring before reaching for a shadow; a shadow means the
surface floats above the page (menus, popovers, a screenshot), never that a card is important.

## Shapes

Small, consistent corners derived from one 6px base radius: 3px and 4px for tight elements (small buttons, the
Cetus mark), 6px for buttons and inputs, 8px for cards, code blocks and screenshots, and full pills for badges
and avatars. No sharp corners and no large, soft blobs.

## Components

### Buttons

Precise at rest, tactile when pressed.

- **Shape:** gently rounded (6px); 36px tall by default, 28px / 32px / 40px / 44px for xs / sm / lg / xl (xl
  matches the large input on the auth screens), square icon
  variants at the same heights.
- **Primary:** Ledger Ink fill with off-white text, 13px medium; hover softens the ink to 80%.
- **Outline / Secondary / Ghost:** paper with a rule border, a wash fill, or nothing; all hover to wash.
- **Destructive:** Seal Red at 10% (15% in dark) with the deeper red text (destructive-text), stepping
  up 5% on hover so text stays at 4.5:1 or more; never a solid red fill.
- **Hover / Focus:** 150ms ease-out color transitions; focus shows a 3px pencil ring; pressing scales to 0.96
  (motion-safe); disabled drops to 50% opacity.

### Chips

- **Badges:** 20px pills, 11px medium. Neutral variants for counts and environments (Producción = ink fill,
  Pruebas = wash, Simulación = outline).
- **Status badges:** a state tint with its icon and label: dashed circle (idle), info, spinner (pending),
  check (success), triangle (warning), cross (error). On a status change the icons cross-fade with a slight
  blur and scale (300ms, `cubic-bezier(0.2, 0, 0, 1)`), so pending → accepted blends instead of jumping.

### Cards / Containers

- **Corner Style:** 8px.
- **Background:** paper (charcoal in dark).
- **Shadow Strategy:** none; a 1px ring of ink at 10%.
- **Border:** the ring replaces it; footers add a top rule over a 50% wash.
- **Internal Padding:** 16px (12px small).

### Inputs / Fields

- **Style:** 36px (44px large), 6px corners, rule stroke, transparent fill (15% white tint in dark), 16px text on
  mobile and 13px from md so iOS never zooms.
- **Focus:** stroke turns pencil with a 3px pencil ring at 50%.
- **Error / Disabled:** red stroke with a 20% red ring; disabled fills with the input tint at 50% opacity.

### Navigation

The sidebar lists sections with lucide icons at 16px, the active item on a wash fill; it collapses to icons.
The top bar's breadcrumbs hide intermediate crumbs on mobile. The marketing nav carries the wordmark, docs,
pricing and the two account CTAs, with a sheet menu on mobile.

### Code Block

The developer's proof of the API: a figure with an 8px corner and rule border, a caption bar with the snippet's
title in mono and an icon-only copy button, and Shiki-highlighted code in 12px Geist Mono with optional line
numbers in pencil. It carries both Shiki themes and follows the page theme.

## Do's and Don'ts

### Do:

- **Do** keep surfaces achromatic and spend hue only on state, at 10% tint with the deeper shade for text.
- **Do** pair every state color with an icon and a word.
- **Do** set keys, IDs, CUFE/CUDE and code in Geist Mono.
- **Do** separate with 1px rules and the 10% ink ring before considering a shadow.
- **Do** keep transitions at 150ms ease-out and wrap press scaling and spinners in motion-safe / motion-reduce.
- **Do** design every surface in light and dark; dark rules are translucent white, not grey.

### Don't:

- **Don't** introduce a brand accent color; Cetus has none.
- **Don't** fill a surface with solid saturated color, except the impersonation banner.
- **Don't** use solid red buttons; destructive actions are tinted.
- **Don't** go above weight 500 for headings or use bold for hierarchy.
- **Don't** use the unused shadcn leftovers (`sidebar-primary`'s blue in dark, the grey `chart-*` scale) as if
  they were part of the system.
