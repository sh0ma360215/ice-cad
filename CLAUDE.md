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

- **App.tsx**: Main component with 2D/3D view toggle, parameter controls
- **Drawing2D.tsx**: Canvas-based 2D CAD drawing with 6 views (side section, top, front section, depth section, design, bottom) and dimension lines. Exposes `exportPNG()` via forwardRef
- **MoldPreview.tsx**: Three.js canvas wrapper with OrbitControls and Environment
- **MoldMesh.tsx**: 3D geometry generation using ExtrudeGeometry for text shapes
- **constants/**: Module containing `FIXED_PARAMS` (manufacturing specs), `VariableParams` interface, and other configuration constants organized by domain (manufacturing, geometry, drawing, mesh)

### Font Processing (Critical Path)

Japanese text → 3D shapes conversion in `src/utils/textToShape.ts`:
1. Load font with `opentype.js` from `/fonts/NotoSansJP-Bold.otf`
2. `textToShapes()`: Convert font path commands (M/L/C/Q/Z) to `THREE.Shape[]`
3. Bezier curves approximated to line segments (5 segments per curve)
4. Clockwise/counter-clockwise detection for hole identification in kanji characters
5. Optional: `createFilledMultiCharShapes()` uses clipper2-js to inflate and merge character paths

### Key Technical Details

- Font file: `public/fonts/NotoSansJP-Bold.otf` (16.2MB, local file required)
- opentype.js supports TTF, OTF, WOFF only (NOT WOFF2)
- Japanese text rendered vertically (characters split and arranged top-to-bottom)
- Hole detection uses signed area calculation (Shoelace formula) and point-in-polygon tests (ray casting)
- clipper2-js uses integer coordinates with CLIPPER_SCALE=1000 for precision

## Manufacturing Parameters

Fixed specs in `FIXED_PARAMS` (`src/constants/manufacturing.ts`):
- Container dimensions: 76.91×113.91mm (outer), 70×107mm (inner)
- Cavity (text area): 57.90×97.30mm
- Depth: 24.5mm, Text depth: 3mm
- Taper angles: 8° (outer), 4° (stick area)
- Corner radius: R9.46 (outer), R6 (inner), Flange width: 3.455mm

## Tech Stack

- React 18 + TypeScript + Vite
- Three.js + @react-three/fiber + @react-three/drei (3D rendering)
- opentype.js (font parsing)
- clipper2-js (polygon offsetting/union for text fill)
- Tailwind CSS (styling)
