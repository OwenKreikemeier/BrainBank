// ---------------------------------------------------------------------------
// ShapeToolbar — styling controls for the selected shape widget
// ---------------------------------------------------------------------------
// Change the shape itself, its fill (or no fill), border colour/width, the
// label's font, and flip it horizontally / vertically. Rotation uses the
// on-canvas handle. Double-click the shape to edit its label.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { useWidgetsStore } from "../../store/widgetsStore";
import { useUiStore } from "../../store/uiStore";
import { useSettingsStore } from "../../store/settingsStore";
import {
  DEFAULT_SHAPE_FILL,
  DEFAULT_SHAPE_STROKE,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_FONT,
  DEFAULT_TEXT_FONT_SIZE,
} from "../../types";
import { LayerControls } from "./LayerControls";
import { TextStyleControls } from "./TextStyleControls";
import { FontSelect, menuControlChrome } from "./FontSelect";
import { SHAPES, ShapeSvg, shapeLabel } from "./ShapeSvg";

export function ShapeToolbar() {
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

  if (!widget || widget.type !== "shape" || selectedCount !== 1) return null;

  const fill = widget.fill ?? DEFAULT_SHAPE_FILL;
  const hasFill = fill !== "";
  const stroke = widget.stroke ?? DEFAULT_SHAPE_STROKE;
  const strokeWidth = widget.strokeWidth ?? 0;

  return (
    <div
      data-hud
      style={{
        position: "absolute",
        top: 78,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 12,
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "center",
        maxWidth: "calc(100vw - 24px)",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 10,
        background: "rgba(28,30,38,0.96)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        color: "rgba(255,255,255,0.9)",
        fontSize: 13,
        overflow: "visible",
      }}
    >
      <ShapeSelect
        light={light}
        value={widget.shape}
        onChange={(shape) => updateWidget(widget.id, { shape })}
      />

      <label style={labelStyle} title="Fill color">
        Fill
        <input
          type="color"
          aria-label="Fill color"
          value={hasFill ? fill : DEFAULT_SHAPE_FILL}
          onChange={(e) => updateWidget(widget.id, { fill: e.target.value })}
          style={colorInputStyle}
        />
      </label>
      <button
        onClick={() =>
          updateWidget(widget.id, { fill: hasFill ? "" : DEFAULT_SHAPE_FILL })
        }
        title={hasFill ? "Remove fill (outline only)" : "Add fill"}
        style={{
          ...controlStyle,
          cursor: "pointer",
          padding: "4px 8px",
          background: hasFill ? controlStyle.background : "rgba(80,160,255,0.4)",
        }}
      >
        {hasFill ? "No fill" : "Filled"}
      </button>

      <label style={labelStyle} title="Border width (0 = none)">
        Border
        <input
          type="number"
          aria-label="Border width"
          min={0}
          max={20}
          value={Math.round(strokeWidth)}
          onChange={(e) =>
            updateWidget(widget.id, {
              strokeWidth: Math.min(20, Math.max(0, Number(e.target.value) || 0)),
              // Give the first border a visible color if none was set yet.
              stroke: widget.stroke ?? DEFAULT_SHAPE_STROKE,
            })
          }
          style={{ ...controlStyle, ...menuControlChrome(light), width: 48 }}
        />
        <input
          type="color"
          aria-label="Border color"
          value={stroke}
          onChange={(e) => updateWidget(widget.id, { stroke: e.target.value })}
          style={colorInputStyle}
        />
      </label>

      <FontSelect
        aria-label="Text font"
        light={light}
        value={widget.fontFamily || DEFAULT_TEXT_FONT}
        onChange={(fontFamily) => updateWidget(widget.id, { fontFamily })}
        style={{ width: 120 }}
      />
      <input
        type="number"
        aria-label="Text size"
        min={8}
        max={96}
        title="Text size"
        value={Math.round(widget.fontSize || DEFAULT_TEXT_FONT_SIZE)}
        onChange={(e) =>
          updateWidget(widget.id, {
            fontSize: Math.min(96, Math.max(8, Number(e.target.value) || 8)),
          })
        }
        style={{ ...controlStyle, ...menuControlChrome(light), width: 52 }}
      />
      <TextStyleControls
        widgetId={widget.id}
        content={widget.content}
        singleLine
        onChangeContent={(content) => updateWidget(widget.id, { content })}
      />

      <label style={labelStyle} title="Text color">
        Text
        <input
          type="color"
          aria-label="Text color"
          value={widget.color || DEFAULT_TEXT_COLOR}
          onChange={(e) => updateWidget(widget.id, { color: e.target.value })}
          style={colorInputStyle}
        />
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <button
          type="button"
          onClick={() => updateWidget(widget.id, { flipH: !widget.flipH })}
          title="Flip horizontally"
          aria-label="Flip horizontally"
          aria-pressed={!!widget.flipH}
          style={{
            ...iconButtonStyle,
            background: widget.flipH
              ? "rgba(80,160,255,0.4)"
              : iconButtonStyle.background,
          }}
        >
          <FlipHorizontalGlyph />
        </button>
        <button
          type="button"
          onClick={() => updateWidget(widget.id, { flipV: !widget.flipV })}
          title="Flip vertically"
          aria-label="Flip vertically"
          aria-pressed={!!widget.flipV}
          style={{
            ...iconButtonStyle,
            background: widget.flipV
              ? "rgba(80,160,255,0.4)"
              : iconButtonStyle.background,
          }}
        >
          <FlipVerticalGlyph />
        </button>
      </div>

      <LayerControls widgetId={widget.id} />

      <button
        onClick={() => {
          deleteWidget(widget.id);
          setSelectedWidget(null);
        }}
        title="Delete shape"
        style={{ ...controlStyle, cursor: "pointer", padding: "4px 10px" }}
      >
        Delete
      </button>
    </div>
  );
}

