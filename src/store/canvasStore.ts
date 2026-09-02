// ---------------------------------------------------------------------------
// canvasStore — viewport + frame state (Zustand)
// ---------------------------------------------------------------------------
// The viewport is always described RELATIVE to a "frame": the note you are
// currently inside, or the root world (frameId === null). `pan`/`zoom` map
// that frame's local grid to the screen.
//
// As you zoom, the store re-bases onto a child (zoom in) or back to the parent
// (zoom out) so `zoom` always stays in a small band — that is what makes
// zoom-in effectively infinite. Depth tracks how deep the current frame is:
// root === -1, root's children === 0, and so on.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import {
  INTERIOR_SPAN,
  REBASE_IN_FACTOR,
  REBASE_OUT_FACTOR,
  ROOT_MIN_ZOOM,
  type Pan,
} from "../types";
import {
  cellPxFor,
  noteScreenRect,
  pointInRect,
  rebaseIn,
  rebaseOut,
} from "../lib/coordinates";
import { useNotesStore } from "./notesStore";

/** Snapped placement square, expressed in current-frame cell units. */
export interface PlacementRect {
  x: number;
  y: number;
  size: number;
}

interface CanvasStore {
  /** Current frame note id, or null for the root world */
  frameId: string | null;
  pan: Pan;
  zoom: number;

  /** Placement mode (drawing a new note) */
  placementActive: boolean;
  placementRect: PlacementRect | null;
  placementValid: boolean;

  movePan: (dx: number, dy: number) => void;
  zoomAtPoint: (newZoom: number, focalX: number, focalY: number) => void;
  resetViewport: () => void;

  setPlacementActive: (active: boolean) => void;
  setPlacementPreview: (rect: PlacementRect | null, valid: boolean) => void;
}

/**
 * Re-base the viewport as far in/out as the current zoom warrants. Runs after
 * every zoom so deep/fast zooms settle onto the right frame in one pass.
 *
 * `focalX/focalY` is the point we are zooming toward (the cursor). We enter the
 * child that sits under that point, so zooming in on a note reliably enters it
 * regardless of where the note is relative to the screen centre.
 */
function settleFrame(
  frameId: string | null,
  pan: Pan,
  zoom: number,
  focalX: number,
  focalY: number
): { frameId: string | null; pan: Pan; zoom: number } {
  const minScreen = Math.min(window.innerWidth, window.innerHeight);
  const notes = useNotesStore.getState();

  let guard = 0;
  while (guard++ < 64) {
    // --- Zoom OUT: current frame no longer fills the screen -> pop to parent
    if (frameId !== null) {
      const interiorEdge = INTERIOR_SPAN * cellPxFor(zoom);
      if (interiorEdge <= REBASE_OUT_FACTOR * minScreen) {
        const frameNote = notes.getNote(frameId);
        if (frameNote) {
          const r = rebaseOut(pan, zoom, frameNote);
          pan = r.pan;
          zoom = r.zoom;
          frameId = frameNote.parentId;
          continue;
        }
      }
    }

    // --- Zoom IN: a child under the cursor now fills the screen -> enter it
    let entered = false;
    for (const child of notes.getChildren(frameId)) {
      const rect = noteScreenRect(child, pan, zoom);
      if (
        rect.w >= REBASE_IN_FACTOR * minScreen &&
        pointInRect(focalX, focalY, rect)
      ) {
        const r = rebaseIn(pan, zoom, child);
        pan = r.pan;
        zoom = r.zoom;
        frameId = child.id;
        entered = true;
        break;
      }
    }
    if (!entered) break;
  }

  return { frameId, pan, zoom };
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  frameId: null,
  pan: { x: 0, y: 0 },
  zoom: 1,

  placementActive: false,
  placementRect: null,
  placementValid: true,

  movePan(dx, dy) {
    set((s) => ({ pan: { x: s.pan.x + dx, y: s.pan.y + dy } }));
  },

  zoomAtPoint(newZoom, focalX, focalY) {
    const { pan, zoom, frameId } = get();

    // Only the root frame has a hard zoom-out floor.
    let target = newZoom;
    if (frameId === null) target = Math.max(ROOT_MIN_ZOOM, target);

    const scale = target / zoom;
    const nextPan: Pan = {
      x: focalX - scale * (focalX - pan.x),
      y: focalY - scale * (focalY - pan.y),
    };

    const settled = settleFrame(frameId, nextPan, target, focalX, focalY);
    set(settled);
  },

  resetViewport() {
    set({ frameId: null, pan: { x: 0, y: 0 }, zoom: 1 });
  },

  setPlacementActive(active) {
    set({
      placementActive: active,
      placementRect: null,
      placementValid: true,
    });
  },

  setPlacementPreview(rect, valid) {
    set({ placementRect: rect, placementValid: valid });
  },
}));
