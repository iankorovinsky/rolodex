# Rolodex Design System

## Brand Thesis

Rolodex should feel like a trusted relationship workspace for serious operators: calm, editorial, and highly legible. The system combines:

- Coinbase's blue-led interaction palette
- Cohere's serif-plus-sans typography hierarchy
- Notion's restraint, warm neutrals, whisper borders, and soft depth

The result should not feel like crypto UI, SaaS template UI, or consumer productivity UI. It should feel like a high-trust personal intelligence tool.

## Core Principles

- Use blue as a functional accent, not decorative paint.
- Keep surfaces quiet: white and warm off-white do most of the work.
- Let typography carry authority; avoid relying on oversized color blocks.
- Borders should separate, not announce themselves.
- Shadows should be ambient and barely perceptible.
- Cards should feel soft and composed, not bubbly or toy-like.
- Prefer a few strong decisions repeated consistently over many variants.

## Visual Direction

- Overall mood: editorial infrastructure
- Tone: trustworthy, warm, precise, understated
- Contrast model: warm neutrals for reading comfort, saturated blue for action
- Density: medium; never cramped, never oversized
- Decoration: minimal; use form, spacing, and type before ornament

## Color System

### Brand

- `brand.blue`: `#0052FF`
- `brand.blueHover`: `#578BFA`
- `brand.blueActive`: `#0041CC`
- `brand.blueTint`: `#EEF4FF`

### Neutrals

- `ink.strong`: `rgba(0, 0, 0, 0.95)`
- `ink.default`: `#17171C`
- `ink.muted`: `#615D59`
- `ink.subtle`: `#A39E98`
- `surface.page`: `#FFFFFF`
- `surface.alt`: `#F6F5F4`
- `surface.raised`: `#FCFBFA`
- `surface.dark`: `#0A0B0D`
- `surface.darkAlt`: `#282B31`

### Structure

- `border.whisper`: `rgba(0, 0, 0, 0.10)`
- `border.strong`: `rgba(0, 0, 0, 0.16)`
- `focus.ring`: `#097FE8`

### Semantic

- `success`: `#1AAE39`
- `warning`: `#DD5B00`
- `danger`: `#C53B32`

## Color Rules

- Blue is reserved for CTAs, links, selection, focus, active states, and small emphasis moments.
- Large layout sections should stay white, warm-white, or dark neutral.
- Avoid purple, neon, or multicolor accents in core product chrome.
- Prefer warm neutrals over cool gray when choosing non-brand surfaces.

## Typography

### Font Strategy

Preferred brand stack:

- Display: `CohereText`
- UI and body: `Unica77`
- Mono: `SF Mono`, `Geist Mono`, `ui-monospace`, `monospace`

Implementation fallback until licensed fonts are available:

- Display fallback: `Instrument Serif`, `Georgia`, `serif`
- UI/body fallback: `Inter`, `ui-sans-serif`, `system-ui`

### Hierarchy

| Role            | Font          | Size | Weight | Line Height | Tracking |
| --------------- | ------------- | ---- | ------ | ----------- | -------- |
| Hero Display    | Display serif | 64px | 400    | 1.0         | -1.8px   |
| Section Display | Display serif | 48px | 400    | 1.02        | -1.2px   |
| Page Heading    | Sans          | 32px | 500    | 1.15        | -0.4px   |
| Card Heading    | Sans          | 24px | 500    | 1.2         | -0.2px   |
| Section Label   | Sans/Mono     | 12px | 600    | 1.35        | 0.12em   |
| Body Large      | Sans          | 18px | 400    | 1.5         | normal   |
| Body            | Sans          | 16px | 400    | 1.5         | normal   |
| UI Label        | Sans          | 15px | 500    | 1.35        | normal   |
| Small           | Sans          | 14px | 500    | 1.4         | normal   |
| Micro           | Sans/Mono     | 12px | 500    | 1.35        | 0.04em   |

### Typography Rules

- Serif is for declaration, framing, and brand voice.
- Sans is for interface, navigation, forms, and dense product content.
- Body copy should rarely exceed 16px in product UI.
- Use weight contrast sparingly; hierarchy should come mostly from size and spacing.
- Large headings can use negative tracking; body copy should not.

## Radius

- `radius.control`: `4px`
- `radius.card`: `12px`
- `radius.featured`: `16px`
- `radius.pill`: `9999px`

### Radius Rules

- Inputs and buttons use 4px.
- Standard cards, tables, panels, and list containers use 12px.
- Featured surfaces and hero cards can use 16px.
- Do not use Cohere's 22px radius. It conflicts with the quieter Notion-style structure.

## Borders And Shadows

### Borders

- Default border: `1px solid rgba(0, 0, 0, 0.10)`
- Strong border: `1px solid rgba(0, 0, 0, 0.16)`

### Shadows

- Card:
  `rgba(0,0,0,0.04) 0 4px 18px, rgba(0,0,0,0.027) 0 2px 8px, rgba(0,0,0,0.02) 0 1px 3px, rgba(0,0,0,0.01) 0 0 1px`
