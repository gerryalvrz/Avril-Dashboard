# MotusDAO Hub Design System

A portable design system for the MotusDAO Hub (mental health & wellness platform). Includes **light**, **dark**, and **Matrix** themes with optional Matrix color variants. Use this document to keep UI consistent when building or forking the hub.

**Source:** Extracted from `main/motusdao-hub`.  
**How to propagate:** Copy this file into your repo (e.g. `docs/DESIGN_SYSTEM-HUB.md`) and reference it when building UI.

---

## 1. Themes Overview

| Theme   | Trigger                      | Use case                          |
|---------|------------------------------|-----------------------------------|
| Light   | `class="light"` on `<html>`  | Default, accessible, marketing    |
| Dark    | `class="dark"` on `<html>`    | Default app experience            |
| Matrix  | `data-theme="matrix"` on root | Terminal/retro/neon aesthetic     |

**Matrix color variants** (when `data-theme="matrix"`): set `data-matrix-color` on root to `green` | `red` | `orange` | `blue` | `pink`. Default is `green`.

---

## 2. Design Tokens & CSS Variables

### Base (all themes)

```css
:root {
  --primary-black: #1a1a1a;
  --primary-blue: #6366f1;
  --primary-gray: #6b7280;
  --pastel-purple: #e0e7ff;
  --pastel-pink: #fce7f3;
  --pastel-cyan: #ecfeff;
  --soft-white: #fafafa;

  /* Gradients */
  --grad-primary: linear-gradient(to right, #9333ea, #ec4899);
  --grad-secondary: linear-gradient(to right, #3b82f6, #06b6d4);
  --grad-background: radial-gradient(60% 60% at 20% 20%, rgba(59,130,246,.18), transparent 60%),
    radial-gradient(60% 60% at 80% 30%, rgba(236,72,153,.16), transparent 60%),
    radial-gradient(70% 70% at 50% 80%, rgba(168,85,247,.18), transparent 60%),
    linear-gradient(45deg, rgba(59,130,246,.08) 0%, rgba(236,72,153,.08) 50%, rgba(168,85,247,.10) 100%);
}
```

### Light theme (shadcn-style HSL)

- `--background: 0 0% 100%`
- `--foreground: 0 0% 3.9%`
- `--primary: 262.1 83.3% 57.8%`
- `--border: 0 0% 89.8%`
- `--ring: 262.1 83.3% 57.8%`
- `--radius: 0.5rem`

### Dark theme

- `--background: 0 0% 0%` (pure black)
- `--foreground: 0 0% 98%`
- `--card: 0 0% 0%`
- `--border: 0 0% 14.9%`
- Same primary/ring as light.

### Matrix theme (default green)

```css
[data-theme="matrix"] {
  --matrix-bg: #000000;
  --matrix-text: #39ff14;
  --matrix-accent: #00ff41;
  --matrix-border: rgba(0,255,65,0.6);
  --matrix-placeholder: #32ff32;
  /* Map --foreground, --primary, --border, --ring to neon green HSL */
}
```

**Matrix variants:** Override `--matrix-text`, `--matrix-accent`, `--matrix-border`, `--matrix-placeholder` per `data-matrix-color` (red, orange, blue, pink). See project `globals.css` for exact values.

---

## 3. Tailwind Theme Extension

