# Design tokens — Phase 1

Foundation layer for the redesign. Structural conventions (type ramp, 8px grid,
surface ladder, radius/elevation roles) follow Linktree's admin patterns; every
colour value is our own existing pink / yellow / black identity.

**Nothing in this phase changes how any component renders.** All tokens are
additive and opt-in. Adoption is Phase 2.

| File | Role |
| --- | --- |
| `app/tokens.css` | Source of truth. All values, as CSS custom properties. |
| `tailwind.config.js` | Exposes tokens as utilities. No values live here. |
| `app/globals.css` | Imports `tokens.css`; legacy shadcn vars unchanged. |

---

## 1. Typography

Manrope, the unified platform-wide typeface loaded via `next/font/google` in `app/layout.js`.
The scale is eight roles with no near-duplicates. Each Tailwind class sets size, line-height, tracking
and weight together, so one class fully expresses one role.

| Class | Size | Weight | Line-height | Tracking | Use |
| --- | --- | --- | --- | --- | --- |
| `text-display` | 32px | 700 | 1.15 | -0.02em | Marketing hero, empty states |
| `text-page-title` | 24px | 700 | 1.25 | -0.02em | Dashboard page H1 |
| `text-section` | 18px | 600 | 1.30 | -0.01em | Section headers, modal titles |
| `text-card-title` | 16px | 600 | 1.40 | -0.005em | Card headings, list item titles |
| `text-body` | 14px | 400 | 1.50 | 0 | Default paragraph, table cell |
| `text-label` | 14px | 500 | 1.40 | 0 | Form labels, nav items, buttons |
| `text-meta` | 13px | 400 | 1.40 | 0 | Timestamps, helper text |
| `text-micro` | 12px | 500 | 1.35 | 0.01em | Badges, uppercase eyebrows |

Headings run tight with negative tracking; body runs open at neutral tracking.
Nothing in the scale is loose.

`text-meta` and `text-micro` are intended to be paired with `text-content-muted`.

### Font loading

Manrope is loaded globally via `next/font/google` with weights 400, 500, 600, 700, and 800.
For `font-black` (900), Manrope's max variable weight is 800 (ExtraBold), which automatically
resolves to 800 ExtraBold for clean, punchy display typography.

---

## 2. Spacing — 8px grid

The allowed values are **4, 8, 12, 16, 24, 32, 48, 64px**. Tailwind's default
numeric scale already lands on exactly these, so no numeric override was needed:

| Token | px | Tailwind |
| --- | --- | --- |
| `--space-1` | 4 | `p-1` `gap-1` |
| `--space-2` | 8 | `p-2` `gap-2` |
| `--space-3` | 12 | `p-3` `gap-3` |
| `--space-4` | 16 | `p-4` `gap-4` |
| `--space-6` | 24 | `p-6` `gap-6` |
| `--space-8` | 32 | `p-8` `gap-8` |
| `--space-12` | 48 | `p-12` `gap-12` |
| `--space-16` | 64 | `p-16` `gap-16` |

Off-system, because they are not multiples of 8: **`-5` (20px), `-7` (28px),
`-9` (36px), `-11` (44px)**. Tailwind still generates these; the audit in §6
lists where they are used today.

### Semantic layout spacing

The recurring measurements that currently get re-guessed on every page. These
are named roles, not aliases of the numeric steps — all resolve onto the grid.

| Class | Value | Use |
| --- | --- | --- |
| `p-gutter` / `p-gutter-lg` | 16 / 24px | Page edge padding, mobile / `md:` and up |
| `p-card` / `p-card-lg` | 16 / 24px | Card interior, mobile / `md:` and up |
| `gap-section` | 32px | Between page sections |
| `gap-stack` | 16px | Between sibling cards |
| `gap-field` | 8px | Label to input |
| `gap-inline` | 12px | Icon to text, chip rows |
| `max-w-narrow` | 720px | Single-column forms, settings |
| `max-w-content` | 1080px | Standard dashboard column |
| `max-w-wide` | 1280px | Tables, analytics grids |

---

## 3. Colour

