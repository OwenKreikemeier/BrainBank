// ---------------------------------------------------------------------------
// useCanvasNavigation — pan, zoom, and placement event handling
// ---------------------------------------------------------------------------
// Attach to the viewport element ref. Two modes:
//
//   Normal mode    — drag pans, wheel zooms (zoom re-bases frames in the store)
//   Placement mode — drag draws a preview; release creates a note, text, or image
//
// Native listeners read live state via getState() so the handlers stay stable
// and never go stale. Pointer-downs that originate on the HUD or a widget are
// ignored, so those elements keep working instead of being hijacked for panning.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { useNotesStore } from "../store/notesStore";
import { useWidgetsStore } from "../store/widgetsStore";
import { useUiStore } from "../store/uiStore";
import { MIN_WIDGET_CELLS, ZOOM_SENSITIVITY, isWidgetPlacement } from "../types";
import { screenToCell, snapSquare, liveSquare, liveRect, noteScreenRect, pointInRect } from "../lib/coordinates";
import { isValidNoteRect, isValidWidgetGeom } from "../lib/noteValidity";
import {
  beginPastePlacement,
  copyNote,
  noteIdForCopy,
  pasteNoteClipboard,
} from "../lib/noteClipboard";

function isHudTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      "[data-hud], [data-note-interactive], [data-widget-interactive], [data-selection-interactive]"
    ) !== null
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return true;
  return target.isContentEditable;
}