- Modal:
  `rgba(0,0,0,0.01) 0 1px 3px, rgba(0,0,0,0.02) 0 3px 7px, rgba(0,0,0,0.02) 0 7px 15px, rgba(0,0,0,0.04) 0 14px 28px, rgba(0,0,0,0.05) 0 23px 52px`

### Elevation Rules

- Most product UI should live at border-only or soft-card elevation.
- Strong shadows are reserved for modals, popovers, and a small number of hero surfaces.
- Never stack heavy borders and heavy shadows together.

## Spacing

Base unit: `8px`

Recommended scale:

- `4, 8, 12, 16, 24, 32, 48, 64, 80`

Usage:

- Inline control gaps: `8-12px`
- Card padding: `16-24px`
- Section padding: `48-80px`
- Route/page spacing: `24-32px`

## Layout

- Max reading width: `720px`
- Max standard content width: `1200px`
- Full app shell uses contained rails and generous internal padding
- Alternate large sections between `surface.page` and `surface.alt`
- Use dark sections sparingly for spotlight moments, not for routine product surfaces

## Components

### Buttons

Primary:

- Background: `brand.blue`
- Text: white
- Radius: `4px`
- Hover: `brand.blueHover`
- Active: `brand.blueActive`
- Focus: `2px` visible ring in `focus.ring`

Secondary:

- Background: `surface.alt`
- Text: `ink.strong`
- Border: whisper

Ghost:

- Background: transparent
- Text: `ink.strong`
- Hover: `brand.blue`
- Border: transparent

### Inputs

- White background
- Whisper border
- 4px radius
- Placeholder in `ink.subtle`
- Focus ring in `focus.ring`
- Error state uses border plus helper text, not red-filled fields

### Cards

- White or warm-white surface
- 12px radius by default
- Whisper border
- Optional soft card shadow
- Headings use sans, not serif

### Badges

- Blue tint background for informational badges
- Full pill radius
- 12px label size
- Keep badge count and status systems restrained

### Navigation

- Mostly white or warm-white
- Sans labels at 15px/500
- One clear primary action in blue
- Active states should be indicated by blue text, blue tint, or a slim marker, not oversized fills

## Motion

- Keep motion short and calm: `120ms-180ms` for controls, `180ms-240ms` for panels
- Favor fade, slight translate, and shadow shifts over springy scaling
- Button active scale can be subtle, but avoid playful bounce

## Do

- Use blue to clarify action hierarchy.
- Use serif display sparingly for route titles, empty states, and marketing moments.
- Keep long-form text on warm white or white.
- Preserve generous whitespace around dense data views.
- Let tables, lists, and sidebars stay quiet.

## Don't

- Don't turn every active surface blue.
- Don't use large-radius bubbly cards.
- Don't rely on heavy shadows for hierarchy.
- Don't mix multiple accent colors in the same screen.
- Don't use serif inside dense forms, tables, or navigation.

## Product-Specific Guidance For Rolodex

- The app should prioritize people and context over dashboard spectacle.
- Person cards should feel archival and trustworthy, not sales-oriented.
- Relationship metadata, tags, and notes need strong hierarchy without visual noise.
- The sidebar and list views should remain calm; detail panes can carry more typographic personality.
- Empty states can use the display serif to make the product feel thoughtful instead of generic.

## Implementation Tokens

```css
:root {
  --rdx-color-bg: #ffffff;
  --rdx-color-bg-alt: #f6f5f4;
  --rdx-color-bg-raised: #fcfbfa;
  --rdx-color-bg-dark: #0a0b0d;
  --rdx-color-fg: rgba(0, 0, 0, 0.95);
  --rdx-color-fg-muted: #615d59;
  --rdx-color-fg-subtle: #a39e98;
  --rdx-color-brand: #0052ff;
  --rdx-color-brand-hover: #578bfa;
  --rdx-color-brand-active: #0041cc;
  --rdx-color-brand-tint: #eef4ff;
  --rdx-color-border: rgba(0, 0, 0, 0.1);
  --rdx-color-border-strong: rgba(0, 0, 0, 0.16);
  --rdx-color-focus: #097fe8;
  --rdx-radius-control: 4px;
  --rdx-radius-card: 12px;
  --rdx-radius-featured: 16px;
  --rdx-radius-pill: 9999px;
  --rdx-shadow-card:
    0 4px 18px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.027), 0 1px 3px rgba(0, 0, 0, 0.02),
    0 0 1px rgba(0, 0, 0, 0.01);
}
```

## Prompt Contract

When generating UI for Rolodex:

- Use Coinbase blue for action and focus only.
- Use Cohere-style serif display for headlines only.
- Use Notion-style warm neutrals, whisper borders, and restrained shadows.
- Prefer white and warm-white surfaces over saturated panels.
- Keep the interface calm, editorial, and product-focused.
