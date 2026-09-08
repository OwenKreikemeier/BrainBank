// ---------------------------------------------------------------------------
// useWidgetInteract — move / resize / rotate a widget on the current note
// ---------------------------------------------------------------------------
// Shift+click toggles selection. Dragging the move handle with a multi-
// selection moves the whole group. Corner resize and rotate stay single-item.
// ---------------------------------------------------------------------------

import { useRef, useState } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { useWidgetsStore } from "../store/widgetsStore";
import { useUiStore } from "../store/uiStore";
import { cellPxFor } from "../lib/coordinates";
import { isValidWidgetGeom } from "../lib/noteValidity";
import {
  applyGroupTranslate,
  captureSelection,
  groupCount,
  groupHasCollision,
  groupIsValid,
  persistGroup,
  revertGroup,
  type GroupSnap,
} from "../lib/groupOps";
import {
  INTERIOR_SPAN,
  MIN_WIDGET_CELLS,
  TITLE_BAR_CELLS,
  type Widget,
} from "../types";

export type WidgetCorner = "nw" | "ne" | "sw" | "se";

function clampRect(x: number, y: number, width: number, height: number) {
  const w = Math.min(INTERIOR_SPAN, Math.max(MIN_WIDGET_CELLS, width));
  const h = Math.min(
    INTERIOR_SPAN - TITLE_BAR_CELLS,
    Math.max(MIN_WIDGET_CELLS, height)
  );
  const minY = TITLE_BAR_CELLS;
  const nx = Math.max(0, Math.min(x, INTERIOR_SPAN - w));
  const ny = Math.max(minY, Math.min(y, INTERIOR_SPAN - h));
  return { x: nx, y: ny, width: w, height: h };
}

function toLocalDelta(dx: number, dy: number, rotationDeg: number) {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    dx: dx * cos + dy * sin,
    dy: -dx * sin + dy * cos,
  };
}

function screenCenter(x: number, y: number, width: number, height: number) {
  const { pan, zoom } = useCanvasStore.getState();
  const cellPx = cellPxFor(zoom);
  return {
    cx: pan.x + (x + width / 2) * cellPx,
    cy: pan.y + (y + height / 2) * cellPx,
  };
}

function pointerAngle(
  clientX: number,
  clientY: number,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const { cx, cy } = screenCenter(x, y, width, height);
  return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
}

function normalizeDeg(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export function useWidgetInteract(widget: Widget) {
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origRot: number;
    startAngle: number;
    moved: boolean;
    corner: WidgetCorner | null;
    rotating: boolean;
    group: GroupSnap | null;
  } | null>(null);

  function applySolo(
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number
  ) {
    useUiStore
      .getState()
      .setSelectionInvalid(
        !isValidWidgetGeom({ x, y, width, height, rotation }, widget.noteId)
      );
    useWidgetsStore.getState().moveWidget(widget.id, x, y, width, height, rotation);
  }

  function begin(e: React.PointerEvent, corner: WidgetCorner | null, rotating: boolean) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const ui = useUiStore.getState();
    if (e.shiftKey) {
      ui.selectWidget(widget.id, true);
      return;
    }

    const already = ui.selectedWidgetIds.includes(widget.id);
    if (!already) {
      ui.selectWidget(widget.id, false);
    }

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const origRot = widget.rotation ?? 0;
    const group =
      !corner && !rotating ? captureSelection() : null;
    if (group && group.notes.length > 0) {
      ui.setLiftedNotes(group.notes.map((n) => n.id));
    }

    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: widget.x,
      origY: widget.y,
      origW: widget.width,
      origH: widget.height,
      origRot,
      startAngle: pointerAngle(
        e.clientX,
        e.clientY,
        widget.x,
        widget.y,
        widget.width,
        widget.height
      ),
      moved: false,
      corner,
      rotating,
      group: group && groupCount(group) > 1 ? group : null,
    };
    setDragging(true);
    ui.setSelectionInvalid(false);
  }

  function onPointerMove(e: React.PointerEvent) {
    const st = drag.current;
    if (!st) return;
    const cellPx = cellPxFor(useCanvasStore.getState().zoom);
    const dx = (e.clientX - st.startX) / cellPx;
    const dy = (e.clientY - st.startY) / cellPx;
    if (Math.abs(e.clientX - st.startX) + Math.abs(e.clientY - st.startY) > 4) {
      st.moved = true;
    }

    if (st.group) {
      applyGroupTranslate(st.group, dx, dy);
      useUiStore.getState().setSelectionInvalid(groupHasCollision(st.group));
      return;
    }

    if (st.rotating) {
      const angle = pointerAngle(
        e.clientX,
        e.clientY,
        st.origX,
        st.origY,
        st.origW,
        st.origH
      );
      applySolo(
        st.origX,
        st.origY,
        st.origW,
        st.origH,
        normalizeDeg(st.origRot + (angle - st.startAngle))
      );
      return;
    }

    if (st.corner) {
      const local = toLocalDelta(dx, dy, st.origRot);
      let x = st.origX;
      let y = st.origY;
      let w = st.origW;
      let h = st.origH;
      if (st.corner.includes("e")) w = st.origW + local.dx;
      if (st.corner.includes("w")) {
        w = st.origW - local.dx;
        x = st.origX + local.dx;
      }
      if (st.corner.includes("s")) h = st.origH + local.dy;
      if (st.corner.includes("n")) {
        h = st.origH - local.dy;
        y = st.origY + local.dy;
      }
      const next = clampRect(x, y, w, h);
      applySolo(next.x, next.y, next.width, next.height, st.origRot);
      return;
    }

    const next = clampRect(st.origX + dx, st.origY + dy, st.origW, st.origH);
    applySolo(next.x, next.y, next.width, next.height, st.origRot);
  }

  function onPointerUp(e: React.PointerEvent) {
    const st = drag.current;
    drag.current = null;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // capture already released
    }
    if (!st) return;

    const ui = useUiStore.getState();
    ui.setLiftedNotes([]);

    if (st.group) {
      if (!st.moved) {
        revertGroup(st.group);
        ui.setSelectionInvalid(false);
        return;
      }
      if (!groupIsValid(st.group, true)) {
        revertGroup(st.group);
        ui.setSelectionInvalid(false);
        return;
      }
      persistGroup(st.group, true);
      ui.setSelectionInvalid(false);
      return;
    }

    const widgets = useWidgetsStore.getState();
    const live = widgets.getWidget(widget.id);
    if (!live) return;

    const geom = {
      x: live.x,
      y: live.y,
      width: live.width,
      height: live.height,
      rotation: live.rotation ?? 0,
    };
    const bad = !isValidWidgetGeom(geom, widget.noteId);

    if (bad || !st.moved) {
      widgets.moveWidget(widget.id, st.origX, st.origY, st.origW, st.origH, st.origRot);
      ui.setSelectionInvalid(false);
      return;
    }

    widgets.persistWidget(widget.id);
    ui.setSelectionInvalid(false);
  }

  return {
    dragging,
    didMove: () => drag.current?.moved ?? false,
    bodyHandlers: {
      onPointerDown: (e: React.PointerEvent) => begin(e, null, false),
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
    handleHandlers: (corner: WidgetCorner) => ({
      onPointerDown: (e: React.PointerEvent) => begin(e, corner, false),
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    }),
    rotateHandlers: {
      onPointerDown: (e: React.PointerEvent) => begin(e, null, true),
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
