// ---------------------------------------------------------------------------
// Shrink displayed font so text stays inside its box, without changing the
// user-set target size. When the box grows again, the font returns toward
// that target (never above it).
// ---------------------------------------------------------------------------

const MIN_FIT_PX = 8;

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
}): number {
  const minPx = opts.minPx ?? MIN_FIT_PX;
  const target = Math.max(minPx, opts.targetPx);
  if (!opts.content.trim()) return target;
  if (opts.widthPx < 8 || opts.heightPx < 8) return minPx;

  const el = getProbe();
  if (fits(el, target, opts.fontFamily, opts.content, opts.widthPx, opts.heightPx)) {
    return target;
  }
  if (!fits(el, minPx, opts.fontFamily, opts.content, opts.widthPx, opts.heightPx)) {
    return minPx;
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
  return best;
}
