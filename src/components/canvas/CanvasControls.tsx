// ---------------------------------------------------------------------------
// CanvasControls — HUD overlay
// ---------------------------------------------------------------------------
// Chrome:
//   • top-left      search (slides to top-center when open)
//   • top-center    current-note title (only when inside a note)
//   • bottom-right  reset + settings
//   • bottom-middle + button that expands a tool tray (note / text / image)
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { useNotesStore } from "../../store/notesStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useUiStore } from "../../store/uiStore";
import { beginPastePlacement } from "../../lib/noteClipboard";
import type { PlacementKind } from "../../types";
import { NoteSearch } from "./NoteSearch";

export function CanvasControls() {
  const resetViewport = useCanvasStore((s) => s.resetViewport);
  const placementActive = useCanvasStore((s) => s.placementActive);
  const placementKind = useCanvasStore((s) => s.placementKind);
  const setPlacementActive = useCanvasStore((s) => s.setPlacementActive);
  const frameId = useCanvasStore((s) => s.frameId);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const toolMenuOpen = useUiStore((s) => s.toolMenuOpen);
  const setToolMenuOpen = useUiStore((s) => s.setToolMenuOpen);
  const hasNoteClipboard = useUiStore((s) => s.noteClipboard !== null);
  const searchOpen = useUiStore((s) => s.searchOpen);
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
    if ((kind === "text" || kind === "image") && !insideNote) return;
    setToolMenuOpen(false);
    useUiStore.getState().setSelectedWidget(null);
    setPlacementActive(true, kind);
  }

  const hint = placementActive
    ? placementKind === "text"
      ? "Drag to draw a text block · Esc to cancel"
      : placementKind === "image"
        ? "Drag to draw an image · Esc to cancel"
        : placementKind === "paste"
          ? "Drag to place the copied note · Esc to cancel"
          : "Drag to draw a note · Esc to cancel"
    : null;

  return (
    <div data-hud>
      <NoteSearch light={light} />
      {frameNote && (
        <div
          style={{
            position: "absolute",
            top: searchOpen ? 76 : 20,
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
          aria-label="Reset view"
          style={hudButtonStyle(light, false)}
        >
          ⌂
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          aria-label="Settings"
          style={hudButtonStyle(light, false)}
        >
          <SettingsGlyph />
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
        }}
      >
        {hint && (
          <span
            style={{
              position: "absolute",
              bottom: PLUS_PX + 12,
              fontSize: 12,
              color: light ? "rgba(20,22,28,0.78)" : "rgba(255,255,255,0.7)",
              background: light ? "rgba(255,255,255,0.86)" : "rgba(0,0,0,0.45)",
              border: light
                ? "1px solid rgba(0,0,0,0.12)"
                : "1px solid transparent",
              padding: "4px 10px",
              borderRadius: 6,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {hint}
          </span>
        )}

        <ToolTray
          light={light}
          open={toolMenuOpen && !placementActive}
          insideNote={insideNote}
          hasNoteClipboard={hasNoteClipboard}
          placementActive={placementActive}
          onToggle={togglePlus}
          onPick={pickTool}
        />
      </div>
    </div>
  );
}

const PLUS_PX = 52;
const TOOL_PX = 44;
const TOOL_GAP = 12;
const TOOL_LIFT = 10;
const TOOL_EASE = "0.22s ease";

function ToolTray({
  light,
  open,
  insideNote,
  hasNoteClipboard,
  placementActive,
  onToggle,
  onPick,
}: {
  light: boolean;
  open: boolean;
  insideNote: boolean;
  hasNoteClipboard: boolean;
  placementActive: boolean;
  onToggle: () => void;
  onPick: (kind: PlacementKind) => void;
}) {
  const tools = [
    {
      id: "note",
      symbol: "▢" as React.ReactNode,
      label: "Add note",
      disabled: false,
      onClick: () => onPick("note"),
    },
    hasNoteClipboard
      ? {
          id: "paste",
          symbol: <PasteGlyph />,
          label: "Paste note",
          disabled: false,
          onClick: () => beginPastePlacement(),
        }
      : null,
    {
      id: "text",
      symbol: "T",
      label: insideNote ? "Add text" : "Zoom into a note to add text",
      disabled: !insideNote,
      onClick: () => onPick("text"),
    },
    {
      id: "image",
      symbol: <ImageGlyph />,
      label: insideNote ? "Add image" : "Zoom into a note to add images",
      disabled: !insideNote,
      onClick: () => onPick("image"),
    },
  ].filter((tool): tool is NonNullable<typeof tool> => tool !== null);

  const count = tools.length;
  const rowWidth = count * TOOL_PX + Math.max(0, count - 1) * TOOL_GAP;
  const plusCenter = PLUS_PX / 2;
  const closedLeft = (PLUS_PX - TOOL_PX) / 2;
  const closedTop = (PLUS_PX - TOOL_PX) / 2;

  return (
    <div style={{ position: "relative", width: PLUS_PX, height: PLUS_PX }}>
      {tools.map((tool, index) => {
        const delay = open
          ? `${index * 0.035}s`
          : `${(count - 1 - index) * 0.035}s`;
        const left = open
          ? plusCenter - rowWidth / 2 + index * (TOOL_PX + TOOL_GAP)
          : closedLeft;
        const top = open ? -(TOOL_PX + TOOL_LIFT) : closedTop;
        return (
          <div
            key={tool.id}
            style={{
              position: "absolute",
              left,
              top,
              zIndex: 1,
              transition: `left ${TOOL_EASE} ${delay}, top ${TOOL_EASE} ${delay}`,
              pointerEvents: open ? "auto" : "none",
            }}
          >
            <ToolCircle
              light={light}
              symbol={tool.symbol}
              label={tool.label}
              onClick={tool.onClick}
              disabled={tool.disabled}
              visible={open}
            />
          </div>
        );
      })}
      <button
        onClick={onToggle}
        title={placementActive ? "Cancel" : open ? "Close tools" : "Add"}
        aria-label={placementActive ? "Cancel" : open ? "Close tools" : "Add"}
        aria-expanded={open}
        style={{
          ...placeButtonStyle(light, placementActive || open),
          position: "relative",
          zIndex: 2,
        }}
      >
        {placementActive || open ? "×" : "+"}
      </button>
    </div>
  );
}

function SettingsGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z" />
    </svg>
  );
}

function PasteGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function ImageGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <path d="M21 16.5 15.5 11l-3.2 3.2-2.1-2.1L3.8 19" />
    </svg>
  );
}