/** Compact dropdown showing a grid of shapes to switch the selected one. */
function ShapeSelect({
  value,
  onChange,
  light,
}: {
  value: string | undefined;
  onChange: (shape: string) => void;
  light: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const chrome = menuControlChrome(light);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc, true);
    return () => document.removeEventListener("pointerdown", onDoc, true);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        title="Change shape"
        aria-label="Change shape"
        aria-expanded={open}
        style={{
          ...controlStyle,
          ...chrome,
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          padding: "4px 8px",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 14, height: 14, display: "block" }}>
          <ShapeSvg kind={value} fill="currentColor" stroke="" strokeWidth={0} />
        </span>
        {shapeLabel(value)}
        <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 20,
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 2,
            padding: 8,
            borderRadius: 10,
            boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
            maxHeight: 280,
            overflowY: "auto",
            ...chrome,
          }}
        >
          {SHAPES.map((def) => (
            <button
              key={def.kind}
              title={def.label}
              aria-label={def.label}
              onClick={() => {
                onChange(def.kind);
                setOpen(false);
              }}
              style={{
                width: 36,
                height: 36,
                padding: 8,
                boxSizing: "border-box",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                background:
                  def.kind === (value ?? "rectangle")
                    ? "rgba(80,160,255,0.4)"
                    : "transparent",
                color: "inherit",
              }}
            >
              <ShapeSvg
                kind={def.kind}
                fill="currentColor"
                stroke=""
                strokeWidth={0}
              />
            </button>
          ))}
        </div>
      )}
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

const flipIconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  style: { display: "block" },
};

function FlipHorizontalGlyph() {
  return (
    <svg {...flipIconProps}>
      <path d="M8 2.25v11.5" />
      <path d="M6.35 4.15 2.35 8l4 3.85z" fill="currentColor" stroke="none" />
      <path d="M9.65 4.15 13.65 8l-4 3.85z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FlipVerticalGlyph() {
  return (
    <svg {...flipIconProps}>
      <path d="M2.25 8h11.5" />
      <path d="M4.15 6.35 8 2.35l3.85 4z" fill="currentColor" stroke="none" />
      <path d="M4.15 9.65 8 13.65l3.85-4z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12,
  color: "rgba(255,255,255,0.7)",
  whiteSpace: "nowrap",
};

const colorInputStyle: React.CSSProperties = {
  width: 30,
  height: 26,
  border: "none",
  background: "none",
  cursor: "pointer",
  padding: 0,
};

const controlStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  color: "inherit",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  padding: "4px 6px",
  fontSize: 13,
};
