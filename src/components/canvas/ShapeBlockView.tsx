// ---------------------------------------------------------------------------
// ShapeBlockView — a shape widget on a note
// ---------------------------------------------------------------------------
// Same selection / move / resize / rotate chrome as text and images. The
// shape stretches to the widget's box (no fixed aspect), can be flipped
// horizontally / vertically, and restyled from the shape toolbar.
// Double-click the shape to type a label, the same way a note title is renamed.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  BASE_CELL_PX,
  DEFAULT_SHAPE_FILL,
  DEFAULT_SHAPE_STROKE,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_FONT,
  DEFAULT_TEXT_FONT_SIZE,
  type ScreenRect,
  type Widget,
} from "../../types";
import { useUiStore } from "../../store/uiStore";
import { useWidgetsStore } from "../../store/widgetsStore";
import { fitSingleLineFont } from "../../lib/fitTextFont";
import { WidgetChrome } from "./WidgetChrome";
import { ShapeSvg } from "./ShapeSvg";

interface ShapeBlockViewProps {
  widget: Widget;
  rect: ScreenRect;
  cellPx: number;
  interactive: boolean;
}

export function ShapeBlockView({
  widget,
  rect,
  cellPx,
  interactive,
}: ShapeBlockViewProps) {
  const editing = useUiStore((s) => s.editingWidgetId === widget.id);
  const setEditingWidget = useUiStore((s) => s.setEditingWidget);
  const setSelectedWidget = useUiStore((s) => s.setSelectedWidget);
  const strokePx = Math.max(
    0,
    (widget.strokeWidth ?? 0) * (cellPx / BASE_CELL_PX)
  );
  const fontFamily = widget.fontFamily || DEFAULT_TEXT_FONT;
  const color = widget.color || DEFAULT_TEXT_COLOR;
  const targetPx = Math.max(
    1,
    (widget.fontSize || DEFAULT_TEXT_FONT_SIZE) * (cellPx / BASE_CELL_PX)
  );
  const padX = Math.max(4, rect.w * 0.12);
  const label = widget.content ?? "";
  const fitted = label.trim()
    ? fitSingleLineFont({
        content: label,
        targetPx,
        widthPx: Math.max(0, rect.w - padX * 2),
        fontFamily,
      })
    : { px: targetPx, visible: false };

  function beginEdit(e: MouseEvent) {
    if (!interactive) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedWidget(widget.id);
    setEditingWidget(widget.id);
  }

  return (
    <WidgetChrome widget={widget} rect={rect} interactive={interactive && !editing}>
      <ShapeSvg
        kind={widget.shape}
        fill={widget.fill ?? DEFAULT_SHAPE_FILL}
        stroke={widget.stroke ?? DEFAULT_SHAPE_STROKE}
        strokeWidth={strokePx}
        flipH={widget.flipH}
        flipV={widget.flipV}
      />
      <div
        onPointerDown={(e) => {
          if (editing) e.stopPropagation();
        }}
        onDoubleClick={beginEdit}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `0 ${padX}px`,
          pointerEvents: interactive ? "auto" : "none",
          overflow: "hidden",
        }}
      >
        {editing ? (
          <ShapeLabelEditor widget={widget} fontSize={targetPx} color={color} fontFamily={fontFamily} />
        ) : (
          fitted.visible &&
          label.trim() !== "" && (
            <span
              style={{
                maxWidth: "100%",
                fontFamily,
                fontSize: fitted.px,
                fontWeight: 600,
                lineHeight: 1.15,
                color,
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {label}
            </span>
          )
        )}
      </div>
    </WidgetChrome>
  );
}

function ShapeLabelEditor({
  widget,
  fontSize,
  fontFamily,
  color,
}: {
  widget: Widget;
  fontSize: number;
  fontFamily: string;
  color: string;
}) {
  const [value, setValue] = useState(widget.content ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const readyRef = useRef(false);
  const updateWidget = useWidgetsStore((s) => s.updateWidget);
  const setEditingWidget = useUiStore((s) => s.setEditingWidget);

  function placeCaretAtEnd() {
    const el = inputRef.current;
    if (!el) return;
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      placeCaretAtEnd();
      readyRef.current = true;
    });
    function onUp() {
      placeCaretAtEnd();
      window.removeEventListener("pointerup", onUp, true);
    }
    window.addEventListener("pointerup", onUp, true);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("pointerup", onUp, true);
    };
  }, []);

  function commit() {
    updateWidget(widget.id, { content: value.trim(), align: "center" });
    setEditingWidget(null);
  }

  return (
    <input
      ref={inputRef}
      data-widget-interactive=""
      aria-label="Shape text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={() => {
        if (!readyRef.current) {
          inputRef.current?.focus();
          return;
        }
        commit();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setEditingWidget(null);
        }
      }}
      style={{
        width: "100%",
        textAlign: "center",
        fontSize,
        fontFamily,
        fontWeight: 600,
        color,
        caretColor: color,
        background: "transparent",
        border: "none",
        outline: "none",
        boxShadow: "none",
        padding: 0,
        margin: 0,
        lineHeight: 1.15,
        appearance: "none",
        WebkitAppearance: "none",
      }}
    />
  );
}