export function useCanvasNavigation(
  viewportRef: React.RefObject<HTMLElement | null>
) {
  const isPanning = useRef(false);
  const isPlacing = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const anchorCell = useRef({ cx: 0, cy: 0 });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const viewport = el;

    const canvas = useCanvasStore.getState;
    const notes = useNotesStore.getState;
    const widgets = useWidgetsStore.getState;
    const ui = useUiStore.getState;

    function updatePlacementPreview(clientX: number, clientY: number) {
      const { pan, zoom, frameId, placementKind } = canvas();
      const current = screenToCell(clientX, clientY, pan, zoom);

      if (isWidgetPlacement(placementKind)) {
        const live = liveRect(anchorCell.current, current);
        const valid =
          frameId !== null &&
          live.width >= MIN_WIDGET_CELLS &&
          live.height >= MIN_WIDGET_CELLS &&
          isValidWidgetGeom({ ...live, rotation: 0 }, frameId);
        canvas().setPlacementPreview(live, valid);
        return;
      }

      const live = liveSquare(anchorCell.current, current);
      const snapped = snapSquare(anchorCell.current, current);
      const valid = isValidNoteRect(snapped, frameId);

      canvas().setPlacementPreview(
        { x: live.x, y: live.y, width: live.size, height: live.size },
        valid
      );
    }

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      if (isHudTarget(e.target)) return;

      viewport.setPointerCapture(e.pointerId);

      if (canvas().placementActive) {
        isPlacing.current = true;
        const { pan, zoom } = canvas();
        anchorCell.current = screenToCell(e.clientX, e.clientY, pan, zoom);
        updatePlacementPreview(e.clientX, e.clientY);
        return;
      }

      ui().clearSelection();

      isPanning.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      viewport.style.cursor = "grabbing";
    }

    function onPointerMove(e: PointerEvent) {
      if (isPlacing.current) {
        updatePlacementPreview(e.clientX, e.clientY);
        return;
      }
      if (isPanning.current) {
        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        lastPointer.current = { x: e.clientX, y: e.clientY };
        canvas().movePan(dx, dy);
      }
      // Rebase only when nothing is being dragged/resized. Otherwise the
      // cursor leaving a shrinking note can switch frames and unmount it.
      if (
        !canvas().placementActive &&
        ui().liftedNoteIds.length === 0
      ) {
        canvas().settleAt(e.clientX, e.clientY);
        ui().pruneSelection(canvas().frameId);
      }
    }

    function onPointerUp(e: PointerEvent) {
      viewport.releasePointerCapture(e.pointerId);

      if (isPlacing.current) {
        isPlacing.current = false;
        const { pan, zoom, frameId, placementKind, placementValid } = canvas();
        const current = screenToCell(e.clientX, e.clientY, pan, zoom);

        if (isWidgetPlacement(placementKind)) {
          const live = liveRect(anchorCell.current, current);
          if (placementValid && frameId) {
            const created = widgets().addWidget({
              noteId: frameId,
              type: placementKind === "image" ? "image" : "text",
              x: live.x,
              y: live.y,
              width: live.width,
              height: live.height,
            });
            ui().setSelectedWidget(created.id);
          }
        } else {
          const snapped = snapSquare(anchorCell.current, current);
          if (placementValid) {
            if (placementKind === "paste") {
              const clip = ui().noteClipboard;
              if (clip) {
                const created = pasteNoteClipboard(
                  clip,
                  frameId,
                  snapped.x,
                  snapped.y,
                  snapped.size
                );
                if (created) ui().selectNote(created.id, false);
              }
            } else {
              notes().addNote({
                parentId: frameId,
                x: snapped.x,
                y: snapped.y,
                size: snapped.size,
              });
            }
          }
        }

        canvas().setPlacementActive(false);
        return;
      }

      if (!isPanning.current) return;
      isPanning.current = false;
      viewport.style.cursor = "grab";
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const { zoom } = canvas();
      const factor = 1 - e.deltaY * ZOOM_SENSITIVITY;
      canvas().zoomAtPoint(zoom * factor, e.clientX, e.clientY);
    }

    function onDoubleClick(e: MouseEvent) {
      if (e.button !== 0) return;
      if (isHudTarget(e.target)) return;
      if (canvas().placementActive) return;
      if (ui().editingNoteId || ui().settingsOpen || ui().confirmDelete) return;

      const { pan, zoom, frameId } = canvas();
      for (const child of notes().getChildren(frameId)) {
        const rect = noteScreenRect(child, pan, zoom);
        if (pointInRect(e.clientX, e.clientY, rect)) {
          e.preventDefault();
          canvas().enterNote(child.id);
          return;
        }
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (ui().searchOpen) {
          ui().setSearchOpen(false);
          return;
        }
        if (canvas().placementActive) {
          canvas().setPlacementActive(false);
          return;
        }
        if (ui().toolMenuOpen) {
          ui().setToolMenuOpen(false);
          return;
        }
        if (
          ui().selectedWidgetId ||
          ui().selectedNoteIds.length > 0 ||
          ui().selectedWidgetIds.length > 0
        ) {
          ui().clearSelection();
        }
        return;
      }

      if (e.key === "Delete") {
        const target = e.target;
        if (isEditableTarget(target)) {
          return;
        }
        const ids = ui().selectedWidgetIds;
        if (ids.length > 0) {
          for (const id of ids) widgets().deleteWidget(id);
          ui().clearSelection();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        if (isEditableTarget(e.target)) return;
        if (ui().settingsOpen || ui().confirmDelete) return;
        const key = e.key.toLowerCase();
        if (key === "c") {
          const noteId = noteIdForCopy();
          if (!noteId) return;
          e.preventDefault();
          copyNote(noteId);
          return;
        }
        if (key === "v") {
          if (!ui().noteClipboard) return;
          e.preventDefault();
          beginPastePlacement();
          return;
        }
      }

      if (e.key === "[" || e.key === "]") {
        if (isEditableTarget(e.target)) {
          return;
        }
        if (ui().selectedNoteIds.length + ui().selectedWidgetIds.length !== 1) {
          return;
        }
        const id = ui().selectedWidgetIds[0];
        if (!id) return;
        e.preventDefault();
        if (e.key === "[") {
          widgets().moveWidgetLayer(id, e.shiftKey ? "back" : "backward");
        } else {
          widgets().moveWidgetLayer(id, e.shiftKey ? "front" : "forward");
        }
      }
    }

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("dblclick", onDoubleClick);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [viewportRef]);
}
