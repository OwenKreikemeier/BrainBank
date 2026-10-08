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

/** A real highlight, ignoring white, black, and fully transparent backgrounds. */
export function isHighlightColor(value: string): boolean {
  const hex = hexFromCss(value);
  return !!hex && hex !== "#ffffff" && hex !== "#000000";
}

function elementHighlight(el: Element | null, stop: HTMLElement): string | null {
  let cur: Element | null = el;
  while (cur && cur !== stop) {
    if (cur instanceof HTMLElement) {
      const hex = hexFromCss(cur.style.backgroundColor);
      if (hex && hex !== "#ffffff") return hex;
    }
    cur = cur.parentElement;
  }
  return null;
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
  // backColor paints whichever element holds the selection, including an
  // existing <b> or <u>, so the color has to be kept from any tag.
  const bg = isHighlightColor(el.style.backgroundColor)
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

function anchorElement(): Element | null {
  const sel = window.getSelection();
  const node = sel?.anchorNode;
  if (!node) return null;
  return node instanceof Element ? node : node.parentElement;
}

export function formatState(editor: HTMLElement | null): {
  bold: boolean;
  underline: boolean;
  highlight: boolean;
} {
  if (!editor || document.activeElement !== editor || !selectionInside(editor)) {
    return { bold: false, underline: false, highlight: false };
  }
  const commandColor = hexFromCss(document.queryCommandValue("backColor") || "");
  const boxColor = hexFromCss(editor.style.backgroundColor);
  const pendingHighlight =
    !!commandColor &&
    commandColor !== "#ffffff" &&
    commandColor !== "#000000" &&
    commandColor !== boxColor;
  return {
    bold: document.queryCommandState("bold"),
    underline: document.queryCommandState("underline"),
    highlight: !!elementHighlight(anchorElement(), editor) || pendingHighlight,
  };
}

/** Tell the editor to save. A plain Event is treated as a zoom glitch and undone. */
function syncEditor(editor: HTMLElement) {
  editor.dispatchEvent(
    new InputEvent("input", { bubbles: true, inputType: "formatBold" })
  );
}

function textOffset(root: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  try {
    range.setEnd(container, offset);
  } catch {
    return 0;
  }
  return range.toString().length;
}

function pointAt(
  root: HTMLElement,
  offset: number
): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let left = offset;
  let last: Text | null = null;
  let current = walker.nextNode() as Text | null;
  while (current) {
    last = current;
    const len = current.textContent?.length ?? 0;
    if (left <= len) return { node: current, offset: left };
    left -= len;
    current = walker.nextNode() as Text | null;
  }
  if (last) return { node: last, offset: last.textContent?.length ?? 0 };
  return null;
}

function selectionOffsets(root: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !selectionInside(root)) return null;
  const range = sel.getRangeAt(0);
  return {
    start: textOffset(root, range.startContainer, range.startOffset),
    end: textOffset(root, range.endContainer, range.endOffset),
  };
}

function selectOffsets(root: HTMLElement, start: number, end: number) {
  const a = pointAt(root, start);
  const b = pointAt(root, Math.max(start, end));
  if (!a || !b) return;
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
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

function applyCommand(
  editor: HTMLElement,
  kind: "bold" | "underline" | "highlight",
  color: string,
  forceColor: boolean
) {
  const offsets = selectionOffsets(editor);
  const collapsed = !offsets || offsets.start === offsets.end;
  const highlighted = formatState(editor).highlight;

  // backColor fires an input event with an empty inputType. The editor
  // treats that as a zoom glitch unless it knows this command is ours.
  editor.dataset.bbFormatting = "1";
  try {
    if (kind === "bold") document.execCommand("bold");
    else if (kind === "underline") document.execCommand("underline");
    else if (!forceColor && highlighted) {
      document.execCommand("backColor", false, "transparent");
    } else {
      document.execCommand("backColor", false, color);
    }
  } finally {
    delete editor.dataset.bbFormatting;
  }

  // Rebuilding a collapsed caret drops the pending bold, underline, or
  // highlight that the browser is holding for the next typed characters.
  if (!collapsed && offsets) {
    selectOffsets(editor, offsets.start, offsets.end);
    if (kind === "highlight" && !forceColor && highlighted) {
      unwrapCoveredHighlights(editor);
      selectOffsets(editor, offsets.start, offsets.end);
    }
  }
  syncEditor(editor);
}

/** True when every character in the element sits inside the selection. */
function selectionCoversElement(range: Range, el: HTMLElement): boolean {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const first = walker.nextNode() as Text | null;
  if (!first) return false;
  let last = first;
  let next = walker.nextNode() as Text | null;
  while (next) {
    last = next;
    next = walker.nextNode() as Text | null;
  }
  try {
    // 0 means the point is on the boundary or inside the range.
    return (
      range.comparePoint(first, 0) === 0 &&
      range.comparePoint(last, last.textContent?.length ?? 0) === 0
    );
  } catch {
    return false;
  }
}

/** Remove highlight wrappers that the selection completely covers. */
function unwrapCoveredHighlights(editor: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const styled = [...editor.querySelectorAll<HTMLElement>("mark, span, font")].filter(
    (el) =>
      (el.tagName === "MARK" || isHighlightColor(el.style.backgroundColor)) &&
      range.intersectsNode(el)
  );
  for (const el of styled) {
    if (!selectionCoversElement(range, el)) continue;
    const parent = el.parentNode;
    if (!parent) continue;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  }
}

export function applyFormat(
  widgetId: string,
  kind: "bold" | "underline" | "highlight",
  opts: { singleLine: boolean; content: string; color?: string; forceColor?: boolean }
): string | null {
  const editor = findRichEditor(widgetId);
  const color = opts.color ?? highlightColor;
  if (!editor || !editor.isContentEditable) {
    return toggleWhole(opts.content, kind, color);
  }

  editor.focus();
  if (!restoreSelection(editor) && !selectionInside(editor)) {
    placeCaretAtEnd(editor);
  }
  // A selection is formatted in place. A caret only changes how the next
  // characters are typed, the same way a word processor does it.
  applyCommand(editor, kind, color, !!opts.forceColor);
  return null;
}

export function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}
