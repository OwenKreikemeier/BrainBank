// ---------------------------------------------------------------------------
// App — root component
// ---------------------------------------------------------------------------
// Mounts the InfiniteCanvas. The desktop app fades the wordmark in and out
// over the canvas while it opens.
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
