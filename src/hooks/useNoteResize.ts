// ---------------------------------------------------------------------------
// useNoteResize — resize a note by dragging one of its corners
// ---------------------------------------------------------------------------
// The opposite corner stays fixed and the note stays a perfect square. Size
// follows the cursor smoothly. Overlapping a sibling (or leaving the parent)
// turns the outline red; on release the result snaps to whole cells, or
// reverts if that snap would still be illegal.
// ---------------------------------------------------------------------------

import { useRef, useState } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { useNotesStore } from "../store/notesStore";
import { useUiStore } from "../store/uiStore";
import { screenToCell } from "../lib/coordinates";
import { isValidNoteRect } from "../lib/noteValidity";
import { MIN_NOTE_CELLS, type Note } from "../types";

/** Which corner is being dragged: [n|s][w|e] */
export type Corner = "nw" | "ne" | "sw" | "se";

interface ResizeState {
  corner: Corner;
  origX: number;
  origY: number;
  origSize: number;
  changed: boolean;
}

function rectFromCorner(
  corner: Corner,
  origX: number,
  origY: number,
  origSize: number,
  size: number
): { x: number; y: number; size: number } {
  return {
    x: corner[1] === "w" ? origX + origSize - size : origX,
    y: corner[0] === "n" ? origY + origSize - size : origY,
    size,
  };
}

export function useNoteResize(note: Note) {
  const [invalid, setInvalid] = useState(false);
  const resize = useRef<ResizeState | null>(null);

  function markInvalid(bad: boolean) {
    setInvalid(bad);
    useUiStore.getState().setSelectionInvalid(bad);
  }

  function onPointerDown(corner: Corner, e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const ui = useUiStore.getState();
    if (!ui.selectedNoteIds.includes(note.id)) {
      ui.selectNote(note.id, false);
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ui.setLiftedNotes([note.id]);
    setInvalid(false);
    resize.current = {
      corner,
      origX: note.x,
      origY: note.y,
      origSize: note.size,
      changed: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const st = resize.current;
    if (!st) return;

    const { pan, zoom } = useCanvasStore.getState();
    const cursor = screenToCell(e.clientX, e.clientY, pan, zoom);

    const spanX =
      st.corner[1] === "e"
        ? cursor.cx - st.origX
        : st.origX + st.origSize - cursor.cx;
    const spanY =
      st.corner[0] === "s"
        ? cursor.cy - st.origY
        : st.origY + st.origSize - cursor.cy;

    const liveSize = Math.max(0.05, Math.max(spanX, spanY));
    const live = rectFromCorner(st.corner, st.origX, st.origY, st.origSize, liveSize);

    if (live.x !== st.origX || live.y !== st.origY || live.size !== st.origSize) {
      st.changed = true;
    }

    markInvalid(!isValidNoteRect(live, note.parentId, note.id));
    useNotesStore.getState().resizeNote(note.id, live.x, live.y, live.size);
  }

  function onPointerUp(e: React.PointerEvent) {
    const st = resize.current;
    if (!st) return;
    resize.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    const ui = useUiStore.getState();
    ui.setLiftedNotes([]);
    setInvalid(false);

    const notes = useNotesStore.getState();
    const live = notes.getNote(note.id);
    if (!live) {
      ui.setSelectionInvalid(false);
      return;
    }

    const snapSize = Math.max(MIN_NOTE_CELLS, Math.round(live.size));
    const snap = rectFromCorner(st.corner, st.origX, st.origY, st.origSize, snapSize);
    const bad = !isValidNoteRect(snap, note.parentId, note.id);

    if (bad || !st.changed) {
      notes.resizeNote(note.id, st.origX, st.origY, st.origSize);
      ui.setSelectionInvalid(false);
      return;
    }

    notes.resizeNote(note.id, snap.x, snap.y, snap.size);
    notes.persistNote(note.id);
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

  return { invalid, handlersFor };
}
