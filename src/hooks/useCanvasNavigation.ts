// ---------------------------------------------------------------------------
// useCanvasNavigation — pan, zoom, and placement event handling
// ---------------------------------------------------------------------------
// Attach to the viewport element ref. Two modes:
//
//   Normal mode    — drag pans, wheel zooms (zoom re-bases frames in the store)
//   Placement mode — drag draws a preview; release creates a note or text block
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
import { MIN_WIDGET_CELLS, ZOOM_SENSITIVITY } from "../types";
import { screenToCell, snapSquare, liveSquare, liveRect } from "../lib/coordinates";
import { isValidNoteRect, isValidWidgetGeom } from "../lib/noteValidity";

function isHudTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      "[data-hud], [data-note-interactive], [data-widget-interactive], [data-selection-interactive]"
    ) !== null
  );
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

      if (placementKind === "text") {
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
      if (!canvas().placementActive) {
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

        if (placementKind === "text") {
          const live = liveRect(anchorCell.current, current);
          if (placementValid && frameId) {
            const created = widgets().addWidget({
              noteId: frameId,
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
            notes().addNote({
              parentId: frameId,
              x: snapped.x,
              y: snapped.y,
              size: snapped.size,
            });
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

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
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
        if (
          target instanceof HTMLElement &&
          (target.tagName === "TEXTAREA" || target.tagName === "INPUT")
        ) {
          return;
        }
        const ids = ui().selectedWidgetIds;
        if (ids.length > 0) {
          for (const id of ids) widgets().deleteWidget(id);
          ui().clearSelection();
        }
      }
    }

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
      viewport.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [viewportRef]);
}
