# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bee2Waste is a waste management platform ("Plataforma de Gestao de Residuos") by Bee2Solutions. It digitizes operations for entities managing waste reception, treatment, recycling, dismantling, and circular economy processes across multiple parks (facilities).

**MVP scope**: Park Management — controlling waste entries and exits. This includes weighing/scale integration, e-GAR (electronic waste tracking guide) validation, LER code classification, stock management by storage areas, and client management (suppliers and buyers).

**Current state**: Pre-development. The repository contains only the PRD (`Bee2Waste_PRD_MVP_Gestao_Parques.docx`) and the B2S Design System assets. No application code, build system, or tests exist yet.

## Design System (B2S)

All design assets live in `design_rules/`. This is a shared design system across the Bee2Solutions product family (Bee2Waste, Bee2Water, Bee2Crop, Bee2Green, Bee2Lighting, Bee2Energy).

### Token Files

| File | Purpose |
|------|---------|
| `b2s-design-tokens/tokens.ts` | TypeScript tokens — primary source for React/Vue apps. Exports `tokens`, `lightTheme`, `darkTheme`, `b2sOverrides`, `typography`, `iconography`, `tailwindExtend` |
| `b2s-design-tokens/tokens.css` | CSS custom properties version. Semantic tokens use `--bg-*`, `--text-*`, `--border`, `--primary-*` etc. Primitives use `--b2s-*` prefix |
| `b2s-design-tokens/b2s-tokens.json` | Tokens Studio (Figma plugin) format |
| `b2s-design-tokens/tokens.w3c.json` | W3C DTCG format for Style Dictionary / CI builds |
| `b2s-design-system.html` | Visual reference of all components, colors, typography, and patterns |

### Key Design Conventions

- **Font**: Inter (400/500/600/700), base size 14px
- **Icons**: Lucide (`lucide-react` >= 0.460), stroke-based 24x24, strokeWidth 2. Canonical icon-to-concept mappings are in `tokens.ts` under `iconography.mapping`
- **Themes**: Light (default), Dark, B2S Brand (Warm Red `#f93f26` + Petro Gray `#5a6268`). Toggle via `data-theme="dark"` or `data-b2s="true"` on `<html>`
- **Spacing**: 4px base scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
- **Border radius**: sm=6px, md=10px, lg=14px, xl=20px
- **Layout**: Sidebar 280px, header 70px, content max 1400px
- **Naming**: Primitives prefixed `b2s-` (e.g., `--b2s-color-blue-500`). Semantic tokens unprefixed (e.g., `--bg-card`, `--text-primary`)
- **Tailwind integration**: Import `tailwindExtend` from `tokens.ts` into `theme.extend` in Tailwind config

### Product Icons

SVG files in `b2s-design-tokens/product-icons/` — 200x200 viewBox, `#f93f26` background, 40px radius, white Lucide symbol scaled x6.25.

## Domain Model (from PRD)

Core entities for the MVP:

- **Entidade/Organizacao**: Parent company operating multiple parks
- **Parque**: Physical facility with scales, storage areas, sorting lines, authorized LER codes
- **e-GAR**: Electronic waste tracking guide (from SILiAmb system) — the legal document for every waste movement
- **Codigo LER**: EU waste classification codes — each park has a licensed subset
- **Area de Armazem**: Physical/logical storage zones within a park (VFV areas, sorting lines, warehouses)
- **Cliente**: External entity — can be waste supplier (entries) or treated product buyer (exits/sales)

### MVP Modules

1. **Entradas** (Entries): Vehicle arrival, e-GAR validation, weighing (gross/tare), LER verification, physical inspection, classification, storage allocation, e-GAR confirmation, invoicing
2. **Classificacao e Tratamento**: Classification sheets, inter-area transfers, internal weighing, non-conformity registration, material recovery
3. **Saidas** (Exits): Three destination types — treatment (non-valorized), clients, group (inter-company). All require e-GAR issuance
4. **Stocks**: Centralized stock by area and treatment level, internal transfers
5. **Gestao de Clientes**: Client registry linked to entries, planning/scheduling, exits/sales

## Language

The application domain is in Portuguese (Portugal). All business terms, UI labels, and domain entities use PT-PT terminology. Code identifiers (variables, functions, classes) should be in English, but domain-specific constants and enum values may use Portuguese where they map to official terminology (e.g., LER codes, e-GAR statuses).
