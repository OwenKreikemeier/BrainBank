// ---------------------------------------------------------------------------
// notesStore — in-memory note cache + persistence
// ---------------------------------------------------------------------------
// Notes form a tree. To make zooming between notes instant we keep two caches
// in memory and mirror every change to Dexie:
//
//   byId             — id -> Note               (the upward link via parentId)
//   childrenByParent — parentKey -> id[]        (the downward "next-level" link)
//
// `parentKey` is the parent's id, or the literal "root" for top-level notes.
// A `version` counter bumps on every mutation so React components can re-read
// the (mutable) Maps reliably.
//
// IMPORTANT: a note's `depth` is always derived from its parent (root child = 0,
// otherwise parent.depth + 1). We never trust a separate counter — that is what
// caused the old "orphan note with depth 1 and no parent" bug.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { db } from "../db/database";
import { NOTE_COLOR, type Note, type NoteType } from "../types";

const ROOT_KEY = "root";

function parentKey(parentId: string | null): string {
  return parentId ?? ROOT_KEY;
}

interface NewNoteInput {
  parentId: string | null;
  x: number;
  y: number;
  size: number;
  type?: NoteType;
  color?: string;
  title?: string;
  content?: string;
}

interface NotesStore {
  byId: Map<string, Note>;
  childrenByParent: Map<string, string[]>;
  /** Bumps on every mutation so subscribers know to re-read the caches. */
  version: number;

  loadAll: () => Promise<void>;
  addNote: (input: NewNoteInput) => Note;
  /** Cache-only position update (used during a live drag). */
  moveNote: (id: string, x: number, y: number) => void;
  /** Cache-only rect update (used during a live corner resize). */
  resizeNote: (id: string, x: number, y: number, size: number) => void;
  /** Persist the current cached note to disk (used when a drag commits). */
  persistNote: (id: string) => void;
  /** Update fields in cache + disk (e.g. color, title). */
  updateNote: (id: string, patch: Partial<Note>) => void;
  /** Delete a note and all of its descendants (cache + disk). */
  deleteNote: (id: string) => void;
  getNote: (id: string | null) => Note | undefined;
  getChildren: (parentId: string | null) => Note[];
  /** Total number of notes nested anywhere under `id`. */
  countDescendants: (id: string) => number;
}

/** Build the childrenByParent index from a flat list of notes. */
function indexChildren(notes: Note[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const note of notes) {
    const key = parentKey(note.parentId);
    const list = index.get(key) ?? [];
    list.push(note.id);
    index.set(key, list);
  }
  return index;
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  byId: new Map(),
  childrenByParent: new Map(),
  version: 0,

  async loadAll() {
    const all = await db.notes.toArray();
    const byId = new Map<string, Note>();
    for (const note of all) byId.set(note.id, note);

    // Compute a correct depth for a note by walking its parent chain.
    // Returns null if the chain is broken (missing parent) or cyclic.
    function correctDepth(note: Note): number | null {
      let depth = 0;
      let current = note;
      const seen = new Set<string>();
      while (current.parentId !== null) {
        if (seen.has(current.id)) return null; // cycle guard
        seen.add(current.id);
        const parent = byId.get(current.parentId);
        if (!parent) return null; // broken chain -> orphan
        depth += 1;
        current = parent;
      }
      return depth;
    }

    const survivors: Note[] = [];
    const toDelete: string[] = [];
    const toPersist: Note[] = [];

    for (const note of all) {
      const depth = correctDepth(note);
      if (depth === null) {
        toDelete.push(note.id);
        continue;
      }
      // Repair drifted depth and backfill missing title.
      const fixed: Note = {
        ...note,
        depth,
        title: note.title ?? "",
      };
      if (fixed.depth !== note.depth || note.title === undefined) {
        toPersist.push(fixed);
      }
      byId.set(fixed.id, fixed);
      survivors.push(fixed);
    }

    set((s) => ({
      byId,
      childrenByParent: indexChildren(survivors),
      version: s.version + 1,
    }));

    // Persist repairs in the background.
    if (toDelete.length) void db.notes.bulkDelete(toDelete);
    if (toPersist.length) void db.notes.bulkPut(toPersist);
  },

  addNote(input) {
    const now = new Date();
    const { byId, childrenByParent } = get();

    // Depth is ALWAYS derived from the parent — never from an external counter.
    const parent = input.parentId ? byId.get(input.parentId) : undefined;
    const depth = parent ? parent.depth + 1 : 0;

    const note: Note = {
      id: crypto.randomUUID(),
      parentId: input.parentId,
      depth,
      x: input.x,
      y: input.y,
      size: input.size,
      type: input.type ?? "text",
      color: input.color ?? NOTE_COLOR,
      title: input.title ?? "",
      content: input.content ?? "",
      createdAt: now,
      updatedAt: now,
    };

    byId.set(note.id, note);
    const key = parentKey(note.parentId);
    const list = childrenByParent.get(key) ?? [];
    list.push(note.id);
    childrenByParent.set(key, list);

    set((s) => ({ version: s.version + 1 }));
    void db.notes.add(note);
    return note;
  },

  moveNote(id, x, y) {
    const note = get().byId.get(id);
    if (!note) return;
    note.x = x;
    note.y = y;
    set((s) => ({ version: s.version + 1 }));
  },

  resizeNote(id, x, y, size) {
    const note = get().byId.get(id);
    if (!note) return;
    note.x = x;
    note.y = y;
    note.size = size;
    set((s) => ({ version: s.version + 1 }));
  },

  persistNote(id) {
    const note = get().byId.get(id);
    if (!note) return;
    note.updatedAt = new Date();
    void db.notes.put(note);
  },

  updateNote(id, patch) {
    const note = get().byId.get(id);
    if (!note) return;
    Object.assign(note, patch, { updatedAt: new Date() });
    set((s) => ({ version: s.version + 1 }));
    void db.notes.put(note);
  },

  deleteNote(id) {
    const { byId, childrenByParent } = get();
    const target = byId.get(id);
    if (!target) return;

    // Collect the note plus every descendant (breadth-first).
    const removed: string[] = [];
    const queue: string[] = [id];
    while (queue.length) {
      const current = queue.shift()!;
      removed.push(current);
      const children = childrenByParent.get(current) ?? [];
      queue.push(...children);
    }

    for (const rid of removed) {
      byId.delete(rid);
      childrenByParent.delete(rid); // drop its children list
    }

    // Remove the target from its parent's children list.
    const parentList = childrenByParent.get(parentKey(target.parentId));
    if (parentList) {
      childrenByParent.set(
        parentKey(target.parentId),
        parentList.filter((cid) => cid !== id)
      );
    }

    set((s) => ({ version: s.version + 1 }));
    void db.notes.bulkDelete(removed);
  },

  getNote(id) {
    if (!id) return undefined;
    return get().byId.get(id);
  },

  getChildren(parentId) {
    const { byId, childrenByParent } = get();
    const ids = childrenByParent.get(parentKey(parentId)) ?? [];
    return ids
      .map((id) => byId.get(id))
      .filter((n): n is Note => n !== undefined);
  },

  countDescendants(id) {
    const { childrenByParent } = get();
    let count = 0;
    const queue: string[] = [...(childrenByParent.get(id) ?? [])];
    while (queue.length) {
      const current = queue.shift()!;
      count += 1;
      queue.push(...(childrenByParent.get(current) ?? []));
    }
    return count;
  },
}));
