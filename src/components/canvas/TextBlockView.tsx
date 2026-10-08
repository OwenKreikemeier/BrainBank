// ---------------------------------------------------------------------------
// TextBlockView — a freeform text widget on a note
// ---------------------------------------------------------------------------
// Interactive only when its host note is the current frame. Click to select
// and type; Shift+click adds it to the selection. Font shrinks to fit the
// box, down to 1px. If it still cannot fit, the text is hidden instead of
// wrapping at the minimum size.
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import { BASE_CELL_PX, type ScreenRect, type Widget } from "../../types";
import { useWidgetsStore } from "../../store/widgetsStore";
import { useUiStore } from "../../store/uiStore";
import { fitTextFont } from "../../lib/fitTextFont";
import { WidgetChrome } from "./WidgetChrome";
import { RichTextEditor } from "./RichTextEditor";

interface TextBlockViewProps {
  widget: Widget;
  rect: ScreenRect;
  cellPx: number;
  interactive: boolean;
}

export function TextBlockView({
  widget,
  rect,
  cellPx,
  interactive,
}: TextBlockViewProps) {
  const multi = useUiStore(
    (s) => s.selectedNoteIds.length + s.selectedWidgetIds.length > 1
  );
  const selected = useUiStore((s) => s.selectedWidgetIds.includes(widget.id));
  const updateWidget = useWidgetsStore((s) => s.updateWidget);
  const targetPx = Math.max(1, widget.fontSize * (cellPx / BASE_CELL_PX));
  const fitted = useMemo(
    () =>
      fitTextFont({
        content: widget.content,
        fontFamily: widget.fontFamily,
        targetPx,
        widthPx: rect.w,
        heightPx: rect.h,
      }),
    [widget.content, widget.fontFamily, targetPx, rect.w, rect.h]
  );

  // Optional background fill and border, scaled with zoom like the font.
  const bg = widget.fill && widget.fill !== "" ? widget.fill : "transparent";
  const strokePx = (widget.strokeWidth ?? 0) * (cellPx / BASE_CELL_PX);
  const border =
    strokePx > 0
      ? `${Math.max(0.5, strokePx)}px solid ${widget.stroke ?? "#1a1a1a"}`
      : "none";

  return (
    <WidgetChrome widget={widget} rect={rect} interactive={interactive} cursor="text">
      <RichTextEditor
        widgetId={widget.id}
        content={widget.content}
        editable={interactive && !multi}
        autoFocus={selected && !multi && interactive}
        placeholder={interactive ? "Type here" : ""}
        onChange={(content) => updateWidget(widget.id, { content })}
        style={{
          border,
          background: bg,
          padding: 4,
          fontFamily: widget.fontFamily,
          fontSize: fitted.px,
          lineHeight: 1.25,
          color: widget.color,
          visibility: fitted.visible ? "visible" : "hidden",
          textAlign: widget.align ?? "left",
        }}
      />
    </WidgetChrome>
  );
}
