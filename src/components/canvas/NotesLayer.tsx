// ---------------------------------------------------------------------------
// NotesLayer — renders all notes visible from the current viewpoint
// ---------------------------------------------------------------------------
// Two passes:
//   1. The current frame's children (and their subtrees), walked top-down with
//      culling: off-screen or sub-pixel notes are skipped along with their
//      entire subtree, so the rendered set stays tiny at any note count.
//   2. Surrounding context: siblings at every ancestor level (the notes NEXT
//      to the one you're inside), so neighbours stay visible when you zoom
//      deep near a note's edge instead of suddenly disappearing.
//
// Notes whose rect grows beyond HUGE_RECT_PX are drawn as a simple colour
// rectangle clamped to the viewport — browsers can't lay out astronomically
// large divs, and at that size the title bar is off-screen anyway.
//
// Frame math: `pan`/`zoom` describe the current frame's interior grid. A
// note's children live in its interior (INTERIOR_SPAN cells across its edge),
// so each level down divides the cell size by INTERIOR_SPAN; each level up
// multiplies it by INTERIOR_SPAN / parentNote.size.
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { useNotesStore } from "../../store/notesStore";
import { useUiStore } from "../../store/uiStore";
import {
  INTERIOR_SPAN,
  MIN_RENDER_PX,
  type Note,
  type ScreenRect,
} from "../../types";
import { cellPxFor } from "../../lib/coordinates";
import { NoteView } from "./NoteView";

/** Above this width a note is drawn as a clamped plain rectangle. */
const HUGE_RECT_PX = 16000;
const CLAMP_MARGIN_PX = 50;
const MAX_CONTEXT_LEVELS = 32;

interface VisibleNote {
  note: Note;
  rect: ScreenRect;
}

export function NotesLayer() {
  const pan = useCanvasStore((s) => s.pan);
  const zoom = useCanvasStore((s) => s.zoom);
  const frameId = useCanvasStore((s) => s.frameId);
  // Re-read the cache whenever notes change.
  const version = useNotesStore((s) => s.version);
  const liftedNoteIds = useUiStore((s) => s.liftedNoteIds);

  const visible = useMemo<VisibleNote[]>(() => {
    void version; // dependency only — traversal reads the live cache below
    const notes = useNotesStore.getState();
    const lifted = new Set(liftedNoteIds);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const out: VisibleNote[] = [];

    // Recurse: render `parentId`'s children given the interior origin +
    // cell px. `excludeId` skips the note whose interior we are already
    // rendering (its contents come from the main pass / an inner level).
    function visit(
      parentId: string | null,
      originX: number,
      originY: number,
      cellPx: number,
      excludeId?: string
    ) {
      for (const note of notes.getChildren(parentId)) {
        if (note.id === excludeId) continue;

        const rect: ScreenRect = {
          x: originX + note.x * cellPx,
          y: originY + note.y * cellPx,
          w: note.size * cellPx,
          h: note.size * cellPx,
        };

        // Keep a note that is being dragged/resized mounted even if it is
        // off-screen or sub-pixel — unmounting would abort the gesture.
        const keepMounted = lifted.has(note.id);

        // Cull: fully off-screen (the subtree is inside it, so skip it too)
        if (
          !keepMounted &&
          (rect.x + rect.w < 0 ||
            rect.y + rect.h < 0 ||
            rect.x > vw ||
            rect.y > vh)
        ) {
          continue;
        }

        // Cull: too small to see
        if (!keepMounted && rect.w < MIN_RENDER_PX) continue;

        out.push({ note, rect });

        // Only descend once children could plausibly be large enough to show.
        if (rect.w >= MIN_RENDER_PX * INTERIOR_SPAN) {
          visit(note.id, rect.x, rect.y, rect.w / INTERIOR_SPAN);
        }
      }
    }

    // Pass 1 — the current frame's own children.
    visit(frameId, pan.x, pan.y, cellPxFor(zoom));

    // Pass 2 — surrounding context. Walk up the ancestor chain; at each level
    // render the path note's siblings (and their subtrees). Stop once the path
    // note's rect fully covers the viewport (nothing outside it is visible).
    let pathId = frameId;
    let originX = pan.x;
    let originY = pan.y;
    let cellPx = cellPxFor(zoom);

    for (let level = 0; pathId !== null && level < MAX_CONTEXT_LEVELS; level++) {
      const pathNote = notes.getNote(pathId);
      if (!pathNote) break;

      const edge = INTERIOR_SPAN * cellPx;
      if (originX <= 0 && originY <= 0 && originX + edge >= vw && originY + edge >= vh) {
        break; // path note covers the whole screen — outer context is hidden
      }

      // Re-express the viewport in the parent's interior grid.
      const parentCellPx = edge / pathNote.size;
      originX -= pathNote.x * parentCellPx;
      originY -= pathNote.y * parentCellPx;
      cellPx = parentCellPx;

      visit(pathNote.parentId, originX, originY, cellPx, pathNote.id);
      pathId = pathNote.parentId;
    }

    return out;
  }, [pan, zoom, frameId, version, liftedNoteIds]);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      {visible.map(({ note, rect }) =>
        rect.w > HUGE_RECT_PX && !liftedNoteIds.includes(note.id) ? (
          <HugeNoteRect key={note.id} note={note} rect={rect} />
        ) : (
          <NoteView
            key={note.id}
            note={note}
            rect={rect}
            interactive={note.parentId === frameId}
          />
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HugeNoteRect — a note too large for normal DOM layout, clamped to the
// viewport and drawn as a plain colour block (sharp corners make this
// indistinguishable from the real thing).
// ---------------------------------------------------------------------------

function HugeNoteRect({ note, rect }: VisibleNote) {
  const left = Math.max(rect.x, -CLAMP_MARGIN_PX);
  const top = Math.max(rect.y, -CLAMP_MARGIN_PX);
  const right = Math.min(rect.x + rect.w, window.innerWidth + CLAMP_MARGIN_PX);
  const bottom = Math.min(rect.y + rect.h, window.innerHeight + CLAMP_MARGIN_PX);
  if (right <= left || bottom <= top) return null;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: right - left,
        height: bottom - top,
        background: note.color,
      }}
    />
  );
}
