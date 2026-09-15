// ---------------------------------------------------------------------------
// PlacementOverlay — translucent preview while drawing a note, text, or image
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
  const cellPx = cellPxFor(zoom);

  return (
    <div
      style={{
        position: "fixed",
        left: topLeft.x,
        top: topLeft.y,
        width: rect.width * cellPx,
        height: rect.height * cellPx,
        background: SELECTION_FILL,
        border: `1.5px solid ${valid ? SELECTION_STROKE : SELECTION_INVALID_STROKE}`,
        pointerEvents: "none",
        zIndex: 3,
      }}
    />
  );
}
