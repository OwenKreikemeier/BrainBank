// ---------------------------------------------------------------------------
// ShapePicker — shape gallery that rises from the bottom of the screen
// ---------------------------------------------------------------------------
// Opened from the + tool tray's shape button. Stays mounted so it can slide
// up from below the viewport. Picking a shape starts a normal widget
// placement drag with that shape.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { useUiStore } from "../../store/uiStore";
import { SHAPE_GROUPS, SHAPES } from "./ShapeSvg";
import { ShapeSvg } from "./ShapeSvg";

const CELL = 44;

export function ShapePicker({ light }: { light: boolean }) {
  const open = useUiStore((s) => s.shapePickerOpen);
  const setShapePickerOpen = useUiStore((s) => s.setShapePickerOpen);
  const setPlacementShape = useUiStore((s) => s.setPlacementShape);
  const setPlacementActive = useCanvasStore((s) => s.setPlacementActive);

  function choose(kind: string) {
    setPlacementShape(kind);
    setShapePickerOpen(false);
    useUiStore.getState().setSelectedWidget(null);
    setPlacementActive(true, "shape");
  }

  return (
    <div
      data-hud
      role="dialog"
      aria-label="Shape gallery"
      aria-hidden={!open}
      style={{
        position: "absolute",
        bottom: 88,
        left: "50%",
        zIndex: 11,
        width: "min(560px, calc(100vw - 32px))",
        maxHeight: "min(52vh, 480px)",
        padding: "12px 14px 14px",
        borderRadius: 14,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        background: light ? "rgba(255,255,255,0.96)" : "rgba(28,30,38,0.98)",
        border: light
          ? "1px solid rgba(0,0,0,0.15)"
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 10px 32px rgba(0,0,0,0.35)",
        backdropFilter: "blur(8px)",
        transform: open
          ? "translate(-50%, 0)"
          : "translate(-50%, calc(100% + 110px))",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "transform 0.28s ease, opacity 0.22s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: light ? "rgba(20,22,28,0.65)" : "rgba(255,255,255,0.6)",
          }}
        >
          Pick a shape, then drag to draw it
        </div>
        <button
          type="button"
          title="Close"
          aria-label="Close shape gallery"
          tabIndex={open ? 0 : -1}
          onClick={() => setShapePickerOpen(false)}
          style={{
            background: "transparent",
            border: "none",
            color: light ? "rgba(20,22,28,0.5)" : "rgba(255,255,255,0.5)",
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
            padding: "0 4px",
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {SHAPE_GROUPS.map((group) => {
          const items = SHAPES.filter((def) => def.group === group.id);
          if (items.length === 0) return null;
          return (
            <div key={group.id} style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  margin: "4px 2px 6px",
                  color: light
                    ? "rgba(20,22,28,0.45)"
                    : "rgba(255,255,255,0.42)",
                }}
              >
                {group.label}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))",
                  gap: 2,
                }}
              >
                {items.map((def) => (
                  <ShapeCell
                    key={def.kind}
                    kind={def.kind}
                    label={def.label}
                    light={light}
                    visible={open}
                    onPick={() => choose(def.kind)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShapeCell({
  kind,
  label,
  light,
  visible,
  onPick,
}: {
  kind: string;
  label: string;
  light: boolean;
  visible: boolean;
  onPick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const glyph = light ? "rgba(20,22,28,0.78)" : "rgba(255,255,255,0.85)";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      tabIndex={visible ? 0 : -1}
      onClick={onPick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        width: CELL,
        height: CELL,
        padding: 8,
        boxSizing: "border-box",
        justifySelf: "center",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        background: hovered
          ? light
            ? "rgba(80,160,255,0.22)"
            : "rgba(80,160,255,0.3)"
          : "transparent",
      }}
    >
      <ShapeSvg kind={kind} fill={glyph} stroke="" strokeWidth={0} />
    </button>
  );
}
