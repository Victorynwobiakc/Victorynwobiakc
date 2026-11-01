# 🦆 Duck — animation studio

A frame-by-frame animation web app. You draw frames, use onion skin to trace from one frame to the next, add layers and audio, then export a video.

**Status: UI/UX prototype.** All screens and flows are clickable, using mock content. The real drawing and animation engine is the next phase. See [`docs/UX.md`](docs/UX.md) for the full spec.

## Run it
No build step. Open `index.html` in a browser, or serve the folder:

```bash
cd duck && python3 -m http.server 8000
# open http://localhost:8000
# jump straight into the editor: http://localhost:8000/?screen=editor
```

## Files
| File | Purpose |
|---|---|
| `index.html` | All screens, popovers and sheets |
| `style.css` | Design system and responsive layout |
| `ui.js` | Prototype interactions (navigation, panels, timeline, playback) |
| `docs/UX.md` | Screens, flows and interaction spec |
