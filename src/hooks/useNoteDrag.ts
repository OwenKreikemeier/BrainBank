// ---------------------------------------------------------------------------
// useNoteDrag — drag a note by its title bar
// ---------------------------------------------------------------------------
// Only used for notes that are direct children of the current frame, where the
// parent's cell size is exactly cellPxFor(zoom). Dragging updates the note's
// x/y (snapped to whole cells); its children follow for free because they are
// stored/rendered relative to the parent. Overlapping a sibling or crossing
// the parent's borders marks the drag invalid (red outline) and reverts the
// position on release.
// ---------------------------------------------------------------------------

import { useRef, useState } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { useNotesStore } from "../store/notesStore";
import { cellPxFor, squaresOverlap } from "../lib/coordinates";
import { INTERIOR_SPAN, TITLE_BAR_CELLS, type Note } from "../types";

interface DragState {
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  moved: boolean;
  invalid: boolean;
}

export function useNoteDrag(note: Note) {
  const [invalid, setInvalid] = useState(false);
  const drag = useRef<DragState | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: note.x,
      origY: note.y,
      moved: false,
      invalid: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const st = drag.current;
    if (!st) return;

    const { zoom } = useCanvasStore.getState();
    const cellPx = cellPxFor(zoom);
    const dxCells = Math.round((e.clientX - st.startX) / cellPx);
    const dyCells = Math.round((e.clientY - st.startY) / cellPx);

    const newX = st.origX + dxCells;
    const newY = st.origY + dyCells;
    if (dxCells !== 0 || dyCells !== 0) st.moved = true;

    const notes = useNotesStore.getState();
    const overlaps = notes
      .getChildren(note.parentId)
      .some(
        (sib) =>
          sib.id !== note.id &&
          squaresOverlap(
            { x: newX, y: newY, size: note.size },
            { x: sib.x, y: sib.y, size: sib.size }
          )
      );

    // Nested notes must stay inside their parent's borders (and out of the
    // parent's title band). Root-level notes can go anywhere.
    const outOfBounds =
      note.parentId !== null &&
      (newX < 0 ||
        newY < TITLE_BAR_CELLS ||
        newX + note.size > INTERIOR_SPAN ||
        newY + note.size > INTERIOR_SPAN);

    const isInvalid = overlaps || outOfBounds;
    st.invalid = isInvalid;
    setInvalid(isInvalid);
    notes.moveNote(note.id, newX, newY);
  }

  function onPointerUp(e: React.PointerEvent) {
    const st = drag.current;
    if (!st) return;
    drag.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    const notes = useNotesStore.getState();
    if (st.invalid) {
      notes.moveNote(note.id, st.origX, st.origY); // cancel + reset
      setInvalid(false);
    } else if (st.moved) {
      notes.persistNote(note.id);
    }
  }

  return {
    invalid,
    isDragging: drag.current !== null,
    dragHandlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}
