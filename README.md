# BrainBank

BrainBank is an infinite canvas of nested sticky notes. Each note is a square on a grid. Zoom into a note and its interior becomes a new canvas: more notes, text, images, and shapes. Zoom back out and you are looking at the parent again. Depth is unlimited because the view re-bases onto whichever note fills the screen, so the zoom number itself stays in a small range.

Everything you create stays on this computer. Notes are not uploaded to GitHub. The desktop app can check GitHub for a newer installer and update itself, but that update replaces the program, not your notes.

Current version: **0.2.4** (`src-tauri/tauri.conf.json`).

Repository: [github.com/OwenKreikemeier/BrainBank](https://github.com/OwenKreikemeier/BrainBank)

## What you can do

- Pan and zoom an infinite root canvas, and step in and out of notes.
- Draw square notes. They snap to the grid and cannot overlap their siblings.
- Name a note by double-clicking its title. Style the title and the note color from the right-click menu.
- Place text blocks, images, and shapes inside a note. Widgets may overlap each other. They may not cover a child note or sit in the title band.
- Search every note by title and jump straight to it.
- Copy and paste a note (including everything nested inside it) or a single text block, image, or shape.
- Switch the canvas between a dark and a light theme, hide the grid, and hide the depth labels.
- Choose the default title font for notes you create from then on.
- Install BrainBank as a Windows desktop app. On launch it checks GitHub for a newer release. A red dot on Settings means an update is ready.

## Concepts

### The frame

The screen always shows one **frame**:

- The **root** is the world grid. It has no parent. Its frame id is `null` and its depth is `-1`.
- A **note** you have entered is the current frame. Its interior is a fresh 12-by-12 cell grid. Child notes and widgets live on that grid, in the parent’s cell units.

`pan` and `zoom` in `canvasStore` map the current frame’s grid onto the screen. When a child note grows larger than the screen and covers at least half the viewport under the cursor, the store re-bases into that note and resets pan and zoom so you are now “inside” it. When the current frame shrinks to cover less than half the viewport, the store pops back out to the parent. That is what makes zoom feel infinite without an ever-growing zoom value.

A double-click on a note’s body (not its title bar) also enters that note, with a short animation that keeps the click point steady.

### Notes

A note is a square. Its position (`x`, `y`) and side length (`size`) are in **the parent frame’s cells**, not in pixels.

- On the root, a note can sit anywhere that does not overlap another root note. There is no outer wall.
- Inside another note, a child must stay inside the 12×12 interior and must start at or below the title band (the top 2 cells). It also must not overlap a sibling note or a widget on that same note.
- The smallest note you can draw is 1 cell. On screen, notes smaller than 4 pixels are not drawn, and notes narrower than 70 pixels are visible but not clickable.
- New notes are yellow (`#f5d33f`) until you recolor them.
- A note’s `depth` is always derived from its parent: root children are depth 0, their children are depth 1, and so on. The app repairs a drifted depth on load and deletes notes whose parent chain is missing or cyclic.

The `type` field on a note can be `text`, `image`, `audio`, `video`, or `space`. The app currently creates notes as `text`. Pictures and drawings are **widgets** on a note, not note types.

### Widgets

Widgets live only on a note, never on the root. Deleting a note deletes its widgets and every nested note.

| Kind | What it is |
| --- | --- |
| Text | A text box. Click it and type. The font shrinks to fit the box, down to 1px; if it still cannot fit, the text is hidden instead of overflowing. |
| Image | A picture you pick from disk. It is letterboxed (`object-fit: contain`) inside its frame. An empty frame, or a double-click on a filled one, opens the file picker. |
| Shape | An SVG shape that stretches to the box (it is not letterboxed). You can flip it, rotate it, recolor it, and swap the shape itself. |

Widget geometry is a free rectangle (`x`, `y`, `width`, `height`) plus `rotation` in degrees. The smallest side is 0.4 cells. Widgets may overlap each other. They may not leave the note interior or cover a child note. The top 2 cells are reserved for the title, so widgets cannot be placed there.

Each widget has a `zIndex`. Higher values draw in front. The toolbar and the `[` / `]` keys change stacking order.

### The grid

At zoom 1, one cell is 60 pixels (`BASE_CELL_PX`). Scroll-wheel zoom uses a sensitivity of `0.001`. At the root, zoom cannot go below `0.2`, so Reset view has a home. Inside a note there is no extra zoom floor; popping out is handled by the coverage rule instead.

Major grid lines are every cell; the overlay follows the theme.

## Using the canvas

### Move around

- **Drag the empty canvas** to pan. The cursor is a grab hand.
- **Scroll** to zoom toward the pointer.
- **Double-click a note’s body** to fly into that note. The title bar does not do this; double-clicking the title renames it.
- Keep zooming until a note fills the screen and the view enters it on its own. Zoom back out until the frame covers less than half the window and you pop back to the parent.
- **Reset view** (the home control in the top-right HUD) returns to the root.
- **Search** (top-left) matches note titles. Results show the title, the depth, and the title of the root-level ancestor. Enter jumps to the first hit. Click a row to jump to that note. Escape closes search.

The current frame’s title is shown in the HUD when you are inside a note.

### Notes

**Add a note.** Open the **+** tray and choose **Add note**. Drag on the canvas. The preview snaps to a square on the grid. A legal drop creates the note, selects it, and opens the title editor. An illegal drop (overlap, or outside the interior) does not create anything.

**Select.** Click a note once. That click only selects it. A second press-and-drag on an already selected note moves it. Shift+click toggles a note in the selection. Corner handles appear only on a selected note. Dragging a handle resizes that note; the opposite corner stays fixed and the note stays square.

**Move or resize a group.** Select several notes and widgets, then drag one of them. They move together. Drag a corner of the selection frame to scale the group about the opposite corner. Notes stay square. If the live position overlaps something it should not, the outline turns red. On release, legal positions snap to cells. An illegal snap reverts the group to where it started.

**Rename.** Double-click the title bar. The caret blinks at the end of the title. Enter saves the trimmed title. Escape cancels and keeps the old title. You can also choose **Rename** in the right-click menu. A brand-new note opens this editor immediately.

**Right-click the title** for:

- Note color, from the preset swatches or a custom HSV picker.
- Title color, the same way.
- Title font (Sans, Serif, Mono, Comic) and title size (8–96).
- Copy note.
- Rename.
- Delete note. If the note contains other notes, a confirmation lists how many descendants will be removed. A note with no children deletes immediately. Widgets on the note are removed with it.

Notes that are too small on screen show their title but do not accept clicks, drags, or the context menu.

### Text, images, and shapes

These tools are in the **+** tray. Text, image, and shape can only be added while you are **inside** a note. On the root those buttons are disabled.

**Text.** Choose **Add text** and drag a rectangle. Click the block and type. The toolbar (shown when exactly one text block is selected) sets font, size (8–96), text color, alignment, background color (or none), and border width and color. It also has layer controls and Delete.

**Image.** Choose **Add image** and drag a rectangle, then pick a file (`image/*`). The picture stays inside the box without cropping. **Replace** in the toolbar picks a new file. Double-click the image to pick a file too. Images can be moved, resized, and rotated like other widgets.

**Shape.** Choose **Add shape**. A gallery slides up from the bottom, grouped into Basic, Arrows, Stars & badges, Callouts, Flowchart, and Symbols. Pick a shape, then drag it onto the note. The gallery starts with a rectangle; the last shape you picked is what the next placement uses.

The shape toolbar can:

- Swap the shape.
- Set fill, or turn fill off.
- Set border width (0–20) and border color. New shapes start with a 2px dark border and a blue fill (`#5aa9ff`).
- Flip horizontally or vertically. Flip is a mirror of the SVG. Rotation is separate and uses the rotate handle on the shape.
- Change layer order, or delete the shape.

Shapes stretch to the width and height of the box. They do not keep a fixed aspect ratio the way images do.

**Widget handles.** Click a widget to select it. Drag to move it. Corner handles resize it (widgets are free rectangles, not forced squares). The rotate handle turns it. Shift+click adds or removes it from the selection. If a move or resize would leave the note or cover a child note, it is rejected and the widget returns.

**Layers.** With one widget selected, the toolbar buttons send it backward, back, forward, or to the front among the widgets on that note. The same actions are on the keyboard: `[` sends backward, Shift+`[` sends to the back, `]` brings forward, Shift+`]` brings to the front.

### Clipboard

There are two clipboards, and only one is active at a time. Copying a note clears a copied widget, and copying a widget clears a copied note.

**Copy a note** with Ctrl+C when exactly one note is selected and no widget is selected, or with **Copy note** in the right-click menu. The snapshot includes every nested note and every widget on those notes, including image bytes.

**Paste a note** with Ctrl+V. The **+** tray also shows **Paste note** while a note is on the clipboard. You then drag to place the pasted root, the same way you draw a new note. Descendants keep their interior positions. The pasted root gets a new parent, position, and size. Every pasted note and widget gets a new id.

**Copy a widget** with Ctrl+C when exactly one widget is selected and no note is selected.

**Paste a widget** with Ctrl+V while you are inside a note. It appears half a cell down and to the right of the original, clamped so it still fits in the interior, and it is selected. Image blobs are copied, not shared.

### Keyboard

| Key | Action |
| --- | --- |
| Escape | Close search, cancel placement, close the shape gallery, close the tool tray, or clear the selection. In the title editor, Escape discards the edit. |
| Delete | Delete the selected widgets. Does not delete notes. Ignored while typing in a field. |
| Ctrl+C or Cmd+C | Copy the selected widget, or otherwise the selected note. |
| Ctrl+V or Cmd+V | Paste a widget into the current note, or start note-paste placement. |
| `[` / `]` | Send the selected widget backward / forward. |
| Shift+`[` / Shift+`]` | Send the selected widget to the back / front. |
| Enter | Save the title while renaming. In search, jump to the first match. |

Shift+click toggles selection on notes and widgets.

## Settings

Open **Settings** from the top-right HUD. Settings are stored in `localStorage` under the key `brainbank-settings`. They are per browser profile, and the desktop app has its own profile (see [Where your notes live](#where-your-notes-live)).

| Setting | What it does |
| --- | --- |
| Theme | **Dark** (near-black canvas, light grid lines) or **light** (off-white canvas, dark grid lines). |
| Show note depth | Shows or hides the small “Depth N” label in the corner of each note. |
| Default note font | Title font for notes created after you change it. Existing notes keep their own font. Choices: Sans, Serif, Mono, Comic. The default is Sans. |
| Update now | Shown only in the desktop app, and only when a newer GitHub release was found at launch. |

**Show / hide grid** is the grid button next to Settings, not a row inside the dialog. It is still saved with the other settings.

When an update is available, a red dot sits on the corner of the Settings button.

## Shape catalog

All of these are in `src/components/canvas/ShapeSvg.tsx`.

**Basic.** Rectangle, rounded rectangle, snipped rectangle, folded corner, ellipse, pill, triangle, right triangle, diamond, pentagon, hexagon, octagon, parallelogram, trapezoid, chevron, cross, plus, minus, semicircle, quarter circle, donut, frame.

**Arrows.** Arrow, thin arrow, notched arrow, double arrow, up arrow, down arrow, bent arrow, curved arrow, circular arrow, chevron arrow, callout arrow, line, elbow, brace, bracket.

**Stars & badges.** 4-point star, star, 6-point star, 8-point star, 12-point star, burst, badge, seal, ribbon, banner, flag, bookmark.

**Callouts.** Speech bubble, thought bubble, rounded callout, cloud callout, oval callout.

**Flowchart.** Process, terminator, decision, document, database, delay, stored data, manual input, preparation, connector, merge.

**Symbols.** Heart, cloud, lightning, moon, teardrop, check, X, location pin, gear, cube, cylinder, play, pause.

## Where your notes live

Notes and widgets are stored in an IndexedDB database named `BrainBank`, through [Dexie](https://dexie.org/).

| Store | Indexed fields | Everything else |
| --- | --- | --- |
| `notes` | `id`, `parentId`, `depth` | Color, title, title font, title size, position, size, timestamps, and the rest of the note |
| `widgets` | `id`, `noteId`, `type` | Geometry, rotation, text, fonts, colors, shape, flip, `zIndex`, and the image `Blob` |

Schema version 1 was notes only. Version 2 added widgets. Dexie upgrades an existing database in place.

Two copies of the app do not share this database:

- **Browser** (`npm run dev`, usually `http://localhost:1420`) uses that browser’s IndexedDB.
- **Desktop app** uses the WebView2 profile for `com.kreik.brainbank`, under `%LOCALAPPDATA%\com.kreik.brainbank` on Windows.

Notes you made in the browser do not show up in the installed app, and the other way around. GitHub never receives note contents. A desktop update installs a new build of the program and leaves that WebView2 profile in place.

In memory, `notesStore` keeps `byId` and `childrenByParent` so zooming does not wait on IndexedDB. `widgetsStore` does the same for widgets. A `version` counter bumps on every change so the canvas re-reads those maps. Writes are also sent to Dexie.

On load, notes with a broken or cyclic parent chain are deleted. Missing title fields are filled in. Depth is recomputed from the parent chain.

## Desktop app and updates

The installable app is a [Tauri 2](https://v2.tauri.app/) window around the same React UI.

- Product name: BrainBank
- Identifier: `com.kreik.brainbank`
- Default window: 1280×800
- Updater endpoint: `https://github.com/OwenKreikemeier/BrainBank/releases/latest/download/latest.json`
- The minisign public key is embedded in `src-tauri/tauri.conf.json`
- `createUpdaterArtifacts` is on, so a release build produces the installer and the updater manifest

On startup, `InfiniteCanvas` calls `updateStore.checkForUpdate` once. In the browser (no Tauri) that check does nothing. In the desktop app it asks the updater plugin whether the latest GitHub release is newer than the installed version. It does not poll after that. It does not download until you press **Update now** in Settings. That button downloads, installs, and relaunches. If the check fails because you are offline, it tries again the next time you open the app.

### Publishing a release

`.github/workflows/release.yml` runs on every push to `main`, and when you start it by hand.

1. It reads `version` from `src-tauri/tauri.conf.json`.
2. If the tag `v<version>` already exists, the workflow stops. A normal push does not publish anything.
3. If the tag is new, a Windows runner installs Node 22 and Rust, runs `npm ci`, and uses `tauri-apps/tauri-action` to build a signed installer and publish the GitHub release, including `latest.json`.

So a push updates the desktop app only when the version in `tauri.conf.json` changed. Keep these in sync when you bump it:

- `src-tauri/tauri.conf.json` (this is the version the workflow and the updater use)
- `package.json` and `package-lock.json`
- `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock` (package name `brainbanktemp`)

The release needs one repository secret:

- `TAURI_SIGNING_PRIVATE_KEY` — the minisign private key that matches the public key in `tauri.conf.json`

The key has no password. The workflow sets `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to an empty string, so you do not add a password secret.

The repository has to be **public**. The installed app fetches `latest.json` from the public releases URL with no token. A private repository would make that request fail unless a token were baked into the app.

After the Action finishes, open the installed app. If the release version is newer, the Settings button shows the red dot.

## Development

### Requirements

- Node.js 22 (the release workflow uses 22; local development works on a current Node 20+ as well)
- npm
- For the desktop shell: the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), including Rust

### Scripts

```bash
npm install
npm run dev          # Vite at http://localhost:1420
npm run build        # tsc, then Vite build into dist/
npm run preview      # serve the production frontend
npm run tauri dev    # desktop window; starts Vite itself
npm run tauri build  # production installer into src-tauri/target/release/bundle
```

Vite is pinned to port **1420** (`strictPort: true`) because Tauri’s dev URL is `http://localhost:1420`. If something else is using that port, dev will fail instead of picking another port. Hot reload ignores `src-tauri/` so Rust rebuilds are not triggered by frontend edits.

`npm run dev` is the browser app. `npm run tauri dev` is the desktop app. They do not share notes.

### Project layout

```
src/
  main.tsx                 React entry
  App.tsx                  Mounts InfiniteCanvas
  types/index.ts           Note, Widget, grid constants, palettes, fonts
  db/database.ts           Dexie schema
  store/
    notesStore.ts          Note tree, load, create, update, delete
    widgetsStore.ts        Widgets on notes
    canvasStore.ts         Frame, pan, zoom, placement, enter/jump/reset
    uiStore.ts             Selection, menus, clipboards, editing
    settingsStore.ts       Theme, grid, depth labels, default title font
    updateStore.ts         GitHub updater check and install
  lib/
    coordinates.ts         Cell ↔ screen, rebase in/out, overlap
    noteValidity.ts        Where a note or widget is allowed to sit
    groupOps.ts            Multi-select move and scale
    noteClipboard.ts       Copy/paste notes and widgets
    noteSearch.ts          Title search ranking
    fitTextFont.ts         Shrink text until it fits
    color.ts               Hex helpers for the HSV picker
    pickImage.ts           File input for images
  hooks/
    useCanvasNavigation.ts Pan, zoom, placement, keyboard
    useNoteDrag.ts         Title-bar drag
    useNoteResize.ts       Note corner resize
    useWidgetInteract.ts   Widget move, resize, rotate
    useGroupScale.ts       Selection-frame scale
  components/canvas/       The canvas, HUD, notes, widgets, toolbars, dialogs
src-tauri/
  tauri.conf.json          App id, version, updater, bundle
  src/lib.rs               Tauri plugins: opener, updater, process
  capabilities/default.json
  Cargo.toml
.github/workflows/release.yml
```

### How a change moves through the app

1. Pointer and keyboard events land in `useCanvasNavigation` or in a note/widget hook.
2. The hook asks `noteValidity` whether the geometry is legal, then updates the Zustand store.
3. During a drag, positions are cache-only. On release, a legal result is written to Dexie. An illegal result is reverted.
4. Components subscribe to `version` (and to selection) and re-read the maps. `NotesLayer` and `WidgetsLayer` turn cell coordinates into screen pixels with the current pan and zoom.

Placement mode is the same path for notes, pasted notes, text, images, and shapes. The kind is `placementKind` on the canvas store. Widget kinds use a free rectangle preview. Note kinds use a snapped square.

### Fonts

| Label | CSS stack |
| --- | --- |
| Sans | `system-ui, sans-serif` |
| Serif | `Georgia, 'Times New Roman', serif` |
| Mono | `ui-monospace, Consolas, monospace` |
| Comic | `"Comic Sans MS", "Comic Sans", cursive` |

The default note font in Settings applies only when a note is created. Pasted notes keep the font they were copied with. Text blocks have their own font, chosen on the text toolbar, and are not affected by the default note font.

### Color presets

Note fills: yellow `#f5d33f`, green `#7ed957`, blue `#5aa9ff`, pink `#ff8fb1`, orange `#ffa94d`, purple `#c08bff`.

Title colors: black `#1a1a1a`, white `#ffffff`, gray `#4a4a4a`, blue `#1d4ed8`, red `#b91c1c`, green `#15803d`.

Any of those rows also opens an HSV picker for a custom color.

## Stack

- React 19 and TypeScript, built with Vite 7
- Zustand 5 for canvas, notes, widgets, UI, settings, and updates
- Dexie 4 on IndexedDB
- Tailwind 4 is installed; most of the canvas is inline styles
- Tauri 2, with `tauri-plugin-updater` and `tauri-plugin-process`
- Windows installer published by GitHub Actions on `windows-latest`
