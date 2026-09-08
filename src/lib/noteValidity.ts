// ---------------------------------------------------------------------------
// Shared validity for placing / moving / resizing notes and widgets.
// ---------------------------------------------------------------------------

import { INTERIOR_SPAN, MIN_NOTE_CELLS, MIN_WIDGET_CELLS, TITLE_BAR_CELLS } from "../types";
import { boxesOverlap, rotatedAabb, squaresOverlap } from "./coordinates";
import { useNotesStore } from "../store/notesStore";
import { useWidgetsStore } from "../store/widgetsStore";

export interface CellRect {
  x: number;
  y: number;
  size: number;
}

export interface WidgetGeom {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export type IdExclude = string | string[] | ReadonlySet<string> | undefined;

function asSet(ids: IdExclude): Set<string> {
  if (!ids) return new Set();
  if (typeof ids === "string") return new Set([ids]);
  return new Set(ids);
}

function inNoteInterior(box: { x: number; y: number; width: number; height: number }): boolean {
  return (
    box.x >= 0 &&
    box.y >= TITLE_BAR_CELLS &&
    box.x + box.width <= INTERIOR_SPAN &&
    box.y + box.height <= INTERIOR_SPAN
  );
}

function widgetAabb(geom: WidgetGeom) {
  return rotatedAabb(geom.x, geom.y, geom.width, geom.height, geom.rotation);
}

/**
 * True if `square` is a legal position for a note whose parent is `parentId`.
 * `excludeNotes` are notes that should not collide with this one (self / co-selected).
 * `excludeWidgets` are text boxes that should not collide (co-selected).
 */
export function isValidNoteRect(
  square: CellRect,
  parentId: string | null,
  excludeNotes?: IdExclude,
  excludeWidgets?: IdExclude
): boolean {
  if (square.size < MIN_NOTE_CELLS - 1e-6) return false;

  if (parentId !== null) {
    if (
      square.x < 0 ||
      square.y < TITLE_BAR_CELLS ||
      square.x + square.size > INTERIOR_SPAN ||
      square.y + square.size > INTERIOR_SPAN
    ) {
      return false;
    }
  }

  const skipNotes = asSet(excludeNotes);
  const overlapsSibling = useNotesStore
    .getState()
    .getChildren(parentId)
    .some(
      (sib) =>
        !skipNotes.has(sib.id) &&
        squaresOverlap(square, { x: sib.x, y: sib.y, size: sib.size })
    );
  if (overlapsSibling) return false;

  if (parentId === null) return true;

  const skipWidgets = asSet(excludeWidgets);
  const noteBox = {
    x: square.x,
    y: square.y,
    width: square.size,
    height: square.size,
  };
  return !useWidgetsStore
    .getState()
    .getForNote(parentId)
    .some(
      (widget) =>
        !skipWidgets.has(widget.id) && boxesOverlap(noteBox, widgetAabb(widget))
    );
}

/**
 * True if a text block can sit on `noteId` without leaving the interior or
 * covering a child note. Widgets may overlap each other.
 * `excludeNotes` are child notes that should not collide (co-selected).
 */
export function isValidWidgetGeom(
  geom: WidgetGeom,
  noteId: string,
  excludeNotes?: IdExclude
): boolean {
  if (geom.width < MIN_WIDGET_CELLS || geom.height < MIN_WIDGET_CELLS) return false;

  const aabb = widgetAabb(geom);
  if (!inNoteInterior(aabb)) return false;

  const skipNotes = asSet(excludeNotes);
  return !useNotesStore
    .getState()
    .getChildren(noteId)
    .some(
      (child) =>
        !skipNotes.has(child.id) &&
        boxesOverlap(aabb, {
          x: child.x,
          y: child.y,
          width: child.size,
          height: child.size,
        })
    );
}
