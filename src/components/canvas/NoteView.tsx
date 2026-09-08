// ---------------------------------------------------------------------------
// NoteView — a single sticky note
// ---------------------------------------------------------------------------
// Positioned in absolute screen pixels by NotesLayer. The body is pass-through
// (pointerEvents: none) so the canvas underneath still pans/zooms and accepts
// child placement. The TITLE BAR is interactive (only for direct children of
// the current frame that are large enough): hover darkens it, double-click
// renames, press+drag moves the note, right-click opens the context menu.
// Corner handles allow resizing (opposite corner stays fixed, always square).
// ---------------------------------------------------------------------------

import { useState } from "react";
import {
  INTERIOR_SPAN,
  MIN_INTERACT_PX,
  MIN_RENDER_PX,
  NOTE_INVALID_STROKE,
  SELECTION_STROKE,
  TITLE_BAR_CELLS,
  TITLE_HOVER_OVERLAY,
  type Note,
  type ScreenRect,
} from "../../types";
import { useNotesStore } from "../../store/notesStore";
import { useWidgetsStore } from "../../store/widgetsStore";
import { useUiStore } from "../../store/uiStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useNoteDrag } from "../../hooks/useNoteDrag";
import { useNoteResize, type Corner } from "../../hooks/useNoteResize";
import { TextBlockView } from "./TextBlockView";

interface NoteViewProps {
  note: Note;
  rect: ScreenRect;
  interactive: boolean;
}

/** True if this note is the one being dragged/resized, or nested inside it. */
function isInLiftedSubtree(note: Note, liftedId: string | null): boolean {
  if (!liftedId) return false;
  let current: Note | undefined = note;
  while (current) {
    if (current.id === liftedId) return true;
    current = current.parentId
      ? useNotesStore.getState().getNote(current.parentId)
      : undefined;
  }
  return false;
}

