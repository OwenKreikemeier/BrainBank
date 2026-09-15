// ---------------------------------------------------------------------------
// FontSelect — theme-aware font picker
// ---------------------------------------------------------------------------
// Native <select> option lists on Windows keep a light system background
// while inheriting the menu's white text. This custom list uses the app
// theme so names stay readable without hovering.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { TEXT_FONTS } from "../../types";

export function menuControlChrome(light: boolean): React.CSSProperties {
  return light
    ? {
        background: "rgba(255,255,255,0.96)",
        color: "rgba(20,22,28,0.9)",
        border: "1px solid rgba(0,0,0,0.18)",
        colorScheme: "light",
      }
    : {
        background: "rgba(36,38,48,0.98)",
        color: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(255,255,255,0.18)",
        colorScheme: "dark",
      };
}

export function FontSelect({
  value,
  onChange,
  light,
  "aria-label": ariaLabel,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  light: boolean;
  "aria-label": string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = TEXT_FONTS.find((font) => font.value === value) ?? TEXT_FONTS[0];
  const chrome = menuControlChrome(light);
  const hoverBg = light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
  const selectedBg = light ? "rgba(80,160,255,0.22)" : "rgba(80,160,255,0.38)";

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
    <div ref={rootRef} style={{ position: "relative", minWidth: 0, ...style }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          ...chrome,
          borderRadius: 6,
          padding: "4px 8px",
          fontSize: 13,
          cursor: "pointer",
          fontFamily: current.value,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {current.label}
        </span>
        <span aria-hidden style={{ opacity: 0.55, fontSize: 10, flexShrink: 0 }}>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 30,
            ...chrome,
            borderRadius: 6,
            boxShadow: light
              ? "0 8px 20px rgba(0,0,0,0.14)"
              : "0 8px 20px rgba(0,0,0,0.5)",
            overflow: "hidden",
            padding: 4,
          }}
        >
          {TEXT_FONTS.map((font) => (
            <FontOption
              key={font.label}
              label={font.label}
              fontFamily={font.value}
              selected={font.value === value}
              color={chrome.color as string}
              selectedBg={selectedBg}
              hoverBg={hoverBg}
              onPick={() => {
                onChange(font.value);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FontOption({
  label,
  fontFamily,
  selected,
  color,
  selectedBg,
  hoverBg,
  onPick,
}: {
  label: string;
  fontFamily: string;
  selected: boolean;
  color: string;
  selectedBg: string;
  hoverBg: string;
  onPick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onPick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "6px 8px",
        background: selected ? selectedBg : hovered ? hoverBg : "transparent",
        color,
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 13,
        fontFamily,
      }}
    >
      {label}
    </button>
  );
}
