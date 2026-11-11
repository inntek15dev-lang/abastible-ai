---
name: Image to CSS
description: Analyzes images to extract visual elements and generate exact CSS theme files
triggers: ["image analysis request", "theme extraction", "css generation from visual"]
---

# ROLE: IMAGE TO CSS EXTRACTOR
# AUTHORITY: Operational Skill
# OBJECTIVE: Transform visual designs into precise, reusable CSS themes

## 1. MISSION
Analizar imágenes de diseño para identificar todos los elementos visuales y generar archivos CSS que repliquen exactamente el estilo visual sobre elementos HTML nativos y genéricos.

## 2. INPUTS

| Input | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `image` | file/path | Sí | Imagen a analizar (PNG, JPG, WebP) |
| `theme_name` | string | Sí | Nombre del tema para el archivo CSS |
| `target_elements` | array | No | Elementos específicos a extraer |

## 3. OUTPUTS

| Output | Ubicación | Descripción |
|--------|-----------|-------------|
| `{theme_name}.css` | `.agent/themes/` | Archivo CSS completo con tema |

## 4. EXECUTION PROTOCOL

### 4.1 Phase 1: Image Analysis
```
1. Load image from path or receive directly
2. Identify visual hierarchy:
   - Background colors/gradients
   - Typography (fonts, sizes, weights, colors)
   - Spacing patterns (margins, paddings)
   - Border styles (radius, width, color)
   - Shadow effects
   - Interactive states (hover indicators)
3. Map elements to HTML equivalents
```

### 4.2 Phase 2: Color Extraction
```
1. Extract primary color palette:
   - Background primary/secondary
   - Text primary/secondary/muted
   - Accent colors
   - Border colors
   - Shadow colors
2. Define CSS custom properties (variables)
```

### 4.3 Phase 3: Typography Analysis
```
1. Identify font families (or closest web-safe alternatives)
2. Extract font sizes for:
   - Headings (h1-h6)
   - Body text
   - Small/caption text
3. Determine line-heights and letter-spacing
4. Map font weights
```

### 4.4 Phase 4: Component Mapping
```
1. Map visual elements to HTML:
   - Containers → div, section, article
   - Text blocks → p, span, h1-h6
   - Lists → ul, ol, li
   - Forms → input, button, select, textarea
   - Tables → table, th, td
   - Navigation → nav, a
   - Cards → div.card
2. Define class naming convention
```

### 4.5 Phase 5: CSS Generation
```
1. Generate CSS with structure:
   a. CSS Variables (custom properties)
   b. Reset/normalize base
   c. Typography system
   d. Layout utilities
   e. Component styles
   f. State modifiers
2. Add comments for each section
3. Document class usage
```

## 5. CSS OUTPUT STRUCTURE

```css
/* ============================================
   Theme: {theme_name}
   Generated: {timestamp}
   Source: {image_path}
   ============================================ */

/* -----------------------------
   1. CSS VARIABLES
   Define all theme tokens here
   ----------------------------- */
:root {
  /* Colors */
  --color-bg-primary: #value;
  --color-bg-secondary: #value;
  --color-text-primary: #value;
  --color-text-secondary: #value;
  --color-accent: #value;
  --color-border: #value;
  
  /* Typography */
  --font-family-base: 'Font', sans-serif;
  --font-size-base: 16px;
  --line-height-base: 1.5;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Borders */
  --border-radius: 8px;
  --border-width: 1px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
}

/* -----------------------------
   2. BASE ELEMENTS
   Styles for native HTML tags
   ----------------------------- */

/* Body: Main container background and text */
body {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
}

/* Headings: Use for section titles */
h1, h2, h3, h4, h5, h6 { }

/* Paragraphs: Standard text blocks */
p { }

/* Links: Navigation and inline links */
a { }

/* -----------------------------
   3. COMPONENT CLASSES
   Reusable component styles
   ----------------------------- */

/* .card: Use for content containers
   Example: <div class="card">...</div> */
.card { }

/* .btn: Use for buttons and CTAs
   Example: <button class="btn">Click</button> */
.btn { }

/* -----------------------------
   4. UTILITY CLASSES
   Single-purpose modifiers
   ----------------------------- */
.text-muted { color: var(--color-text-secondary); }
.text-accent { color: var(--color-accent); }
```

## 6. COMMENT DOCUMENTATION FORMAT

Each CSS block must include:
```css
/* .class-name: Brief description of purpose
   Usage: <tag class="class-name">content</tag>
   Variants: .class-name--modifier
   Parent: Required parent element if any */
```

## 7. GUARDRAILS

1. **Exact Color Matching**: Use color picker precision, no approximations
2. **Web-Safe Fonts**: If font cannot be identified, suggest closest Google Font
3. **Mobile-First**: Generate responsive-ready styles
4. **No Inline Styles**: All styles in external CSS file
5. **Semantic Naming**: Class names describe purpose, not appearance
6. **Comment Every Section**: Mandatory documentation for each block

## 8. VALIDATION CHECKLIST

Before output:
- [ ] All colors extracted and defined as variables
- [ ] Typography hierarchy complete (h1-h6, p, small)
- [ ] All visible components have corresponding CSS
- [ ] Comments document usage for each class
- [ ] File validates (no syntax errors)
- [ ] Variables are used consistently (no hardcoded values in rules)

## 9. EXAMPLE INVOCATION

```
/img-to-css analyze image.png --theme "dark_dashboard"
```

Output: `.agent/themes/dark_dashboard.css`

## 10. INTEGRATIONS

| Skill | Integration |
|-------|-------------|
| `execution-logger` | Log extraction metrics |
| `context-memory` | Store color palettes for reuse |
| `pattern-recognizer` | Identify recurring UI patterns |
