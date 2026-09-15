// ---------------------------------------------------------------------------
// WidgetsLayer — interactive widgets on the current frame
// ---------------------------------------------------------------------------
// Widgets that live on *visible notes* are drawn inside those notes (so they
// move/resize with their host and stay visible). This layer only draws tools
// attached to the note you are currently inside.
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { useWidgetsStore } from "../../store/widgetsStore";
import { MIN_RENDER_PX, type ScreenRect, type Widget } from "../../types";
import { cellPxFor, rotatedAabb } from "../../lib/coordinates";
import { WidgetView } from "./WidgetView";

export function WidgetsLayer() {
  const pan = useCanvasStore((s) => s.pan);
  const zoom = useCanvasStore((s) => s.zoom);
  const frameId = useCanvasStore((s) => s.frameId);
  const widgetsVersion = useWidgetsStore((s) => s.version);

  const visible = useMemo(() => {
    void widgetsVersion;
    if (!frameId) return [];
    const widgets = useWidgetsStore.getState();
    const cellPx = cellPxFor(zoom);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const out: Array<{ widget: Widget; rect: ScreenRect; cellPx: number }> = [];

    for (const widget of widgets.getForNote(frameId)) {
      const rect: ScreenRect = {
        x: pan.x + widget.x * cellPx,
        y: pan.y + widget.y * cellPx,
        w: widget.width * cellPx,
        h: widget.height * cellPx,
      };
      const aabb = rotatedAabb(
        widget.x,
        widget.y,
        widget.width,
        widget.height,
        widget.rotation ?? 0
      );
      const cull: ScreenRect = {
        x: pan.x + aabb.x * cellPx,
        y: pan.y + aabb.y * cellPx,
        w: aabb.width * cellPx,
        h: aabb.height * cellPx,
      };
      if (
        cull.x + cull.w < 0 ||
        cull.y + cull.h < 0 ||
        cull.x > vw ||
        cull.y > vh ||
        cull.w < MIN_RENDER_PX ||
        cull.h < MIN_RENDER_PX
      ) {
        continue;
      }
      out.push({ widget, rect, cellPx });
    }
    return out;
  }, [pan, zoom, frameId, widgetsVersion]);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2 }}>
      {visible.map(({ widget, rect, cellPx }) => (
        <WidgetView
          key={widget.id}
          widget={widget}
          rect={rect}
          cellPx={cellPx}
          interactive
        />
      ))}
    </div>
  );
}
