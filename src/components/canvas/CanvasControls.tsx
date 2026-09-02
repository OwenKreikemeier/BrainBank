// ---------------------------------------------------------------------------
// CanvasControls — HUD overlay
// ---------------------------------------------------------------------------
// Three pieces of chrome:
//   • bottom-right  reset button (returns to the root surface) + settings gear
//   • bottom-middle "+" button   (toggles note placement mode)
//
// The whole HUD is tagged `data-hud` so the canvas navigation hook ignores
// pointer-downs that land here (otherwise it would steal the click for panning
// and the buttons would never fire).
// ---------------------------------------------------------------------------

import { useCanvasStore } from "../../store/canvasStore";
import { useUiStore } from "../../store/uiStore";

export function CanvasControls() {
  const resetViewport = useCanvasStore((s) => s.resetViewport);
  const placementActive = useCanvasStore((s) => s.placementActive);
  const setPlacementActive = useCanvasStore((s) => s.setPlacementActive);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);

  return (
    <div data-hud>
      {/* Reset + settings — bottom right */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          zIndex: 10,
          display: "flex",
          gap: 8,
        }}
      >
        <button
          onClick={resetViewport}
          title="Reset view"
          style={hudButtonStyle(false)}
        >
          ⌂
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          style={hudButtonStyle(false)}
        >
          ⚙
        </button>
      </div>

      {/* Place note — bottom middle */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        {placementActive && (
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
              background: "rgba(0,0,0,0.45)",
              padding: "4px 10px",
              borderRadius: 6,
              whiteSpace: "nowrap",
            }}
          >
            Drag to draw a note · Esc to cancel
          </span>
        )}
        <button
          onClick={() => setPlacementActive(!placementActive)}
          title={placementActive ? "Cancel placement" : "Place a note"}
          style={placeButtonStyle(placementActive)}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function hudButtonStyle(active: boolean): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(120,185,255,0.25)" : "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.8)",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(8px)",
  };
}

function placeButtonStyle(active: boolean): React.CSSProperties {
  return {
    width: 52,
    height: 52,
    borderRadius: "50%",
    border: active
      ? "1px solid rgba(120,185,255,0.9)"
      : "1px solid rgba(255,255,255,0.15)",
    background: active ? "rgba(80,160,255,0.35)" : "rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.9)",
    fontSize: 28,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(8px)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
  };
}