function ToolCircle({
  light,
  symbol,
  label,
  onClick,
  disabled,
  visible,
}: {
  light: boolean;
  symbol: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  visible: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      {visible && hovered && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 12,
            color: light ? "rgba(20,22,28,0.86)" : "rgba(255,255,255,0.9)",
            background: light ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.7)",
            border: light ? "1px solid rgba(0,0,0,0.12)" : "1px solid transparent",
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
        title={visible ? label : undefined}
        aria-label={label}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        style={{
          width: TOOL_PX,
          height: TOOL_PX,
          borderRadius: "50%",
          ...circleChrome(light, disabled),
          fontSize: 18,
          fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(8px)",
        }}
      >
        {symbol}
      </button>
    </div>
  );
}

function circleChrome(
  light: boolean,
  disabled?: boolean
): Pick<React.CSSProperties, "border" | "background" | "color" | "boxShadow"> {
  if (light) {
    return {
      border: "1px solid rgba(0,0,0,0.18)",
      background: disabled ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.9)",
      color: disabled ? "rgba(20,22,28,0.32)" : "rgba(20,22,28,0.88)",
      boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
    };
  }
  return {
    border: "1px solid rgba(255,255,255,0.18)",
    background: disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.12)",
    color: disabled ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.95)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
  };
}

function hudButtonStyle(light: boolean, active: boolean): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 8,
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(8px)",
    ...(light
      ? {
          border: active
            ? "1px solid rgba(40,110,200,0.55)"
            : "1px solid rgba(0,0,0,0.18)",
          background: active ? "rgba(80,160,255,0.28)" : "rgba(255,255,255,0.88)",
          color: "rgba(20,22,28,0.86)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
        }
      : {
          border: "1px solid rgba(255,255,255,0.12)",
          background: active ? "rgba(120,185,255,0.25)" : "rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.8)",
        }),
  };
}

function placeButtonStyle(light: boolean, active: boolean): React.CSSProperties {
  return {
    width: 52,
    height: 52,
    borderRadius: "50%",
    fontSize: 28,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(8px)",
    ...(light
      ? {
          border: active
            ? "1px solid rgba(40,110,200,0.7)"
            : "1px solid rgba(0,0,0,0.2)",
          background: active ? "rgba(80,160,255,0.32)" : "rgba(255,255,255,0.9)",
          color: "rgba(20,22,28,0.88)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.14)",
        }
      : {
          border: active
            ? "1px solid rgba(120,185,255,0.9)"
            : "1px solid rgba(255,255,255,0.15)",
          background: active ? "rgba(80,160,255,0.35)" : "rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.9)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }),
  };
}
