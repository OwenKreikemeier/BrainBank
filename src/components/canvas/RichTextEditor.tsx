// ---------------------------------------------------------------------------
// RichTextEditor — contenteditable text with bold, underline, and highlight
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import {
  applyFormat,
  contentToHtml,
  htmlToStored,
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

  function markupCount(html: string): number {
    return (html.match(/<(b|u|mark)\b/gi) || []).length;
  }

function persistLive() {
    const stored = readStored();
    if (stored === contentRef.current) return;
    contentRef.current = stored;
    onChangeRef.current?.(stored);
  }

  // Only the selected text box is an editing host. Leaving every box
  // contentEditable lets the browser drop highlight markup when the font
  // shrinks on zoom-out, and that change was then saved.
  const editing = editable && (singleLine || autoFocus);
  const fontSize = style?.fontSize;
  const visibility = style?.visibility;
  const editingRef = useRef(editing);

  useEffect(() => {
    const wasEditing = editingRef.current;
    editingRef.current = editing;
    if (!wasEditing || editing || singleLine) return;
    const el = ref.current;
    if (!el) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && sel.anchorNode && el.contains(sel.anchorNode)) {
      sel.removeAllRanges();
    }
    if (document.activeElement === el) el.blur();
    writeHtml(contentRef.current);
  }, [editing, singleLine]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      const stored = contentRef.current;
      const live = htmlToStored(node.innerHTML);
      if (plainText(live) !== plainText(stored)) return;
      if (markupCount(live) < markupCount(stored)) writeHtml(stored);
    });
    return () => window.cancelAnimationFrame(id);
  }, [fontSize, visibility]);

  return (
    <div
      ref={ref}
      className="bb-rich"
      data-rich-text={widgetId}
      data-widget-interactive=""
      role="textbox"
      aria-multiline={singleLine ? undefined : true}
      aria-label={singleLine ? "Shape text" : "Text"}
      contentEditable={editing}
      suppressContentEditableWarning
      data-empty={plainText(content).trim() ? "false" : "true"}
      data-placeholder={placeholder}
      spellCheck
      onInput={(e) => {
        const inputType = e.nativeEvent instanceof InputEvent ? e.nativeEvent.inputType : "";
        const live = readStored();
        const stored = contentRef.current;
        // A highlight command reports an empty inputType. That is a real edit.
        if (ref.current?.dataset.bbFormatting) {
          persistLive();
          return;
        }
        // Zoom can rewrite the editor and drop highlight markup without a
        // real edit. A formatting command adds markup, so only put the saved
        // text back when formatting disappeared.
        if (
          !inputType &&
          plainText(live) === plainText(stored) &&
          markupCount(live) < markupCount(stored)
        ) {
          writeHtml(stored);
          return;
        }
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
          applyFormat(widgetId, "bold", { singleLine, content: contentRef.current });
          return;
        }
        if (mod && !e.altKey && key === "u") {
          e.preventDefault();
          applyFormat(widgetId, "underline", { singleLine, content: contentRef.current });
          return;
        }
        if (mod && e.altKey && key === "h") {
          e.preventDefault();
          applyFormat(widgetId, "highlight", { singleLine, content: contentRef.current });
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
        cursor: editing ? "text" : "inherit",
        ...style,
        userSelect: editing ? "text" : "none",
      }}
    />
  );
}
