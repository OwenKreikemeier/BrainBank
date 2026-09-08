// ---------------------------------------------------------------------------
// useGroupScale — uniform scale of the current multi-selection
// ---------------------------------------------------------------------------
// Dragging a corner of the selection frame scales every selected note and
// text box about the opposite corner. Notes stay square; overlap rules apply.
// ---------------------------------------------------------------------------

import { useRef } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { useUiStore } from "../store/uiStore";
import { screenToCell } from "../lib/coordinates";
import {
  applyGroupScale,
  captureSelection,
  groupHasCollision,
  groupIsValid,
  minGroupScale,
  persistGroup,
  revertGroup,
  scaleFromCorner,
  selectionAabb,
  type GroupSnap,
} from "../lib/groupOps";
import type { Corner } from "./useNoteResize";

interface ScaleState {
  corner: Corner;
  snap: GroupSnap;
  changed: boolean;
}

export function useGroupScale() {
  const scale = useRef<ScaleState | null>(null);

  function onPointerDown(corner: Corner, e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const snap = captureSelection();
    useUiStore.getState().setLiftedNotes(snap.notes.map((n) => n.id));
    scale.current = { corner, snap, changed: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const st = scale.current;
    if (!st) return;
    const aabb = selectionAabb(st.snap);
    if (!aabb || aabb.width < 0.01 || aabb.height < 0.01) return;

    const { pan, zoom } = useCanvasStore.getState();
    const cursor = screenToCell(e.clientX, e.clientY, pan, zoom);
    const { originX, originY, scale: raw } = scaleFromCorner(
      st.corner,
      aabb,
      cursor.cx,
      cursor.cy
    );
    const next = Math.max(minGroupScale(st.snap), raw);
    if (Math.abs(next - 1) > 0.001) st.changed = true;

    applyGroupScale(st.snap, originX, originY, next);
    useUiStore.getState().setSelectionInvalid(groupHasCollision(st.snap));
  }

  function onPointerUp(e: React.PointerEvent) {
    const st = scale.current;
    if (!st) return;
    scale.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    const ui = useUiStore.getState();
    ui.setLiftedNotes([]);

    if (!st.changed || !groupIsValid(st.snap, true)) {
      revertGroup(st.snap);
      ui.setSelectionInvalid(false);
      return;
    }

    persistGroup(st.snap, true);
    ui.setSelectionInvalid(false);
  }

  function handlersFor(corner: Corner) {
    return {
      onPointerDown: (e: React.PointerEvent) => onPointerDown(corner, e),
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    };
  }

  return { handlersFor };
}
