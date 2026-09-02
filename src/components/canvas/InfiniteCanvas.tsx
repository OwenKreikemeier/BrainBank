// ---------------------------------------------------------------------------
// InfiniteCanvas — the main canvas viewport
// ---------------------------------------------------------------------------
// Layering (back to front):
//   viewport background  — dark canvas colour, captures pointer/wheel events
//   FrameBorder (z 0)    — current note's interior colour + boundary edges
//   NotesLayer  (z 1)    — sticky notes, drawn in screen space
//   GridOverlay (z 2)    — grid lines, kept above notes for continuity
//   PlacementOverlay(z3) — translucent square preview while placing
//   CanvasControls (z10) — HUD (reset, place button)
//
// Notes are positioned directly in screen pixels (computed from the current
// frame's pan/zoom), so there is no CSS world-transform layer to manage.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { useNotesStore } from "../../store/notesStore";
import { useSettingsStore, THEME_COLORS } from "../../store/settingsStore";
import { useCanvasNavigation } from "../../hooks/useCanvasNavigation";
import { GridOverlay } from "./GridOverlay";
import { FrameBorder } from "./FrameBorder";
import { NotesLayer } from "./NotesLayer";
import { PlacementOverlay } from "./PlacementOverlay";
import { CanvasControls } from "./CanvasControls";
import { NoteContextMenu } from "./NoteContextMenu";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { SettingsModal } from "./SettingsModal";

export function InfiniteCanvas() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const placementActive = useCanvasStore((s) => s.placementActive);
  const theme = useSettingsStore((s) => s.theme);

  useCanvasNavigation(viewportRef);

  // Hydrate the note cache from the local database once on startup.
  useEffect(() => {
    void useNotesStore.getState().loadAll();
  }, []);

  return (
    <div
      ref={viewportRef}
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
      <NotesLayer />
      <GridOverlay />
      <PlacementOverlay />
      <CanvasControls />
      <NoteContextMenu />
      <ConfirmDeleteModal />
      <SettingsModal />
    </div>
  );
}
