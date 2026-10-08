// ---------------------------------------------------------------------------
// SplashScreen — desktop launch screen
// ---------------------------------------------------------------------------
// The field is white from the first paint. Only the wordmark fades in, rising
// a little as it appears. After a short hold, the logo and the white field
// fade out together and the canvas underneath is revealed.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import logo from "../assets/BrainBank_logo5-cutout.png";

const FADE_MS = 700;
const HOLD_MS = 1500;
const RISE_PX = 22;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [logoIn, setLogoIn] = useState(false);
  const [closing, setClosing] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setLogoIn(true));
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

  return (
    <div
      aria-hidden={closing}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === "opacity" && closing) {
          onDoneRef.current();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        opacity: closing ? 0 : 1,
        transition: closing ? `opacity ${FADE_MS}ms ease` : "none",
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
          opacity: logoIn ? 1 : 0,
          transform: logoIn ? "translateY(0)" : `translateY(${RISE_PX}px)`,
          transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
        }}
      />
    </div>
  );
}
