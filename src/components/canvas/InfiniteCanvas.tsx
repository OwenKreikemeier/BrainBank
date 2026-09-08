// ---------------------------------------------------------------------------
// InfiniteCanvas — the main canvas viewport
// ---------------------------------------------------------------------------
// Layering (back to front):
//   viewport background  — canvas colour, captures pointer/wheel events
//   FrameBorder (z 0)    — backdrops for the current note and its ancestors
//   GridOverlay (z 0)    — grid lines over the current frame's interior only,
//                          below notes so un-entered notes stay clean
//   NotesLayer  (z 1)    — sticky notes, drawn in screen space
//   PlacementOverlay(z3) — translucent square preview while placing
//   CanvasControls (z10) — HUD (reset, settings, place button)
//
// Notes are positioned directly in screen pixels (computed from the current
// frame's pan/zoom), so there is no CSS world-transform layer to manage.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { useNotesStore } from "../../store/notesStore";
import { useWidgetsStore } from "../../store/widgetsStore";
import { useSettingsStore, THEME_COLORS } from "../../store/settingsStore";
import { useCanvasNavigation } from "../../hooks/useCanvasNavigation";
import { GridOverlay } from "./GridOverlay";
import { FrameBorder } from "./FrameBorder";
import { NotesLayer } from "./NotesLayer";
import { WidgetsLayer } from "./WidgetsLayer";
import { PlacementOverlay } from "./PlacementOverlay";
import { CanvasControls } from "./CanvasControls";
import { NoteContextMenu } from "./NoteContextMenu";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { SettingsModal } from "./SettingsModal";
import { SelectionFrame } from "./SelectionFrame";
import { TextToolbar } from "./TextToolbar";

export function InfiniteCanvas() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const placementActive = useCanvasStore((s) => s.placementActive);
  const theme = useSettingsStore((s) => s.theme);

  useCanvasNavigation(viewportRef);

  useEffect(() => {
    void useNotesStore.getState().loadAll();
    void useWidgetsStore.getState().loadAll();
  }, []);

  return (
    <div
      ref={viewportRef}
      role="application"
      aria-label="Canvas"
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        cursor: placementActive ? "crosshair" : "grab",
        userSelect: "none",
        // The root canvas colour (theme-dependent); the note you're inside
        // (and its ancestors) are drawn as bounded rects by FrameBorder.
        background: THEME_COLORS[theme].background,
      }}
    >
      <FrameBorder />
      <GridOverlay />
      <NotesLayer />
      <WidgetsLayer />
      <SelectionFrame />
      <PlacementOverlay />
      <CanvasControls />
      <TextToolbar />
      <NoteContextMenu />
      <ConfirmDeleteModal />
      <SettingsModal />
    </div>
  );
}
