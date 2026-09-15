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
  BASE_CELL_PX,
  INTERIOR_SPAN,
  REBASE_IN_FACTOR,
  REBASE_OUT_FACTOR,
  ROOT_MIN_ZOOM,
  type Pan,
  type PlacementKind,
} from "../types";
import {
  cellPxFor,
  noteScreenRect,
  pointInRect,
  rebaseIn,
  rebaseOut,
} from "../lib/coordinates";
import { useNotesStore } from "./notesStore";
import { useUiStore } from "./uiStore";

/** Placement preview, expressed in current-frame cell units. */
export interface PlacementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasStore {
  /** Current frame note id, or null for the root world */
  frameId: string | null;
  pan: Pan;
  zoom: number;

  /** Placement mode (drawing a new note, text block, or image) */
  placementActive: boolean;
  placementKind: PlacementKind;
  placementRect: PlacementRect | null;
  placementValid: boolean;

  movePan: (dx: number, dy: number) => void;
  zoomAtPoint: (newZoom: number, focalX: number, focalY: number) => void;
  /** Re-evaluate which note the viewport is inside, using the cursor as focus. */
  settleAt: (focalX: number, focalY: number) => void;
  /**
   * Zoom into a direct child of the current frame and make it the new frame.
   * Nested grandchildren are ignored — only one layer at a time.
   */
  enterNote: (noteId: string) => void;
  /** Jump into any note (including nested) and make it the current frame. */
  jumpToNote: (noteId: string) => void;
  resetViewport: () => void;

  setPlacementActive: (active: boolean, kind?: PlacementKind) => void;
  setPlacementPreview: (rect: PlacementRect | null, valid: boolean) => void;
}

/**
 * Re-base the viewport as far in/out as the current zoom (and cursor) warrant.
 * Called after zoom and while the pointer moves, so hovering a large-enough
 * adjacent note switches into it without an extra zoom.
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
    if (entered) continue;

    // --- Adjacent note: hovering a sibling that's large enough -> switch to it
    if (frameId !== null) {
      const frameNote = notes.getNote(frameId);
      if (frameNote) {
        const parentView = rebaseOut(pan, zoom, frameNote);
        let switched = false;
        for (const sib of notes.getChildren(frameNote.parentId)) {
          if (sib.id === frameId) continue;
          const rect = noteScreenRect(sib, parentView.pan, parentView.zoom);
          if (
            rect.w >= REBASE_IN_FACTOR * minScreen &&
            pointInRect(focalX, focalY, rect)
          ) {
            const r = rebaseIn(parentView.pan, parentView.zoom, sib);
            pan = r.pan;
            zoom = r.zoom;
            frameId = sib.id;
            switched = true;
            break;
          }
        }
        if (switched) continue;
      }
    }

    break;
  }

  return { frameId, pan, zoom };
}

function clearUiForFrameChange() {
  const ui = useUiStore.getState();
  ui.clearSelection();
  ui.setLiftedNotes([]);
  ui.closeContextMenu();
  ui.setEditingNote(null);
  ui.setToolMenuOpen(false);
  ui.setSearchOpen(false);
}

/** Fit a note's interior to the screen the same way a zoom-in enter does. */
function interiorViewport(): { pan: Pan; zoom: number } {
  const minScreen = Math.min(window.innerWidth, window.innerHeight);
  const targetSize = REBASE_IN_FACTOR * minScreen;
  return {
    zoom: targetSize / INTERIOR_SPAN / BASE_CELL_PX,
    pan: {
      x: (window.innerWidth - targetSize) / 2,
      y: (window.innerHeight - targetSize) / 2,
    },
  };
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  frameId: null,
  pan: { x: 0, y: 0 },
  zoom: 1,

  placementActive: false,
  placementKind: "note",
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

  settleAt(focalX, focalY) {
    const { pan, zoom, frameId } = get();
    set(settleFrame(frameId, pan, zoom, focalX, focalY));
  },

  enterNote(noteId) {
    const note = useNotesStore.getState().getNote(noteId);
    const { frameId, pan, zoom } = get();
    if (!note || note.parentId !== frameId) return;

    const rect = noteScreenRect(note, pan, zoom);
    if (rect.w < 1) return;

    const minScreen = Math.min(window.innerWidth, window.innerHeight);
    const targetSize = REBASE_IN_FACTOR * minScreen;
    const scale = targetSize / rect.w;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const nextPan: Pan = {
      x: cx - scale * (cx - pan.x),
      y: cy - scale * (cy - pan.y),
    };
    const entered = rebaseIn(nextPan, zoom * scale, note);

    clearUiForFrameChange();

    set({
      frameId: note.id,
      pan: entered.pan,
      zoom: entered.zoom,
      placementActive: false,
      placementRect: null,
      placementValid: true,
    });
  },

  jumpToNote(noteId) {
    const note = useNotesStore.getState().getNote(noteId);
    if (!note) return;

    clearUiForFrameChange();
    const view = interiorViewport();
    set({
      frameId: note.id,
      pan: view.pan,
      zoom: view.zoom,
      placementActive: false,
      placementRect: null,
      placementValid: true,
    });
  },

  resetViewport() {
    set({ frameId: null, pan: { x: 0, y: 0 }, zoom: 1 });
  },

  setPlacementActive(active, kind = "note") {
    set({
      placementActive: active,
      placementKind: kind,
      placementRect: null,
      placementValid: true,
    });
  },

  setPlacementPreview(rect, valid) {
    set({ placementRect: rect, placementValid: valid });
  },
}));
