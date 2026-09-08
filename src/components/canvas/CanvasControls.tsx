// ---------------------------------------------------------------------------
// CanvasControls — HUD overlay
// ---------------------------------------------------------------------------
// Chrome:
//   • top-center    current-note title (only when inside a note)
//   • bottom-right  reset + settings
//   • bottom-middle + button that expands a tool tray (note / text)
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { useNotesStore } from "../../store/notesStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useUiStore } from "../../store/uiStore";
import type { PlacementKind } from "../../types";

export function CanvasControls() {
  const resetViewport = useCanvasStore((s) => s.resetViewport);
  const placementActive = useCanvasStore((s) => s.placementActive);
  const placementKind = useCanvasStore((s) => s.placementKind);
  const setPlacementActive = useCanvasStore((s) => s.setPlacementActive);
  const frameId = useCanvasStore((s) => s.frameId);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const toolMenuOpen = useUiStore((s) => s.toolMenuOpen);
  const setToolMenuOpen = useUiStore((s) => s.setToolMenuOpen);
  const notesVersion = useNotesStore((s) => s.version);
  const theme = useSettingsStore((s) => s.theme);
  void notesVersion;
  const frameNote = useNotesStore.getState().getNote(frameId);
  const light = theme === "light";
  const insideNote = frameId !== null;

  function togglePlus() {
    if (placementActive) {
      setPlacementActive(false);
      setToolMenuOpen(false);
      return;
    }
    setToolMenuOpen(!toolMenuOpen);
  }

  function pickTool(kind: PlacementKind) {
    if (kind === "text" && !insideNote) return;
    setToolMenuOpen(false);
    useUiStore.getState().setSelectedWidget(null);
    setPlacementActive(true, kind);
  }

  const hint = placementActive
    ? placementKind === "text"
      ? "Drag to draw a text block · Esc to cancel"
      : "Drag to draw a note · Esc to cancel"
    : null;

  return (
    <div data-hud>
      {frameNote && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            maxWidth: "min(720px, calc(100% - 48px))",
            padding: "8px 20px",
            borderRadius: 10,
            background: light ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.5)",
            border: light
              ? "1px solid rgba(0,0,0,0.12)"
              : "1px solid rgba(255,255,255,0.12)",
            color: light ? "rgba(0,0,0,0.82)" : "rgba(255,255,255,0.92)",
            backdropFilter: "blur(10px)",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "0.01em",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            pointerEvents: "none",
          }}
        >
          {frameNote.title.trim() || "Untitled"}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          zIndex: 10,
          display: "flex",
          gap: 8,
        }}
      >
        <button
          onClick={resetViewport}
          title="Reset view"
          style={hudButtonStyle(false)}
        >
          ⌂
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          style={hudButtonStyle(false)}
        >
          ⚙
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        {hint && (
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
              background: "rgba(0,0,0,0.45)",
              padding: "4px 10px",
              borderRadius: 6,
              whiteSpace: "nowrap",
            }}
          >
            {hint}
          </span>
        )}

        {toolMenuOpen && !placementActive && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <ToolCircle
              symbol="▢"
              label="Add note"
              onClick={() => pickTool("note")}
            />
            <ToolCircle
              symbol="T"
              label={insideNote ? "Add text" : "Zoom into a note to add text"}
              disabled={!insideNote}
              onClick={() => pickTool("text")}
            />
          </div>
        )}

        <button
          onClick={togglePlus}
          title={
            placementActive
              ? "Cancel"
              : toolMenuOpen
                ? "Close tools"
                : "Add"
          }
          style={placeButtonStyle(placementActive || toolMenuOpen)}
        >
          {placementActive || toolMenuOpen ? "×" : "+"}
        </button>
      </div>
    </div>
  );
}

function ToolCircle({
  symbol,
  label,
  onClick,
  disabled,
}: {
  symbol: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      {hovered && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 12,
            color: "rgba(255,255,255,0.9)",
            background: "rgba(0,0,0,0.7)",
            padding: "4px 8px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {label}
        </span>
      )}
      <button
        onClick={onClick}
        disabled={disabled}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.18)",
          background: disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.12)",
          color: disabled ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.95)",
          fontSize: 18,
          fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
        }}
      >
        {symbol}
      </button>
    </div>
  );
}

function hudButtonStyle(active: boolean): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(120,185,255,0.25)" : "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.8)",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(8px)",
  };
}

function placeButtonStyle(active: boolean): React.CSSProperties {
  return {
    width: 52,
    height: 52,
    borderRadius: "50%",
    border: active
      ? "1px solid rgba(120,185,255,0.9)"
      : "1px solid rgba(255,255,255,0.15)",
    background: active ? "rgba(80,160,255,0.35)" : "rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.9)",
    fontSize: 28,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(8px)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
  };
}
