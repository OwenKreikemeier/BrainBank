// ---------------------------------------------------------------------------
// ShapeSvg — the shape catalog and its SVG renderer
// ---------------------------------------------------------------------------
// Every shape is drawn in a 0..100 viewBox and stretched to the widget's box
// (preserveAspectRatio="none"), so shapes are freely reshapable by resizing —
// unlike images, they have no fixed aspect. Strokes use non-scaling-stroke so
// borders stay even when a shape is stretched. Flip is a CSS scale on the
// svg; rotation is handled by the widget chrome around it.
//
// Used by ShapeBlockView (on-canvas) and ShapePicker (menu previews).
// ---------------------------------------------------------------------------

import { cloneElement, type JSX } from "react";

export type ShapeGroupId =
  | "basic"
  | "arrows"
  | "stars"
  | "callouts"
  | "flowchart"
  | "symbols";

export type ShapeKind = string;

interface ShapeDef {
  kind: string;
  label: string;
  group: ShapeGroupId;
  element: JSX.Element;
}

export const SHAPE_GROUPS: { id: ShapeGroupId; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "arrows", label: "Arrows" },
  { id: "stars", label: "Stars & badges" },
  { id: "callouts", label: "Callouts" },
  { id: "flowchart", label: "Flowchart" },
  { id: "symbols", label: "Symbols" },
];

function pg(points: string): JSX.Element {
  return <polygon points={points} />;
}

