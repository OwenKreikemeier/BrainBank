// ---------------------------------------------------------------------------
// FrameBorder — bounded backdrops for the current note and all its ancestors
// ---------------------------------------------------------------------------
// When the viewport is inside a note, this renders one coloured rectangle per
// ancestor on the path to the root (outermost first, innermost painted last),
// each with a border. So zooming deep inside a yellow child of a green parent
// shows: dark canvas → green parent rect → yellow child rect, with visible
// edges at every level — nothing ever "turns black" or loses its border.
//
// Every rect is clamped to the viewport (with a margin larger than the border
// width) so divs never get astronomically large at deep zoom; clamped edges
// sit off-screen so their border simply isn't visible. The upward walk stops
// as soon as a rect fully covers the viewport, since anything further out
// would be invisible behind it.
// ---------------------------------------------------------------------------

import { useCanvasStore } from "../../store/canvasStore";
import { useNotesStore } from "../../store/notesStore";
import { INTERIOR_SPAN } from "../../types";
import { cellPxFor } from "../../lib/coordinates";

const CLAMP_MARGIN_PX = 100;
const MAX_LEVELS = 32;

interface BackdropLayer {
  id: string;
  color: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export function FrameBorder() {
  const pan = useCanvasStore((s) => s.pan);
  const zoom = useCanvasStore((s) => s.zoom);
  const frameId = useCanvasStore((s) => s.frameId);
  // Re-render when notes mutate (e.g. an ancestor is recoloured).
  const version = useNotesStore((s) => s.version);
  void version;

  if (!frameId) return null;
  const notes = useNotesStore.getState();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Walk up from the current note to the root, collecting a clamped rect per
  // level. At each step (origin, cellPx) describe that note's interior grid;
  // its own rect is INTERIOR_SPAN cells square at the origin.
  const layers: BackdropLayer[] = [];
  let id: string | null = frameId;
  let originX = pan.x;
  let originY = pan.y;
  let cellPx = cellPxFor(zoom);

  for (let level = 0; id !== null && level < MAX_LEVELS; level++) {
    const note = notes.getNote(id);
    if (!note) break;

    const edge = INTERIOR_SPAN * cellPx;
    const left = Math.max(originX, -CLAMP_MARGIN_PX);
    const top = Math.max(originY, -CLAMP_MARGIN_PX);
    const right = Math.min(originX + edge, vw + CLAMP_MARGIN_PX);
    const bottom = Math.min(originY + edge, vh + CLAMP_MARGIN_PX);
    if (right > left && bottom > top) {
      layers.push({
        id: note.id,
        color: note.color,
        left,
        top,
        width: right - left,
        height: bottom - top,
      });
    }

    // This rect fully covers the viewport — outer levels would be hidden.
    if (originX <= 0 && originY <= 0 && originX + edge >= vw && originY + edge >= vh) {
      break;
    }

    // Re-express the viewport in the parent's interior grid.
    const parentCellPx = edge / note.size;
    originX -= note.x * parentCellPx;
    originY -= note.y * parentCellPx;
    cellPx = parentCellPx;
    id = note.parentId;
  }

  // Outermost first so inner levels paint on top.
  return (
    <>
      {layers.reverse().map((layer) => (
        <div
          key={layer.id}
          style={{
            position: "fixed",
            left: layer.left,
            top: layer.top,
            width: layer.width,
            height: layer.height,
            background: layer.color,
            border: "3px solid rgba(0,0,0,0.6)",
            boxSizing: "border-box",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      ))}
    </>
  );
}