Our palette, organised into the structural roles Linktree uses. No hue was
imported — the additions are all new *shades* of colours already in the codebase.

### Brand accent

`#FF90E8` is well established (1,347 occurrences). The codebase also contains
four ad-hoc hover pinks — `#FF7BE5`, `#FF70E2`, `#FF77E4`, `#FF75E3` — which are
visually indistinguishable from one another. Two defined interaction states
replace all four.

| Class | Hex | Role |
| --- | --- | --- |
| `bg-brand` | `#FF90E8` | Base accent |
| `bg-brand-hover` | `#FF7BE5` | Hover |
| `bg-brand-active` | `#F462D6` | Pressed |
| `bg-brand-soft` | `#FFB3EF` | Light fill, accent-on-disabled |
| `text-brand-fg` | `#000000` | Text on accent — 10.41:1 |
| `bg-brand-yellow` | `#FFDE59` | Secondary brand |
| `bg-brand-flare` | `#F0441E` | Tertiary, decorative only |

### Surfaces

**This is the most consequential gap Phase 1 closes.** Today `--card` and
`--background` are both pure black in dark mode, so a card has no surface
separation and depends entirely on a 1px border to be visible at all. The
codebase compensates with twelve near-identical darks applied inconsistently:
`#0A0A0A` `#121212` `#141414` `#161616` `#181818` `#1A1A1A` `#1C1C1C` `#1F1F1F`
`#242424` `#262626` `#2A2A2A` `#2E2E2E`.

Four rungs replace all twelve. Every value is one already in the codebase.

| Class | Hex | Role |
| --- | --- | --- |
| `bg-surface-base` | `#000000` | Page background |
| `bg-surface-raised` | `#121212` | Subtle panels, table headers |
| `bg-surface-card` | `#1A1A1A` | Default card |
| `bg-surface-overlay` | `#242424` | Modals, popovers, dropdowns |
| `bg-surface-hover` | `#2A2A2A` | Row / menu-item hover fill |

### Text

Contrast measured against `#1A1A1A` (card). `content-secondary` and
`content-subtle` are the genuinely new shades: the palette previously jumped
straight from `#FFFFFF` to `#A1A1A1` with nothing between and nothing below.

| Class | Hex | Contrast | |
| --- | --- | --- | --- |
| `text-content-primary` | `#FFFFFF` | 17.40:1 | AA |
| `text-content-secondary` | `#C7C7C7` | 10.30:1 | AA — **new** |
| `text-content-muted` | `#A1A1A1` | 6.74:1 | AA |
| `text-content-subtle` | `#737373` | 3.67:1 | AA large text only — **new** |
| `text-content-disabled` | `#595959` | 2.48:1 | Intentionally sub-threshold |

`content-subtle` must not be used for body copy at 14px or below. It is for
placeholder text and decorative labels.

### Borders

| Class | Hex | Role |
| --- | --- | --- |
| `border-edge-subtle` | `#242424` | Hairlines inside cards |
| `border-edge` | `#3A3A3A` | Default (1,419 occurrences today) |
| `border-edge-strong` | `#555555` | Hover, emphasis |
| `border-edge-focus` | `#FF90E8` | Focus outline |

### Status

Three slots per status: a solid fill, a lighter `-fg` that stays AA-legible as
text on dark surfaces, and a 14% `-subtle` tint for chip and banner backgrounds.
Warning reuses the brand yellow, so no new hue was needed.

| Status | Fill | `-fg` | Contrast of `-fg` on card |
| --- | --- | --- | --- |
| `success` | `#34D399` | `#6EE7B7` | 11.42:1 |
| `warning` | `#FFDE59` | `#FFE580` | 13.90:1 |
| `error` | `#EF4444` | `#F87171` | 6.29:1 |
| `info` | `#60A5FA` | `#93C5FD` | 9.65:1 |

Use the `-fg` variant for status *text* and the base for *fills*. `#EF4444` as
text on `#242424` is only 4.13:1, which is why `error-fg` exists.

### Disabled