function regular(n: number, r = 48, cx = 50, cy = 50, rot = -Math.PI / 2): string {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / n;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

function star(points: number, outer = 48, inner = 20, cx = 50, cy = 50): string {
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    parts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return parts.join(" ");
}

export const SHAPES: ShapeDef[] = [
  // —— Basic ——
  { kind: "rectangle", group: "basic", label: "Rectangle", element: <rect x="0" y="0" width="100" height="100" /> },
  { kind: "rounded", group: "basic", label: "Rounded rectangle", element: <rect x="4" y="4" width="92" height="92" rx="16" /> },
  { kind: "snipped", group: "basic", label: "Snipped rectangle", element: pg("18,0 100,0 100,100 0,100 0,18") },
  { kind: "folded", group: "basic", label: "Folded corner", element: pg("0,0 72,0 100,28 100,100 0,100") },
  { kind: "ellipse", group: "basic", label: "Ellipse", element: <ellipse cx="50" cy="50" rx="50" ry="50" /> },
  { kind: "pill", group: "basic", label: "Pill", element: <rect x="2" y="22" width="96" height="56" rx="28" /> },
  { kind: "triangle", group: "basic", label: "Triangle", element: pg("50,2 98,98 2,98") },
  { kind: "right-triangle", group: "basic", label: "Right triangle", element: pg("4,4 4,96 96,96") },
  { kind: "diamond", group: "basic", label: "Diamond", element: pg("50,2 98,50 50,98 2,50") },
  { kind: "pentagon", group: "basic", label: "Pentagon", element: pg(regular(5)) },
  { kind: "hexagon", group: "basic", label: "Hexagon", element: pg(regular(6)) },
  { kind: "octagon", group: "basic", label: "Octagon", element: pg(regular(8, 46)) },
  { kind: "parallelogram", group: "basic", label: "Parallelogram", element: pg("22,4 98,4 78,96 2,96") },
  { kind: "trapezoid", group: "basic", label: "Trapezoid", element: pg("20,4 80,4 98,96 2,96") },
  { kind: "chevron", group: "basic", label: "Chevron", element: pg("0,4 70,4 100,50 70,96 0,96 30,50") },
  { kind: "cross", group: "basic", label: "Cross", element: pg("36,2 64,2 64,36 98,36 98,64 64,64 64,98 36,98 36,64 2,64 2,36 36,36") },
  { kind: "plus", group: "basic", label: "Plus", element: pg("38,8 62,8 62,38 92,38 92,62 62,62 62,92 38,92 38,62 8,62 8,38 38,38") },
  { kind: "minus", group: "basic", label: "Minus", element: pg("6,38 94,38 94,62 6,62") },
  { kind: "semicircle", group: "basic", label: "Semicircle", element: <path d="M4,92 A46,46 0 0 1 96,92 Z" /> },
  { kind: "quarter", group: "basic", label: "Quarter circle", element: <path d="M8,92 L8,8 A84,84 0 0 1 92,92 Z" /> },
  {
    kind: "donut",
    group: "basic",
    label: "Donut",
    element: (
      <path
        fillRule="evenodd"
        d="M50,2 A48,48 0 1 1 49.9,2 Z M50,28 A22,22 0 1 0 50.1,28 Z"
      />
    ),
  },
  { kind: "frame", group: "basic", label: "Frame", element: <path fillRule="evenodd" d="M2,2 H98 V98 H2 Z M18,18 H82 V82 H18 Z" /> },

  // —— Arrows ——
  { kind: "arrow", group: "arrows", label: "Arrow", element: pg("0,32 58,32 58,8 100,50 58,92 58,68 0,68") },
  { kind: "thin-arrow", group: "arrows", label: "Thin arrow", element: pg("0,42 66,42 66,22 100,50 66,78 66,58 0,58") },
  { kind: "notched-arrow", group: "arrows", label: "Notched arrow", element: pg("0,28 18,50 0,72 62,72 62,92 100,50 62,8 62,28") },
  { kind: "double-arrow", group: "arrows", label: "Double arrow", element: pg("0,50 22,14 22,34 78,34 78,14 100,50 78,86 78,66 22,66 22,86") },
  { kind: "up-arrow", group: "arrows", label: "Up arrow", element: pg("50,2 92,42 68,42 68,98 32,98 32,42 8,42") },
  { kind: "down-arrow", group: "arrows", label: "Down arrow", element: pg("50,98 8,58 32,58 32,2 68,2 68,58 92,58") },
  { kind: "bent-arrow", group: "arrows", label: "Bent arrow", element: pg("8,8 8,62 58,62 58,82 92,50 58,18 58,38 28,38 28,8") },
  {
    kind: "curved-arrow",
    group: "arrows",
    label: "Curved arrow",
    element: (
      <path d="M18,78 C18,40 42,18 78,18 L78,6 L98,28 L78,50 L78,38 C50,38 34,52 34,78 Z" />
    ),
  },
  {
    kind: "circular-arrow",
    group: "arrows",
    label: "Circular arrow",
    element: (
      <path d="M50,8 A42,42 0 1 1 18,70 L8,62 L28,92 L42,62 L32,68 A30,30 0 1 0 50,20 Z" />
    ),
  },
  { kind: "chevron-arrow", group: "arrows", label: "Chevron arrow", element: pg("4,8 60,8 96,50 60,92 4,92 40,50") },
  { kind: "callout-arrow", group: "arrows", label: "Callout arrow", element: pg("4,28 52,28 52,8 96,50 52,92 52,72 4,72") },
  { kind: "line", group: "arrows", label: "Line", element: pg("0,44 100,44 100,56 0,56") },
  { kind: "elbow", group: "arrows", label: "Elbow", element: pg("8,8 28,8 28,72 92,72 92,92 8,92") },
  { kind: "brace", group: "arrows", label: "Brace", element: pg("70,4 92,4 62,28 62,42 40,50 62,58 62,72 92,96 70,96 42,72 42,58 8,50 42,42 42,28") },
  { kind: "bracket", group: "arrows", label: "Bracket", element: pg("78,4 96,4 96,16 30,16 30,84 96,84 96,96 78,96 12,96 12,4") },

  // —— Stars & badges ——
  { kind: "star4", group: "stars", label: "4-point star", element: pg(star(4, 48, 16)) },
  { kind: "star5", group: "stars", label: "Star", element: pg(star(5, 48, 19)) },
  { kind: "star6", group: "stars", label: "6-point star", element: pg(star(6, 48, 22)) },
  { kind: "star8", group: "stars", label: "8-point star", element: pg(star(8, 48, 22)) },
  { kind: "star12", group: "stars", label: "12-point star", element: pg(star(12, 48, 30)) },
  { kind: "burst", group: "stars", label: "Burst", element: pg(star(16, 48, 32)) },
  { kind: "badge", group: "stars", label: "Badge", element: pg(regular(12, 48)) },
  { kind: "seal", group: "stars", label: "Seal", element: pg(star(24, 48, 38)) },
  {
    kind: "ribbon",
    group: "stars",
    label: "Ribbon",
    element: pg("8,18 92,18 92,62 50,62 50,86 32,70 8,86 8,62"),
  },
  { kind: "banner", group: "stars", label: "Banner", element: pg("4,28 96,28 84,50 96,72 4,72 16,50") },
  { kind: "flag", group: "stars", label: "Flag", element: pg("16,4 92,28 16,52 16,96 4,96 4,4") },
  { kind: "bookmark", group: "stars", label: "Bookmark", element: pg("22,4 78,4 78,96 50,74 22,96") },

  // —— Callouts ——
  {
    kind: "speech",
    group: "callouts",
    label: "Speech bubble",
    element: (
      <path d="M12,6 H88 Q96,6 96,16 V56 Q96,66 88,66 H48 L26,94 L34,66 H12 Q4,66 4,56 V16 Q4,6 12,6 Z" />
    ),
  },
  {
    kind: "thought",
    group: "callouts",
    label: "Thought bubble",
    element: (
      <path d="M32,58 A22,18 0 1 1 58,32 A20,16 0 1 1 86,46 A18,16 0 1 1 72,78 A24,16 0 1 1 32,58 Z M22,82 A7,6 0 1 1 22.1,82 Z M12,92 A5,4 0 1 1 12.1,92 Z" />
    ),
  },
  {
    kind: "rounded-callout",
    group: "callouts",
    label: "Rounded callout",
    element: (
      <path d="M18,8 H82 Q94,8 94,20 V56 Q94,68 82,68 H40 L22,92 L30,68 H18 Q6,68 6,56 V20 Q6,8 18,8 Z" />
    ),
  },
  { kind: "cloud-callout", group: "callouts", label: "Cloud callout", element: <path d="M28,78 A18,18 0 0 1 22,44 A24,22 0 0 1 62,30 A20,18 0 0 1 90,50 A16,16 0 0 1 84,78 Z" /> },
  { kind: "oval-callout", group: "callouts", label: "Oval callout", element: <path d="M50,8 A42,32 0 1 1 22,62 L12,92 L40,66 A42,32 0 0 1 50,8 Z" /> },

  // —— Flowchart ——
  { kind: "process", group: "flowchart", label: "Process", element: <rect x="4" y="22" width="92" height="56" /> },
  { kind: "terminator", group: "flowchart", label: "Terminator", element: <rect x="4" y="24" width="92" height="52" rx="26" /> },
  { kind: "decision", group: "flowchart", label: "Decision", element: pg("50,4 96,50 50,96 4,50") },
  {
    kind: "document",
    group: "flowchart",
    label: "Document",
    element: <path d="M8,10 H92 V70 C76,82 60,58 50,70 C40,82 24,58 8,70 Z" />,
  },
  {
    kind: "database",
    group: "flowchart",
    label: "Database",
    element: <path d="M12,22 C12,12 88,12 88,22 L88,78 C88,88 12,88 12,78 Z M12,22 C12,32 88,32 88,22" />,
  },
  {
    kind: "delay",
    group: "flowchart",
    label: "Delay",
    element: <path d="M8,20 H62 A30,30 0 0 1 62,80 H8 Z" />,
  },
  { kind: "stored", group: "flowchart", label: "Stored data", element: pg("16,18 92,18 84,82 8,82") },
  { kind: "manual-input", group: "flowchart", label: "Manual input", element: pg("8,32 92,12 92,84 8,84") },
  { kind: "prep", group: "flowchart", label: "Preparation", element: pg("22,18 78,18 98,50 78,82 22,82 2,50") },
  { kind: "connector", group: "flowchart", label: "Connector", element: <circle cx="50" cy="50" r="36" /> },
  { kind: "or-gate", group: "flowchart", label: "Merge", element: pg("8,12 92,12 50,88") },

  // —— Symbols ——
  {
    kind: "heart",
    group: "symbols",
    label: "Heart",
    element: (
      <path d="M50,90 C50,90 8,62 8,34 C8,16 22,6 34,6 C43,6 50,12 50,20 C50,12 57,6 66,6 C78,6 92,16 92,34 C92,62 50,90 50,90 Z" />
    ),
  },
  {
    kind: "cloud",
    group: "symbols",
    label: "Cloud",
    element: (
      <path d="M26,80 A18,18 0 0 1 20,46 A24,22 0 0 1 62,32 A20,18 0 0 1 88,50 A16,16 0 0 1 82,80 Z" />
    ),
  },
  { kind: "lightning", group: "symbols", label: "Lightning", element: pg("58,2 28,48 48,48 36,98 78,42 54,42") },
  {
    kind: "moon",
    group: "symbols",
    label: "Moon",
    element: <path d="M62,8 A42,42 0 1 0 62,92 A30,30 0 1 1 62,8 Z" />,
  },
  {
    kind: "teardrop",
    group: "symbols",
    label: "Teardrop",
    element: <path d="M50,4 C50,4 92,48 92,68 A42,32 0 1 1 8,68 C8,48 50,4 50,4 Z" />,
  },
  { kind: "check", group: "symbols", label: "Check", element: pg("8,52 22,38 40,58 78,16 94,32 40,90") },
  { kind: "x-mark", group: "symbols", label: "X", element: pg("18,8 50,36 82,8 92,18 64,50 92,82 82,92 50,64 18,92 8,82 36,50 8,18") },
  {
    kind: "pin",
    group: "symbols",
    label: "Location pin",
    element: <path d="M50,4 C30,4 16,20 16,40 C16,64 50,96 50,96 C50,96 84,64 84,40 C84,20 70,4 50,4 Z M50,28 A12,12 0 1 1 49.9,28 Z" fillRule="evenodd" />,
  },
  {
    kind: "gear",
    group: "symbols",
    label: "Gear",
    element: pg(
      "40,4 60,4 64,16 76,12 88,24 84,36 96,40 96,60 84,64 88,76 76,88 64,84 60,96 40,96 36,84 24,88 12,76 16,64 4,60 4,40 16,36 12,24 24,12 36,16"
    ),
  },
  {
    kind: "cube",
    group: "symbols",
    label: "Cube",
    element: pg("50,6 94,28 94,72 50,94 6,72 6,28"),
  },
  {
    kind: "cylinder",
    group: "symbols",
    label: "Cylinder",
    element: <path d="M12,22 C12,10 88,10 88,22 L88,78 C88,90 12,90 12,78 Z M12,22 C12,34 88,34 88,22" />,
  },
  { kind: "play", group: "symbols", label: "Play", element: pg("18,8 90,50 18,92") },
  {
    kind: "pause",
    group: "symbols",
    label: "Pause",
    element: <path fillRule="evenodd" d="M16,10 H40 V90 H16 Z M60,10 H84 V90 H60 Z" />,
  },
];

const SHAPE_BY_KIND = new Map(SHAPES.map((def) => [def.kind, def]));

export function isShapeKind(value: unknown): value is string {
  return typeof value === "string" && SHAPE_BY_KIND.has(value);
}

export function shapeLabel(kind: string | undefined): string {
  return SHAPE_BY_KIND.get(kind ?? "rectangle")?.label ?? "Shape";
}

export function ShapeSvg({
  kind,
  fill,
  stroke,
  strokeWidth,
  flipH,
  flipV,
  style,
}: {
  kind: string | undefined;
  fill: string;
  stroke: string;
  /** Stroke width in on-screen px (already zoom-scaled); 0 = no border. */
  strokeWidth: number;
  flipH?: boolean;
  flipV?: boolean;
  style?: React.CSSProperties;
}) {
  const def = SHAPE_BY_KIND.get(kind ?? "rectangle") ?? SHAPES[0];
  const hasStroke = strokeWidth > 0;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        overflow: "visible",
        transform:
          flipH || flipV
            ? `scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`
            : undefined,
        ...style,
      }}
      aria-hidden
    >
      {cloneElement(def.element, {
        fill: fill === "" ? "none" : fill,
        stroke: hasStroke ? stroke : "none",
        strokeWidth: hasStroke ? strokeWidth : 0,
        strokeLinejoin: "round",
        strokeLinecap: "round",
        vectorEffect: "non-scaling-stroke",
      })}
    </svg>
  );
}
