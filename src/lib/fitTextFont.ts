// ---------------------------------------------------------------------------
// Shrink displayed font so text stays inside its box, without changing the
// user-set target size. When the box grows again, the font returns toward
// that target (never above it). If even the minimum size cannot fit without
// wrapping, the caller should hide the text instead of folding it.
// ---------------------------------------------------------------------------

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
  if (!opts.content.trim()) return { px: target, visible: true };
  if (opts.widthPx < 1 || opts.heightPx < 1) {
    return { px: minPx, visible: false };
  }

  const el = getProbe();
  if (fits(el, target, opts.fontFamily, opts.content, opts.widthPx, opts.heightPx)) {
    return { px: target, visible: true };
  }
  if (!fits(el, minPx, opts.fontFamily, opts.content, opts.widthPx, opts.heightPx)) {
    return { px: minPx, visible: false };
  }

  let lo = minPx;
  let hi = target;
  let best = minPx;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (fits(el, mid, opts.fontFamily, opts.content, opts.widthPx, opts.heightPx)) {
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
  el.textContent = content;
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
  if (!opts.content.trim()) return { px: Math.max(minPx, opts.targetPx), visible: true };
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
