// ---------------------------------------------------------------------------
// PlacementOverlay — the translucent square preview while drawing a note
// ---------------------------------------------------------------------------
// Reads the snapped placement rect (in current-frame cells) from the store and
// draws it in screen space as a Windows-style light-blue selection box. Turns
// red when the square is invalid (overlaps an existing sibling note).
// ---------------------------------------------------------------------------

import { useCanvasStore } from "../../store/canvasStore";
import {
  SELECTION_FILL,
  SELECTION_INVALID_STROKE,
  SELECTION_STROKE,
} from "../../types";
import { cellToScreen, cellPxFor } from "../../lib/coordinates";

export function PlacementOverlay() {
  const pan = useCanvasStore((s) => s.pan);
  const zoom = useCanvasStore((s) => s.zoom);
  const rect = useCanvasStore((s) => s.placementRect);
  const valid = useCanvasStore((s) => s.placementValid);

  if (!rect) return null;

  const topLeft = cellToScreen(rect.x, rect.y, pan, zoom);
  const sizePx = rect.size * cellPxFor(zoom);

  return (
    <div
      style={{
        position: "fixed",
        left: topLeft.x,
        top: topLeft.y,
        width: sizePx,
        height: sizePx,
        background: SELECTION_FILL,
        border: `1.5px solid ${valid ? SELECTION_STROKE : SELECTION_INVALID_STROKE}`,
        borderRadius: 2,
        pointerEvents: "none",
        zIndex: 3,
      }}
    />
  );
}
