// ---------------------------------------------------------------------------
// useNoteDrag — drag a note by its title bar
// ---------------------------------------------------------------------------
// Shift+click toggles the note in the selection. A regular click on an
// unselected note selects only it; a click on an already-selected note keeps
// the group. Drag then moves every selected note and text box together.
// The group follows the cursor smoothly. A red outline means the live
// position overlaps something; on release notes snap to cells, or revert
// if that snap would still be illegal.
// ---------------------------------------------------------------------------

import { useRef, useState } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { useUiStore } from "../store/uiStore";
import { cellPxFor } from "../lib/coordinates";
import {
  applyGroupTranslate,
  captureSelection,
  groupCount,
  groupHasCollision,
  groupIsValid,
  persistGroup,
  revertGroup,
  type GroupSnap,
} from "../lib/groupOps";
import type { Note } from "../types";

interface DragState {
  startX: number;
  startY: number;
  snap: GroupSnap;
  moved: boolean;
}

function fallbackSnap(note: Note): GroupSnap {
  return {
    notes: [
      {
        id: note.id,
        x: note.x,
        y: note.y,
        size: note.size,
        parentId: note.parentId,
      },
    ],
    widgets: [],
  };
}

export function useNoteDrag(note: Note) {
  const [invalid, setInvalid] = useState(false);
  const drag = useRef<DragState | null>(null);

  function markInvalid(bad: boolean) {
    setInvalid(bad);
    useUiStore.getState().setSelectionInvalid(bad);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();

    const ui = useUiStore.getState();
    if (e.shiftKey) {
      ui.selectNote(note.id, true);
      return;
    }
    if (!ui.selectedNoteIds.includes(note.id)) {
      ui.selectNote(note.id, false);
    }

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const captured = captureSelection();
    const snap = captured.notes.length > 0 ? captured : fallbackSnap(note);
    ui.setLiftedNotes(snap.notes.map((n) => n.id));
    setInvalid(false);
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      snap,
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const st = drag.current;
    if (!st) return;

    const cellPx = cellPxFor(useCanvasStore.getState().zoom);
    const dx = (e.clientX - st.startX) / cellPx;
    const dy = (e.clientY - st.startY) / cellPx;
    if (dx !== 0 || dy !== 0) st.moved = true;

    applyGroupTranslate(st.snap, dx, dy);
    markInvalid(groupHasCollision(st.snap));
  }

  function onPointerUp(e: React.PointerEvent) {
    const st = drag.current;
    if (!st) return;
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // capture already released
    }
    const ui = useUiStore.getState();
    ui.setLiftedNotes([]);
    setInvalid(false);

    if (!st.moved || groupCount(st.snap) === 0) {
      ui.setSelectionInvalid(false);
      if (!st.moved && groupCount(st.snap) > 1) {
        ui.selectNote(note.id, false);
      }
      return;
    }

    const bad = !groupIsValid(st.snap, true);
    if (bad) {
      revertGroup(st.snap);
      ui.setSelectionInvalid(false);
      return;
    }

    persistGroup(st.snap, true);
    ui.setSelectionInvalid(false);
  }

  return {
    invalid,
    dragHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
