// ---------------------------------------------------------------------------
// uiStore — transient interaction / overlay state (Zustand)
// ---------------------------------------------------------------------------
// Keeps canvasStore focused on the viewport. This holds which note is being
// renamed, the open right-click menu, and the delete-confirmation modal.
// ---------------------------------------------------------------------------

import { create } from "zustand";

export interface ContextMenuState {
  noteId: string;
  x: number;
  y: number;
}

export interface ConfirmDeleteState {
  noteId: string;
  descendantCount: number;
}

interface UiStore {
  /** Note currently being renamed (inline title editor), or null */
  editingNoteId: string | null;
  /** Open right-click menu, or null */
  contextMenu: ContextMenuState | null;
  /** Open delete-confirmation modal, or null */
  confirmDelete: ConfirmDeleteState | null;
  /** Whether the settings modal is open */
  settingsOpen: boolean;

  setEditingNote: (id: string | null) => void;
  openContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;
  openConfirmDelete: (state: ConfirmDeleteState) => void;
  closeConfirmDelete: () => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  editingNoteId: null,
  contextMenu: null,
  confirmDelete: null,
  settingsOpen: false,

  setEditingNote(id) {
    set({ editingNoteId: id });
  },
  openContextMenu(menu) {
    set({ contextMenu: menu });
  },
  closeContextMenu() {
    set({ contextMenu: null });
  },
  openConfirmDelete(state) {
    set({ confirmDelete: state, contextMenu: null });
  },
  closeConfirmDelete() {
    set({ confirmDelete: null });
  },
  setSettingsOpen(open) {
    set({ settingsOpen: open });
  },
}));
