// ---------------------------------------------------------------------------
// GridOverlay — infinite, adaptive grid lines rendered as an SVG pattern
// ---------------------------------------------------------------------------
// The SVG fills the entire viewport (position:fixed, full screen). The grid
// lines are drawn using a <pattern> that tiles across the whole view.
//
// Adaptive spacing (Desmos-style):
//   The "logical" cell size at the current zoom is BASE_CELL_PX * zoom.
//   When that rendered size gets too small or too large we scale the level
//   up/down by powers of 5, so lines never crowd or disappear. A second set
//   of "major" lines is drawn every 5 cells at a higher opacity.
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { useSettingsStore, THEME_COLORS } from "../../store/settingsStore";
import { BASE_CELL_PX } from "../../types";

// Target rendered size range for minor cells (pixels on screen)
const TARGET_MIN_PX = 20;
const TARGET_MAX_PX = 120;

/**
 * Pick a cell size (in world units) such that its rendered pixel size stays
 * within [TARGET_MIN_PX, TARGET_MAX_PX]. Increments / decrements by ×5.
 */
function adaptiveCellSize(zoom: number): number {
  let cellPx = BASE_CELL_PX * zoom;

  while (cellPx < TARGET_MIN_PX) cellPx *= 5;
  while (cellPx > TARGET_MAX_PX) cellPx /= 5;

  return cellPx; // this is already the screen-pixel size of one minor cell
}

export function GridOverlay() {
  const pan = useCanvasStore((s) => s.pan);
  const zoom = useCanvasStore((s) => s.zoom);
  const theme = useSettingsStore((s) => s.theme);
  const showGridLines = useSettingsStore((s) => s.showGridLines);
  const { minorLine, majorLine } = THEME_COLORS[theme];

  // Minor cell size in screen pixels
  const minorPx = useMemo(() => adaptiveCellSize(zoom), [zoom]);
  // Major lines every 5 minor cells
  const majorPx = minorPx * 5;

  if (!showGridLines) return null;

  // Pattern offset — shift the pattern so (0,0) in world space is always a
  // grid intersection, regardless of where the user has panned.
  const offsetX = ((pan.x % majorPx) + majorPx) % majorPx;
  const offsetY = ((pan.y % majorPx) + majorPx) % majorPx;

  return (
    <svg
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        // Above notes so the grid stays continuous when you zoom into a note.
        zIndex: 2,
      }}
    >
      <defs>
        {/* Minor grid pattern */}
        <pattern
          id="minor-grid"
          x={offsetX}
          y={offsetY}
          width={minorPx}
          height={minorPx}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${minorPx} 0 L 0 0 0 ${minorPx}`}
            fill="none"
            stroke={minorLine}
            strokeWidth="0.5"
          />
        </pattern>

        {/* Major grid pattern (layered on top of minor) */}
        <pattern
          id="major-grid"
          x={offsetX}
          y={offsetY}
          width={majorPx}
          height={majorPx}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${majorPx} 0 L 0 0 0 ${majorPx}`}
            fill="none"
            stroke={majorLine}
            strokeWidth="1"
          />
        </pattern>
      </defs>

      {/* Fill the entire viewport with tiled minor lines */}
      <rect width="100%" height="100%" fill="url(#minor-grid)" />
      {/* Overlay major lines */}
      <rect width="100%" height="100%" fill="url(#major-grid)" />
    </svg>
  );
}
