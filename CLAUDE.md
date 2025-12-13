# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ice CAD is a desktop application for generating 2D/3D CAD drawings of ice candy molds with customizable Japanese text (kanji). The app allows users to input place names (e.g., "鎌倉", "渋谷") and generates technical drawings with dimensions.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build (tsc -b && vite build)
npm run lint         # Run ESLint
npm run preview      # Preview production build
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage  # Run tests with coverage report
```

## Architecture

### Core Data Flow
1. User inputs Japanese text and adjusts parameters in the left panel
2. `App.tsx` manages state with `VariableParams` (text, offsetX, offsetY, scale, rotation, fillText, fillOffset)
3. Fixed manufacturing parameters are defined in `FIXED_PARAMS` constant in `src/constants/manufacturing.ts`
4. View renders either 2D CAD drawing (Canvas API) or 3D model (Three.js)

### Key Components

- **App.tsx**: Main component with 2D/3D view toggle, parameter controls (252 lines)
- **Drawing2D.tsx**: Canvas-based 2D CAD drawing component (128 lines). Delegates drawing logic to `utils/drawing/` modules. Exposes `exportPNG()` via forwardRef
- **MoldPreview.tsx**: Three.js canvas wrapper with OrbitControls and Environment
- **MoldMesh.tsx**: 3D geometry generation using ExtrudeGeometry for text shapes

### Constants Organization

Constants are organized by domain in `src/constants/`:
- **manufacturing.ts**: `FIXED_PARAMS` - physical dimensions, angles, radii for mold production
- **geometry.ts**: Font processing constants - `FONT_URL`, `CLIPPER_SCALE`, `BEZIER_SEGMENTS`, etc.
- **drawing.ts**: 2D canvas drawing constants - `CANVAS`, `LAYOUT`, `FONTS`, `COLORS`
- **mesh.ts**: 3D mesh constants - `STICK_DIMENSIONS`, `ICE_EXTRUDE_SETTINGS`, `MESH_COLORS`
- **index.ts**: Exports `FIXED_PARAMS`, `VariableParams` interface, and defaults

### Drawing Utils Module (`src/utils/drawing/`)

2D CAD drawing functions are organized by concern:
- **border.ts**: `drawBorder()`, `drawTitleBlock()` - outer frame and title block
- **sections.ts**: `drawSideSection()`, `drawFrontSection()`, `drawDepthSection()` - cross-section views
- **views.ts**: `drawTopView()`, `drawDesignView()`, `drawBottomView()` - plan/elevation views
- **dimensions.ts**: `drawDimensionH()`, `drawDimensionV()`, `drawArrowH()`, `drawArrowV()` - dimension lines and arrows
- **text.ts**: `drawTextWithHatching()`, `drawTextOutlineInView()` - text rendering with hatching patterns
- **primitives.ts**: `roundedRect()` - low-level drawing primitives
- **index.ts**: Exports all drawing functions

### Font Processing (Critical Path)

Japanese text → 3D shapes conversion in `src/utils/textToShape.ts`:
1. **Font loading**: `loadFont()` caches font with `opentype.js` from `/fonts/NotoSansJP-Bold.otf`
2. **Shape conversion**: `textToShapes()` converts font path commands (M/L/C/Q/Z) to `THREE.Shape[]`
3. **Bezier approximation**: Curves approximated to line segments (5 segments per curve via `BEZIER_SEGMENTS`)
4. **Hole detection**: Clockwise/counter-clockwise detection using Shoelace formula for kanji character holes
5. **Text filling** (optional): `createFilledMultiCharShapes()` uses clipper2-js to inflate and merge character paths
6. **Auto-offset**: `createFilledMultiCharShapesAuto()` calculates optimal offset based on character spacing

### Key Technical Details

- **Font file**: `public/fonts/NotoSansJP-Bold.otf` (16.2MB, local file required)
- **Font support**: opentype.js supports TTF, OTF, WOFF only (NOT WOFF2)
- **Text layout**: Japanese text rendered vertically (characters split and arranged top-to-bottom)
- **Hole detection**: Signed area calculation (Shoelace formula) + point-in-polygon tests (ray casting)
- **Clipper precision**: Uses integer coordinates with `CLIPPER_SCALE=1000` for sub-millimeter precision
- **Shape conversion**: `SHAPE_POINTS_DIVISIONS=12` for THREE.Shape to clipper path conversion

### Manufacturing Parameters

Fixed specs in `FIXED_PARAMS` (`src/constants/manufacturing.ts`):
- **Container**: 76.91×113.91mm (outer), 70×107mm (inner)
- **Cavity** (text area): 57.90×97.30mm
- **Depth**: 24.5mm total, 3mm text depth
- **Taper angles**: 8° (outer wall), 4° (stick area)
- **Corner radii**: R9.46 (outer), R6 (inner)
- **Flange**: 3.455mm width

## Tech Stack

- React 18 + TypeScript + Vite
- Three.js + @react-three/fiber + @react-three/drei (3D rendering)
- opentype.js (font parsing)
- clipper2-js (polygon offsetting/union for text fill)
- Tailwind CSS (styling)
- Vitest + @testing-library/react (testing)

## Testing

Unit tests focus on geometry/font utilities in `src/utils/textToShape.test.ts`:
- `isClockwise()` - polygon orientation detection
- `approximateCubicBezier()`, `approximateQuadraticBezier()` - curve approximation
- `getCenter()` - polygon centroid calculation
- `isPointInPolygon()` - point-in-polygon ray casting

Run single test file:
```bash
npx vitest run src/utils/textToShape.test.ts
```

Run tests matching pattern:
```bash
npx vitest run -t "isClockwise"
```

## Code Organization Principles

The codebase follows a modular structure:
1. **Separation by domain**: Constants, components, and utilities are organized by their domain (drawing, geometry, manufacturing, mesh)
2. **Single responsibility**: Each module has a focused purpose (e.g., `border.ts` only handles border/frame drawing)
3. **Maximum file size**: Target 200-300 lines per file for maintainability
4. **Centralized constants**: All magic numbers are extracted to domain-specific constant files
5. **Pure functions**: Utilities (drawing, geometry) are pure functions for testability

## Deployment

This is a static site (no backend) that can be deployed to any static hosting platform. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment options and cost analysis.

**Recommended platform**: Cloudflare Pages (free, unlimited bandwidth)

Quick production build test:
```bash
npm run build    # Production build
npm run preview  # Preview build locally
```

Configuration files included:
- `.node-version` - Node.js version for build environments
- `vercel.json` - Vercel deployment config
- `netlify.toml` - Netlify deployment config
- `.cloudflare-pages.toml` - Cloudflare Pages config (optional, auto-detected)
