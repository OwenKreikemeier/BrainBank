// ---------------------------------------------------------------------------
// Shrink displayed font so text stays inside its box, without changing the
// user-set target size. When the box grows again, the font returns toward
// that target (never above it). If even the minimum size cannot fit without
// wrapping, the caller should hide the text instead of folding it.
// ---------------------------------------------------------------------------

import { contentToHtml, isRichContent, plainText } from "./richText";

const MIN_FIT_PX = 1;

let probe: HTMLTextAreaElement | null = null;

function getProbe(): HTMLTextAreaElement {
  if (!probe) {
    probe = document.createElement("textarea");
    probe.setAttribute("aria-hidden", "true");
    probe.tabIndex = -1;
    probe.style.cssText = [
      "position:absolute",
      "left:-99999px",
      "top:0",
      "visibility:hidden",
      "overflow:hidden",
      "padding:4px",
      "border:none",
      "resize:none",
      "line-height:1.25",
      "box-sizing:border-box",
      "white-space:pre-wrap",
      "word-wrap:break-word",
    ].join(";");
    document.body.appendChild(probe);
  }
  return probe;
}

function fits(
  el: HTMLTextAreaElement,
  fontPx: number,
  fontFamily: string,
  content: string,
  widthPx: number,
  heightPx: number
): boolean {
  el.style.width = `${Math.max(1, widthPx)}px`;
  el.style.height = `${Math.max(1, heightPx)}px`;
  el.style.fontSize = `${fontPx}px`;
  el.style.fontFamily = fontFamily;
  el.value = content;
  return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
}

let richProbe: HTMLDivElement | null = null;

function getRichProbe(): HTMLDivElement {
  if (!richProbe) {
    richProbe = document.createElement("div");
    richProbe.className = "bb-rich";
    richProbe.setAttribute("aria-hidden", "true");
    richProbe.style.cssText = [
      "position:absolute",
      "left:-99999px",
      "top:0",
      "visibility:hidden",
      "overflow:hidden",
      "padding:4px",
      "border:none",
      "line-height:1.25",
      "box-sizing:border-box",
      "white-space:pre-wrap",
      "overflow-wrap:break-word",
      "word-break:break-word",
    ].join(";");
    document.body.appendChild(richProbe);
  }
  return richProbe;
}

function fitsRich(
  el: HTMLDivElement,
  fontPx: number,
  fontFamily: string,
  content: string,
  widthPx: number,
  heightPx: number
): boolean {
  el.style.width = `${Math.max(1, widthPx)}px`;
  el.style.height = `${Math.max(1, heightPx)}px`;
  el.style.fontSize = `${fontPx}px`;
  el.style.fontFamily = fontFamily;
  el.innerHTML = contentToHtml(content);
  return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
}

export function fitTextFont(opts: {
  content: string;
  fontFamily: string;
  targetPx: number;
  widthPx: number;
  heightPx: number;
  minPx?: number;
}): { px: number; visible: boolean } {
  const minPx = opts.minPx ?? MIN_FIT_PX;
  const target = Math.max(minPx, opts.targetPx);
  if (!plainText(opts.content).trim()) return { px: target, visible: true };
  if (opts.widthPx < 1 || opts.heightPx < 1) {
    return { px: minPx, visible: false };
  }

  const rich = isRichContent(opts.content);
  const richEl = rich ? getRichProbe() : null;
  const plainEl = rich ? null : getProbe();
  const check = (px: number) =>
    richEl
      ? fitsRich(richEl, px, opts.fontFamily, opts.content, opts.widthPx, opts.heightPx)
      : fits(plainEl!, px, opts.fontFamily, opts.content, opts.widthPx, opts.heightPx);

  if (check(target)) return { px: target, visible: true };
  if (!check(minPx)) return { px: minPx, visible: false };

  let lo = minPx;
  let hi = target;
  let best = minPx;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (check(mid)) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { px: best, visible: true };
}

let lineProbe: HTMLSpanElement | null = null;

function getLineProbe(): HTMLSpanElement {
  if (!lineProbe) {
    lineProbe = document.createElement("span");
    lineProbe.setAttribute("aria-hidden", "true");
    lineProbe.style.cssText = [
      "position:absolute",
      "left:-99999px",
      "top:0",
      "visibility:hidden",
      "white-space:nowrap",
      "font-weight:600",
      "line-height:1",
    ].join(";");
    document.body.appendChild(lineProbe);
  }
  return lineProbe;
}

function lineFits(
  el: HTMLSpanElement,
  fontPx: number,
  content: string,
  widthPx: number,
  fontFamily?: string
): boolean {
  el.style.fontSize = `${fontPx}px`;
  el.style.fontFamily = fontFamily ?? "";
  if (isRichContent(content)) {
    el.className = "bb-rich";
    el.innerHTML = contentToHtml(content);
  } else {
    el.className = "";
    el.textContent = content;
  }
  return el.getBoundingClientRect().width <= widthPx + 0.5;
}

/** Fit a single-line label (note titles) into a width. Hide if even minPx overflows. */
export function fitSingleLineFont(opts: {
  content: string;
  targetPx: number;
  widthPx: number;
  minPx?: number;
  fontFamily?: string;
}): { px: number; visible: boolean } {
  const minPx = opts.minPx ?? MIN_FIT_PX;
  if (!plainText(opts.content).trim()) return { px: Math.max(minPx, opts.targetPx), visible: true };
  if (opts.widthPx < 1 || opts.targetPx < minPx) {
    return { px: minPx, visible: false };
  }

  const target = opts.targetPx;
  const el = getLineProbe();
  if (lineFits(el, target, opts.content, opts.widthPx, opts.fontFamily)) {
    return { px: target, visible: true };
  }
  if (!lineFits(el, minPx, opts.content, opts.widthPx, opts.fontFamily)) {
    return { px: minPx, visible: false };
  }

  let lo = minPx;
  let hi = target;
  let best = minPx;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (lineFits(el, mid, opts.content, opts.widthPx, opts.fontFamily)) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { px: best, visible: true };
}
