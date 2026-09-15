// ---------------------------------------------------------------------------
// TextToolbar — formatting controls for the selected text block
// ---------------------------------------------------------------------------

import { useWidgetsStore } from "../../store/widgetsStore";
import { useUiStore } from "../../store/uiStore";
import { useSettingsStore } from "../../store/settingsStore";
import { type TextAlign } from "../../types";
import { LayerControls } from "./LayerControls";
import { FontSelect, menuControlChrome } from "./FontSelect";

export function TextToolbar() {
  const selectedWidgetId = useUiStore((s) => s.selectedWidgetId);
  const selectedCount = useUiStore(
    (s) => s.selectedNoteIds.length + s.selectedWidgetIds.length
  );
  const setSelectedWidget = useUiStore((s) => s.setSelectedWidget);
  const version = useWidgetsStore((s) => s.version);
  void version;
  const widget = useWidgetsStore.getState().getWidget(selectedWidgetId);
  const updateWidget = useWidgetsStore((s) => s.updateWidget);
  const deleteWidget = useWidgetsStore((s) => s.deleteWidget);
  const light = useSettingsStore((s) => s.theme) === "light";

  if (!widget || widget.type !== "text" || selectedCount !== 1) return null;

  return (
    <div
      data-hud
      style={{
        position: "absolute",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 12,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 10,
        background: "rgba(28,30,38,0.96)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        color: "rgba(255,255,255,0.9)",
        fontSize: 13,
      }}
    >
      <FontSelect
        aria-label="Font"
        light={light}
        value={widget.fontFamily}
        onChange={(fontFamily) => updateWidget(widget.id, { fontFamily })}
      />

      <input
        type="number"
        aria-label="Font size"
        min={8}
        max={96}
        value={Math.round(widget.fontSize)}
        onChange={(e) =>
          updateWidget(widget.id, {
            fontSize: Math.min(96, Math.max(8, Number(e.target.value) || 8)),
          })
        }
        style={{ ...controlStyle, ...menuControlChrome(light), width: 56 }}
      />

      <input
        type="color"
        aria-label="Text color"
        value={widget.color}
        onChange={(e) => updateWidget(widget.id, { color: e.target.value })}
        style={{
          width: 32,
          height: 28,
          border: "none",
          background: "none",
          cursor: "pointer",
          padding: 0,
        }}
      />

      <div style={{ display: "flex", gap: 2 }}>
        {ALIGN_OPTIONS.map((option) => (
          <button
            key={option.value}
            title={option.title}
            aria-label={option.title}
            onClick={() => updateWidget(widget.id, { align: option.value })}
            style={{
              ...controlStyle,
              width: 28,
              padding: "4px 0",
              cursor: "pointer",
              background:
                (widget.align ?? "left") === option.value
                  ? "rgba(80,160,255,0.4)"
                  : controlStyle.background,
            }}
          >
            <AlignGlyph align={option.value} />
          </button>
        ))}
      </div>

      <LayerControls widgetId={widget.id} />

      <button
        onClick={() => {
          deleteWidget(widget.id);
          setSelectedWidget(null);
        }}
        title="Delete text block"
        style={{
          ...controlStyle,
          cursor: "pointer",
          padding: "4px 10px",
        }}
      >
        Delete
      </button>
    </div>
  );
}

const ALIGN_OPTIONS: { value: TextAlign; title: string }[] = [
  { value: "left", title: "Align left" },
  { value: "center", title: "Align center" },
  { value: "right", title: "Align right" },
];

function AlignGlyph({ align }: { align: TextAlign }) {
  const widths = align === "center" ? [10, 14, 10] : [14, 10, 14];
  return (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: 14,
        margin: "0 auto",
      }}
    >
      {widths.map((width, i) => (
        <span
          key={i}
          style={{
            display: "block",
            height: 2,
            width,
            borderRadius: 1,
            background: "currentColor",
            alignSelf:
              align === "left"
                ? "flex-start"
                : align === "right"
                  ? "flex-end"
                  : "center",
          }}
        />
      ))}
    </span>
  );
}

const controlStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  color: "inherit",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  padding: "4px 6px",
  fontSize: 13,
};
