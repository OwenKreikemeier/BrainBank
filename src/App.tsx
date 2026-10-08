// ---------------------------------------------------------------------------
// App — root component
// ---------------------------------------------------------------------------
// Mounts the InfiniteCanvas. The desktop app opens on a white field, fades
// the wordmark in, then fades that field away to reveal the canvas.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { InfiniteCanvas } from "./components/canvas/InfiniteCanvas";
import { SplashScreen } from "./components/SplashScreen";

const isDesktopApp = "__TAURI_INTERNALS__" in window;

function App() {
  const [showSplash, setShowSplash] = useState(isDesktopApp);

  return (
    <>
      <InfiniteCanvas />
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
    </>
  );
}

export default App;
