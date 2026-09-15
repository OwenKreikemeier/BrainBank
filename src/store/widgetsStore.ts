// ---------------------------------------------------------------------------
// widgetsStore — in-memory cache of tools attached to notes
// ---------------------------------------------------------------------------
// Widgets (text blocks, images, …) live on a specific note's interior.
// Indexed by noteId so a frame can fetch its tools in O(1), and so deleting a
// note can cascade-delete every widget attached to it or its descendants.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { db } from "../db/database";
import {
  DEFAULT_TEXT_ALIGN,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_FONT,
  DEFAULT_TEXT_FONT_SIZE,
  type TextAlign,
  type Widget,
  type WidgetLayerMove,
  type WidgetType,
} from "../types";

interface NewWidgetInput {
  noteId: string;
  type?: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  rotation?: number;
  align?: TextAlign;
  imageBlob?: Blob;
}

interface WidgetsStore {
  byId: Map<string, Widget>;
  byNoteId: Map<string, string[]>;
  version: number;

  loadAll: () => Promise<void>;
  addWidget: (input: NewWidgetInput) => Widget;
  /** Insert already-built widgets (used when pasting a copied note tree). */
  importWidgets: (widgets: Widget[]) => void;
  /** Cache-only geometry update (live drag / resize / rotate). */
  moveWidget: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation?: number
  ) => void;
  persistWidget: (id: string) => void;
  updateWidget: (id: string, patch: Partial<Widget>) => void;
  deleteWidget: (id: string) => void;
  /** Remove every widget attached to any of these notes (cascade). */
  deleteForNotes: (noteIds: string[]) => void;
  getWidget: (id: string | null) => Widget | undefined;
  getForNote: (noteId: string | null) => Widget[];
  /** Change stacking order among widgets on the same note. */
  moveWidgetLayer: (id: string, move: WidgetLayerMove) => void;
}

