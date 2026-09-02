// ---------------------------------------------------------------------------
// ConfirmDeleteModal — full-screen confirmation for deleting a note that has
// children. Shows how many nested notes will also be removed.
// ---------------------------------------------------------------------------

import { useNotesStore } from "../../store/notesStore";
import { useUiStore } from "../../store/uiStore";

export function ConfirmDeleteModal() {
  const confirm = useUiStore((s) => s.confirmDelete);
  const closeConfirmDelete = useUiStore((s) => s.closeConfirmDelete);
  const deleteNote = useNotesStore((s) => s.deleteNote);

  if (!confirm) return null;

  function handleDelete() {
    deleteNote(confirm!.noteId);
    closeConfirmDelete();
  }

  return (
    <div
      data-hud
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onPointerDown={closeConfirmDelete}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: 380,
          maxWidth: "90vw",
          background: "rgba(28,30,38,0.99)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          padding: 24,
          color: "rgba(255,255,255,0.9)",
        }}
      >
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Delete this note?</h2>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.7)" }}>
          This note contains{" "}
          <strong style={{ color: "white" }}>
            {confirm.descendantCount}
          </strong>{" "}
          nested {confirm.descendantCount === 1 ? "note" : "notes"}. Deleting it
          will permanently remove the note and everything inside it.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button onClick={closeConfirmDelete} style={cancelButtonStyle}>
            Cancel
          </button>
          <button onClick={handleDelete} style={deleteButtonStyle}>
            Delete all
          </button>
        </div>
      </div>
    </div>
  );
}

const cancelButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.85)",
  fontSize: 14,
  cursor: "pointer",
};

const deleteButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid rgba(255,90,90,0.6)",
  background: "rgba(255,80,80,0.25)",
  color: "white",
  fontSize: 14,
  cursor: "pointer",
};