export function NoteView({ note, rect, interactive }: NoteViewProps) {
  const [hovered, setHovered] = useState(false);
  const editingNoteId = useUiStore((s) => s.editingNoteId);
  const setEditingNote = useUiStore((s) => s.setEditingNote);
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const { invalid: dragInvalid, dragHandlers } = useNoteDrag(note);
  const { invalid: resizeInvalid, handlersFor } = useNoteResize(note);
  const showNoteIds = useSettingsStore((s) => s.showNoteIds);
  const liftedNoteIds = useUiStore((s) => s.liftedNoteIds);
  const selected = useUiStore((s) => s.selectedNoteIds.includes(note.id));
  const selectionInvalid = useUiStore((s) => s.selectionInvalid);
  const multi = useUiStore(
    (s) => s.selectedNoteIds.length + s.selectedWidgetIds.length > 1
  );

  const titleBarHeight = rect.h * (TITLE_BAR_CELLS / INTERIOR_SPAN);
  const isInteractive = interactive && rect.w >= MIN_INTERACT_PX;
  const isEditing = editingNoteId === note.id;
  const fontSize = Math.max(9, Math.min(16, titleBarHeight * 0.45));
  const widgetsVersion = useWidgetsStore((s) => s.version);
  void widgetsVersion;
  const hostedWidgets = useWidgetsStore.getState().getForNote(note.id);
  const innerCellPx = rect.w / INTERIOR_SPAN;
  const moving = liftedNoteIds.includes(note.id);
  const lifted = liftedNoteIds.some((id) => isInLiftedSubtree(note, id));
  const invalid =
    dragInvalid || resizeInvalid || (selectionInvalid && moving);

  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        background: note.color,
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        outline: invalid
          ? `2px solid ${NOTE_INVALID_STROKE}`
          : selected
            ? `2px solid ${SELECTION_STROKE}`
            : "none",
        outlineOffset: -1,
        pointerEvents: "none",
        overflow: "visible",
        zIndex: lifted ? 3 : 0,
      }}
    >
      {/* id label — toggleable in settings */}
      {showNoteIds && rect.w >= 40 && (
        <div
          style={{
            position: "absolute",
            top: 3,
            left: 5,
            fontFamily: "monospace",
            fontSize: Math.max(7, Math.min(11, rect.w * 0.03)),
            lineHeight: 1.2,
            color: "rgba(0,0,0,0.55)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          #{note.id.slice(0, 8)}
        </div>
      )}

      {/* Title bar */}
      <div
        data-note-interactive={isInteractive ? "" : undefined}
        onPointerEnter={() => isInteractive && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onDoubleClick={(e) => {
          if (!isInteractive) return;
          e.stopPropagation();
          setEditingNote(note.id);
        }}
        onContextMenu={(e) => {
          if (!isInteractive) return;
          e.preventDefault();
          e.stopPropagation();
          openContextMenu({ noteId: note.id, x: e.clientX, y: e.clientY });
        }}
        {...(isInteractive && !isEditing ? dragHandlers : {})}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: titleBarHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            isInteractive && hovered ? TITLE_HOVER_OVERLAY : "transparent",
          cursor: isInteractive ? (isEditing ? "text" : "grab") : "default",
          pointerEvents: isInteractive ? "auto" : "none",
          padding: "0 8px",
          boxSizing: "border-box",
          zIndex: 4,
        }}
      >
        {isEditing ? (
          <TitleEditor note={note} fontSize={fontSize} />
        ) : (
          <span
            style={{
              fontSize,
              fontWeight: 600,
              color: "rgba(0,0,0,0.78)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
              pointerEvents: "none",
            }}
          >
            {note.title || (isInteractive ? "Untitled" : "")}
          </span>
        )}
      </div>

      {hostedWidgets.map((widget) => {
        const w = widget.width * innerCellPx;
        const h = widget.height * innerCellPx;
        if (w < MIN_RENDER_PX || h < MIN_RENDER_PX) return null;
        return (
          <TextBlockView
            key={widget.id}
            widget={widget}
            rect={{
              x: widget.x * innerCellPx,
              y: widget.y * innerCellPx,
              w,
              h,
            }}
            cellPx={innerCellPx}
            interactive={false}
          />
        );
      })}

      {/* Corner resize handles */}
      {isInteractive &&
        !isEditing &&
        !multi &&
        CORNERS.map((corner) => (
          <div
            key={corner}
            data-note-interactive=""
            {...handlersFor(corner)}
            style={cornerHandleStyle(corner)}
          />
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Corner handles
// ---------------------------------------------------------------------------

const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];
const HANDLE_PX = 14;

// Invisible corner hit zones — the resize cursor is the only visual cue.
function cornerHandleStyle(corner: Corner): React.CSSProperties {
  return {
    position: "absolute",
    width: HANDLE_PX,
    height: HANDLE_PX,
    top: corner[0] === "n" ? -HANDLE_PX / 2 : undefined,
    bottom: corner[0] === "s" ? -HANDLE_PX / 2 : undefined,
    left: corner[1] === "w" ? -HANDLE_PX / 2 : undefined,
    right: corner[1] === "e" ? -HANDLE_PX / 2 : undefined,
    background: "transparent",
    cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
    pointerEvents: "auto",
    zIndex: 5,
  };
}

// ---------------------------------------------------------------------------
// Inline title editor
// ---------------------------------------------------------------------------

function TitleEditor({ note, fontSize }: { note: Note; fontSize: number }) {
  const [value, setValue] = useState(note.title);
  const updateNote = useNotesStore((s) => s.updateNote);
  const setEditingNote = useUiStore((s) => s.setEditingNote);

  function commit() {
    updateNote(note.id, { title: value.trim() });
    setEditingNote(null);
  }

  return (
    <input
      data-note-interactive=""
      autoFocus
      aria-label="Note title"
      placeholder="Title"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditingNote(null);
      }}
      style={{
        width: "100%",
        textAlign: "center",
        fontSize,
        fontWeight: 600,
        color: "rgba(0,0,0,0.85)",
        background: "rgba(255,255,255,0.55)",
        border: "none",
        borderRadius: 4,
        outline: "1px solid rgba(0,0,0,0.25)",
        padding: "2px 4px",
        boxSizing: "border-box",
      }}
    />
  );
}
