---
name: Institutional Eco-Stewardship
colors:
  surface: '#f5fbf6'
  surface-dim: '#d6dbd7'
  surface-bright: '#f5fbf6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff5f0'
  surface-container: '#e9efea'
  surface-container-high: '#e4eae5'
  surface-container-highest: '#dee4df'
  on-surface: '#171d1a'
  on-surface-variant: '#404943'
  inverse-surface: '#2c322f'
  inverse-on-surface: '#ecf2ed'
  outline: '#707973'
  outline-variant: '#c0c9c2'
  surface-tint: '#316951'
  primary: '#04442f'
  on-primary: '#ffffff'
  primary-container: '#245c45'
  on-primary-container: '#99d2b5'
  inverse-primary: '#99d3b6'
  secondary: '#2e694a'
  on-secondary: '#ffffff'
  secondary-container: '#b2f1c8'
  on-secondary-container: '#357050'
  tertiary: '#00442d'
  on-tertiary: '#ffffff'
  tertiary-container: '#005e40'
  on-tertiary-container: '#66daa8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b5efd1'
  primary-fixed-dim: '#99d3b6'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#16503a'
  secondary-fixed: '#b2f1c8'
  secondary-fixed-dim: '#96d4ad'
  on-secondary-fixed: '#002111'
  on-secondary-fixed-variant: '#125134'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f5fbf6'
  on-background: '#171d1a'
  surface-variant: '#dee4df'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  data-tabular:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system establishes a dignified, disciplined, and transparent visual language for institutional and community-anchored circular economy governance within an Islamic Boarding School (*Pesantren*) ecosystem. It balances civic environmental responsibility, Islamic values of stewardship (*Khalifah fi al-ard* / environmental guardianship), and administrative precision.

### Character & Tone
- **Institutional & Trustworthy:** Authoritative yet accessible, reflecting academic rigor and communal integrity.
- **Ecological Precision:** Purposeful environmentalism rooted in verifiable data, not superficial green marketing.
- **Calm & Methodical:** Clean structures, uncluttered surfaces, and measured interactions that inspire collective accountability.

### Design Movement
The interface employs a **Minimalist-Institutional** design language:
- Ample negative space framed by subtle hairline boundaries.
- Monochromatic neutral structures anchored by deep forest greens and botanical undertones.
- Utilitarian data visualization and transparent status taxonomies (verifications, audit trails, and explicit simulation tags).

## Colors

The palette grounds the interface in grounded natural greens, architectural charcoals, and clean utility neutrals.

### Palette Architecture
- **Primary (`#245C45`):** Deep Forest Green. Anchors top-level governance, brand touchpoints, primary actions, and formal headers.
- **Secondary (`#4F8A68`):** Botanical Eco Green. Used for active navigation tabs, interactive accents, metric progression, and secondary buttons.
- **Tertiary / Verified Emerald (`#059669`):** Represents verified weights, validated audit transactions, and completed recycling logs.
- **Surface Soft Green (`#E7F0E8`):** Subtle tinted fill for stat badges, active row selections, and institutional alerts.
- **Background Light (`#F7F9F7`):** Non-distracting, high-clarity canvas base minimizing screen glare during prolonged administrative sessions.
- **Surface Canvas (`#FFFFFF`):** High-contrast background for cards, tables, panels, and modal dialogs.
- **Charcoal Neutral (`#252B28`):** Primary typography color for optimal contrast and readability.
- **Muted Neutral (`#6B756F`):** Secondary metadata, helper labels, table column headers, and breadcrumb trails.

### Functional & Status Colors
- **Pending Verification (`#D97706`):** Amber accent reserved for unverified weigh-ins, pending admin approvals, and queued batches.
- **System Stream / Conventional (`#2563EB`):** High-clarity cobalt blue for standard non-organic routing, export logistics, and external recycling facility handoffs.
- **Simulation Indicator (`#D97706` / `#B45309`):** Denotes non-production or mock test-bed scenarios with distinct striped or bordered warning surfaces.

## Typography

The type system relies on **Inter** across all roles to ensure functional neutrality, crisp metric displays, and uncompromised optical legibility across varying display densities.

### Rules of Usage
- **Tabular Figures:** All numeric figures in data tables, ledger balances, and weight metrics (`kg`, `rupiah`, `carbon credits`) must enforce tabular numbers (`font-variant-numeric: tabular-nums`).
- **Tracking & Case:** Use uppercase sparingly; only apply to tiny badges (`label-sm`), role pills, and audit codes with `letter-spacing: 0.04em`.
- **Form Weight Balance:** Use `font-weight: 500` for field labels and structural subheaders to maintain contrast against `font-weight: 400` placeholder and secondary copy.

