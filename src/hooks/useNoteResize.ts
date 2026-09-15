// ---------------------------------------------------------------------------
// useNoteResize — resize a note by dragging one of its corners
// ---------------------------------------------------------------------------
// The opposite corner stays fixed and the note stays a perfect square. Size
// follows the cursor smoothly. Overlapping a sibling (or leaving the parent)
// turns the outline red; on release the result snaps to whole cells, or
// reverts if that snap would still be illegal.
//
// Move / up listen on window so the gesture is not tied to the handle's
// pointer capture. Do not commit on unmount: NotesLayer can unmount this
// view mid-drag (cull, huge-rect swap, frame rebase) while the button is
// still down. pointerup / pointercancel on window finish the gesture.
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
  pointerId: number;
  onMove: (ev: PointerEvent) => void;
  onUp: (ev: PointerEvent) => void;
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
  const noteRef = useRef(note);
  noteRef.current = note;

  function markInvalid(bad: boolean) {
    setInvalid(bad);
    useUiStore.getState().setSelectionInvalid(bad);
  }

  function stopListening(st: ResizeState) {
    window.removeEventListener("pointermove", st.onMove);
    window.removeEventListener("pointerup", st.onUp);
    window.removeEventListener("pointercancel", st.onUp);
  }

  function applyLive(clientX: number, clientY: number, st: ResizeState) {
    const liveNote = noteRef.current;
    const { pan, zoom } = useCanvasStore.getState();
    const cursor = screenToCell(clientX, clientY, pan, zoom);

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

    markInvalid(!isValidNoteRect(live, liveNote.parentId, liveNote.id));
    useNotesStore.getState().resizeNote(liveNote.id, live.x, live.y, live.size);
  }

  function commit(st: ResizeState) {
    const liveNote = noteRef.current;
    const ui = useUiStore.getState();
    ui.setLiftedNotes([]);
    setInvalid(false);

    const notes = useNotesStore.getState();
    const live = notes.getNote(liveNote.id);
    if (!live) {
      ui.setSelectionInvalid(false);
      return;
    }

    const snapSize = Math.max(MIN_NOTE_CELLS, Math.round(live.size));
    const snap = rectFromCorner(st.corner, st.origX, st.origY, st.origSize, snapSize);
    const bad = !isValidNoteRect(snap, liveNote.parentId, liveNote.id);

    if (bad || !st.changed) {
      notes.resizeNote(liveNote.id, st.origX, st.origY, st.origSize);
      ui.setSelectionInvalid(false);
      return;
    }

    notes.resizeNote(liveNote.id, snap.x, snap.y, snap.size);
    notes.persistNote(liveNote.id);
    ui.setSelectionInvalid(false);
  }

  function onPointerDown(corner: Corner, e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const prev = resize.current;
    if (prev) {
      stopListening(prev);
      commit(prev);
      resize.current = null;
    }

    const ui = useUiStore.getState();
    const liveNote = noteRef.current;
    if (!ui.selectedNoteIds.includes(liveNote.id)) {
      ui.selectNote(liveNote.id, false);
    }
    ui.setLiftedNotes([liveNote.id]);
    setInvalid(false);

    const pointerId = e.pointerId;

    function onMove(ev: PointerEvent) {
      const st = resize.current;
      if (!st || ev.pointerId !== pointerId) return;
      applyLive(ev.clientX, ev.clientY, st);
    }

    function onUp(ev: PointerEvent) {
      const st = resize.current;
      if (!st || ev.pointerId !== pointerId) return;
      resize.current = null;
      stopListening(st);
      commit(st);
    }

    resize.current = {
      corner,
      origX: liveNote.x,
      origY: liveNote.y,
      origSize: liveNote.size,
      changed: false,
      pointerId,
      onMove,
      onUp,
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function handlersFor(corner: Corner) {
    return {
      onPointerDown: (e: React.PointerEvent) => onPointerDown(corner, e),
    };
  }

  return { invalid, handlersFor };
}
