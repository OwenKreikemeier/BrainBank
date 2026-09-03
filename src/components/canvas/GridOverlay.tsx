// ---------------------------------------------------------------------------
// GridOverlay — adaptive grid lines for the current frame
// ---------------------------------------------------------------------------
// The grid is drawn BELOW the notes layer, so notes show as clean colour
// blocks until you zoom in and "enter" one — at which point the grid appears
// across its interior.
//
// Region: at the root the grid covers the whole canvas in theme colours.
// Inside a note it is clipped to that note's interior rect, and the line
// colour is chosen to contrast with the note's fill (dark lines on light
// notes, light lines on dark notes).
//
// Adaptive spacing (Desmos-style): the rendered minor cell size is kept
// within [TARGET_MIN_PX, TARGET_MAX_PX] by stepping in powers of 5, so lines
// never crowd or disappear. Major lines are drawn every 5 minor cells.
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { useNotesStore } from "../../store/notesStore";
import { useSettingsStore, THEME_COLORS } from "../../store/settingsStore";
import { BASE_CELL_PX, INTERIOR_SPAN } from "../../types";
import { cellPxFor } from "../../lib/coordinates";

// Target rendered size range for minor cells (pixels on screen)
const TARGET_MIN_PX = 20;
const TARGET_MAX_PX = 120;
// Keep the clamped grid slightly larger than the viewport
const CLAMP_MARGIN_PX = 100;

/**
 * Pick a cell size such that its rendered pixel size stays within
 * [TARGET_MIN_PX, TARGET_MAX_PX]. Increments / decrements by ×5.
 */
function adaptiveCellSize(zoom: number): number {
  let cellPx = BASE_CELL_PX * zoom;

  while (cellPx < TARGET_MIN_PX) cellPx *= 5;
  while (cellPx > TARGET_MAX_PX) cellPx /= 5;

  return cellPx; // this is already the screen-pixel size of one minor cell
}

/** Line colours that contrast with a note's fill colour. */
function linesForNoteColor(color: string): { minor: string; major: string } {
  const hex = color.replace("#", "");
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (luminance < 0.5) {
      // Dark note — light lines
      return {
        minor: "rgba(255,255,255,0.14)",
        major: "rgba(255,255,255,0.30)",
      };
    }
  }
  // Light note (or unparseable colour) — dark lines
  return { minor: "rgba(0,0,0,0.10)", major: "rgba(0,0,0,0.24)" };
}

export function GridOverlay() {
  const pan = useCanvasStore((s) => s.pan);
  const zoom = useCanvasStore((s) => s.zoom);
  const frameId = useCanvasStore((s) => s.frameId);
  const theme = useSettingsStore((s) => s.theme);
  const showGridLines = useSettingsStore((s) => s.showGridLines);
  // Re-render when notes mutate (e.g. the frame note is recoloured).
  const version = useNotesStore((s) => s.version);
  void version;

  // Minor cell size in screen pixels
  const minorPx = useMemo(() => adaptiveCellSize(zoom), [zoom]);
  // Major lines every 5 minor cells
  const majorPx = minorPx * 5;

  if (!showGridLines) return null;

  // Region + colours: whole canvas at the root, the note's interior when
  // inside one.
  const themeColors = THEME_COLORS[theme];
  let minorLine = themeColors.minorLine;
  let majorLine = themeColors.majorLine;
  let left = 0;
  let top = 0;
  let right = window.innerWidth;
  let bottom = window.innerHeight;

  if (frameId) {
    const note = useNotesStore.getState().getNote(frameId);
    if (note) {
      const lines = linesForNoteColor(note.color);
      minorLine = lines.minor;
      majorLine = lines.major;
    }
    const edge = INTERIOR_SPAN * cellPxFor(zoom);
    left = Math.max(pan.x, -CLAMP_MARGIN_PX);
    top = Math.max(pan.y, -CLAMP_MARGIN_PX);
    right = Math.min(pan.x + edge, window.innerWidth + CLAMP_MARGIN_PX);
    bottom = Math.min(pan.y + edge, window.innerHeight + CLAMP_MARGIN_PX);
    if (right <= left || bottom <= top) return null;
  }

  // Pattern offset — align grid intersections with the frame origin. Pattern
  // coordinates are relative to the SVG's own top-left corner (left/top).
  const offsetX = (((pan.x - left) % majorPx) + majorPx) % majorPx;
  const offsetY = (((pan.y - top) % majorPx) + majorPx) % majorPx;

  return (
    <svg
      style={{
        position: "fixed",
        left,
        top,
        width: right - left,
        height: bottom - top,
        pointerEvents: "none",
        // Below the notes layer: notes cover the grid until you enter them.
        zIndex: 0,
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

      {/* Fill the region with tiled minor lines */}
      <rect width="100%" height="100%" fill="url(#minor-grid)" />
      {/* Overlay major lines */}
      <rect width="100%" height="100%" fill="url(#major-grid)" />
    </svg>
  );
}