```javascript
// tailwind.config - extend theme
colors: {
  'primary-black': '#1a1a1a',
  'primary-blue': '#6366f1',
  'primary-gray': '#6b7280',
  'pastel-purple': '#e0e7ff',
  'pastel-pink': '#fce7f3',
  'pastel-cyan': '#ecfeff',
  'soft-white': '#fafafa',
  mauve: { 50: "#faf5ff", … 950: "#3b0764" },
  iris: { 50: "#f0f4ff", … 950: "#1e1b4b" },
  matrix: {
    bg: "#000000",
    text: "#39ff14",
    accent: "#00ff41",
    border: "rgba(0,255,65,0.6)",
    placeholder: "#32ff32",
  },
  glass: {
    light: "rgba(255, 255, 255, 0.1)",
    dark: "rgba(0, 0, 0, 0.1)",
    border: "rgba(255, 255, 255, 0.15)",
  },
},
fontFamily: {
  sans: ["Inter", "sans-serif"],
  heading: ["Jura", "sans-serif"],
  accent: ["Playfair Display", "serif"],
  matrix: ["Share Tech Mono", "Courier New", "monospace"],
  matrixHeading: ["Orbitron", "Share Tech Mono", "monospace"],
},
backgroundImage: {
  "grad-primary": "linear-gradient(to right, #9333ea, #ec4899)",
  "grad-secondary": "linear-gradient(to right, #3b82f6, #06b6d4)",
  "grad-background": "var(--grad-background)",
  "grad-soft-purple": "radial-gradient(circle at 30% 30%, rgba(147, 51, 234, 0.15) 0%, transparent 50%)",
  "grad-soft-pink": "radial-gradient(circle at 70% 70%, rgba(236, 72, 153, 0.12) 0%, transparent 50%)",
  "gradient-iridescent": "linear-gradient(135deg, #7c3aed 0%, #a855f7 25%, #6366f1 50%, #ec4899 75%, #7c3aed 100%)",
  "gradient-mauve": "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
  "gradient-iris": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  "gradient-matrix": "linear-gradient(135deg, #39ff14 0%, #00ff41 100%)",
},
backdropBlur: { xs: "2px", glass: "20px", "glass-strong": "32px" },
boxShadow: {
  glass: "0 8px 32px rgba(0, 0, 0, 0.1), 0 0 20px rgba(255, 255, 255, 0.08)",
  "glass-dark": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
  "neo-inset": "inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.1)",
  "neo-outset": "2px 2px 4px rgba(0, 0, 0, 0.1), -2px -2px 4px rgba(255, 255, 255, 0.1)",
  soft: "0 4px 20px 0 rgba(0, 0, 0, 0.1)",
  glow: "0 0 20px rgba(124, 58, 237, 0.3)",
  "matrix-glow": "0 0 20px rgba(0, 255, 65, 0.3)",
  "matrix-glow-strong": "0 0 30px rgba(57, 255, 20, 0.4), 0 0 60px rgba(0, 255, 65, 0.2)",
},
animation: {
  "fade-in": "fadeIn 0.5s ease-in-out",
  "slide-up": "slideUp 0.5s ease-out",
  float: "float 6s ease-in-out infinite",
  "pulse-glow": "pulseGlow 2s ease-in-out infinite alternate",
  "gradient-shift": "gradientShift 8s ease-in-out infinite",
  "hover-lift": "hoverLift 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "press-down": "pressDown 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
},
```

---

## 4. Typography

### Font stack

- **Body / UI:** Inter (`font-sans`)
- **Headings:** Jura (`font-heading`)
- **Accent / editorial:** Playfair Display (`font-accent`)
- **Matrix body:** Share Tech Mono (`font-matrix`)
- **Matrix headings:** Orbitron (`font-matrixHeading`)

### Font import

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Jura:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Share+Tech+Mono:wght@400&family=Orbitron:wght@400;500;600;700;800;900&display=swap');
```

### Utility classes

```css
.modern-typography-large {
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-family: 'Jura', sans-serif;
}

.modern-typography-medium {
  font-size: clamp(1.25rem, 3vw, 2rem);
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.01em;
  font-family: 'Jura', sans-serif;
}
```

In Matrix theme, headings and links use `var(--matrix-accent)` and Orbitron; body uses Share Tech Mono, sharp corners (`border-radius: 0`).

---

## 5. Glassmorphism

### Default glass (light/dark)

```css
.glass {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%),
    radial-gradient(circle at 30% 30%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 70% 70%, rgba(236, 72, 153, 0.08) 0%, transparent 50%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), 0 0 20px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}
```

- **Light mode:** `.glass` can use a more opaque white base; text inside uses dark contrast.
- **Dark:** Transparent glass with purple/pink tints as above.
- **Matrix:** Override to `background: rgba(0,0,0,0.8)`, `border: 1px solid var(--matrix-border)`, `border-radius: 0`, same blur.

### Variants

- **.glass-strong** — stronger blur (32px) and slightly more opaque overlay.
- **.glass-navbar** — for top bar; lighter overlay, rounded-2xl.
- **.glass-sidebar** — darker base (`rgba(0,0,0,0.95)`), side nav.

---

## 6. Buttons

### Primary (purple–pink gradient)

```css
.btn-primary {
  background: var(--grad-primary),
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  color: white;
  border-radius: 1rem;
  border: none;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(147, 51, 234, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px) scale(1.02); }
