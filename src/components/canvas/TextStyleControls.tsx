// ---------------------------------------------------------------------------
// TextStyleControls — bold, underline, and highlight for a text box or label
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import {
  DEFAULT_HIGHLIGHT,
  applyFormat,
  findRichEditor,
  formatState,
  getHighlightColor,
  rememberSelection,
  setHighlightColor,
} from "../../lib/richText";

interface TextStyleControlsProps {
  widgetId: string;
  content: string;
  singleLine?: boolean;
  onChangeContent: (content: string) => void;
}

export function TextStyleControls({
  widgetId,
  content,
  singleLine = false,
  onChangeContent,
}: TextStyleControlsProps) {
  const [bold, setBold] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const [color, setColor] = useState(getHighlightColor());

  useEffect(() => {
    function sync() {
      const state = formatState(findRichEditor(widgetId));
      setBold(state.bold);
      setUnderline(state.underline);
      setHighlight(state.highlight);
    }
    document.addEventListener("selectionchange", sync);
    return () => document.removeEventListener("selectionchange", sync);
  }, [widgetId]);

  function run(
    kind: "bold" | "underline" | "highlight",
    nextColor = color,
    forceColor = false
  ) {
    const stored = applyFormat(widgetId, kind, {
      singleLine,
      content,
      color: nextColor,
      forceColor,
    });
    if (stored != null) onChangeContent(stored);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <FormatButton
        label="Bold"
        title="Bold (Ctrl+B)"
        pressed={bold}
        onClick={() => run("bold")}
      >
        <span style={{ fontWeight: 800 }}>B</span>
      </FormatButton>
      <FormatButton
        label="Underline"
        title="Underline (Ctrl+U)"
        pressed={underline}
        onClick={() => run("underline")}
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </FormatButton>
      <FormatButton
        label="Highlight"
        title="Highlight (Ctrl+Alt+H)"
        pressed={highlight}
        onClick={() => run("highlight")}
      >
        <span
          style={{
            background: color,
            color: "#1a1a1a",
            borderRadius: 2,
            padding: "0 3px",
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          H
        </span>
      </FormatButton>
      <input
        type="color"
        aria-label="Highlight color"
        title="Highlight color"
        value={color}
        onPointerDown={() => rememberSelection(widgetId)}
        onChange={(e) => {
          const next = e.target.value || DEFAULT_HIGHLIGHT;
          setColor(next);
          setHighlightColor(next);
          run("highlight", next, true);
        }}
        style={{
          width: 28,
          height: 26,
          border: "none",
          background: "none",
          cursor: "pointer",
          padding: 0,
        }}
      />
    </div>
  );
}

function FormatButton({
  label,
  title,
  pressed,
  onClick,
  children,
}: {
  label: string;
  title: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        background: pressed ? "rgba(80,160,255,0.4)" : "rgba(255,255,255,0.08)",
        color: "inherit",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 6,
        fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}
