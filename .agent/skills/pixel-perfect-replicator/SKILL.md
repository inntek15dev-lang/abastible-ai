---
name: Pixel Perfect Replicator
description: A robust workflow for replicating UI designs from reference images with pixel-perfect accuracy.
---

# Pixel Perfect Replicator Skill

This skill provides a systematic approach to translating reference images (screenshots, mockups) into code, ensuring high fidelity to the source aesthetic.

## 1. Visual Analysis Protocol
Before writing code, analyze the reference image for the following attributes:

### A. Layout Structure
- **Container**: Is it a Grid, List (Stack), or Masonry?
- **Spacing**: Estimate padding/margins (e.g., generous whitespace vs. compact).
- **Alignment**: Left, Center, or Right aligned? Justified?

### B. Typography & Color
- **Headings**: Font weight, case (UPPER/lower), color keys.
- **Secondary Text**: Color (usually lighter gray), size, location.
- **Accents**: Primary action colors, destructive colors.

### C. Component Primitives
- **Cards**: Border radius, shadow (soft/hard/none), background color.
- **Buttons**:
    - *Primary*: Solid background?
    - *Secondary/Destructive*: Outline? Ghost?
    - *Iconography*: Position and style.

## 2. Replication Strategy (Tailwind CSS)

### Step 1: Structural Skeleton
Establish the outer layout first.
```jsx
// Example: List View
<div className="space-y-4">
  {items.map(item => (
     <div className="flex justify-between items-start">...</div>
  ))}
</div>
```

### Step 2: Token Extraction & Application
Map visual traits to specific Tailwind classes.

| Visual Trait | CSS/Tailwind Approximation |
| :--- | :--- |
| **Subtle Text** | `text-slate-500 text-sm` |
| **Bold Heading** | `font-bold text-gray-900` |
| **Red Outline Button** | `border border-red-200 text-red-500 hover:bg-red-50` |
| **Clean Card** | `bg-white` (No shadow or very subtle `shadow-sm`) |

### Step 3: Icon Matching
Replace emojis or generic placeholders with specific libraries (e.g., Lucide-react) that match the visual weight of the reference.

## 3. Verification Checklist
- [ ] **Layout**: Does the density match?
- [ ] **Hierarchy**: Is the primary info (e.g., "Servicio: X") the most visible element?
- [ ] **Details**: Are borders/dividers present where expected?
- [ ] **Actions**: Are buttons positioned exactly as in the reference (e.g., right-aligned)?

## 4. Anti-Patterns (What NOT to do)
- ❌ Do NOT apply "theme" assumptions (e.g., "Parko means gradients") unless explicitly in the visual reference.
- ❌ Do NOT change layout primitives (Grid -> List) without evidence.
- ❌ Do NOT ignore empty states or spacing.
