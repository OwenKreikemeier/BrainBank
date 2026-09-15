// ---------------------------------------------------------------------------
// HsvColorPicker — saturation/value square + hue slider
// ---------------------------------------------------------------------------
// Dragging updates the color continuously via onChange. The native OS picker
// is not used, so the panel stays open until the parent commits or cancels.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, type MutableRefObject, type PointerEvent } from "react";
import { hexToHsv, hsvToHex, normalizeHex, type Hsv } from "../../lib/color";

interface HsvColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

export function HsvColorPicker({ value, onChange }: HsvColorPickerProps) {
  const dragging = useRef(false);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value) ?? { h: 48, s: 0.75, v: 0.96 });
  const [hexText, setHexText] = useState(normalizeHex(value) ?? value);

  useEffect(() => {
    if (dragging.current) return;
    const next = hexToHsv(value);
    if (!next) return;
    setHsv(next);
    setHexText(normalizeHex(value) ?? value);
  }, [value]);

  function commit(next: Hsv) {
    setHsv(next);
    const hex = hsvToHex(next);
    setHexText(hex);
    onChange(hex);
  }

  function onHexTyped(raw: string) {
    setHexText(raw);
    const hex = normalizeHex(raw);
    if (!hex) return;
    const next = hexToHsv(hex);
    if (!next) return;
    setHsv(next);
    onChange(hex);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <SvSquare hsv={hsv} onChange={commit} dragging={dragging} />
      <HueSlider hsv={hsv} onChange={commit} dragging={dragging} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            background: hsvToHex(hsv),
            border: "1px solid rgba(255,255,255,0.35)",
            flexShrink: 0,
          }}
        />
        <input
          aria-label="Hex color"
          value={hexText}
          onChange={(e) => onHexTyped(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            minWidth: 0,
            background: "rgba(255,255,255,0.08)",
            color: "inherit",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            padding: "4px 6px",
            fontSize: 12,
            fontFamily: "ui-monospace, Consolas, monospace",
          }}
        />
      </div>
    </div>
  );
}

function SvSquare({
  hsv,
  onChange,
  dragging,
}: {
  hsv: Hsv;
  onChange: (hsv: Hsv) => void;
  dragging: MutableRefObject<boolean>;
}) {
  function read(clientX: number, clientY: number, rect: DOMRect) {
    const s = clamp01((clientX - rect.left) / rect.width);
    const v = clamp01(1 - (clientY - rect.top) / rect.height);
    onChange({ ...hsv, s, v });
  }

  return (
    <div
      data-widget-interactive=""
      role="slider"
      aria-label="Saturation and brightness"
      onPointerDown={dragHandlers(dragging, read)}
      onPointerMove={dragMove(dragging, read)}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      style={{
        position: "relative",
        width: "100%",
        height: 120,
        borderRadius: 6,
        cursor: "crosshair",
        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex({ h: hsv.h, s: 1, v: 1 })})`,
        border: "1px solid rgba(255,255,255,0.2)",
        touchAction: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `${hsv.s * 100}%`,
          top: `${(1 - hsv.v) * 100}%`,
          width: 12,
          height: 12,
          marginLeft: -6,
          marginTop: -6,
          borderRadius: "50%",
          border: "2px solid white",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.45)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function HueSlider({
  hsv,
  onChange,
  dragging,
}: {
  hsv: Hsv;
  onChange: (hsv: Hsv) => void;
  dragging: MutableRefObject<boolean>;
}) {
  function read(clientX: number, _clientY: number, rect: DOMRect) {
    const h = clamp01((clientX - rect.left) / rect.width) * 360;
    onChange({ ...hsv, h });
  }

  return (
    <div
      data-widget-interactive=""
      role="slider"
      aria-label="Hue"
      onPointerDown={dragHandlers(dragging, read)}
      onPointerMove={dragMove(dragging, read)}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      style={{
        position: "relative",
        width: "100%",
        height: 14,
        borderRadius: 7,
        cursor: "ew-resize",
        background:
          "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        border: "1px solid rgba(255,255,255,0.2)",
        touchAction: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `${(hsv.h / 360) * 100}%`,
          top: "50%",
          width: 12,
          height: 12,
          marginLeft: -6,
          marginTop: -6,
          borderRadius: "50%",
          background: hsvToHex({ h: hsv.h, s: 1, v: 1 }),
          border: "2px solid white",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.45)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function dragHandlers(
  dragging: MutableRefObject<boolean>,
  read: (x: number, y: number, rect: DOMRect) => void
) {
  return (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // untrusted events in tests
    }
    read(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };
}

function dragMove(
  dragging: MutableRefObject<boolean>,
  read: (x: number, y: number, rect: DOMRect) => void
) {
  return (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    read(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };
}
