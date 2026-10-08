// ---------------------------------------------------------------------------
// Rich text stored in a widget's content string.
// ---------------------------------------------------------------------------
// Plain notes stay plain text. Bold, underline, and highlight are saved as a
// small HTML subset (<b>, <u>, <mark>, <br>) so a selection can be formatted
// the way a word processor does it.

export const DEFAULT_HIGHLIGHT = "#ffe566";

let highlightColor = DEFAULT_HIGHLIGHT;

export function getHighlightColor(): string {
  return highlightColor;
}

export function setHighlightColor(color: string): void {
  highlightColor = color;
}

export function isRichContent(content: string): boolean {
  return /<\/?(b|u|mark|br)\b/i.test(content);
}

export function plainText(content: string): string {
  if (!content) return "";
  if (!/[<>]/.test(content)) return content;
  const withBreaks = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p)>/gi, "\n");
  const decoded = withBreaks
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  return decoded;
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function hexFromCss(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v || v === "transparent" || v === "inherit") return null;
  if (v.startsWith("#")) {
    if (/^#[0-9a-f]{3}$/i.test(v) || /^#[0-9a-f]{6}$/i.test(v)) return v;
    return null;
  }
  const m = v.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!m) return null;
  const a = v.startsWith("rgba") ? v.match(/,\s*([\d.]+)\s*\)$/) : null;
  if (a && Number(a[1]) === 0) return null;
  const hex = [m[1], m[2], m[3]]
    .map((n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

/** A real highlight, ignoring white and fully transparent backgrounds. */
export function isHighlightColor(value: string): boolean {
  const hex = hexFromCss(value);
  return !!hex && hex !== "#ffffff";
}

function serializeChildren(node: Node): string {
  let html = "";
  node.childNodes.forEach((child) => {
    html += serializeNode(child);
  });
  return html;
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.tagName;
  if (tag === "BR") return "<br>";
  let inner = serializeChildren(el);
  if (tag === "DIV" || tag === "P") {
    if (inner && !inner.endsWith("<br>")) inner += "<br>";
    return inner;
  }
  const weight = el.style.fontWeight;
  const bold =
    tag === "B" ||
    tag === "STRONG" ||
    weight === "bold" ||
    weight === "bolder" ||
    Number(weight) >= 600;
  const underline =
    tag === "U" || (el.style.textDecoration || "").includes("underline");
  const bg =
    tag === "MARK" || tag === "SPAN" || tag === "FONT"
      ? hexFromCss(el.style.backgroundColor)
      : null;
  if (bg) inner = `<mark style="background-color:${bg}">${inner}</mark>`;
  if (underline && tag !== "U") inner = `<u>${inner}</u>`;
  if (tag === "U") inner = `<u>${inner}</u>`;
  if (bold && tag !== "B" && tag !== "STRONG") inner = `<b>${inner}</b>`;
  if (tag === "B" || tag === "STRONG") inner = `<b>${inner}</b>`;
  return inner;
}

function collapseEmpty(html: string): string {
  let cur = html;
  let prev = "";
  while (cur !== prev) {
    prev = cur;
    cur = cur.replace(/<(b|u|mark)(\s[^>]*)?>\s*<\/\1>/gi, "");
  }
  return cur.replace(/(?:<br>)+$/i, "");
}

/** Keep only bold, underline, highlight, and line breaks. */
export function sanitizeRichHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  return collapseEmpty(serializeChildren(root));
}

export function contentToHtml(content: string): string {
  if (!content) return "";
  if (isRichContent(content)) return sanitizeRichHtml(content);
  return escapeText(content).replace(/\n/g, "<br>");
}

/** Persist editor HTML. Unformatted text is stored as plain text. */
export function htmlToStored(html: string): string {
  const clean = sanitizeRichHtml(html);
  if (!isRichContent(clean)) {
    let plain = plainText(clean);
    if (plain.endsWith("\n")) plain = plain.slice(0, -1);
    return plain;
  }
  return clean;
}

function wrapped(html: string, tag: "b" | "u" | "mark"): boolean {
  return new RegExp(`^<${tag}\\b[^>]*>[\\s\\S]*</${tag}>$`, "i").test(html.trim());
}

function unwrap(html: string, tag: "b" | "u" | "mark"): string {
  return html.trim().replace(new RegExp(`^<${tag}\\b[^>]*>`, "i"), "").replace(new RegExp(`</${tag}>$`, "i"), "");
}

/** Toggle a format on the entire string. Used for a label that is not being edited. */
export function toggleWhole(
  content: string,
  kind: "bold" | "underline" | "highlight",
  color = highlightColor
): string {
  const html = contentToHtml(content);
  if (!plainText(html).trim() && !isRichContent(html)) return content;
  if (kind === "bold") {
    const next = wrapped(html, "b") ? unwrap(html, "b") : `<b>${html}</b>`;
    return htmlToStored(next);
  }
  if (kind === "underline") {
    const next = wrapped(html, "u") ? unwrap(html, "u") : `<u>${html}</u>`;
    return htmlToStored(next);
  }
  const next = wrapped(html, "mark")
    ? unwrap(html, "mark")
    : `<mark style="background-color:${color}">${html}</mark>`;
  return htmlToStored(next);
}

export function findRichEditor(widgetId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-rich-text="${CSS.escape(widgetId)}"]`);
}

function selectionInside(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const node = sel.anchorNode;
  return !!node && editor.contains(node);
}

export function formatState(editor: HTMLElement | null): {
  bold: boolean;
  underline: boolean;
  highlight: boolean;
} {
  if (!editor || document.activeElement !== editor || !selectionInside(editor)) {
    return { bold: false, underline: false, highlight: false };
  }
  return {
    bold: document.queryCommandState("bold"),
    underline: document.queryCommandState("underline"),
    highlight: isHighlightColor(document.queryCommandValue("backColor") || ""),
  };
}

function syncEditor(editor: HTMLElement) {
  editor.dispatchEvent(new Event("input", { bubbles: true }));
}

let savedRange: Range | null = null;

export function rememberSelection(widgetId: string) {
  const editor = findRichEditor(widgetId);
  const sel = window.getSelection();
  if (!editor || !sel || !sel.rangeCount || !selectionInside(editor)) {
    savedRange = null;
    return;
  }
  savedRange = sel.getRangeAt(0).cloneRange();
}

function restoreSelection(editor: HTMLElement): boolean {
  if (!savedRange) return false;
  if (!editor.contains(savedRange.commonAncestorContainer)) return false;
  editor.focus();
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(savedRange);
  return true;
}

export function applyFormat(
  widgetId: string,
  kind: "bold" | "underline" | "highlight",
  opts: { singleLine: boolean; content: string; color?: string; forceColor?: boolean }
): string | null {
  const editor = findRichEditor(widgetId);
  const color = opts.color ?? highlightColor;
  if (editor) restoreSelection(editor);
  const sel = window.getSelection();
  const inEditor = !!editor && selectionInside(editor);
  const collapsed = !sel || sel.isCollapsed;

  if (editor && inEditor && (!collapsed || !opts.singleLine)) {
    editor.focus();
    if (kind === "bold") document.execCommand("bold");
    else if (kind === "underline") document.execCommand("underline");
    else if (!opts.forceColor && formatState(editor).highlight) {
      document.execCommand("backColor", false, "transparent");
    } else document.execCommand("backColor", false, color);
    syncEditor(editor);
    return null;
  }

  if (editor && opts.singleLine) {
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    sel?.removeAllRanges();
    sel?.addRange(range);
    if (kind === "bold") document.execCommand("bold");
    else if (kind === "underline") document.execCommand("underline");
    else document.execCommand("backColor", false, color);
    syncEditor(editor);
    return null;
  }

  return toggleWhole(opts.content, kind, color);
}

export function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}
