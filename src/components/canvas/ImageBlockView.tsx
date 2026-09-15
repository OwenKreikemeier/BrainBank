// ---------------------------------------------------------------------------
// ImageBlockView — an image widget on a note
// ---------------------------------------------------------------------------
// Same placement / move / resize / rotate chrome as text. Images may overlap
// text (and other images). Click an empty frame, or double-click a filled one,
// to choose a file.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import type { ScreenRect, Widget } from "../../types";
import { useWidgetsStore } from "../../store/widgetsStore";
import { pickImageFile } from "../../lib/pickImage";
import { WidgetChrome } from "./WidgetChrome";

interface ImageBlockViewProps {
  widget: Widget;
  rect: ScreenRect;
  interactive: boolean;
}

export function ImageBlockView({
  widget,
  rect,
  interactive,
}: ImageBlockViewProps) {
  const updateWidget = useWidgetsStore((s) => s.updateWidget);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!widget.imageBlob) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(widget.imageBlob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [widget.imageBlob]);

  async function chooseImage() {
    if (!interactive) return;
    const blob = await pickImageFile();
    if (blob) updateWidget(widget.id, { imageBlob: blob });
  }

  return (
    <WidgetChrome
      widget={widget}
      rect={rect}
      interactive={interactive}
      cursor={src ? "default" : "pointer"}
    >
      {src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          onDoubleClick={(e) => {
            e.stopPropagation();
            void chooseImage();
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            pointerEvents: interactive ? "auto" : "none",
            userSelect: "none",
          }}
        />
      ) : (
        <button
          type="button"
          data-widget-interactive={interactive ? "" : undefined}
          onClick={(e) => {
            e.stopPropagation();
            void chooseImage();
          }}
          disabled={!interactive}
          style={{
            width: "100%",
            height: "100%",
            border: "1px dashed rgba(80,160,255,0.7)",
            background: "rgba(255,255,255,0.16)",
            color: "rgba(0,0,0,0.55)",
            fontSize: Math.max(11, Math.min(14, rect.w * 0.08)),
            cursor: interactive ? "pointer" : "default",
            pointerEvents: interactive ? "auto" : "none",
          }}
        >
          {interactive ? "Choose image" : ""}
        </button>
      )}
    </WidgetChrome>
  );
}
