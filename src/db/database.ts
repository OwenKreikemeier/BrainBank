// ---------------------------------------------------------------------------
// BrainBank local database — powered by Dexie (IndexedDB wrapper)
// ---------------------------------------------------------------------------
// Dexie handles large text, binary blobs (images/audio/video later), and
// relational queries via indexed fields. This is the persistent source of
// truth; the in-memory notesStore caches it for fast access while navigating.
// ---------------------------------------------------------------------------

import Dexie, { type EntityTable } from "dexie";
import type { Note } from "../types";

class BrainBankDatabase extends Dexie {
  notes!: EntityTable<Note, "id">;

  constructor() {
    super("BrainBank");

    // notes — the full tree, keyed by UUID string:
    //   'id'       — uuid primary key (assigned by the app)
    //   'parentId' — index to fetch a frame's direct children
    //   'depth'    — index for depth-based queries
    this.version(1).stores({
      notes: "id, parentId, depth",
    });
  }
}

export const db = new BrainBankDatabase();
