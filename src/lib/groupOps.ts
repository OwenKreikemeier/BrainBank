// ---------------------------------------------------------------------------
// Group move / scale for a multi-selection of notes and text widgets.
// All geometry is in the current frame's cell space. Overlap rules are the
// same as single-item edits; co-selected items are excluded from colliding
// with each other.
// ---------------------------------------------------------------------------

import { MIN_NOTE_CELLS, MIN_WIDGET_CELLS } from "../types";
import { rotatedAabb, type CellBox } from "./coordinates";
import { isValidNoteRect, isValidWidgetGeom } from "./noteValidity";
import { useNotesStore } from "../store/notesStore";
import { useWidgetsStore } from "../store/widgetsStore";
import { useUiStore } from "../store/uiStore";
import { useCanvasStore } from "../store/canvasStore";

export interface NoteSnap {
  id: string;
  x: number;
  y: number;
  size: number;
  parentId: string | null;
}

export interface WidgetSnap {
  id: string;
  noteId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface GroupSnap {
  notes: NoteSnap[];
  widgets: WidgetSnap[];
}

export function captureSelection(): GroupSnap {
  const ui = useUiStore.getState();
  const notes = useNotesStore.getState();
  const widgets = useWidgetsStore.getState();
  const frameId = useCanvasStore.getState().frameId;

  const noteSnaps: NoteSnap[] = [];
  for (const id of ui.selectedNoteIds) {
    const n = notes.getNote(id);
    if (!n || n.parentId !== frameId) continue;
    noteSnaps.push({
      id: n.id,
      x: n.x,
      y: n.y,
      size: n.size,
      parentId: n.parentId,
    });
  }

  const widgetSnaps: WidgetSnap[] = [];
  for (const id of ui.selectedWidgetIds) {
    const w = widgets.getWidget(id);
    if (!w || w.noteId !== frameId) continue;
    widgetSnaps.push({
      id: w.id,
      noteId: w.noteId,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      rotation: w.rotation ?? 0,
    });
  }

  return { notes: noteSnaps, widgets: widgetSnaps };
}

export function groupCount(snap: GroupSnap): number {
  return snap.notes.length + snap.widgets.length;
}

export function selectionAabb(snap: GroupSnap): CellBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of snap.notes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.size);
    maxY = Math.max(maxY, n.y + n.size);
  }
  for (const w of snap.widgets) {
    const box = rotatedAabb(w.x, w.y, w.width, w.height, w.rotation);
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function excludeIds(snap: GroupSnap) {
  return {
    notes: snap.notes.map((n) => n.id),
    widgets: snap.widgets.map((w) => w.id),
  };
}

export function applyGroupTranslate(snap: GroupSnap, dx: number, dy: number) {
  const notes = useNotesStore.getState();
  const widgets = useWidgetsStore.getState();
  for (const n of snap.notes) {
    notes.moveNote(n.id, n.x + dx, n.y + dy);
  }
  for (const w of snap.widgets) {
    widgets.moveWidget(w.id, w.x + dx, w.y + dy, w.width, w.height, w.rotation);
  }
}

export function applyGroupScale(
  snap: GroupSnap,
  originX: number,
  originY: number,
  scale: number
) {
  const notes = useNotesStore.getState();
  const widgets = useWidgetsStore.getState();
  const s = Math.max(0.05, scale);

  for (const n of snap.notes) {
    notes.resizeNote(
      n.id,
      originX + (n.x - originX) * s,
      originY + (n.y - originY) * s,
      n.size * s
    );
  }
  for (const w of snap.widgets) {
    widgets.moveWidget(
      w.id,
      originX + (w.x - originX) * s,
      originY + (w.y - originY) * s,
      w.width * s,
      w.height * s,
      w.rotation
    );
  }
}

export function minGroupScale(snap: GroupSnap): number {
  let min = 0.05;
  for (const n of snap.notes) {
    min = Math.max(min, MIN_NOTE_CELLS / Math.max(n.size, 0.01));
  }
  for (const w of snap.widgets) {
    min = Math.max(min, MIN_WIDGET_CELLS / Math.max(Math.min(w.width, w.height), 0.01));
  }
  return min;
}

/** True if the live (unsnapped) geometry currently overlaps something. */
export function groupHasCollision(snap: GroupSnap): boolean {
  return !groupIsValid(snap, false);
}

export function groupIsValid(snap: GroupSnap, snapNotes = false): boolean {
  const notes = useNotesStore.getState();
  const widgets = useWidgetsStore.getState();
  const exclude = excludeIds(snap);

  for (const n of snap.notes) {
    const live = notes.getNote(n.id);
    if (!live) return false;
    const square = snapNotes
      ? {
          x: Math.round(live.x),
          y: Math.round(live.y),
          size: Math.max(MIN_NOTE_CELLS, Math.round(live.size)),
        }
      : { x: live.x, y: live.y, size: live.size };
    if (!isValidNoteRect(square, live.parentId, exclude.notes, exclude.widgets)) {
      return false;
    }
  }

  for (const w of snap.widgets) {
    const live = widgets.getWidget(w.id);
    if (!live) return false;
    if (
      !isValidWidgetGeom(
        {
          x: live.x,
          y: live.y,
          width: live.width,
          height: live.height,
          rotation: live.rotation ?? 0,
        },
        live.noteId,
        exclude.notes
      )
    ) {
      return false;
    }
  }

  return true;
}

export function revertGroup(snap: GroupSnap) {
  const notes = useNotesStore.getState();
  const widgets = useWidgetsStore.getState();
  for (const n of snap.notes) {
    notes.resizeNote(n.id, n.x, n.y, n.size);
  }
  for (const w of snap.widgets) {
    widgets.moveWidget(w.id, w.x, w.y, w.width, w.height, w.rotation);
  }
}

export function persistGroup(snap: GroupSnap, snapNotes: boolean) {
  const notes = useNotesStore.getState();
  const widgets = useWidgetsStore.getState();

  if (snapNotes) {
    const exclude = excludeIds(snap);
    for (const n of snap.notes) {
      const live = notes.getNote(n.id);
      if (!live) continue;
      const rounded = {
        x: Math.round(live.x),
        y: Math.round(live.y),
        size: Math.max(MIN_NOTE_CELLS, Math.round(live.size)),
      };
      if (isValidNoteRect(rounded, live.parentId, exclude.notes, exclude.widgets)) {
        notes.resizeNote(n.id, rounded.x, rounded.y, rounded.size);
      } else if (
        !isValidNoteRect(
          { x: live.x, y: live.y, size: live.size },
          live.parentId,
          exclude.notes,
          exclude.widgets
        )
      ) {
        notes.resizeNote(n.id, n.x, n.y, n.size);
      }
    }
  }

  for (const n of snap.notes) notes.persistNote(n.id);
  for (const w of snap.widgets) widgets.persistWidget(w.id);
}

export function scaleFromCorner(
  corner: "nw" | "ne" | "sw" | "se",
  aabb: CellBox,
  cursorCx: number,
  cursorCy: number
): { originX: number; originY: number; scale: number } {
  const originX = corner[1] === "e" ? aabb.x : aabb.x + aabb.width;
  const originY = corner[0] === "s" ? aabb.y : aabb.y + aabb.height;
  const origDx = corner[1] === "e" ? aabb.width : -aabb.width;
  const origDy = corner[0] === "s" ? aabb.height : -aabb.height;
  const origDist = Math.hypot(origDx, origDy) || 1;
  const liveDist = Math.hypot(cursorCx - originX, cursorCy - originY);
  return { originX, originY, scale: liveDist / origDist };
}
