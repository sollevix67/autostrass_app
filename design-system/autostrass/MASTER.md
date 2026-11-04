# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Autostrass
**Generated:** 2026-09-25 22:03:42
**Implementation reviewed:** 2026-11-04 — refonte bleu et ambre validée.
**Category:** Analytics Dashboard
**Design Dials:** Variance 3/10 (Centered / Minimal) | Density 9/10 (Dense / Dashboard)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#1E40AF` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#3B82F6` | `--color-secondary` |
| Accent/CTA | `#D97706` | `--color-accent` |
| On Accent/CTA | `#231700` | `--color-on-accent` |
| Background | `#F8FAFC` | `--color-background` |
| Foreground | `#172B4D` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#172B4D` | `--color-card-foreground` |
| Muted | `#E9EEF6` | `--color-muted` |
| Muted Foreground | `#526277` | `--color-muted-foreground` |
| Border | `#DBE3EF` | `--color-border` |
| Input Border | `#8190A5` | `--color-border-strong` |
| Destructive | `#B91C1C` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#1E40AF` | `--color-ring` |

**Color Notes:** Blue data + amber highlights [Accent adjusted from #F59E0B]

Les actions principales sont bleues ; l'ambre souligne les repères de
navigation, les indicateurs et les montants de caisse. Éviter le texte blanc
sur l'ambre, dont le contraste est insuffisant pour les petits caractères.
Les états succès, avertissement et erreur utilisent leurs propres tokens.

Le thème sombre surcharge uniquement les tokens dans
[`src/tokens.css`](../../src/tokens.css) : fond `#0D1729`, surface `#162338`,
bleu `#A9C3FF`, ambre `#FBBF24`. Les textes des boutons s'adaptent à leur fond.
Le mode automatique suit la préférence du système.

### Typography

- **Heading Font:** Fira Code
- **Body Font:** Fira Sans
- **Mood:** dashboard, data, analytics, code, technical, precise
- **Google Fonts:** [Fira Code + Fira Sans](https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

### Spacing Variables

*Density: 9/10 — Dense / Dashboard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `2px` / `0.125rem` | Tight gaps |
| `--space-sm` | `4px` / `0.25rem` | Icon gaps, inline spacing |
| `--space-md` | `8px` / `0.5rem` | Standard padding |
| `--space-lg` | `12px` / `0.75rem` | Section padding |
| `--space-xl` | `16px` / `1rem` | Large gaps |
| `--space-2xl` | `24px` / `1.5rem` | Section margins |
| `--space-3xl` | `32px` / `2rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgb(15 23 42 / 4%)` | Cards, buttons |
| `--shadow-md` | `0 4px 16px rgb(15 23 42 / 7%)` | Login, notifications |
| `--shadow-lg` | `0 16px 48px rgb(15 23 42 / 18%)` | Modals, navigation |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.primary-button {
  background: var(--color-primary);
  color: var(--color-on-primary);
  padding: 9px 16px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  cursor: pointer;
}

.primary-button:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

/* Secondary Button */
.secondary-button {
  background: var(--color-surface);
  color: var(--text-body);
  border: 1px solid var(--color-border);
  padding: 9px 16px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  cursor: pointer;
}
```

### Cards

```css
.form-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}
```

### Inputs

```css
.form-group :where(input:not([type='checkbox']):not([type='radio']), select, textarea) {
  padding: 10px 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-body);
  background: var(--color-surface);
  font-size: 14px; /* 16 px sur mobile */
}

.form-group input:focus-visible {
  outline: 3px solid var(--color-ring);
  outline-offset: 3px;
}
```

### Modals

```css
.modal-overlay {
  background: var(--color-overlay);
  backdrop-filter: blur(3px);
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 28px;
  box-shadow: var(--shadow-lg);
  width: min(540px, 100%);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
}
```

---

## Style Guidelines

**Style:** Minimalism & Swiss Style

**Keywords:** Clean, simple, spacious, functional, white space, high contrast, geometric, sans-serif, grid-based, essential

**Best For:** Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools

**Key Effects:** Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading

### Page Pattern

**Pattern Name:** Application de gestion du dépôt

- Barre latérale bleu nuit, fil d'Ariane et un seul titre principal par vue.
- Dashboard : indicateurs, stock à réapprovisionner, activité et accès rapides.
- Vues métier : titre, formulaire puis tableau ; grilles à une colonne sur mobile.
- Le défilement horizontal reste dans les tableaux. Les dialogues restent
  dans la hauteur disponible et défilent si nécessaire.
- Cartes statiques ; transitions de couleur uniquement pour les interactions.

### Organisation CSS

`tokens.css` définit la palette et les dimensions. `index.css` contient les
bases et le focus clavier. `App.css` gère la structure et les vues spécifiques,
`components.css` les boutons/tableaux/messages, `forms.css` les champs et
dialogues, `auth.css` la connexion. Ne pas réintroduire de surcharges de thème
par composant : utiliser les tokens sémantiques.

---

## Anti-Patterns (Do NOT Use)

- ❌ Ornate design
- ❌ No filtering

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Unnecessary motion** — Color transitions only, disabled with reduced motion
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