`bg-disabled` `#1A1A1A`, `border-disabled-border` `#242424`,
`text-disabled-fg` `#595959`. Previously there was no disabled treatment at
all — disabled states are currently ad-hoc `opacity-50`, which dims the
background along with the text and produces muddy results on dark surfaces.

---

## 4. Border radius

Soft and rounded, stopping short of pill.

| Class | Value | Use |
| --- | --- | --- |
| `rounded-chip` | 4px | Badges, tags |
| `rounded-control` | 8px | Inputs, buttons, selects |
| `rounded-card` | 12px | Cards, panels, list rows |
| `rounded-modal` | 16px | Dialogs, popovers, dropdowns |
| `rounded-sheet` | 20px | Bottom sheets, large surfaces |

Named by role rather than t-shirt size deliberately: `rounded-sm/md/lg` are
already wired to `--radius` (6px) and used by every shadcn component, so
reusing those names would have silently restyled the whole app.

---

## 5. Elevation

On a pure-black canvas a drop shadow is close to invisible, so elevation here is
carried **primarily by the surface ladder** — a raised element gets a lighter
surface, not a darker shadow. Shadows are the secondary cue: soft, wide, low
opacity, never a hard offset.

```
surface-base     →  (no shadow)
surface-card     →  shadow-card
surface-overlay  →  shadow-dropdown  /  shadow-modal
```

| Class | Use |
| --- | --- |
| `shadow-raised` | Barely-lifted elements, sticky headers |
| `shadow-card` | Default card |
| `shadow-dropdown` | Menus, popovers, tooltips |
| `shadow-modal` | Dialogs, sheets |
| `shadow-focus` | 3px brand-pink focus ring |
| `shadow-brand` | The hard-offset yellow/orange CTA stack |

`shadow-brand` is the deliberate exception to the soft rule. It is a signature
gesture of the existing pink CTA, so it is preserved as an explicit token rather
than being flattened into the neutral ramp.

---

## 6. Audit — inconsistencies to fix in Phase 2

Counts are occurrences across `app/` and `components/`.

### 6a. Off-grid spacing — 1,588 occurrences

| Step | px | Count | Typical use |
| --- | --- | --- | --- |
| `-1.5` | 6px | **577** | Chips, badges, button internals, form field stacks |
| `-5` | 20px | **286** | Card padding, table cells, section stacks |
| `-2.5` | 10px | **270** | Dropdowns, sidebar links, popover items |
| `-0.5` | 2px | **268** | Optical nudges, micro-badges |
| `-3.5` | 14px | **135** | Sidebar nav, auth form inputs |
| `-9` | 36px | 40 | `pl-9` search inputs with icon inset |
| `-7` | 28px | 11 | Pricing and testimonial cards |
| `-11` | 44px | 1 | |

Split by surface: **702** in the dashboard, **192** on the landing and public
storefront, the remainder in buyer account and shared components.

**The half-steps are the real story, and they are easy to miss.** `-0.5`,
`-1.5`, `-2.5` and `-3.5` account for **1,250 of the 1,588** — nearly four
times the integer-step problem. A grep for `p-5`/`p-7`/`p-9` alone finds only
338 and badly understates the work.

Three groups, which need different treatment rather than one blanket sweep:

- **6px (577) is the priority.** It sits between 4 and 8 with no defined role
  and is the single largest bucket. Most uses should resolve to 4px or 8px.
  The dashboard sidebar in `app/dashboard/layout.js:140,158,214,236` is the
  highest-leverage target, since it renders on every dashboard view.
- **10px (270), 14px (135) and 20px (286)** are straightforward migrations to
  8/12, 12/16 and 16/24 respectively. `p-5` as card padding at
  `app/dashboard/orders/page.js:53`, `app/dashboard/customers/page.js:36` and
  `app/dashboard/analytics/page.js:87` becomes `p-card` / `p-card-lg`.
- **2px (268) is an open decision, not automatically a defect.** These are
  optical nudges on badges and icon alignment, where 4px is visibly too much.
  Mechanically rounding them up would bloat every chip in the product. Either
  legitimise 2px as an explicit hairline step (documented as optical-only,
  never layout), or accept the churn. **This needs a call before Phase 2** —
  it was deliberately not added to the scale in §2, since the brief specified
  4px as the floor.

