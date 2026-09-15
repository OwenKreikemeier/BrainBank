// ---------------------------------------------------------------------------
// LayerControls — send a widget behind / in front of its siblings
// ---------------------------------------------------------------------------

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
    move: "back",
    title: "Send to back",
    disabled: (index) => index <= 0,
  },
  {
    move: "backward",
    title: "Send backward",
    disabled: (index) => index <= 0,
  },
  {
    move: "forward",
    title: "Bring forward",
    disabled: (index, count) => index < 0 || index >= count - 1,
  },
  {
    move: "front",
    title: "Bring to front",
    disabled: (index, count) => index < 0 || index >= count - 1,
  },
];

export function LayerControls({ widgetId }: LayerControlsProps) {
  const version = useWidgetsStore((s) => s.version);
  void version;
  const widgets = useWidgetsStore.getState();
  const widget = widgets.getWidget(widgetId);
  const moveWidgetLayer = widgets.moveWidgetLayer;

  if (!widget) return null;

  const siblings = widgets.getForNote(widget.noteId);
  const index = siblings.findIndex((w) => w.id === widgetId);
  const count = siblings.length;

  return (
    <div style={{ display: "flex", gap: 2 }}>
      {ACTIONS.map((action) => (
        <button
          key={action.move}
          type="button"
          title={action.title}
          aria-label={action.title}
          disabled={action.disabled(index, count)}
          onClick={() => moveWidgetLayer(widgetId, action.move)}
          style={{
            width: 28,
            height: 28,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: action.disabled(index, count) ? "default" : "pointer",
            opacity: action.disabled(index, count) ? 0.35 : 1,
            background: "rgba(255,255,255,0.08)",
            color: "inherit",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
          }}
        >
          <LayerGlyph move={action.move} />
        </button>
      ))}
    </div>
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
