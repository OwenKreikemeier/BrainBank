// ---------------------------------------------------------------------------
// NoteContextMenu — right-click menu for a note's title bar
// ---------------------------------------------------------------------------
// Offers note fill and title styling, plus Copy, Rename, and Delete. Preset
// swatches sit in a row; a trailing custom circle opens the HSV picker. Edits
// apply and save immediately. Copy snapshots the note and everything nested
// in it. Double-click enters a note; rename is here. Deleting a note that
// has descendants opens a confirmation modal first.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useNotesStore } from "../../store/notesStore";
import { useUiStore } from "../../store/uiStore";
import {
  DEFAULT_TITLE_COLOR,
  DEFAULT_TITLE_FONT,
  DEFAULT_TITLE_FONT_SIZE,
  NOTE_PALETTE,
  TITLE_PALETTE,
} from "../../types";
import { normalizeHex } from "../../lib/color";
import { copyNote } from "../../lib/noteClipboard";
import { HsvColorPicker } from "./HsvColorPicker";
import { FontSelect, menuControlChrome } from "./FontSelect";
import { useSettingsStore } from "../../store/settingsStore";

type PickerKind = "note" | "title" | null;

export function NoteContextMenu() {
  const menu = useUiStore((s) => s.contextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const openConfirmDelete = useUiStore((s) => s.openConfirmDelete);
  const setEditingNote = useUiStore((s) => s.setEditingNote);
  const notesVersion = useNotesStore((s) => s.version);
  void notesVersion;

  const getNote = useNotesStore((s) => s.getNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const countDescendants = useNotesStore((s) => s.countDescendants);
  const [picker, setPicker] = useState<PickerKind>(null);
  const light = useSettingsStore((s) => s.theme) === "light";

  useEffect(() => {
    setPicker(null);
  }, [menu?.noteId]);

  useEffect(() => {
    if (!menu) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      useUiStore.getState().closeContextMenu();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [menu]);

  if (!menu) return null;
  const note = getNote(menu.noteId);
  if (!note) return null;

  function close() {
    closeContextMenu();
  }

  function handleCopy() {
    copyNote(menu!.noteId);
    closeContextMenu();
  }

  function handleRename() {
    closeContextMenu();
    setEditingNote(menu!.noteId);
  }

  function handleDelete() {
    const count = countDescendants(menu!.noteId);
    closeContextMenu();
    if (count > 0) {
      openConfirmDelete({ noteId: menu!.noteId, descendantCount: count });
    } else {
      deleteNote(menu!.noteId);
    }
  }

  const left = Math.min(menu.x, window.innerWidth - 250);
  const top = Math.min(menu.y, window.innerHeight - 600);

  return (
    <div data-hud>
      <div
        onPointerDown={close}
        onContextMenu={(e) => {
          e.preventDefault();
          close();
        }}
        style={{ position: "fixed", inset: 0, zIndex: 40 }}
      />

      <div
        style={{
          position: "fixed",
          left,
          top,
          zIndex: 41,
          width: 232,
          background: "rgba(28,30,38,0.98)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          padding: 8,
          color: "rgba(255,255,255,0.85)",
          fontSize: 13,
        }}
      >
        <SwatchRow
          label="Color"
          palette={NOTE_PALETTE}
          value={note.color}
          pickerOpen={picker === "note"}
          onPick={(color) => {
            setPicker(null);
            updateNote(menu.noteId, { color });
          }}
          onToggleCustom={() => setPicker(picker === "note" ? null : "note")}
          onCustom={(color) => updateNote(menu.noteId, { color })}
        />

        <SwatchRow
          label="Title color"
          palette={TITLE_PALETTE}
          value={note.titleColor ?? DEFAULT_TITLE_COLOR}
          pickerOpen={picker === "title"}
          onPick={(color) => {
            setPicker(null);
            updateNote(menu.noteId, { titleColor: color });
          }}
          onToggleCustom={() => setPicker(picker === "title" ? null : "title")}
          onCustom={(color) => updateNote(menu.noteId, { titleColor: color })}
        />

        <div style={{ padding: "8px 8px 4px", opacity: 0.6, fontSize: 11 }}>
          Title font
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "0 8px 8px",
            alignItems: "center",
          }}
        >
          <FontSelect
            aria-label="Title font"
            light={light}
            value={note.titleFontFamily ?? DEFAULT_TITLE_FONT}
            onChange={(titleFontFamily) =>
              updateNote(menu.noteId, { titleFontFamily })
            }
            style={{ flex: 1 }}
          />
          <input
            type="number"
            aria-label="Title size"
            min={8}
            max={96}
            value={Math.round(note.titleFontSize ?? DEFAULT_TITLE_FONT_SIZE)}
            onChange={(e) =>
              updateNote(menu.noteId, {
                titleFontSize: Math.min(
                  96,
                  Math.max(8, Number(e.target.value) || 8)
                ),
              })
            }
            style={{
              ...controlStyle,
              ...menuControlChrome(light),
              width: 56,
              borderRadius: 6,
              padding: "4px 6px",
              fontSize: 13,
            }}
          />
        </div>

        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.1)",
            margin: "4px 4px 6px",
          }}
        />
        <button onClick={handleCopy} style={menuItemStyle}>
          Copy note
        </button>
        <button onClick={handleRename} style={menuItemStyle}>
          Rename
        </button>
        <button onClick={handleDelete} style={menuItemStyle}>
          Delete note
        </button>
      </div>
    </div>
  );
}

function SwatchRow({
  label,
  palette,
  value,
  pickerOpen,
  onPick,
  onToggleCustom,
  onCustom,
}: {
  label: string;
  palette: readonly string[];
  value: string;
  pickerOpen: boolean;
  onPick: (color: string) => void;
  onToggleCustom: () => void;
  onCustom: (color: string) => void;
}) {
  const custom = !palette.some((color) => hexEq(color, value));
  return (
    <>
      <div style={{ padding: "8px 8px 4px", opacity: 0.6, fontSize: 11 }}>
        {label}
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          padding: "0 8px 8px",
          alignItems: "center",
        }}
      >
        {palette.map((color) => (
          <button
            key={color}
            onClick={() => onPick(color)}
            title={color}
            style={swatchStyle(color, hexEq(color, value) && !pickerOpen)}
          />
        ))}
        <button
          onClick={onToggleCustom}
          title="Custom color"
          aria-label={`Custom ${label.toLowerCase()}`}
          aria-pressed={pickerOpen}
          style={{
            ...swatchStyle(custom ? value : "transparent", custom || pickerOpen),
            background: custom
              ? value
              : "conic-gradient(#f5d33f, #7ed957, #5aa9ff, #c08bff, #ff8fb1, #ffa94d, #f5d33f)",
          }}
        />
      </div>
      {pickerOpen && (
        <div style={{ padding: "0 8px 8px" }}>
          <HsvColorPicker value={value} onChange={onCustom} />
        </div>
      )}
    </>
  );
}

function hexEq(a: string, b: string): boolean {
  const left = normalizeHex(a);
  const right = normalizeHex(b);
  if (left && right) return left === right;
  return a.toLowerCase() === b.toLowerCase();
}

function swatchStyle(color: string, selected: boolean): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: color,
    border: selected ? "2px solid white" : "1px solid rgba(255,255,255,0.3)",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  };
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "6px 8px",
  background: "transparent",
  border: "none",
  borderRadius: 6,
  color: "inherit",
  fontSize: 13,
  cursor: "pointer",
};

const controlStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  color: "inherit",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  padding: "4px 6px",
  fontSize: 13,
};
