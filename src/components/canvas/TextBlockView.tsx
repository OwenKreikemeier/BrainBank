// ---------------------------------------------------------------------------
// TextBlockView — a freeform text widget on a note
// ---------------------------------------------------------------------------
// Interactive only when its host note is the current frame. Click to select
// and type; Shift+click adds it to the selection. Font shrinks to fit the
// box, down to 1px. If it still cannot fit, the text is hidden instead of
// wrapping at the minimum size.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from "react";
import { BASE_CELL_PX, type ScreenRect, type Widget } from "../../types";
import { useWidgetsStore } from "../../store/widgetsStore";
import { useUiStore } from "../../store/uiStore";
import { fitTextFont } from "../../lib/fitTextFont";
import { WidgetChrome } from "./WidgetChrome";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  useEffect(() => {
    if (selected && !multi && interactive) {
      textareaRef.current?.focus();
    }
  }, [selected, multi, interactive]);

  return (
    <WidgetChrome widget={widget} rect={rect} interactive={interactive} cursor="text">
      <textarea
        ref={textareaRef}
        value={widget.content}
        readOnly={!interactive || multi}
        placeholder={interactive ? "Type here" : ""}
        onChange={(e) => updateWidget(widget.id, { content: e.target.value })}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          height: "100%",
          resize: "none",
          border: "none",
          outline: "none",
          background: "transparent",
          padding: 4,
          boxSizing: "border-box",
          fontFamily: widget.fontFamily,
          fontSize: fitted.px,
          lineHeight: 1.25,
          color: widget.color,
          visibility: fitted.visible ? "visible" : "hidden",
          textAlign: widget.align ?? "left",
          cursor: interactive ? "text" : "inherit",
          overflow: "hidden",
        }}
      />
    </WidgetChrome>
  );
}
