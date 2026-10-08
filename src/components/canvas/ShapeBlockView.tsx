// ---------------------------------------------------------------------------
// ShapeBlockView — a shape widget on a note
// ---------------------------------------------------------------------------
// Same selection / move / resize / rotate chrome as text and images. The
// shape stretches to the widget's box (no fixed aspect), can be flipped
// horizontally / vertically, and restyled from the shape toolbar.
// Double-click the shape to type a label, the same way a note title is renamed.
// ---------------------------------------------------------------------------

import { type MouseEvent } from "react";
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
import { contentToHtml, isRichContent, plainText } from "../../lib/richText";
import { WidgetChrome } from "./WidgetChrome";
import { ShapeSvg } from "./ShapeSvg";
import { RichTextEditor } from "./RichTextEditor";

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
          plainText(label).trim() !== "" && (
            <span
              className="bb-rich"
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
              dangerouslySetInnerHTML={{ __html: contentToHtml(label) }}
            />
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
  const updateWidget = useWidgetsStore((s) => s.updateWidget);
  const setEditingWidget = useUiStore((s) => s.setEditingWidget);

  function commit(value: string) {
    const next = isRichContent(value) ? value : value.trim();
    updateWidget(widget.id, { content: next, align: "center" });
    setEditingWidget(null);
  }

  return (
    <RichTextEditor
      widgetId={widget.id}
      content={widget.content ?? ""}
      editable
      singleLine
      autoFocus
      caretAtEnd
      onCommit={commit}
      onCancel={() => setEditingWidget(null)}
      style={{
        textAlign: "center",
        fontSize,
        fontFamily,
        fontWeight: 400,
        color,
        caretColor: color,
        background: "transparent",
        border: "none",
        padding: 0,
        margin: 0,
        lineHeight: 1.15,
      }}
    />
  );
}
