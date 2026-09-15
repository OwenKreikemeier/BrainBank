// ---------------------------------------------------------------------------
// Shared selection chrome for text and image widgets: outline, move handle,
// corner resize, and rotate. Content is passed as children.
// ---------------------------------------------------------------------------

import type { PointerEvent, ReactNode } from "react";
import { NOTE_INVALID_STROKE, type ScreenRect, type Widget } from "../../types";
import { useUiStore } from "../../store/uiStore";
import { useWidgetInteract, type WidgetCorner } from "../../hooks/useWidgetInteract";

interface WidgetChromeProps {
  widget: Widget;
  rect: ScreenRect;
  interactive: boolean;
  cursor?: string;
  children: ReactNode;
}

const CORNERS: WidgetCorner[] = ["nw", "ne", "sw", "se"];
const HANDLE = 10;

export function WidgetChrome({
  widget,
  rect,
  interactive,
  cursor = "default",
  children,
}: WidgetChromeProps) {
  const selected = useUiStore((s) => s.selectedWidgetIds.includes(widget.id));
  const multi = useUiStore(
    (s) => s.selectedNoteIds.length + s.selectedWidgetIds.length > 1
  );
  const selectionInvalid = useUiStore((s) => s.selectionInvalid);
  const selectWidget = useUiStore((s) => s.selectWidget);
  const { dragging, bodyHandlers, handleHandlers, rotateHandlers } =
    useWidgetInteract(widget);
  const invalid = selectionInvalid && (selected || dragging);
  const rotation = widget.rotation ?? 0;

  function onSelectPointerDown(e: PointerEvent) {
    if (!interactive) return;
    e.stopPropagation();
    if (e.shiftKey) {
      e.preventDefault();
      selectWidget(widget.id, true);
      return;
    }
    selectWidget(widget.id, false);
  }

  return (
    <div
      data-widget-interactive={interactive ? "" : undefined}
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        pointerEvents: interactive ? "auto" : "none",
        outline: invalid
          ? `2px solid ${NOTE_INVALID_STROKE}`
          : selected && interactive
            ? "2px solid rgba(80,160,255,0.95)"
            : "none",
        outlineOffset: 1,
        background: selected ? "rgba(255,255,255,0.12)" : "transparent",
        zIndex: widget.zIndex ?? 0,
        cursor: interactive ? cursor : "default",
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
      }}
      onPointerDown={onSelectPointerDown}
    >
      {selected && interactive && (
        <div
          data-widget-interactive=""
          {...bodyHandlers}
          title="Drag to move"
          style={{
            position: "absolute",
            top: -14,
            left: 0,
            right: 0,
            height: 12,
            cursor: dragging ? "grabbing" : "grab",
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "rgba(80,160,255,0.95)",
              margin: "4px auto 0",
            }}
          />
        </div>
      )}

      {children}

      {selected &&
        interactive &&
        !multi &&
        CORNERS.map((corner) => (
          <div
            key={corner}
            data-widget-interactive=""
            {...handleHandlers(corner)}
            style={{
              position: "absolute",
              width: HANDLE,
              height: HANDLE,
              top: corner[0] === "n" ? -HANDLE / 2 : undefined,
              bottom: corner[0] === "s" ? -HANDLE / 2 : undefined,
              left: corner[1] === "w" ? -HANDLE / 2 : undefined,
              right: corner[1] === "e" ? -HANDLE / 2 : undefined,
              background: "white",
              border: "1px solid rgba(80,160,255,0.95)",
              cursor:
                corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
              zIndex: 2,
            }}
          />
        ))}

      {selected && interactive && !multi && (
        <div
          data-widget-interactive=""
          {...rotateHandlers}
          title="Drag to rotate"
          style={{
            position: "absolute",
            left: "50%",
            bottom: -28,
            width: 14,
            height: 28,
            marginLeft: -7,
            cursor: "grab",
            zIndex: 3,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              width: 1,
              height: 14,
              marginLeft: -0.5,
              background: "rgba(80,160,255,0.95)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              width: 12,
              height: 12,
              marginLeft: -6,
              borderRadius: "50%",
              background: "white",
              border: "2px solid rgba(80,160,255,0.95)",
            }}
          />
        </div>
      )}
    </div>
  );
}
