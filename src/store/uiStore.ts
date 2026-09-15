// ---------------------------------------------------------------------------
// uiStore — transient interaction / overlay state (Zustand)
// ---------------------------------------------------------------------------
// Keeps canvasStore focused on the viewport. This holds which note is being
// renamed, the open right-click menu, the delete-confirmation modal, and the
// current multi-selection of notes and text widgets.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import type { NoteClipboard } from "../lib/noteClipboard";
import { useNotesStore } from "./notesStore";
import { useWidgetsStore } from "./widgetsStore";

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
  /** Notes currently being dragged or resized — rendered above siblings */
  liftedNoteIds: string[];
  /** Notes in the current selection */
  selectedNoteIds: string[];
  /** Text widgets in the current selection */
  selectedWidgetIds: string[];
  /** Primary selected widget (last clicked) — drives the text toolbar */
  selectedWidgetId: string | null;
  /** True while a group/item drag is in an illegal spot */
  selectionInvalid: boolean;
  /** Whether the + tool tray is expanded */
  toolMenuOpen: boolean;
  /** Copied note tree (nested notes + widgets), or null */
  noteClipboard: NoteClipboard | null;
  /** Whether the note search bar is expanded */
  searchOpen: boolean;

  setEditingNote: (id: string | null) => void;
  openContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;
  openConfirmDelete: (state: ConfirmDeleteState) => void;
  closeConfirmDelete: () => void;
  setSettingsOpen: (open: boolean) => void;
  setLiftedNotes: (ids: string[]) => void;
  setSelectedWidget: (id: string | null) => void;
  selectNote: (id: string, additive: boolean) => void;
  selectWidget: (id: string, additive: boolean) => void;
  clearSelection: () => void;
  pruneSelection: (frameId: string | null) => void;
  setSelectionInvalid: (invalid: boolean) => void;
  setToolMenuOpen: (open: boolean) => void;
  setNoteClipboard: (clip: NoteClipboard | null) => void;
  setSearchOpen: (open: boolean) => void;
}

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export const useUiStore = create<UiStore>((set, get) => ({
  editingNoteId: null,
  contextMenu: null,
  confirmDelete: null,
  settingsOpen: false,
  liftedNoteIds: [],
  selectedNoteIds: [],
  selectedWidgetIds: [],
  selectedWidgetId: null,
  selectionInvalid: false,
  toolMenuOpen: false,
  noteClipboard: null,
  searchOpen: false,

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
  setLiftedNotes(ids) {
    set({ liftedNoteIds: ids });
  },
  setSelectedWidget(id) {
    if (!id) {
      set({
        selectedWidgetId: null,
        selectedWidgetIds: [],
        selectedNoteIds: [],
        selectionInvalid: false,
      });
      return;
    }
    set({
      selectedWidgetId: id,
      selectedWidgetIds: [id],
      selectedNoteIds: [],
      selectionInvalid: false,
    });
  },
  selectNote(id, additive) {
    if (additive) {
      const selectedNoteIds = toggleId(get().selectedNoteIds, id);
      set({ selectedNoteIds, selectionInvalid: false });
      return;
    }
    set({
      selectedNoteIds: [id],
      selectedWidgetIds: [],
      selectedWidgetId: null,
      selectionInvalid: false,
    });
  },
  selectWidget(id, additive) {
    if (additive) {
      const selectedWidgetIds = toggleId(get().selectedWidgetIds, id);
      set({
        selectedWidgetIds,
        selectedWidgetId: selectedWidgetIds[selectedWidgetIds.length - 1] ?? null,
        selectionInvalid: false,
      });
      return;
    }
    set({
      selectedWidgetIds: [id],
      selectedWidgetId: id,
      selectedNoteIds: [],
      selectionInvalid: false,
    });
  },
  clearSelection() {
    set({
      selectedNoteIds: [],
      selectedWidgetIds: [],
      selectedWidgetId: null,
      selectionInvalid: false,
    });
  },
  pruneSelection(frameId) {
    const notes = useNotesStore.getState();
    const widgets = useWidgetsStore.getState();
    const { selectedNoteIds, selectedWidgetIds } = get();
    const nextNotes = selectedNoteIds.filter((id) => {
      const n = notes.getNote(id);
      return n !== undefined && n.parentId === frameId;
    });
    const nextWidgets =
      frameId === null
        ? []
        : selectedWidgetIds.filter((id) => {
            const w = widgets.getWidget(id);
            return w !== undefined && w.noteId === frameId;
          });
    set({
      selectedNoteIds: nextNotes,
      selectedWidgetIds: nextWidgets,
      selectedWidgetId: nextWidgets[nextWidgets.length - 1] ?? null,
    });
  },
  setSelectionInvalid(invalid) {
    set({ selectionInvalid: invalid });
  },
  setToolMenuOpen(open) {
    set({ toolMenuOpen: open });
  },
  setNoteClipboard(clip) {
    set({ noteClipboard: clip });
  },
  setSearchOpen(open) {
    set({ searchOpen: open });
  },
}));
