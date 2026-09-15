// ---------------------------------------------------------------------------
// Search notes by title for the HUD jump-to-note bar.
// ---------------------------------------------------------------------------

import type { Note } from "../types";
import { useNotesStore } from "../store/notesStore";

export interface NoteSearchHit {
  id: string;
  title: string;
  depth: number;
  /** Title of the ancestor that sits on the root canvas. */
  rootTitle: string;
}

function displayTitle(note: Note): string {
  const title = (note.title ?? "").trim();
  return title || "Untitled";
}

function rootSurfaceNote(note: Note): Note {
  const getNote = useNotesStore.getState().getNote;
  let current = note;
  const seen = new Set<string>();
  while (current.parentId) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    const parent = getNote(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

function matchScore(title: string, query: string): number {
  if (title === query) return 0;
  if (title.startsWith(query)) return 1;
  return 2;
}

/** Ranked title matches. Empty query yields no hits. */
export function searchNotes(query: string): NoteSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits: Array<{ hit: NoteSearchHit; score: number }> = [];
  for (const note of useNotesStore.getState().byId.values()) {
    const title = displayTitle(note);
    const hay = title.toLowerCase();
    if (!hay.includes(q)) continue;
    hits.push({
      score: matchScore(hay, q),
      hit: {
        id: note.id,
        title,
        depth: note.depth,
        rootTitle: displayTitle(rootSurfaceNote(note)),
      },
    });
  }

  hits.sort(
    (a, b) =>
      a.score - b.score ||
      a.hit.depth - b.hit.depth ||
      a.hit.title.localeCompare(b.hit.title)
  );
  return hits.map((row) => row.hit);
}
