---
name: Crimson Cravings
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#5d3f3d'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#926e6c'
  outline-variant: '#e7bdba'
  surface-tint: '#bf0022'
  primary: '#bd0021'
  on-primary: '#ffffff'
  primary-container: '#e61e32'
  on-primary-container: '#fffeff'
  inverse-primary: '#ffb3af'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#5c5d5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#747676'
  on-tertiary-container: '#fefefe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3af'
  on-primary-fixed: '#410005'
  on-primary-fixed-variant: '#930017'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e3e2e2'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  price-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 20px
  card-gutter: 16px
  element-gap-sm: 8px
  element-gap-md: 16px
  section-margin: 32px
---

## Brand & Style

The brand personality is energetic, appetizing, and efficient. It aims to evoke a sense of hunger and immediate gratification through a vibrant, high-contrast visual language. The target audience is urban professionals and students who value speed and clarity when ordering food.

The design style is **Corporate / Modern** with a **Minimalist** focus. It utilizes high-quality food photography set against clinical white backgrounds to make the products the hero of the experience. The interface relies on a strict card-based hierarchy and soft, generous roundedness to feel approachable and premium.

## Colors

The palette is led by **Crimson Red**, used strategically for calls-to-action, active states, and price points to stimulate appetite and urgency. **Pure White** serves as the primary canvas, ensuring the UI feels clean and spacious. 

- **Primary:** #E61E32 (Crimson Red) for primary buttons, selection indicators, and branding.
- **Secondary:** #1A1A1A for high-contrast headings and primary text.
- **Surface:** #FFFFFF (Pure White) for cards and background.
- **Subtle Surface:** #F8F8F8 for background fills behind cards to create soft separation.
- **Muted:** #757575 for secondary descriptions and metadata.

## Typography

The typography system combines **Plus Jakarta Sans** for headlines and labels to maintain a friendly, geometric personality, with **Be Vietnam Pro** for body text to ensure high legibility in descriptive content.

Headlines use tight letter-spacing and heavy weights to create a strong visual anchor. Price points are treated as a specific typographic role, always rendered in bold Plus Jakarta Sans and Crimson Red to ensure they are the second most important element on a product card after the image.

## Layout & Spacing

This design system uses a **Fluid Grid** for mobile, optimized for a single or two-column product feed. The layout relies on a 20px safe margin on the horizontal axis. 

- **Product Grid:** 2-column layout on mobile with a 16px gutter.
- **Margins:** 20px global horizontal margin for all container content.
- **Rhythm:** An 8px-based spacing system (4px, 8px, 16px, 24px, 32px) drives all internal padding and external margins.
- **Mobile-First:** Layouts are designed to be thumb-friendly, with primary actions (plus buttons, checkout) placed in the lower-right or bottom-sticky zones.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Ambient Shadows**. 

- **Surface Level 0:** The main application background uses a light grey (#F8F8F8) to provide contrast for white cards.
- **Surface Level 1 (Cards):** Pure white cards use a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)) to appear lifted from the background.
- **Surface Level 2 (Sticky Elements):** The bottom navigation or cart summary uses a stronger shadow (0px -4px 16px rgba(0,0,0,0.08)) and a backdrop blur to indicate it sits above the scrolling content.
- **Interactive States:** Buttons do not use heavy shadows but rely on solid Crimson Red fills to indicate primary importance.

## Shapes

The shape language is consistently **Rounded**, reflecting the friendly and approachable brand personality.

- **Cards:** Use `rounded-xl` (24px) for a soft, containerized look.
- **Category Chips:** Use pill-shaped (full radius) rounding to distinguish them from product cards.
- **Action Buttons:** Primary buttons use `rounded-lg` (16px) to provide a large, comfortable hit area.
- **Small Elements:** Quantity selectors and input fields use `rounded-md` (8px).

## Components

### Food Category Chips
Horizontal scrolling chips with a white background and grey border for inactive states. The active state transitions to a Crimson Red fill with white text.

### Product Cards
White containers with `rounded-xl` corners. The product image is centered with no background. The price is positioned at the bottom-left in the `price-display` style. A circular Crimson Red "plus" button is floating in the top-right or bottom-right corner for quick "Add to Cart" actions.

### Sticky Bottom Cart
A full-width sticky bar with `rounded-t-xl` corners. It displays the total item count and price, with a large "View Cart" primary button. It uses a backdrop-filter (blur) for a modern, integrated feel.

### Input Fields
Clean, borderless inputs with a light grey background fill (#F2F2F2). Labels sit above the field in `label-md` bold. Focus states are indicated by a 2px Crimson Red bottom border.

### Primary Buttons
Large, high-pill or `rounded-lg` buttons with Crimson Red fill and white text. Height should be a minimum of 56px for mobile accessibility.