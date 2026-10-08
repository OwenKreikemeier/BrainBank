// ---------------------------------------------------------------------------
// LayerControls — one button that drops the stacking actions in a column
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { useWidgetsStore } from "../../store/widgetsStore";
import type { WidgetLayerMove } from "../../types";

interface LayerControlsProps {
  widgetId: string;
}

const ACTIONS: {
  move: WidgetLayerMove;
  title: string;
  disabled: (index: number, count: number) => boolean;
}[] = [
  {
    move: "front",
    title: "Bring to front",
    disabled: (index, count) => index < 0 || index >= count - 1,
  },
  {
    move: "forward",
    title: "Bring forward",
    disabled: (index, count) => index < 0 || index >= count - 1,
  },
  {
    move: "backward",
    title: "Send backward",
    disabled: (index) => index <= 0,
  },
  {
    move: "back",
    title: "Send to back",
    disabled: (index) => index <= 0,
  },
];

export function LayerControls({ widgetId }: LayerControlsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const version = useWidgetsStore((s) => s.version);
  void version;
  const widgets = useWidgetsStore.getState();
  const widget = widgets.getWidget(widgetId);
  const moveWidgetLayer = widgets.moveWidgetLayer;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!widget) return null;

  const siblings = widgets.getForNote(widget.noteId);
  const index = siblings.findIndex((w) => w.id === widgetId);
  const count = siblings.length;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        title="Layer"
        aria-label="Layer"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={iconButtonStyle}
      >
        <LayerMenuGlyph />
      </button>
      <div
        role="menu"
        aria-label="Layer"
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: "50%",
          translate: "-50% 0",
          zIndex: 30,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: open ? 6 : 0,
          borderRadius: 10,
          background: "rgba(28,30,38,0.98)",
          border: open ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
          boxShadow: open ? "0 10px 24px rgba(0,0,0,0.45)" : "none",
          maxHeight: open ? 220 : 0,
          opacity: open ? 1 : 0,
          overflow: "hidden",
          pointerEvents: open ? "auto" : "none",
          transformOrigin: "top center",
          transition: "max-height 180ms ease, opacity 160ms ease, padding 180ms ease",
        }}
      >
        {ACTIONS.map((action, i) => {
          const disabled = action.disabled(index, count);
          return (
            <button
              key={action.move}
              type="button"
              role="menuitem"
              title={action.title}
              aria-label={action.title}
              disabled={disabled}
              onClick={() => moveWidgetLayer(widgetId, action.move)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 10px",
                whiteSpace: "nowrap",
                cursor: disabled ? "default" : "pointer",
                opacity: !open ? 0 : disabled ? 0.35 : 1,
                transform: open ? "translateY(0)" : "translateY(-8px)",
                transition: `transform 180ms ease ${i * 35}ms, opacity 160ms ease ${i * 35}ms`,
                background: "rgba(255,255,255,0.08)",
                color: "inherit",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                fontSize: 13,
                textAlign: "left",
              }}
            >
              <LayerGlyph move={action.move} />
              {action.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  background: "rgba(255,255,255,0.08)",
  color: "inherit",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
};

function LayerMenuGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 5.5h10M3 8h10M3 10.5h10" />
    </svg>
  );
}

function LayerGlyph({ move }: { move: WidgetLayerMove }) {
  const d =
    move === "back"
      ? "M4 3.5 8 7l4-3.5M4 8.5 8 12l4-3.5"
      : move === "backward"
        ? "M4 6 8 10l4-4"
        : move === "forward"
          ? "M4 10 8 6l4 4"
          : "M4 12.5 8 9l4 3.5M4 7.5 8 4l4 3.5";
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}
