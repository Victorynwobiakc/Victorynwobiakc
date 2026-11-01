# Duck — UI/UX spec

Duck is a frame-by-frame animation studio for the browser. It's built for phones first, and it also works on tablets and desktops.
This document describes the screens, layout and flows. The clickable prototype (`index.html` + `ui.js`) implements all of it.
The drawing and animation engine comes in the next phase.

## Design principles
1. **The canvas comes first.** The tools float as cards, so the drawing gets most of the screen.
2. **Thumb reach.** The timeline and actions sit at the bottom, where a thumb can reach them easily on a phone.
3. **One accent colour.** Duck pink (`#ff4f7b`) marks what's active or primary and is used for nothing else.
4. **Forgiving.** Every destructive action can be undone. Delete actions on projects ask you to confirm.
5. **Learn by doing.** Short toasts explain what just happened. There's no up-front tutorial.

## Design tokens
| Token | Value | Use |
|---|---|---|
| `--accent` | `#ff4f7b` | Active tool, selected frame, primary buttons |
| `--bg` | `#f2f2f4` | App background behind floating cards |
| `--surface` | `#ffffff` | Cards, toolbar, sheets |
| `--paper` | `#fbfaf7` | Default canvas background |
| `--danger` | `#e5484d` | Delete actions |
| Radius | 12–24px | Rounded, friendly controls |
| Touch target | ≥ 44px | Every button |

## Screens

### 1. Studio (home)
- Header: Duck logo, **All / Recent** filter, help.
- A grid of project cards. Each card shows a thumbnail, the frame count, the name and when it was last edited. The **⋮** menu has Open, Rename, Duplicate and Delete.
- A dashed **New animation** card plus a floating **New animation** button.

### 2. New animation sheet
- Name, canvas size (**Landscape 16:9**, **Story 9:16**, **Square 1:1**), background colour (including transparent), and speed in fps.
- **Create** opens the editor on a blank first frame.

### 3. Editor
```
┌──────────────────────────────────────┐
│ ✕  🦆        [Studio]          ⤴  ⋮ │  top bar
├──────────────────────────────────────┤
│   ⠿ [Brush] Eraser Lasso Fill T  … │  floating toolbar (draggable)
│   ● ● ● ● ● ●   Size ━━○   Opacity   │  options for the current tool
│                                      │
│        ┌──────────────────┐          │
│        │      canvas      │          │  onion skin: previous = red,
│        └──────────────────┘          │              next = blue
├──────────────────────────────────────┤
│ [Layer] [1][2][3][4] [+]           ▶ │  timeline card
├──────────────────────────────────────┤
│ Undo Redo Copy Paste Image/Video Audio│  action bar
└──────────────────────────────────────┘
```
- **Top bar.** ✕ returns to Studio. Tapping the title also opens Studio. Share opens Export. ⋮ opens the main menu: canvas settings, export, save/open project file, rename, help.
- **Toolbar.** Brush, Eraser, Lasso, Fill, Text, and **…** for more: onion skin, flip layer, clear layer, clear frame. Drag the handle to move the toolbar; double-tap the handle to reset it.
- **Tool options.** These change with the tool:
  - Brush: colour, size, opacity
  - Eraser: size
  - Fill: colour, gap tolerance
  - Text: colour, size
  - Lasso: a short hint
- **Selection bar.** Appears while something is selected with the lasso: Done, Copy, Flip, Delete. Drag to move the selection; drag the corner to resize it.
- **Timeline.**
  - Each frame is a thumbnail with a number badge.
  - Tap a frame to jump to it.
  - Tap the selected frame again for its menu: Duplicate, Insert blank before, Move left/right, Clear, Delete.
  - **＋** adds a frame after the current one.
  - ▶ plays the animation. While it plays, the toolbar dims; tap the canvas to stop.
- **Layers panel** (opens from the Layer button). Rows are listed top to bottom, each with a thumbnail and a show/hide eye. You can also set opacity, Add, Move up/down, Rename and Delete. A layer exists in every frame.
- **Action bar.**
  - Undo / Redo.
  - Copy and Paste work on the frame, or on the selection if one is active.
  - **Image/Video:** an image comes in as a movable selection. A video is split into frames on a new "Video" layer, so you can trace over it (rotoscoping).
  - **Add audio:** after you add a track, the button turns pink and shows the track name. Tap it again to replace or remove the track.

### 4. Export / share sheet
- Shows a preview with frames, duration and fps.
- Formats: **Video** (MP4/WebM with audio), **GIF**, **Image** (current frame), **Sprite sheet**.
- Export shows a progress bar, then the Done screen with **Download** and **Share…** (uses the system share sheet where the device supports it).

### 5. Canvas settings
Speed (1–30 fps), background, onion skin on/off, loop on/off, and the canvas size.

## Core flows
1. **First animation:** New animation → draw → ＋ → trace over the onion skin → ▶ → Share → Video.
2. **Edit a frame:** tap the selected frame → Duplicate → make a small change.
3. **Rotoscope:** Image/Video → pick a video → draw on a new layer above it → hide the Video layer → export.
4. **Lip sync:** Add audio → ▶ to preview with sound → adjust frames.

## Keyboard (desktop)
| Keys | Action |
|---|---|
| B, E, L, F, T | Switch tools |
| `[` and `]` | Change size |
| Ctrl+Z, Ctrl+Shift+Z | Undo / redo |
| Ctrl+C, Ctrl+V | Copy / paste |
| ←, → | Previous / next frame |
| N | New frame |
| D | Duplicate frame |
| O | Onion skin on/off |
| Space | Play / stop |
| Esc | Close menus |

## Responsive rules
- **Phones (≤ 520px):** smaller tools and frames; sheets slide up from the bottom.
- **Desktop (≥ 900px):** the timeline is centred and at most 1100px wide; the action bar is centred.
- **Canvas:** always scaled to fit the space below the toolbar, keeping its aspect ratio.
- **Notched phones:** safe-area insets are respected.

## Next phase (engine)
- Raster layers per frame and a real brush with smoothing and pressure.
- Flood fill, lasso move/scale, and the text tool.
- Undo history stored as changed regions only, to save memory.
- Autosave to IndexedDB; project file import/export.
- Video and GIF export with audio.
