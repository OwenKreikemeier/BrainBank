// ---------------------------------------------------------------------------
// useNoteResize — resize a note by dragging one of its corners
// ---------------------------------------------------------------------------
// Only used for notes that are direct children of the current frame (same
// condition as title-bar dragging). The corner opposite the one being dragged
// stays fixed; the note stays a perfect square, snapped to whole cells.
//
// Validity follows the same rules as placing/moving:
//   • may not overlap a sibling note
//   • nested notes must stay within the parent's borders and below its title band
//   • never smaller than MIN_NOTE_CELLS
// While invalid the note shows a red outline; releasing then reverts the
// original rect. Children scale with the parent automatically (their positions
// are relative to the parent's interior), so they can never stick out.
// ---------------------------------------------------------------------------

import { useRef, useState } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { useNotesStore } from "../store/notesStore";
import { screenToCell, squaresOverlap } from "../lib/coordinates";
import {
  INTERIOR_SPAN,
  MIN_NOTE_CELLS,
  TITLE_BAR_CELLS,
  type Note,
} from "../types";

/** Which corner is being dragged: [n|s][w|e] */
export type Corner = "nw" | "ne" | "sw" | "se";

interface ResizeState {
  corner: Corner;
  origX: number;
  origY: number;
  origSize: number;
  changed: boolean;
  invalid: boolean;
}

export function useNoteResize(note: Note) {
  const [invalid, setInvalid] = useState(false);
  const resize = useRef<ResizeState | null>(null);

  function onPointerDown(corner: Corner, e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resize.current = {
      corner,
      origX: note.x,
      origY: note.y,
      origSize: note.size,
      changed: false,
      invalid: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const st = resize.current;
    if (!st) return;

    const { pan, zoom } = useCanvasStore.getState();
    const cursor = screenToCell(e.clientX, e.clientY, pan, zoom);

    // Distance from the FIXED (opposite) corner to the cursor, per axis.
    const spanX =
      st.corner[1] === "e"
        ? cursor.cx - st.origX
        : st.origX + st.origSize - cursor.cx;
    const spanY =
      st.corner[0] === "s"
        ? cursor.cy - st.origY
        : st.origY + st.origSize - cursor.cy;

    // Perfect square, snapped to whole cells, never below the minimum.
    const size = Math.max(MIN_NOTE_CELLS, Math.round(Math.max(spanX, spanY)));

    // Keep the opposite corner fixed.
    const x = st.corner[1] === "w" ? st.origX + st.origSize - size : st.origX;
    const y = st.corner[0] === "n" ? st.origY + st.origSize - size : st.origY;

    if (x !== st.origX || y !== st.origY || size !== st.origSize) {
      st.changed = true;
    }

    const notes = useNotesStore.getState();
    const overlaps = notes
      .getChildren(note.parentId)
      .some(
        (sib) =>
          sib.id !== note.id &&
          squaresOverlap({ x, y, size }, { x: sib.x, y: sib.y, size: sib.size })
      );

    const outOfBounds =
      note.parentId !== null &&
      (x < 0 ||
        y < TITLE_BAR_CELLS ||
        x + size > INTERIOR_SPAN ||
        y + size > INTERIOR_SPAN);

    const isInvalid = overlaps || outOfBounds;
    st.invalid = isInvalid;
    setInvalid(isInvalid);
    notes.resizeNote(note.id, x, y, size);
  }

  function onPointerUp(e: React.PointerEvent) {
    const st = resize.current;
    if (!st) return;
    resize.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    const notes = useNotesStore.getState();
    if (st.invalid) {
      notes.resizeNote(note.id, st.origX, st.origY, st.origSize); // revert
      setInvalid(false);
    } else if (st.changed) {
      notes.persistNote(note.id);
    }
  }

  /** Pointer handlers for one corner handle. */
  function handlersFor(corner: Corner) {
    return {
      onPointerDown: (e: React.PointerEvent) => onPointerDown(corner, e),
      onPointerMove,
      onPointerUp,
    };
  }

  return { invalid, handlersFor };
}