function widgetCreatedAt(w: Widget): number {
  const value = w.createdAt;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function compareWidgetLayer(a: Widget, b: Widget): number {
  const za = typeof a.zIndex === "number" ? a.zIndex : 0;
  const zb = typeof b.zIndex === "number" ? b.zIndex : 0;
  if (za !== zb) return za - zb;
  const ta = widgetCreatedAt(a);
  const tb = widgetCreatedAt(b);
  if (ta !== tb) return ta - tb;
  return a.id.localeCompare(b.id);
}

function nextZIndex(siblings: Widget[]): number {
  if (siblings.length === 0) return 0;
  return (
    siblings.reduce(
      (max, w) => Math.max(max, typeof w.zIndex === "number" ? w.zIndex : 0),
      0
    ) + 1
  );
}

function indexByNote(widgets: Widget[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const w of widgets) {
    const list = index.get(w.noteId) ?? [];
    list.push(w.id);
    index.set(w.noteId, list);
  }
  return index;
}

export const useWidgetsStore = create<WidgetsStore>((set, get) => ({
  byId: new Map(),
  byNoteId: new Map(),
  version: 0,

  async loadAll() {
    const raw = await db.widgets.toArray();
    const all: Widget[] = raw.map((w) => ({
      ...w,
      type: w.type === "image" ? ("image" as const) : ("text" as const),
      rotation: typeof w.rotation === "number" ? w.rotation : 0,
      align: w.align === "center" || w.align === "right" ? w.align : DEFAULT_TEXT_ALIGN,
      imageBlob: w.imageBlob instanceof Blob ? w.imageBlob : undefined,
      zIndex: typeof w.zIndex === "number" ? w.zIndex : 0,
    }));
    const byId = new Map<string, Widget>();
    for (const w of all) byId.set(w.id, w);
    set((s) => ({
      byId,
      byNoteId: indexByNote(all),
      version: s.version + 1,
    }));
  },

  addWidget(input) {
    const now = new Date();
    const widget: Widget = {
      id: crypto.randomUUID(),
      noteId: input.noteId,
      type: input.type ?? "text",
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      rotation: input.rotation ?? 0,
      content: input.content ?? "",
      fontFamily: input.fontFamily ?? DEFAULT_TEXT_FONT,
      fontSize: input.fontSize ?? DEFAULT_TEXT_FONT_SIZE,
      color: input.color ?? DEFAULT_TEXT_COLOR,
      align: input.align ?? DEFAULT_TEXT_ALIGN,
      imageBlob: input.imageBlob,
      zIndex: nextZIndex(get().getForNote(input.noteId)),
      createdAt: now,
      updatedAt: now,
    };

    const { byId, byNoteId } = get();
    byId.set(widget.id, widget);
    const list = byNoteId.get(widget.noteId) ?? [];
    list.push(widget.id);
    byNoteId.set(widget.noteId, list);

    set((s) => ({ version: s.version + 1 }));
    void db.widgets.add(widget);
    return widget;
  },

  importWidgets(widgets) {
    if (widgets.length === 0) return;
    const { byId, byNoteId } = get();
    for (const widget of widgets) {
      byId.set(widget.id, widget);
      const list = byNoteId.get(widget.noteId) ?? [];
      list.push(widget.id);
      byNoteId.set(widget.noteId, list);
    }
    set((s) => ({ version: s.version + 1 }));
    void db.widgets.bulkAdd(widgets);
  },

  moveWidget(id, x, y, width, height, rotation) {
    const widget = get().byId.get(id);
    if (!widget) return;
    widget.x = x;
    widget.y = y;
    widget.width = width;
    widget.height = height;
    if (rotation !== undefined) widget.rotation = rotation;
    set((s) => ({ version: s.version + 1 }));
  },

  persistWidget(id) {
    const widget = get().byId.get(id);
    if (!widget) return;
    widget.updatedAt = new Date();
    void db.widgets.put(widget);
  },

  updateWidget(id, patch) {
    const widget = get().byId.get(id);
    if (!widget) return;
    Object.assign(widget, patch, { updatedAt: new Date() });
    set((s) => ({ version: s.version + 1 }));
    void db.widgets.put(widget);
  },

  deleteWidget(id) {
    const { byId, byNoteId } = get();
    const widget = byId.get(id);
    if (!widget) return;
    byId.delete(id);
    const list = byNoteId.get(widget.noteId);
    if (list) {
      byNoteId.set(
        widget.noteId,
        list.filter((wid) => wid !== id)
      );
    }
    set((s) => ({ version: s.version + 1 }));
    void db.widgets.delete(id);
  },

  deleteForNotes(noteIds) {
    if (noteIds.length === 0) return;
    const { byId, byNoteId } = get();
    const removed: string[] = [];
    for (const noteId of noteIds) {
      const ids = byNoteId.get(noteId) ?? [];
      for (const id of ids) {
        byId.delete(id);
        removed.push(id);
      }
      byNoteId.delete(noteId);
    }
    if (removed.length === 0) return;
    set((s) => ({ version: s.version + 1 }));
    void db.widgets.bulkDelete(removed);
  },

  getWidget(id) {
    if (!id) return undefined;
    return get().byId.get(id);
  },

  getForNote(noteId) {
    if (!noteId) return [];
    const { byId, byNoteId } = get();
    return (byNoteId.get(noteId) ?? [])
      .map((id) => byId.get(id))
      .filter((w): w is Widget => w !== undefined)
      .sort(compareWidgetLayer);
  },

  moveWidgetLayer(id, move) {
    const widget = get().byId.get(id);
    if (!widget) return;
    const list = get().getForNote(widget.noteId);
    const index = list.findIndex((w) => w.id === id);
    if (index < 0) return;

    const next = list.slice();
    if (move === "backward") {
      if (index === 0) return;
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
    } else if (move === "forward") {
      if (index === next.length - 1) return;
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
    } else if (move === "back") {
      if (index === 0) return;
      next.splice(index, 1);
      next.unshift(widget);
    } else if (move === "front") {
      if (index === next.length - 1) return;
      next.splice(index, 1);
      next.push(widget);
    }

    const changed: Widget[] = [];
    next.forEach((item, zIndex) => {
      if (item.zIndex !== zIndex) {
        item.zIndex = zIndex;
        item.updatedAt = new Date();
        changed.push(item);
      }
    });
    if (changed.length === 0) return;
    set((s) => ({ version: s.version + 1 }));
    void db.widgets.bulkPut(changed);
  },
}));
