# Profile Card Maker

A private, browser-based card studio. Turn a photo (or just your initials) into a cinematic profile card, social portrait, story, or banner.

[Open the live app](https://mankolik.github.io/Profile-Card-Maker/)

## Card Studio features

- **Six coordinated looks:** Original, Afterglow, Hologram, Midnight FM, Silver Screen, and Less is More. Customize the finish, typography, and accent independently.
- **Surprise me:** shuffle the art direction while keeping your name, bio, photo, badge, handle, and crop.
- **Photo lab:** circle, rounded-square, and hexagon frames; original, monochrome, golden-hour, arctic, and vivid color grades; brightness, zoom, and positioning controls.
- **Direct manipulation:** upload, drop, or paste a JPG/PNG/WEBP, then drag the photo inside the preview to reframe it. Panning is clamped so the image always covers the frame.
- **More identity:** add a custom badge and handle, write a bio, or roll a random funny one. Without a photo, the card uses your initials.
- **Four composed layouts:** each format repositions the photo and text, rather than stretching the square card.
- **Optional 3D preview:** a pointer-reactive tilt effect on desktop. It respects reduced-motion settings and does not affect exports.
- **Undo / redo:** up to 50 recent states, including photo replacement, presets, project imports, and reset. Ctrl/⌘ Z and Ctrl/⌘ Shift Z work outside text inputs; text inputs keep native text undo.
- **Autosaved draft:** the current card, including its photo, is restored on the next visit in the same browser. Storage failures are reported; use **Save project** for a durable backup.
- **Editable projects:** save and open `.card.json` files containing the photo and all card settings. Unknown formats, external photo URLs, and invalid images are rejected. Importing is undoable.
- **PNG export:** standard or 2× resolution, native file sharing on supported devices, and copy-to-clipboard where available.

| Format | Standard PNG | Ultra PNG |
| --- | --- | --- |
| Square | 1080 × 1080 | 2160 × 2160 |
| Portrait | 1080 × 1350 | 2160 × 2700 |
| Story | 1080 × 1920 | 2160 × 3840 |
| Banner | 1500 × 600 | 3000 × 1200 |

## Usage

Choose a look, add a photo and your details, then choose a format and **Save / Share PNG**. On supported iPhone/iPad browsers, the native share sheet offers image/file saving. Other browsers download the PNG. Clipboard availability depends on the browser, permissions, and a secure context; PNG saving remains available when copying is unsupported.

The 2× setting doubles the entire card's pixel dimensions. Uploaded photos are normalized to at most 1800 pixels on their longest edge, so it does not recover detail missing from the source photo. Uploads are limited to 15 MB and 40 megapixels. Projects are limited to 9 MB. Photos are stored as embedded raster data; no remote images or SVG imports are loaded.

## Privacy

All editing and image processing happen locally. The app has no analytics, external fonts, API calls, or runtime dependencies. Your photo is not uploaded. Autosaved drafts remain in this browser's local storage; exported project files include the photo. Clearing site data removes the draft. Undo history is session-only and is not included in projects.

## Development

No installation or build step is needed. Open `index.html` directly, or serve this directory with any static server. Deploy the root directory to GitHub Pages as before.

- `index.html` — accessible editor controls and responsive workspace
- `styles.css` — editor presentation and optional preview tilt
- `model.js` — validated project format, history, text wrapping, and crop/layout geometry
- `renderer.js` — Canvas drawing and browser-compatible pixel color grading
- `app.js` — interactions, image loading, local drafts, and export

Run the dependency-free regression tests with Node.js 18 or newer:

```sh
node --test tests/model.test.cjs
```

The tests cover crop coverage at extreme positions, project validation and round-trips, history branching, long Unicode bios, and output layout bounds. Native browser sharing, clipboard permissions, and responsive browser presentation should also be checked on target devices when releasing.

## License

Released under the [MIT License](LICENSE).
