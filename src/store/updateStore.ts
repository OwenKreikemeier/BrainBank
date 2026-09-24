// ---------------------------------------------------------------------------
// updateStore — GitHub-release auto-update state (Tauri updater plugin)
// ---------------------------------------------------------------------------
// On app launch, `checkForUpdate` asks the updater plugin whether the latest
// GitHub release is newer than the installed version. If so, `available`
// holds the pending update: the HUD shows a dot on the settings button and
// the settings modal offers an "Update" button. `installUpdate` downloads,
// installs, and relaunches the app.
//
// In the browser (vite dev without Tauri) the plugin is unavailable, so the
// check is a no-op there.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

interface UpdateStore {
  /** Pending update, or null when up to date / not yet checked. */
  available: Update | null;
  /** True while downloading + installing. */
  installing: boolean;
  /** Human-readable install failure, or null. */
  error: string | null;

  checkForUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

const isTauri = "__TAURI_INTERNALS__" in window;

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  available: null,
  installing: false,
  error: null,

  async checkForUpdate() {
    if (!isTauri) return;
    try {
      const update = await check();
      if (update) set({ available: update });
    } catch {
      // Offline or GitHub unreachable — check again next launch.
    }
  },

  async installUpdate() {
    const update = get().available;
    if (!update || get().installing) return;
    set({ installing: true, error: null });
    try {
      await update.downloadAndInstall();
      await relaunch();
    } catch (err) {
      set({ installing: false, error: String(err) });
    }
  },
}));
