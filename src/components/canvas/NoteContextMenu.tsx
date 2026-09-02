// ---------------------------------------------------------------------------
// NoteContextMenu — right-click menu for a note's title bar
// ---------------------------------------------------------------------------
// Offers Delete and Change-color (preset swatches + a custom picker). Deleting
// a note that has descendants opens a confirmation modal first. A transparent
// full-screen backdrop closes the menu on any outside click.
// ---------------------------------------------------------------------------

import { useNotesStore } from "../../store/notesStore";
import { useUiStore } from "../../store/uiStore";
import { NOTE_PALETTE } from "../../types";

export function NoteContextMenu() {
  const menu = useUiStore((s) => s.contextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const openConfirmDelete = useUiStore((s) => s.openConfirmDelete);

  const getNote = useNotesStore((s) => s.getNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const countDescendants = useNotesStore((s) => s.countDescendants);

  if (!menu) return null;
  const note = getNote(menu.noteId);
  if (!note) return null;

  function handleDelete() {
    const count = countDescendants(menu!.noteId);
    if (count > 0) {
      openConfirmDelete({ noteId: menu!.noteId, descendantCount: count });
    } else {
      deleteNote(menu!.noteId);
      closeContextMenu();
    }
  }

  function pickColor(color: string) {
    updateNote(menu!.noteId, { color });
    closeContextMenu();
  }

  // Keep the menu on-screen.
  const left = Math.min(menu.x, window.innerWidth - 200);
  const top = Math.min(menu.y, window.innerHeight - 160);

  return (
    <div data-hud>
      {/* Backdrop closes the menu */}
      <div
        onPointerDown={closeContextMenu}
        onContextMenu={(e) => {
          e.preventDefault();
          closeContextMenu();
        }}
        style={{ position: "fixed", inset: 0, zIndex: 40 }}
      />

      <div
        style={{
          position: "fixed",
          left,
          top,
          zIndex: 41,
          minWidth: 180,
          background: "rgba(28,30,38,0.98)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          padding: 8,
          color: "rgba(255,255,255,0.85)",
          fontSize: 13,
        }}
      >
        <button onClick={handleDelete} style={menuItemStyle}>
          Delete note
        </button>

        <div style={{ padding: "8px 8px 4px", opacity: 0.6, fontSize: 11 }}>
          Color
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            padding: "0 8px 6px",
          }}
        >
          {NOTE_PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => pickColor(color)}
              title={color}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: color,
                border:
                  color === note.color
                    ? "2px solid white"
                    : "1px solid rgba(255,255,255,0.3)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
        <label style={{ ...menuItemStyle, cursor: "pointer", display: "flex", gap: 8, alignItems: "center" }}>
          Custom…
          <input
            type="color"
            value={note.color}
            onChange={(e) => pickColor(e.target.value)}
            style={{ marginLeft: "auto", width: 28, height: 22, border: "none", background: "none", cursor: "pointer" }}
          />
        </label>
      </div>
    </div>
  );
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
