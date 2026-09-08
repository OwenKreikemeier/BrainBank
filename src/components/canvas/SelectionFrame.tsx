// ---------------------------------------------------------------------------
// SelectionFrame — bounding box + scale handles for a multi-selection
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { useNotesStore } from "../../store/notesStore";
import { useWidgetsStore } from "../../store/widgetsStore";
import { useUiStore } from "../../store/uiStore";
import { cellPxFor, cellToScreen } from "../../lib/coordinates";
import { captureSelection, selectionAabb } from "../../lib/groupOps";
import { useGroupScale } from "../../hooks/useGroupScale";
import type { Corner } from "../../hooks/useNoteResize";
import { SELECTION_INVALID_STROKE, SELECTION_STROKE } from "../../types";

const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];
const HANDLE = 10;

export function SelectionFrame() {
  const selectedNoteIds = useUiStore((s) => s.selectedNoteIds);
  const selectedWidgetIds = useUiStore((s) => s.selectedWidgetIds);
  const invalid = useUiStore((s) => s.selectionInvalid);
  const pan = useCanvasStore((s) => s.pan);
  const zoom = useCanvasStore((s) => s.zoom);
  const notesVersion = useNotesStore((s) => s.version);
  const widgetsVersion = useWidgetsStore((s) => s.version);
  const { handlersFor } = useGroupScale();

  const box = useMemo(() => {
    void notesVersion;
    void widgetsVersion;
    void selectedNoteIds;
    void selectedWidgetIds;
    if (selectedNoteIds.length + selectedWidgetIds.length < 2) return null;
    const snap = captureSelection();
    const aabb = selectionAabb(snap);
    if (!aabb) return null;
    const topLeft = cellToScreen(aabb.x, aabb.y, pan, zoom);
    const cellPx = cellPxFor(zoom);
    return {
      x: topLeft.x,
      y: topLeft.y,
      w: aabb.width * cellPx,
      h: aabb.height * cellPx,
    };
  }, [
    pan,
    zoom,
    notesVersion,
    widgetsVersion,
    selectedNoteIds,
    selectedWidgetIds,
  ]);

  if (!box) return null;

  const stroke = invalid ? SELECTION_INVALID_STROKE : SELECTION_STROKE;

  return (
    <div
      data-selection-interactive=""
      style={{
        position: "fixed",
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        outline: `2px solid ${stroke}`,
        outlineOffset: 4,
        pointerEvents: "none",
        zIndex: 6,
      }}
    >
      {CORNERS.map((corner) => (
        <div
          key={corner}
          data-selection-interactive=""
          {...handlersFor(corner)}
          style={{
            position: "absolute",
            width: HANDLE,
            height: HANDLE,
            top: corner[0] === "n" ? -HANDLE / 2 - 4 : undefined,
            bottom: corner[0] === "s" ? -HANDLE / 2 - 4 : undefined,
            left: corner[1] === "w" ? -HANDLE / 2 - 4 : undefined,
            right: corner[1] === "e" ? -HANDLE / 2 - 4 : undefined,
            background: "white",
            border: `1px solid ${stroke}`,
            pointerEvents: "auto",
            cursor:
              corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
          }}
        />
      ))}
    </div>
  );
}