## Layout & Spacing

A structured, predictable 12-column grid anchors the platform across operational dashboards, field intake interfaces, and community tracking portals.

### Grid & Breakpoints
- **Desktop (1024px+):** 12-column fluid grid, `1.25rem` gutters, outer canvas margin of `2rem` (capped at max-width `1440px`).
- **Tablet (768px – 1023px):** 8-column layout, `1rem` gutters, `1.5rem` horizontal page margins.
- **Mobile (< 768px):** 4-column layout, `0.75rem` gutters, `1rem` horizontal screen edge margins.

### Rhythmic Philosophy
- Keep administrative data density comfortable: component padding strictly derives from the base `0.25rem` (4px) scale.
- Metric display blocks and ledger summary cards use consistent internal padding of `space-md` (`1rem`) on mobile and `space-lg` (`1.5rem`) on desktop.

## Elevation & Depth

This design system avoids theatrical or exaggerated dropshadows in favor of an **institutional planar model** centered around micro-borders, surface stratification, and tactile containment.

### Surface Hierarchy
1. **Canvas (`#F7F9F7`):** Base workspace background.
2. **Elevated Panels & Cards (`#FFFFFF`):** Delineated primarily by subtle borders (`1px solid #E2E8E4`) instead of heavy shadows.
3. **Modal & Floating Menus:** Elevated with soft, diffuse ambient diffusion: `0 4px 16px -2px rgba(37, 43, 40, 0.08)`.

### Border Discipline
- Hairstyle divider lines use `#E5EBE6` to split table columns and ledger rows cleanly without visual clutter.
- Selected, focused, or active containers switch border definition to `Primary Forest Green` (`#245C45`) with no outward glow.

## Shapes

The design system enforces a **Soft (Level 1)** curvature discipline.

- **Base Components:** Input fields, buttons, table rows, and alert banners feature `0.25rem` (4px) corners.
- **Containers & Data Cards:** `0.5rem` (8px) for balance and modern structural cleanliness.
- **Badges & Role Pills:** `9999px` fully rounded pill treatment to contrast against structural rectilinear data tables.

## Components

### Buttons
- **Primary:** Background `#245C45`, Text `#FFFFFF`, `border-radius: 0.25rem`, height `40px` (desktop), `44px` (touch-optimized field view). Hover: `#1B4735`.
- **Secondary:** Transparent background, `1px solid #4F8A68`, Text `#245C45`. Hover: Background `#E7F0E8`.
- **Ghost / Utility:** Transparent background, Text `#6B756F`. Hover: Background `#E7F0E8`, Text `#252B28`.

### Role Badges
Distinct, low-saturation pill indicators positioned in headers and table rows:
- **Santri:** Tinted eco green background (`#E7F0E8`), text `#245C45`, dot prefix `#4F8A68`.
- **Warga (Community):** Tinted neutral slate background (`#EFF2F0`), text `#252B28`, dot prefix `#6B756F`.
- **Relawan / Petugas (Field Agent):** Tinted cyan/teal background (`#E0F2FE`), text `#0369A1`, dot prefix `#0284C7`.
- **Admin Pesantren:** Deep forest solid badge `#245C45`, text `#FFFFFF`.

### Verification Status Indicators
- **Verified (`#059669`):** Soft green background (`#ECFDF5`), bold emerald text, checkmark icon prefix.
- **Pending Verification (`#D97706`):** Soft amber background (`#FFFBEB`), amber text, clock/hourglass icon prefix.
- **Simulation Badge ("Data Simulasi"):** Outlined badge with warning amber border (`1px dashed #D97706`), background `#FEF3C7`, text `#92400E`, displaying explicit disclaimer copy.

### Tables & Data Ledger
- **Header:** Background `#F2F6F3`, text `#6B756F` (`label-md`), bottom border `1px solid #DCE4DE`.
- **Cells:** Padding `12px 16px`, numeric alignments set right, textual descriptions set left.
- **Row States:** Hover state `#F9FAF9`; zebra alternate rows optional on wide logs.

### Form Inputs
- **Base Style:** Background `#FFFFFF`, border `1px solid #CFD8D2`, radius `0.25rem`, text `#252B28`.
- **Focus:** Border `1.5px solid #245C45`, zero glowing outer rings.
- **Error:** Border `1.5px solid #DC2626`, accompanying helper text in `#DC2626`.