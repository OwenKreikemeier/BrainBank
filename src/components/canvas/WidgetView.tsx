// ---------------------------------------------------------------------------
// WidgetView — dispatch a widget to its type-specific renderer
// ---------------------------------------------------------------------------

import type { ScreenRect, Widget } from "../../types";
import { ImageBlockView } from "./ImageBlockView";
import { TextBlockView } from "./TextBlockView";

interface WidgetViewProps {
  widget: Widget;
  rect: ScreenRect;
  cellPx: number;
  interactive: boolean;
}

export function WidgetView({
  widget,
  rect,
  cellPx,
  interactive,
}: WidgetViewProps) {
  if (widget.type === "image") {
    return (
      <ImageBlockView widget={widget} rect={rect} interactive={interactive} />
    );
  }
  return (
    <TextBlockView
      widget={widget}
      rect={rect}
      cellPx={cellPx}
      interactive={interactive}
    />
  );
}
