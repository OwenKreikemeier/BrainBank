// ---------------------------------------------------------------------------
// coordinates.ts — pure geometry helpers (no React, no state)
// ---------------------------------------------------------------------------
// Everything here is a pure function so the math is easy to read, reason
// about, and unit-test in isolation.
//
// Coordinate systems:
//   • screen px      — what the user sees
//   • frame-local    — cell units inside the *current* frame's grid
//
// A note stores its position/size in its PARENT frame's local cell units.
// Zooming into a note re-bases the viewport onto that note's interior grid
// (which is INTERIOR_SPAN cells across), keeping `zoom` numerically small no
// matter how deep you go — that is what makes zoom-in effectively infinite.
// ---------------------------------------------------------------------------

import {
  BASE_CELL_PX,
  INTERIOR_SPAN,
  type Cell,
  type Note,
  type Pan,
  type ScreenRect,
} from "../types";

/** Pixel size of one local cell at the given zoom. */
export function cellPxFor(zoom: number): number {
  return BASE_CELL_PX * zoom;
}

/** Convert a screen point to floating frame-local cell coordinates. */
export function screenToCell(
  screenX: number,
  screenY: number,
  pan: Pan,
  zoom: number
): Cell {
  const cellPx = cellPxFor(zoom);
  return {
    cx: (screenX - pan.x) / cellPx,
    cy: (screenY - pan.y) / cellPx,
  };
}

/** Convert frame-local cell coordinates to a screen point. */
export function cellToScreen(
  cx: number,
  cy: number,
  pan: Pan,
  zoom: number
): { x: number; y: number } {
  const cellPx = cellPxFor(zoom);
  return {
    x: pan.x + cx * cellPx,
    y: pan.y + cy * cellPx,
  };
}

/** Screen rectangle occupied by a note that lives in the current frame. */
export function noteScreenRect(note: Note, pan: Pan, zoom: number): ScreenRect {
  const cellPx = cellPxFor(zoom);
  return {
    x: pan.x + note.x * cellPx,
    y: pan.y + note.y * cellPx,
    w: note.size * cellPx,
    h: note.size * cellPx,
  };
}

/**
 * Given a drag from `anchor` cell to `current` cell, produce an integer,
 * top-left-anchored PERFECT SQUARE. The square grows from the anchor in the
 * drag direction; side = max(|dx|, |dy|) so it is always square.
 */
export function snapSquare(
  anchor: Cell,
  current: Cell
): { x: number; y: number; size: number } {
  const ax = Math.floor(anchor.cx);
  const ay = Math.floor(anchor.cy);
  const bx = Math.floor(current.cx);
  const by = Math.floor(current.cy);

  // Inclusive cell span in each axis (at least 1 cell)
  const spanX = Math.abs(bx - ax) + 1;
  const spanY = Math.abs(by - ay) + 1;
  const size = Math.max(spanX, spanY);

  // Top-left corner depends on drag direction so the square hugs the anchor
  const x = bx >= ax ? ax : ax - (size - 1);
  const y = by >= ay ? ay : ay - (size - 1);

  return { x, y, size };
}

/** Do two cell-space squares overlap? (used to forbid placing over siblings) */
export function squaresOverlap(
  a: { x: number; y: number; size: number },
  b: { x: number; y: number; size: number }
): boolean {
  return (
    a.x < b.x + b.size &&
    a.x + a.size > b.x &&
    a.y < b.y + b.size &&
    a.y + a.size > b.y
  );
}

/** Is a screen point inside a screen rect? */
export function pointInRect(px: number, py: number, r: ScreenRect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// ---------------------------------------------------------------------------
// Rebasing — change of reference frame
// ---------------------------------------------------------------------------

/**
 * Re-base INTO a child note: the child's interior becomes the new frame.
 * The child currently occupies `child` (in the OLD frame's cells). After this
 * the viewport describes the child's interior grid (INTERIOR_SPAN cells wide).
 */
export function rebaseIn(
  pan: Pan,
  zoom: number,
  child: Note
): { pan: Pan; zoom: number } {
  const rect = noteScreenRect(child, pan, zoom);
  // The child's edge maps to INTERIOR_SPAN interior cells.
  const interiorCellPx = rect.w / INTERIOR_SPAN;
  return {
    zoom: interiorCellPx / BASE_CELL_PX,
    pan: { x: rect.x, y: rect.y }, // interior origin sits at the child's corner
  };
}

/**
 * Re-base OUT to the parent: `frameNote` is the note we are currently inside.
 * We express the viewport back in the parent frame's cells.
 */
export function rebaseOut(
  pan: Pan,
  zoom: number,
  frameNote: Note
): { pan: Pan; zoom: number } {
  // Interior edge currently on screen
  const interiorEdgePx = INTERIOR_SPAN * cellPxFor(zoom);
  // In the parent the note spans frameNote.size cells, so:
  const parentCellPx = interiorEdgePx / frameNote.size;
  const parentZoom = parentCellPx / BASE_CELL_PX;
  return {
    zoom: parentZoom,
    pan: {
      x: pan.x - frameNote.x * parentCellPx,
      y: pan.y - frameNote.y * parentCellPx,
    },
  };
}
