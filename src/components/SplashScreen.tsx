// ---------------------------------------------------------------------------
// SplashScreen — desktop launch screen
// ---------------------------------------------------------------------------
// Full-bleed black field with the wordmark, matching the logo artwork.
// The mark fades in, holds, then fades out so the canvas is underneath.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import logo from "../assets/BrainBank_logo5-cutout.png";

const FADE_MS = 700;
const HOLD_MS = 1500;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setShown(true));
    });
    const closeTimer = window.setTimeout(() => setClosing(true), FADE_MS + HOLD_MS);
    const doneTimer = window.setTimeout(
      () => onDoneRef.current(),
      FADE_MS + HOLD_MS + FADE_MS + 80
    );
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(closeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  const visible = shown && !closing;

  return (
    <div
      aria-hidden={closing}
      onTransitionEnd={(e) => {
        if (e.propertyName === "opacity" && closing) onDoneRef.current();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: closing ? "none" : "auto",
      }}
    >
      <img
        src={logo}
        alt="BrainBank"
        draggable={false}
        style={{
          width: "min(880px, 86vw)",
          height: "auto",
          userSelect: "none",
        }}
      />
    </div>
  );
}