### 6a-bis. The dashboard page shell is applied twice

`app/dashboard/layout.js:347` already gives every route
`px-3 sm:px-4 md:px-8 pb-24 pt-4 md:pt-6`. The core admin pages (home,
products, orders, analytics, settings) correctly add no outer padding of their
own. A legacy cluster of roughly nineteen pages — the `marketing/*`
sub-pages, `leads`, `settings/billing` and the `[id]/setup` flows — stacks a
further `p-4 sm:p-6` or `p-6 sm:p-8` on top, so their effective gutters differ
visibly from the rest of the dashboard.

Two smaller mismatches in the same file: the sticky header at
`app/dashboard/layout.js:469` uses `md:px-10` (40px) against the main canvas's
`md:px-8` (32px), so the header is misaligned with the content beneath it by
8px at every desktop width; and content max-width varies between `max-w-3xl`,
`max-w-5xl`, `max-w-6xl` and `max-w-[1380px]` with no rule. The
`max-w-narrow` / `max-w-content` / `max-w-wide` tokens exist to settle this.

### 6b. The dashboard surface ladder is inverted

`app/dashboard/layout.js:347` sets the main content background to `#242424` —
our *most elevated* surface — while the cards sitting on it are `#000000`
(`app/dashboard/page.js:111`) or `#1A1A1A` (`orders`, `analytics`, `settings`).
Cards are therefore darker than the page behind them, which reads as recessed
rather than raised. Correcting this to `bg-surface-base` for the shell and
`bg-surface-card` for cards is the single highest-impact Phase 2 change.

Card surfaces are also not consistent between pages: `#000000` on the dashboard
home, `#1A1A1A` on orders / analytics / settings / payments, `#242424` for
nested cards on payments.

### 6c. Border radius — 20 distinct values

`rounded-xl` (756), `rounded-full` (474), `rounded-2xl` (408), `rounded-3xl`
(283), `rounded-[6px]` (208), `rounded-lg` (146), `rounded` (86),
`rounded-[5px]` (84), `rounded-[8px]` (66), `rounded-md` (49), `rounded-[4px]`
(30), `rounded-[12px]` (23), `rounded-sm` (15), plus `[3px]` `[10px]` `[14px]`
`[16px]` `[18px]` `[44px]` and `rounded-none`.

Cards currently use `rounded-2xl` (16px) and `rounded-3xl` (24px), both notably
rounder than the 12px `rounded-card` target. `rounded-[5px]` and `rounded-[6px]`
are indistinguishable from each other in practice.

Arbitrary `rounded-[Npx]` values total **431** across the app. Because radius
is highly visible and the five role tokens map cleanly onto the existing
clusters, this is one of the more mechanical Phase 2 sweeps.

### 6d. Typography — 11 Tailwind sizes plus sub-12px arbitraries

| Class | px | Count |
| --- | --- | --- |
| `text-xs` | 12 | **2315** |
| `text-sm` | 14 | 504 |
| `text-base` | 16 | 211 |
| `text-lg` | 18 | 166 |
| `text-2xl` | 24 | 160 |
| `text-xl` | 20 | 151 |
| `text-3xl` | 30 | 87 |
| `text-4xl` | 36 | 32 |
| `text-5xl` | 48 | 24 |
| `text-6xl` | 60 | 18 |
| `text-7xl` | 72 | 5 |

Plus **485 arbitrary sub-12px sizes**: `text-[10px]` (234), `text-[11px]` (223),
`text-[9px]` (25), `text-[8px]` (3). The landing surface adds a few one-off
display sizes on top — `text-[15px]`, `lg:text-[68px]`, `sm:text-[150px]`.

Three problems. First, `text-xs` (12px) is used 2,315 times and has become the
de facto body size — it should be `text-body` (14px), with 12px reserved for
badges and eyebrows. Second, 8–11px text is below the practical legibility
floor and has no corresponding token; all 485 uses should resolve to
`text-micro` (12px) or `text-meta` (13px). Third, `text-[10px]` and
`text-[11px]` together (457) nearly rival `text-sm` (504), so the micro range
is carrying far more of the interface than it should.

