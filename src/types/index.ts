// ---------------------------------------------------------------------------
// Core domain types + tunable constants for BrainBank
// ---------------------------------------------------------------------------
// A "Note" is a square placed on a frame's grid. Notes nest: zooming into a
// note reveals its own interior grid where child notes live. Positions and
// sizes are always expressed in the PARENT frame's local cell units.
// ---------------------------------------------------------------------------

export type NoteType = "text" | "image" | "audio" | "video" | "space";

export interface Note {
  /** Stable UUID (crypto.randomUUID) */
  id: string;
  /** Parent note id, or null when this note sits on the root world grid */
  parentId: string | null;
  /** Nesting level: root's direct children are 0, their children 1, etc. */
  depth: number;
  /** Top-left X in the parent frame's local cell units */
  x: number;
  /** Top-left Y in the parent frame's local cell units */
  y: number;
  /** Square side length in the parent frame's local cell units */
  size: number;
  type: NoteType;
  /** Fill colour */
  color: string;
  /** Short title shown centered in the note's title bar */
  title: string;
  /** Text content / URL / reference depending on `type` */
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Widgets — tools placed on a note's interior (text blocks, later images, …)
// Positions are in THAT note's interior cell units (INTERIOR_SPAN across).
// Widgets never live on the root grid; deleting a note deletes its widgets.
// ---------------------------------------------------------------------------

export type WidgetType = "text";

export type PlacementKind = "note" | "text";

export type TextAlign = "left" | "center" | "right";

export interface Widget {
  id: string;
  /** The note this widget is attached to */
  noteId: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Rotation in degrees, clockwise */
  rotation: number;
  content: string;
  fontFamily: string;
  /** Font size in CSS px when one interior cell is BASE_CELL_PX on screen */
  fontSize: number;
  color: string;
  align: TextAlign;
  createdAt: Date;
  updatedAt: Date;
}

export const TEXT_FONTS: { label: string; value: string }[] = [
  { label: "Sans", value: "system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, Consolas, monospace" },
  { label: "Comic", value: '"Comic Sans MS", "Comic Sans", cursive' },
];

export const DEFAULT_TEXT_FONT = TEXT_FONTS[0].value;
export const DEFAULT_TEXT_COLOR = "#1a1a1a";
export const DEFAULT_TEXT_FONT_SIZE = 22;
export const DEFAULT_TEXT_ALIGN: TextAlign = "left";
export const MIN_WIDGET_CELLS = 0.4;

// ---------------------------------------------------------------------------
// Viewport / geometry helpers
// ---------------------------------------------------------------------------

export interface Pan {
  x: number;
  y: number;
}

/** A point in frame-local cell coordinates */
export interface Cell {
  cx: number;
  cy: number;
}

/** An axis-aligned rectangle in screen pixels */
export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Tunable constants
// ---------------------------------------------------------------------------

/** Pixel size of one grid cell at zoom === 1 */
export const BASE_CELL_PX = 60;

/**
 * How many interior cells span a note's edge. When you zoom into a note its
 * interior becomes a fresh grid this many cells across, so any child note is
 * always smaller than its parent.
 */
export const INTERIOR_SPAN = 12;

/** Zoom-out floor — only enforced at the root frame so reset has a "home". */
export const ROOT_MIN_ZOOM = 0.2;

/** Scroll-wheel zoom sensitivity */
export const ZOOM_SENSITIVITY = 0.001;

/**
 * Rebase thresholds (multiples of the smaller screen dimension). Hysteresis:
 * we only enter a child once it is clearly bigger than the screen, and only
 * pop back out once the current frame no longer fills the screen.
 */
export const REBASE_IN_FACTOR = 1.3;
export const REBASE_OUT_FACTOR = 1.0;

/** Smallest note you can draw, in cells */
export const MIN_NOTE_CELLS = 1;

/** Notes smaller than this many screen px are not rendered (cull) */
export const MIN_RENDER_PX = 4;

/** Sticky-note yellow */
export const NOTE_COLOR = "#f5d33f";

/** Preset sticky-note swatches offered in the recolor menu */
export const NOTE_PALETTE = [
  "#f5d33f", // yellow
  "#7ed957", // green
  "#5aa9ff", // blue
  "#ff8fb1", // pink
  "#ffa94d", // orange
  "#c08bff", // purple
];

/**
 * Interior cells reserved at the top of every note for its title bar. Child
 * notes may not be placed in this band. As a fraction of the note's height
 * this is TITLE_BAR_CELLS / INTERIOR_SPAN.
 */
export const TITLE_BAR_CELLS = 2;

/** A note must be at least this wide on screen (px) to be interactive. */
export const MIN_INTERACT_PX = 70;

/** Translucent overlay used to darken the title bar on hover */
export const TITLE_HOVER_OVERLAY = "rgba(0, 0, 0, 0.14)";

/** Outline shown when a dragged note overlaps a sibling */
export const NOTE_INVALID_STROKE = "rgba(255, 80, 80, 0.95)";

/** Selection box colours (Windows-style light blue) */
export const SELECTION_FILL = "rgba(80, 160, 255, 0.18)";
export const SELECTION_STROKE = "rgba(120, 185, 255, 0.95)";
export const SELECTION_INVALID_STROKE = "rgba(255, 110, 110, 0.95)";
