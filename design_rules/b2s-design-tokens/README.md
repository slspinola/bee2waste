# B2S Design System — Design Tokens

**Versão:** 1.1.0  
**Autor:** Bee2Solutions  
**Ícones:** [Lucide](https://lucide.dev) (>=0.460)

---

## Ficheiros incluídos

| Ficheiro | Formato | Utilização |
|---|---|---|
| `b2s-tokens.json` | Tokens Studio (Figma) | Importar no plugin **Tokens Studio for Figma** |
| `tokens.w3c.json` | W3C DTCG | Compatível com **Style Dictionary**, **Theo**, ou builds CI/CD |
| `tokens.css` | CSS Custom Properties | Usar directamente em projectos web |
| `tokens.ts` | TypeScript/JavaScript | React, Vue, Tailwind config, styled-components |

### Pasta `product-icons/`

| Ficheiro | Produto | Ícone Lucide |
|---|---|---|
| `bee2waste.svg` | Bee2Waste — Gestão de Recolha de Resíduos | `Recycle` |
| `bee2water.svg` | Bee2Water — Gestão de Consumo de Água | `Droplets` |
| `bee2crop.svg` | Bee2Crop — Rega e Fertilização Inteligente | `Sprout` |
| `bee2green.svg` | Bee2Green — Gestão de Água e Espaços Verdes | `LeafyGreen` |
| `bee2lighting.svg` | Bee2Lighting — Gestão de Iluminação Pública | `Lightbulb` |
| `bee2energy.svg` | Bee2Energy — Gestão de Eficiência Energética | `Zap` |

Cada SVG: 200×200, fundo `#f93f26` (B2S Warm Red), radius 40px, símbolo Lucide branco escalado ×6.25.

---

## Importar no Figma (Tokens Studio)

1. Instalar o plugin **Tokens Studio for Figma** (antigo Figma Tokens)
2. Abrir o plugin no Figma → **Settings** → **Import**
3. Seleccionar `b2s-tokens.json`
4. Activar os token sets pretendidos:
   - **core** — valores primitivos (sempre activo)
   - **semantic/light** — tema claro
   - **semantic/dark** — tema escuro
   - **brand/b2s** — overrides B2S (Warm Red + Petro Gray)
5. Aplicar estilos aos componentes com o plugin

### Temas disponíveis

| Tema | Token Sets Activos |
|---|---|
| Light (padrão) | `core` + `semantic/light` |
| Dark | `core` + `semantic/dark` |
| B2S Brand | `core` + `semantic/light` + `brand/b2s` |

---

## Iconografia — Lucide

O design system utiliza **Lucide** como biblioteca de ícones oficial. Os ícones Lucide são SVG stroke-based, 24x24, stroke-width 2 com round caps/joins — exactamente o estilo já existente no B2S.

### Instalação

```bash
# React
npm install lucide-react

# Vue 3
npm install lucide-vue-next

# Svelte
npm install lucide-svelte

# Vanilla JS / Web Components
npm install lucide

# SVG estáticos (para Figma, email, etc.)
npm install lucide-static
```

### Utilização em React

```tsx
import { Droplets, Gauge, CircleCheck, Plus } from 'lucide-react';

// Tamanho base do nav (20px)
<Droplets size={20} strokeWidth={2} />

// Stat card (28px, cor primária)
<Gauge size={28} className="text-blue-600" />

// Com as classes CSS do design system
<CircleCheck className="b2s-icon b2s-icon--xl b2s-icon--success" />
```

### Utilização em CSS

```html
<!-- Com classes utilitárias B2S -->
<span class="b2s-icon b2s-icon--lg b2s-icon--primary">
  <svg><!-- Lucide SVG aqui --></svg>
</span>
```

### Propriedades SVG padrão

| Propriedade | Valor |
|---|---|
| viewBox | `0 0 24 24` |
| stroke-width | `2` |
| stroke-linecap | `round` |
| stroke-linejoin | `round` |
| fill | `none` |

### Escala de tamanhos

| Token | Tamanho | Uso |
|---|---|---|
| `icon-sm` | 14px | Ícones dentro de badges |
| `icon-md` | 18px | Ícones em botões |
| `icon-base` | 20px | Itens de navegação (sidebar) |
| `icon-lg` | 22px | Cabeçalhos de secção |
| `icon-xl` | 24px | Ícones standalone, alertas |
| `icon-2xl` | 28px | Stat cards |

### Cores semânticas

| Token CSS | Cor | Uso |
|---|---|---|
| `--b2s-icon-color-default` | neutral-400 | Ícones genéricos |
| `--b2s-icon-color-muted` | neutral-200 | Desactivados |
| `--b2s-icon-color-primary` | blue-600 | Acções primárias |
| `--b2s-icon-color-success` | green-600 | Estado sucesso |
| `--b2s-icon-color-warning` | amber-500 | Estado aviso |
| `--b2s-icon-color-danger` | red-600 | Estado erro/perigo |
| `--b2s-icon-color-on-primary` | #ffffff | Sobre fundos coloridos |

### Mapeamento de ícones

Os tokens incluem um mapeamento canónico de nomes Lucide por conceito UI:

**Navegação**
| Conceito | Ícone Lucide | Import React |
|---|---|---|
| Dashboard | `layout-dashboard` | `LayoutDashboard` |
| Zonas | `map-pin` | `MapPin` |
| Válvulas | `circle-dot` | `CircleDot` |
| Programações | `calendar-clock` | `CalendarClock` |
| Histórico | `history` | `History` |
| Analytics | `trending-up` | `TrendingUp` |
| Definições | `settings` | `Settings` |
| Alertas | `bell-ring` | `BellRing` |

**Domínio (IoT / Rega / Resíduos)**
| Conceito | Ícone Lucide | Import React |
|---|---|---|
| Água | `droplets` | `Droplets` |
| Sensor | `activity` | `Activity` |
| Temperatura | `thermometer-sun` | `ThermometerSun` |
| Humidade | `cloud-drizzle` | `CloudDrizzle` |
| Pressão | `gauge` | `Gauge` |
| Caudal | `waves` | `Waves` |
| Bomba | `power` | `Power` |
| Bateria | `battery-medium` | `BatteryMedium` |
| Sinal | `wifi` | `Wifi` |
| Resíduos | `trash-2` | `Trash2` |
| Reciclagem | `recycle` | `Recycle` |
| RFID | `scan-line` | `ScanLine` |
| Viatura | `truck` | `Truck` |
| Contentor | `package` | `Package` |

**Estado**
| Conceito | Ícone Lucide | Import React |
|---|---|---|
| Sucesso | `circle-check` | `CircleCheck` |
| Aviso | `triangle-alert` | `TriangleAlert` |
| Erro | `circle-x` | `CircleX` |
| Info | `info` | `Info` |
| Online | `circle` | `Circle` |
| Offline | `circle-off` | `CircleOff` |
| Loading | `loader-circle` | `LoaderCircle` |

**Acções**
| Conceito | Ícone Lucide | Import React |
|---|---|---|
| Adicionar | `plus` | `Plus` |
| Editar | `pencil` | `Pencil` |
| Eliminar | `trash-2` | `Trash2` |
| Guardar | `save` | `Save` |
| Fechar | `x` | `X` |
| Filtrar | `sliders-horizontal` | `SlidersHorizontal` |
| Exportar | `download` | `Download` |
| Actualizar | `refresh-cw` | `RefreshCw` |

**Temas**
| Conceito | Ícone Lucide | Import React |
|---|---|---|
| Claro | `sun` | `Sun` |
| Escuro | `moon` | `Moon` |
| Sistema | `monitor` | `Monitor` |

### Lucide no Figma

Para usar Lucide directamente no Figma:
1. Instalar o plugin **Lucide Icons** no Figma
2. Ou importar SVGs de `node_modules/lucide-static/icons/`
3. Configurar `stroke-width: 2` e `corner: round` nos ícones

---

## Ícones de Produto

Os 6 produtos B2S têm ícones dedicados na pasta `product-icons/`. Cada ícone usa paths SVG originais do Lucide, escalados ×6.25 sobre fundo B2S Warm Red.

### Especificações do contentor

| Propriedade | Valor |
|---|---|
| ViewBox | `0 0 200 200` |
| Fundo | `#f93f26` (B2S Warm Red 500) |
| Fundo radius | `40px` (20% do viewBox) |
| Símbolo cor | `#ffffff` (white) |
| Escala | `×6.25` (Lucide 24px → 150px) |
| Offset | `translate(25, 25)` para centrar |
| Stroke width | `2` (Lucide default) |

### Utilização em HTML/CSS

```html
<!-- Directamente como imagem -->
<img src="product-icons/bee2waste.svg" width="80" height="80" alt="Bee2Waste">

<!-- Inline com tamanho variável -->
<div style="width: 44px; height: 44px;">
  <!-- conteúdo do SVG -->
</div>
```

### Utilização em React

```tsx
import { Recycle, Droplets, Sprout, LeafyGreen, Lightbulb, Zap } from 'lucide-react';
import { products, iconography } from './tokens';

// Renderizar ícone de produto com fundo
function ProductIcon({ product, size = 80 }) {
  const { productIcon } = iconography;
  const IconComponent = { Recycle, Droplets, Sprout, LeafyGreen, Lightbulb, Zap }[
    products[product].lucideImport
  ];

  return (
    <div style={{
      width: size, height: size,
      background: productIcon.background,
      borderRadius: size * 0.2,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <IconComponent size={size * 0.6} color={productIcon.foreground} strokeWidth={2} />
    </div>
  );
}

// Uso
<ProductIcon product="bee2waste" size={80} />
<ProductIcon product="bee2lighting" size={44} />
```

### Utilização no Figma

1. Arrastar os SVGs da pasta `product-icons/` para o canvas
2. Ou usar o plugin Lucide Icons + aplicar fundo manualmente
3. Background: `#f93f26`, corner radius: 20% da dimensão

---

## Usar em CSS

```html
<link rel="stylesheet" href="tokens.css">
```

```css
.meu-componente {
  background: var(--bg-card);
  color: var(--text-primary);
  border: var(--b2s-border-width-default) solid var(--border);
  border-radius: var(--b2s-radius-lg);
  padding: var(--b2s-space-5);
  box-shadow: var(--shadow-sm);
}
```

Para alternar tema: `<html data-theme="dark">` ou `<html data-b2s="true">`.

---

## Usar em TypeScript / React

```ts
import { tokens, lightTheme, darkTheme, typography, iconography } from './tokens';

// Cores
const primary = tokens.color.blue[500]; // #0096c7

// Tema
const bg = lightTheme.bg.card; // #ffffff

// Tipografia
const heading = typography.h1; // { fontSize: '28px', fontWeight: 700, ... }

// Ícones
const dashIcon = iconography.mapping.navigation.dashboard; // 'layout-dashboard'
const iconSize = iconography.size.xl; // '24px'
const iconDefaults = iconography.defaults; // { strokeWidth: 2, ... }
```

### Tailwind CSS

```js
// tailwind.config.js
import { tailwindExtend } from './tokens';

export default {
  theme: {
    extend: tailwindExtend,
  },
};
```

---

## Estrutura dos Tokens

```
core/
  color/
    blue/               ← Paleta primária (50–600)
    green/               ← Sucesso
    red/                 ← Perigo
    amber/               ← Aviso
    neutral/             ← Fundos, texto, bordas (0–900)
    b2s/                 ← Brand overrides
  font/                  ← Família, tamanhos, pesos
  space/                 ← Escala 4px (1–16)
  radius/                ← sm, md, lg, xl, full
  shadow/                ← sm, md, lg
  duration/              ← Transições
  sizing/                ← Ícones, layout, componentes
  iconography/           ← Lucide: defaults, sizes, colors, mapping
    size/                ← sm (14px) → 2xl (28px)
    color/               ← default, muted, primary, success, warning, danger
    mapping/
      navigation/        ← dashboard, zones, valves, schedules...
      domain/            ← blue, sensor, temperature, pressure, waste...
      status/            ← success, warning, error, info, online...
      action/            ← add, edit, delete, save, filter, refresh...
      theme/             ← light, dark, system
      product/           ← bee2waste, bee2water, bee2crop, bee2green, bee2lighting, bee2energy
    productIcon/         ← Container specs: bg, fg, radius, scale

product-icons/           ← SVG files (200×200, Lucide on #f93f26)
  bee2waste.svg
  bee2water.svg
  bee2crop.svg
  bee2green.svg
  bee2lighting.svg
  bee2energy.svg

semantic/light/          ← Mapeamento semântico tema claro
semantic/dark/           ← Mapeamento semântico tema escuro
brand/b2s/               ← Overrides Warm Red + Petro Gray
```

---

## Convenções de nomenclatura

- **Primitivos:** `b2s-color-blue-500`, `b2s-space-4`, `b2s-icon-xl`
- **Semânticos:** `bg-card`, `text-primary`, `primary-default`, `danger-subtle`
- **Ícones:** `b2s-icon-color-primary`, `b2s-icon--lg`, `b2s-icon--success`
- **Compostos:** `typo-h1-size`, `typo-body-weight`

Os primitivos têm prefixo `b2s-` para evitar conflitos. Os semânticos não têm prefixo para facilitar utilização.