.btn-primary:active { transform: translateY(1px) scale(0.98); }
```

### Secondary (glass)

- `backdrop-blur-xl`, light gradient overlay, `border border-white/15`, rounded-xl, same hover/active lift/press.

### Ghost

- `bg-transparent`, `border border-white/10`, `hover:bg-white/5`, `text-foreground`.

### Matrix primary

- `bg-gradient-to-r from-[#39ff14] to-[#00ff41]`, `text-black`, `border-radius: 0`, `box-shadow: 0 0 20px rgba(57,255,20,0.3), 0 0 40px rgba(0,255,65,0.2)`.

### Matrix secondary

- `bg-black`, `border` with `var(--matrix-border)`, `text-[#00ff41]`, sharp corners, glow on hover/focus.

---

## 7. Gradient Text

```css
.gradient-text {
  background: var(--grad-primary);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.gradient-text-secondary {
  background: var(--grad-secondary);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

Matrix: override to `linear-gradient(135deg, #39ff14 0%, #00ff41 100%)` (and secondary variant) so gradient text stays neon green.

---

## 8. Layout & Components

### App shell

- **Sidebar:** Fixed left, `w-64`, `glass-sidebar`, `border-r border-white/10`. On small screens: slide-out with overlay.
- **Topbar:** Fixed top, `glass-navbar`, full width with `lg:ml-64` to clear sidebar. Height ~h-12 / h-16.
- **Main:** `flex-1 pt-16 sm:pt-20`, `max-w-full`, main content area.
- **Footer:** `border-t border-white/10`, container with grid (e.g. 3 cols on lg).

### Section

- Padding scale: `sm: py-8`, `md: py-12`, `lg: py-16`, `xl: py-24`. Use a single `Section` component with a `padding` prop.

### GlassCard

- Wrapper that applies `.glass` or `.glass-strong`; optional `hover:scale-[1.02] hover:shadow-glow`. Use for content blocks and footer cards.

### CTAButton

- Variants: `primary` → `.btn-primary`, `secondary` → `.btn-secondary`, `ghost` → transparent + border. Sizes: `sm` / `md` / `lg`. Optional `glow` for shadow-glow.

### GradientText

- Renders heading or span with `.gradient-text` (or `.gradient-text-secondary`). Use for brand name and key headings.

### IridescentBorder

- Container with iridescent gradient border (e.g. `.gradient-iridescent` mask). Optional intensity: low / medium / high (opacity).

### Neumorphism (optional)

- `.neo`: outset shadow.
- `.neo-inset`: inset shadow.  
Matrix overrides: black bg, matrix border, no rounded corners, flat shadow.

---

## 9. Backgrounds

### Default (light/dark)

- `body::before`: `var(--grad-background)`, `animation: gradientShift 8s ease-in-out infinite`.
- `body::after`: Soft radial overlays (purple, pink, blue) at low opacity.

### Matrix

- Override `body::before` / `body::after` to neon green (or red/orange/blue/pink per `data-matrix-color`) radial/conic gradients. Same animation.

---

## 10. Motion & Transitions

- **Smooth:** `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` (`.smooth-transition`).
- **Slow:** 0.6s same curve (`.smooth-transition-slow`).
- **Hover lift:** `translateY(-2px) scale(1.02)`.
- **Press:** `translateY(1px) scale(0.98)`.
- **Reduced motion:** Respect `prefers-reduced-motion: reduce` (disable or shorten animations).

---

## 11. Accessibility & Focus

- Focus ring: `focus:outline-none focus:ring-2 focus:ring-offset-2` with `--ring` and `--background` for offset.
- Matrix: `outline: 2px solid var(--matrix-accent)`.
- Buttons and links: visible focus state; don’t rely only on color.

---

## 12. Scrollbar

- Default: 8px width, thumb `rgba(147, 51, 234, 0.3)`, rounded, hover darker.
- Matrix: thumb `rgba(0, 255, 65, 0.4)`, hover `rgba(57, 255, 20, 0.6)`; can set `border-radius: 0` for Matrix look.

---

## 13. Theme Provider (React)

Theme is applied on `<html>`:

- **Light/Dark:** `document.documentElement.classList.add('light' | 'dark')`.
- **Matrix:** `document.documentElement.setAttribute('data-theme', 'matrix')` and `setAttribute('data-matrix-color', matrixColor)`.

Store: single source of truth for `theme: 'light' | 'dark' | 'matrix'` and `matrixColor: 'green' | 'red' | 'orange' | 'blue' | 'pink'`. Sync on mount and when user changes theme.

---

## 14. Quick Reference

| Element        | Light/Dark classes / tokens                    | Matrix override                          |
|----------------|------------------------------------------------|------------------------------------------|
| Page bg        | `hsl(var(--background))` + grad layers        | Black + neon grad layers                 |
| Card           | `.glass` / `.glass-strong`                     | Black 80%, matrix border, no radius      |
| Navbar         | `.glass-navbar`                                | Same override as card                   |
| Sidebar        | `.glass-sidebar`                               | Same override                            |
| Primary btn    | `.btn-primary`                                 | `.btn-matrix-primary`                    |
| Secondary btn  | `.btn-secondary`                               | `.btn-matrix-secondary`                  |
| Headings       | `font-heading` + `.gradient-text`             | Orbitron + `var(--matrix-accent)`        |
| Body           | `font-sans`                                    | Share Tech Mono                          |
| Border radius  | `rounded-2xl` / `rounded-xl`                   | 0                                        |

---

## 15. Propagation Checklist

When bringing this design system to another project:

1. Copy this `.md` into the repo (e.g. `docs/DESIGN_SYSTEM-HUB.md`).
2. Copy or merge design tokens (Section 2) and Tailwind extension (Section 3) into your `tailwind.config` and global CSS.
3. Add font import and typography utilities (Section 4).
4. Implement or copy glass classes and Matrix overrides from `globals.css` (Section 5, 9).
5. Add button classes (Section 6) and gradient text (Section 7).
6. Reuse or recreate layout components (Section 8) and theme provider (Section 13).
7. Ensure reduced-motion and focus styles (Sections 10, 11).
8. Point contributors and AI to this file for consistency across MotusDAO Hub UIs.
