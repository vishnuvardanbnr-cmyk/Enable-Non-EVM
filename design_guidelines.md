# Design Guidelines: Minimal Welcome Screen

## Design Approach
**Selected Approach:** Minimal HTML-only implementation (no CSS as explicitly requested)

This is a stripped-down welcome screen using browser default styling only, respecting the constraint of zero CSS and single-section structure.

## Core Design Elements

### Typography
- Use browser default fonts (typically Times New Roman or system serif)
- Rely on semantic HTML tags for hierarchy:
  - `<h1>` for main welcome heading
  - `<p>` for any supporting text
- No custom font sizes, weights, or families

### Layout System
- Single-section layout with natural document flow
- No spacing controls (browser defaults only)
- No containers or wrappers beyond the minimal section element
- Content flows naturally top-to-bottom

### Component Library
**Single Section Component:**
- Welcome heading as primary element
- Optional brief welcome message text below heading
- Minimal semantic HTML structure only

### Visual Design
- Browser default colors (black text on white background)
- No backgrounds, borders, or visual enhancements
- No images or graphics
- Pure text-based content

### Accessibility
- Semantic HTML provides basic accessibility
- Proper heading hierarchy (`<h1>` for main title)
- Readable default text size

## Implementation Notes
- Use only HTML5 semantic tags
- No inline styles, external stylesheets, or style tags
- Keep structure to absolute minimum: one `<section>` with heading and optional text
- Let browser defaults handle all visual presentation