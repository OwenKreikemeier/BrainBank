// ---------------------------------------------------------------------------
// RichTextEditor — contenteditable text with bold, underline, and highlight
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import {
  contentToHtml,
  getHighlightColor,
  htmlToStored,
  isHighlightColor,
  placeCaretAtEnd,
  plainText,
} from "../../lib/richText";

interface RichTextEditorProps {
  widgetId: string;
  content: string;
  editable: boolean;
  placeholder?: string;
  singleLine?: boolean;
  autoFocus?: boolean;
  /** Label editors open with the caret at the end, not a selected word. */
  caretAtEnd?: boolean;
  style?: React.CSSProperties;
  onChange?: (content: string) => void;
  onCommit?: (content: string) => void;
  onCancel?: () => void;
}

export function RichTextEditor({
  widgetId,
  content,
  editable,
  placeholder = "",
  singleLine = false,
  autoFocus = false,
  caretAtEnd = false,
  style,
  onChange,
  onCommit,
  onCancel,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const contentRef = useRef(content);
  contentRef.current = content;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  function readStored() {
    const el = ref.current;
    if (!el) return contentRef.current;
    return htmlToStored(el.innerHTML);
  }

  function writeHtml(next: string) {
    const el = ref.current;
    if (!el) return;
    const html = contentToHtml(next);
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    writeHtml(content);
  }, [content]);

  useEffect(() => {
    if (!autoFocus) return;
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    el.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!caretAtEnd) return;
    const el = ref.current;
    if (!el) return;
    writeHtml(contentRef.current);
    const id = window.requestAnimationFrame(() => {
      el.focus();
      placeCaretAtEnd(el);
      readyRef.current = true;
    });
    function onUp() {
      if (ref.current && document.activeElement === ref.current) placeCaretAtEnd(ref.current);
      window.removeEventListener("pointerup", onUp, true);
    }
    window.addEventListener("pointerup", onUp, true);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("pointerup", onUp, true);
    };
  }, [caretAtEnd]);

  function persistLive() {
    const stored = readStored();
    if (stored !== contentRef.current) onChangeRef.current?.(stored);
  }

  return (
    <div
      ref={ref}
      className="bb-rich"
      data-rich-text={widgetId}
      data-widget-interactive=""
      role="textbox"
      aria-multiline={singleLine ? undefined : true}
      aria-label={singleLine ? "Shape text" : "Text"}
      contentEditable={editable}
      suppressContentEditableWarning
      data-empty={plainText(content).trim() ? "false" : "true"}
      data-placeholder={placeholder}
      spellCheck
      onInput={() => {
        if (ref.current) {
          ref.current.dataset.empty = plainText(ref.current.innerText).trim() ? "false" : "true";
        }
        persistLive();
      }}
      onPointerDown={(e) => {
        // A text box lets the press reach the widget frame so the box can be
        // selected, moved, and resized. A shape label keeps the press so
        // typing does not start a drag.
        if (singleLine) e.stopPropagation();
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain").replace(/\r\n/g, "\n");
        document.execCommand("insertText", false, singleLine ? text.replace(/\n/g, " ") : text);
        persistLive();
      }}
      onBlur={(e) => {
        if (!onCommitRef.current) return;
        if (!readyRef.current) {
          ref.current?.focus();
          return;
        }
        const next = e.relatedTarget;
        if (next instanceof Element && next.closest("[data-hud]")) return;
        onCommitRef.current(readStored());
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        const mod = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();
        if (mod && !e.altKey && key === "b") {
          e.preventDefault();
          document.execCommand("bold");
          persistLive();
          return;
        }
        if (mod && !e.altKey && key === "u") {
          e.preventDefault();
          document.execCommand("underline");
          persistLive();
          return;
        }
        if (mod && e.altKey && key === "h") {
          e.preventDefault();
          const highlighted = isHighlightColor(document.queryCommandValue("backColor") || "");
          document.execCommand(
            "backColor",
            false,
            highlighted ? "transparent" : getHighlightColor()
          );
          persistLive();
          return;
        }
        if (!singleLine) return;
        if (e.key === "Enter") {
          e.preventDefault();
          onCommitRef.current?.(readStored());
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancelRef.current?.();
        }
      }}
      style={{
        width: "100%",
        height: singleLine ? "auto" : "100%",
        boxSizing: "border-box",
        outline: "none",
        overflow: "hidden",
        whiteSpace: singleLine ? "nowrap" : "pre-wrap",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        cursor: editable ? "text" : "inherit",
        ...style,
      }}
    />
  );
}
