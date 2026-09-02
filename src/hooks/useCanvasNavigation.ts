// ---------------------------------------------------------------------------
// useCanvasNavigation — pan, zoom, and placement event handling
// ---------------------------------------------------------------------------
// Attach to the viewport element ref. Two modes:
//
//   Normal mode    — drag pans, wheel zooms (zoom re-bases frames in the store)
//   Placement mode — drag draws a snapped square preview; release creates a note
//
// Native listeners read live state via getState() so the handlers stay stable
// and never go stale. Pointer-downs that originate on the HUD are ignored, so
// HUD buttons (like reset) keep working instead of being hijacked for panning.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { useNotesStore } from "../store/notesStore";
import {
  INTERIOR_SPAN,
  MIN_NOTE_CELLS,
  TITLE_BAR_CELLS,
  ZOOM_SENSITIVITY,
} from "../types";
import { screenToCell, snapSquare, squaresOverlap } from "../lib/coordinates";

/**
 * Should the canvas ignore this pointer-down? True for HUD chrome and for
 * interactive note elements (title bars), so their own handlers fire instead
 * of the canvas starting a pan.
 */
function isHudTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("[data-hud], [data-note-interactive]") !== null
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

    const canvas = useCanvasStore.getState;
    const notes = useNotesStore.getState;

    // Compute the snapped square + validity for the current drag position.
    function updatePlacementPreview(clientX: number, clientY: number) {
      const { pan, zoom, frameId } = canvas();
      const current = screenToCell(clientX, clientY, pan, zoom);
      const square = snapSquare(anchorCell.current, current);

      // Inside a note, children must stay within the parent's borders and out
      // of the reserved top title band. The root world has no bounds.
      const inBounds =
        frameId === null ||
        (square.x >= 0 &&
          square.y >= TITLE_BAR_CELLS &&
          square.x + square.size <= INTERIOR_SPAN &&
          square.y + square.size <= INTERIOR_SPAN);

      const valid =
        square.size >= MIN_NOTE_CELLS &&
        inBounds &&
        !notes()
          .getChildren(frameId)
          .some((sibling) =>
            squaresOverlap(square, {
              x: sibling.x,
              y: sibling.y,
              size: sibling.size,
            })
          );

      canvas().setPlacementPreview(square, valid);
    }

    // -----------------------------------------------------------------------
    // Pointer down — start panning OR start drawing a note
    // -----------------------------------------------------------------------
    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      if (isHudTarget(e.target)) return; // let HUD buttons handle their click

      el!.setPointerCapture(e.pointerId);

      if (canvas().placementActive) {
        isPlacing.current = true;
        const { pan, zoom } = canvas();
        anchorCell.current = screenToCell(e.clientX, e.clientY, pan, zoom);
        updatePlacementPreview(e.clientX, e.clientY);
        return;
      }

      isPanning.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      el!.style.cursor = "grabbing";
    }

    // -----------------------------------------------------------------------
    // Pointer move — pan OR update the square preview
    // -----------------------------------------------------------------------
    function onPointerMove(e: PointerEvent) {
      if (isPlacing.current) {
        updatePlacementPreview(e.clientX, e.clientY);
        return;
      }
      if (!isPanning.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      canvas().movePan(dx, dy);
    }

    // -----------------------------------------------------------------------
    // Pointer up — finish panning OR commit the note
    // -----------------------------------------------------------------------
    function onPointerUp(e: PointerEvent) {
      el!.releasePointerCapture(e.pointerId);

      if (isPlacing.current) {
        isPlacing.current = false;
        const { placementRect, placementValid, frameId } = canvas();
        if (placementRect && placementValid) {
          notes().addNote({
            parentId: frameId,
            x: placementRect.x,
            y: placementRect.y,
            size: placementRect.size,
          });
        }
        canvas().setPlacementActive(false); // one note per activation
        return;
      }

      if (!isPanning.current) return;
      isPanning.current = false;
      el!.style.cursor = "grab";
    }

    // -----------------------------------------------------------------------
    // Wheel — zoom toward the cursor (the store handles frame rebasing)
    // -----------------------------------------------------------------------
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const { zoom } = canvas();
      const factor = 1 - e.deltaY * ZOOM_SENSITIVITY;
      canvas().zoomAtPoint(zoom * factor, e.clientX, e.clientY);
    }

    // -----------------------------------------------------------------------
    // Escape — cancel placement mode
    // -----------------------------------------------------------------------
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && canvas().placementActive) {
        canvas().setPlacementActive(false);
      }
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [viewportRef]);
}