**Tracking runs the wrong direction.** `tracking-wider` (262) outnumbers
`tracking-tight` (148), with `tracking-widest` (9) and `tracking-wide` (11)
alongside. Wide tracking is currently paired with the heavy `font-black`
uppercase treatment. The token scale deliberately goes the other way — tight
on headings, neutral on body, and a slight 0.01em only on `text-micro` — so
this is a visible change to expect in Phase 2 rather than a silent cleanup.

Weight usage is also top-heavy: `font-bold` (1387), `font-black` (960),
`font-extrabold` (484) against `font-medium` (451) and `font-semibold` (222).
Nearly everything is bold, which leaves little room for hierarchy. The type
tokens bake in weights (700/600/500/400) to pull this back.

### 6e. Colour is inlined rather than tokenised

Hardcoded hex in `className` strings: `text-[#A1A1A1]` (1101),
`text-[#FF90E8]` (534), `text-[#FFDE59]` (121), `text-[#F0441E]` (65),
`text-[#34D399]` (35), `text-[#60A5FA]` (21). Each maps 1:1 onto a token now, so
this is a mechanical find-and-replace.

### 6f. A second, off-brand visual region exists

The buyer-facing `app/account/**` pages and the product widgets
(`components/membership`, `components/coaching`, `components/community`,
`components/external-link`) are built as a **light theme with an indigo accent**,
not the dark pink one: `bg-white` (286), `text-slate-900` (342),
`border-slate-200` (293), `bg-slate-50` (103), and `#5B4BFF` indigo (362) with
`bg-purple-50` / `bg-purple-100` (119).

`app/dashboard/marketing/page.js:33` mixes both in a single view — a
`text-slate-900` light-theme container rendered inside the dark dashboard shell.

This is scope worth deciding on explicitly before Phase 2, because it is not a
token problem: either those surfaces get migrated onto the dark palette, or
indigo gets formalised as a real second accent. It was deliberately **not**
encoded as a token here, since doing so would bless what currently looks like
unintentional drift.

### 6g. Shadows — 14+ distinct treatments

`shadow-sm` (144), `shadow-md` (142), `shadow-2xl` (59), `shadow-lg` (43),
`shadow-xl` (26), `shadow` (22), `shadow-inner` (8), plus seven arbitrary
hard-offset variants (`shadow-[2px_2px_0px_0px_#FFDE59]` and relatives, ~80
combined). The hard-offset family should collapse into `shadow-brand`; the
Tailwind defaults are tuned for light backgrounds (10% black) and are
effectively invisible on `#000000`, which is why the new ramp uses 24–56%.

---

## 7. Phase 2 order of work

Ordered by visual gain per unit of risk. Two questions need answering first:
the 2px hairline step (§6a) and the light/indigo region (§6f).

1. **Fix the inverted surface ladder** in `app/dashboard/layout.js` (§6b).
   Largest visual gain for the smallest diff — a handful of lines.
2. **Normalise the page shell** (§6a-bis). Strip the doubled padding from the
   ~19 legacy pages, align the header's `md:px-10` to `md:px-8`, and settle
   max-widths onto the tokens. Structural, and it makes everything after it
   easier to judge.
3. **Migrate hardcoded hex to colour tokens** (§6e). Mechanical, low risk,
   ~1,900 occurrences that map 1:1.
4. **Collapse radius onto the five role tokens** (§6c). Also mechanical.
5. **Spacing** (§6a), in bucket order: 6px first (577, biggest and clearest),
   then 10/14/20px. Hold the 2px bucket until the hairline question is
   settled. Start with `layout.js`, since the sidebar renders everywhere.
6. **Rebase the type scale** (§6d): the 485 sub-12px uses, then the `text-xs`
   body-copy problem, then tracking. Highest churn and most visible, so it
   benefits from going last, once surfaces and spacing are stable.

The spacing and typography work is genuinely large — roughly 1,588 spacing and
485 type occurrences. Both are well suited to codemods with per-surface review
rather than a single sweeping commit.
