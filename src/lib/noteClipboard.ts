// ---------------------------------------------------------------------------
// Snapshot / restore a note tree for copy and paste.
// ---------------------------------------------------------------------------
// A copied note includes every nested note plus every widget (text, images,
// …) attached to any of those notes. Interior coordinates stay as they are:
// only the pasted root gets a new parent, position, and size.

import {
  DEFAULT_TEXT_ALIGN,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_FONT,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_TITLE_COLOR,
  DEFAULT_TITLE_FONT,
  DEFAULT_TITLE_FONT_SIZE,
  type Note,
  type NoteType,
  type TextAlign,
  type Widget,
  type WidgetType,
} from "../types";
import { useCanvasStore } from "../store/canvasStore";
import { useNotesStore } from "../store/notesStore";
import { useUiStore } from "../store/uiStore";
import { useWidgetsStore } from "../store/widgetsStore";

export interface NoteClipboardNote {
  id: string;
  /** Null on the copied root; original parent id on descendants. */
  parentId: string | null;
  x: number;
  y: number;
  size: number;
  type: NoteType;
  color: string;
  title: string;
  titleColor: string;
  titleFontFamily: string;
  titleFontSize: number;
  content: string;
}

export interface NoteClipboardWidget {
  noteId: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  align: TextAlign;
  imageBlob?: Blob;
  zIndex: number;
}

export interface NoteClipboard {
  notes: NoteClipboardNote[];
  widgets: NoteClipboardWidget[];
}

function cloneBlob(blob: Blob | undefined): Blob | undefined {
  return blob instanceof Blob ? blob.slice() : undefined;
}

export function captureNoteClipboard(noteId: string): NoteClipboard | null {
  const notes = useNotesStore.getState();
  const widgets = useWidgetsStore.getState();
  const root = notes.getNote(noteId);
  if (!root) return null;

  const collected: Note[] = [];
  const queue: string[] = [root.id];
  while (queue.length) {
    const id = queue.shift()!;
    const note = notes.getNote(id);
    if (!note) continue;
    collected.push(note);
    for (const child of notes.getChildren(id)) queue.push(child.id);
  }

  const clipNotes: NoteClipboardNote[] = collected.map((note) => ({
    id: note.id,
    parentId: note.id === root.id ? null : note.parentId,
    x: note.x,
    y: note.y,
    size: note.size,
    type: note.type,
    color: note.color,
    title: note.title ?? "",
    titleColor: note.titleColor ?? DEFAULT_TITLE_COLOR,
    titleFontFamily: note.titleFontFamily ?? DEFAULT_TITLE_FONT,
    titleFontSize: note.titleFontSize ?? DEFAULT_TITLE_FONT_SIZE,
    content: note.content ?? "",
  }));

  const clipWidgets: NoteClipboardWidget[] = [];
  for (const note of collected) {
    for (const widget of widgets.getForNote(note.id)) {
      clipWidgets.push({
        noteId: widget.noteId,
        type: widget.type,
        x: widget.x,
        y: widget.y,
        width: widget.width,
        height: widget.height,
        rotation: widget.rotation ?? 0,
        content: widget.content ?? "",
        fontFamily: widget.fontFamily ?? DEFAULT_TEXT_FONT,
        fontSize: widget.fontSize ?? DEFAULT_TEXT_FONT_SIZE,
        color: widget.color ?? DEFAULT_TEXT_COLOR,
        align:
          widget.align === "center" || widget.align === "right"
            ? widget.align
            : DEFAULT_TEXT_ALIGN,
        imageBlob: cloneBlob(widget.imageBlob),
        zIndex: typeof widget.zIndex === "number" ? widget.zIndex : 0,
      });
    }
  }

  return { notes: clipNotes, widgets: clipWidgets };
}

export function pasteNoteClipboard(
  clip: NoteClipboard,
  parentId: string | null,
  x: number,
  y: number,
  size: number
): Note | null {
  if (clip.notes.length === 0) return null;

  const notes = useNotesStore.getState();
  const parent = parentId ? notes.getNote(parentId) : undefined;
  const rootDepth = parent ? parent.depth + 1 : 0;
  const rootSnap =
    clip.notes.find((note) => note.parentId === null) ?? clip.notes[0];

  const idMap = new Map<string, string>();
  for (const note of clip.notes) idMap.set(note.id, crypto.randomUUID());

  const depthByOldId = new Map<string, number>();
  depthByOldId.set(rootSnap.id, rootDepth);
  for (const note of clip.notes) {
    if (note.id === rootSnap.id) continue;
    const parentDepth =
      note.parentId !== null ? depthByOldId.get(note.parentId) : undefined;
    depthByOldId.set(
      note.id,
      parentDepth !== undefined ? parentDepth + 1 : rootDepth + 1
    );
  }

  const now = new Date();
  const created: Note[] = clip.notes.map((note) => {
    const isRoot = note.id === rootSnap.id;
    return {
      id: idMap.get(note.id)!,
      parentId: isRoot ? parentId : idMap.get(note.parentId ?? "") ?? parentId,
      depth: depthByOldId.get(note.id) ?? rootDepth,
      x: isRoot ? x : note.x,
      y: isRoot ? y : note.y,
      size: isRoot ? size : note.size,
      type: note.type,
      color: note.color,
      title: note.title,
      titleColor: note.titleColor,
      titleFontFamily: note.titleFontFamily,
      titleFontSize: note.titleFontSize,
      content: note.content,
      createdAt: now,
      updatedAt: now,
    };
  });

  const createdWidgets: Widget[] = clip.widgets.flatMap((widget) => {
    const noteId = idMap.get(widget.noteId);
    if (!noteId) return [];
    return [
      {
        id: crypto.randomUUID(),
        noteId,
        type: widget.type,
        x: widget.x,
        y: widget.y,
        width: widget.width,
        height: widget.height,
        rotation: widget.rotation,
        content: widget.content,
        fontFamily: widget.fontFamily,
        fontSize: widget.fontSize,
        color: widget.color,
        align: widget.align,
        imageBlob: cloneBlob(widget.imageBlob),
        zIndex: widget.zIndex,
        createdAt: now,
        updatedAt: now,
      },
    ];
  });

  notes.importNotes(created);
  useWidgetsStore.getState().importWidgets(createdWidgets);
  return created.find((note) => note.id === idMap.get(rootSnap.id)) ?? created[0];
}

export function copyNote(noteId: string): boolean {
  const clip = captureNoteClipboard(noteId);
  if (!clip) return false;
  useUiStore.getState().setNoteClipboard(clip);
  return true;
}

export function beginPastePlacement(): boolean {
  const clip = useUiStore.getState().noteClipboard;
  if (!clip || clip.notes.length === 0) return false;
  const ui = useUiStore.getState();
  ui.setToolMenuOpen(false);
  ui.closeContextMenu();
  ui.setSelectedWidget(null);
  useCanvasStore.getState().setPlacementActive(true, "paste");
  return true;
}

/** Note to copy from the current selection or open settings menu. */
export function noteIdForCopy(): string | null {
  const ui = useUiStore.getState();
  if (ui.contextMenu) return ui.contextMenu.noteId;
  if (ui.selectedNoteIds.length === 1 && ui.selectedWidgetIds.length === 0) {
    return ui.selectedNoteIds[0];
  }
  return null;
}
