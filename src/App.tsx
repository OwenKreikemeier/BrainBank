// ---------------------------------------------------------------------------
// App — root component
// ---------------------------------------------------------------------------
// Mounts the InfiniteCanvas, which owns the grid, notes, and HUD.
// ---------------------------------------------------------------------------

import { InfiniteCanvas } from "./components/canvas/InfiniteCanvas";

function App() {
  return <InfiniteCanvas />;
}

export default App;
