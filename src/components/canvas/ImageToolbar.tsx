// ---------------------------------------------------------------------------
// ImageToolbar — replace / delete controls for the selected image widget
// ---------------------------------------------------------------------------

import { useWidgetsStore } from "../../store/widgetsStore";
import { useUiStore } from "../../store/uiStore";
import { pickImageFile } from "../../lib/pickImage";
import { LayerControls } from "./LayerControls";

export function ImageToolbar() {
  const selectedWidgetId = useUiStore((s) => s.selectedWidgetId);
  const selectedCount = useUiStore(
    (s) => s.selectedNoteIds.length + s.selectedWidgetIds.length
  );
  const setSelectedWidget = useUiStore((s) => s.setSelectedWidget);
  const version = useWidgetsStore((s) => s.version);
  void version;
  const widget = useWidgetsStore.getState().getWidget(selectedWidgetId);
  const updateWidget = useWidgetsStore((s) => s.updateWidget);
  const deleteWidget = useWidgetsStore((s) => s.deleteWidget);

  if (!widget || widget.type !== "image" || selectedCount !== 1) return null;
  const image = widget;

  async function replaceImage() {
    const blob = await pickImageFile();
    if (blob) updateWidget(image.id, { imageBlob: blob });
  }

  return (
    <div
      data-hud
      style={{
        position: "absolute",
        top: 78,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 12,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 10,
        background: "rgba(28,30,38,0.96)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        color: "rgba(255,255,255,0.9)",
        fontSize: 13,
      }}
    >
      <button
        onClick={() => void replaceImage()}
        title="Replace image"
        style={{ ...controlStyle, cursor: "pointer", padding: "4px 10px" }}
      >
        Replace
      </button>
      <LayerControls widgetId={image.id} />
      <button
        onClick={() => {
          deleteWidget(image.id);
          setSelectedWidget(null);
        }}
        title="Delete image"
        style={{ ...controlStyle, cursor: "pointer", padding: "4px 10px" }}
      >
        Delete
      </button>
    </div>
  );
}

const controlStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  color: "inherit",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  padding: "4px 6px",
  fontSize: 13,
};
