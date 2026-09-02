// ---------------------------------------------------------------------------
// SettingsModal — full-screen settings dialog
// ---------------------------------------------------------------------------
// Options so far:
//   • Theme       — dark (black grid, light lines) or light (white grid, dark lines)
//   • Note IDs    — show/hide the small id label in each note's corner
//   • Grid lines  — show/hide the grid lines entirely
// Settings persist to localStorage via settingsStore.
// ---------------------------------------------------------------------------

import { useUiStore } from "../../store/uiStore";
import { useSettingsStore, type Theme } from "../../store/settingsStore";

export function SettingsModal() {
  const open = useUiStore((s) => s.settingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const showNoteIds = useSettingsStore((s) => s.showNoteIds);
  const setShowNoteIds = useSettingsStore((s) => s.setShowNoteIds);
  const showGridLines = useSettingsStore((s) => s.showGridLines);
  const setShowGridLines = useSettingsStore((s) => s.setShowGridLines);

  if (!open) return null;

  return (
    <div
      data-hud
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onPointerDown={() => setSettingsOpen(false)}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: 400,
          maxWidth: "90vw",
          background: "rgba(28,30,38,0.99)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          padding: 24,
          color: "rgba(255,255,255,0.9)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 18 }}>Settings</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            title="Close settings"
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.6)",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Theme */}
        <SettingRow
          label="Theme"
          description="Background and grid line colours of the canvas"
        >
          <div style={{ display: "flex", gap: 6 }}>
            {(["dark", "light"] as Theme[]).map((option) => (
              <button
                key={option}
                onClick={() => setTheme(option)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                  border:
                    theme === option
                      ? "1px solid rgba(120,185,255,0.9)"
                      : "1px solid rgba(255,255,255,0.15)",
                  background:
                    theme === option
                      ? "rgba(80,160,255,0.3)"
                      : "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.9)",
                  textTransform: "capitalize",
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </SettingRow>

        {/* Note ids */}
        <SettingRow
          label="Show note IDs"
          description="Display each note's id label in its corner"
        >
          <ToggleSwitch
            checked={showNoteIds}
            onChange={setShowNoteIds}
            title="Toggle note IDs"
          />
        </SettingRow>

        {/* Grid lines */}
        <SettingRow
          label="Show grid lines"
          description="Draw the grid lines over the canvas"
        >
          <ToggleSwitch
            checked={showGridLines}
            onChange={setShowGridLines}
            title="Toggle grid lines"
          />
        </SettingRow>
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  title,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked ? "true" : "false"}
      onClick={() => onChange(!checked)}
      title={title}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.2)",
        background: checked ? "rgba(80,160,255,0.6)" : "rgba(255,255,255,0.1)",
        position: "relative",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "white",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 0",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
          {description}
        </div>
      </div>
      {children}
    </div>
  );
}
