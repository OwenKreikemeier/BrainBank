// ---------------------------------------------------------------------------
// ShapeBlockView — a shape widget on a note
// ---------------------------------------------------------------------------
// Same selection / move / resize / rotate chrome as text and images. The
// shape stretches to the widget's box (no fixed aspect), can be flipped
// horizontally / vertically, and restyled from the shape toolbar.
// ---------------------------------------------------------------------------

import {
  BASE_CELL_PX,
  DEFAULT_SHAPE_FILL,
  DEFAULT_SHAPE_STROKE,
  type ScreenRect,
  type Widget,
} from "../../types";
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
  const strokePx = Math.max(
    0,
    (widget.strokeWidth ?? 0) * (cellPx / BASE_CELL_PX)
  );
  return (
    <WidgetChrome widget={widget} rect={rect} interactive={interactive}>
      <ShapeSvg
        kind={widget.shape}
        fill={widget.fill ?? DEFAULT_SHAPE_FILL}
        stroke={widget.stroke ?? DEFAULT_SHAPE_STROKE}
        strokeWidth={strokePx}
        flipH={widget.flipH}
        flipV={widget.flipV}
      />
    </WidgetChrome>
  );
}
