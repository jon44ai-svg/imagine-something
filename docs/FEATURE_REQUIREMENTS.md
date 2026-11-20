# Feature Requirements & Architecture Backlog

Persisted product & UX requirements for **Runware I2I Pipeline**. All additions must preserve backwards compatibility with existing `localStorage` (`runware_i2i_api_key`, `runware_i2i_settings_v1`, `runware_i2i_model_library_v1`) and `IndexedDB` (`RunwareI2IPipelineDB` v1) storage, strict TypeScript (`erasableSyntaxOnly`, `verbatimModuleSyntax`), SOLID module boundaries, and Vitest coverage.

---

## 1. Per-Model Supported Resolutions (Learned, Seeded & Persisted)

### Triggering Error Example (`meta:muse@image`)
```text
Unsupported use of width/height parameters. The specified dimensions are not supported for the selected model. Supported values are: '1600x1600', '1920x1280', '1280x1920', '1792x1344', '1344x1792', '2048x1152', '1152x2048', '2352x1008'.
```

### Requirements
1. **Seed & Learn Allowed Dimensions**:
   - Seed `meta:muse@image` with its known supported dimensions (`1600x1600`, `1920x1280`, `1280x1920`, `1792x1344`, `1344x1792`, `2048x1152`, `1152x2048`, `2352x1008`) alongside its existing `steps` restriction.
   - Parse Runware dimension-rejection errors dynamically (e.g., extracting `'WxH'` pairs from `Supported values are: ...`) for *any* model on the fly.
   - Persist learned per-model allowed resolutions in `ModelLibrary` (`localStorage` key `runware_i2i_model_library_v1`) so subsequent runs and UI controls immediately know the model's exact resolution constraints.
   - Automatically retry the rejected inference request with the resolved supported `width`/`height` so the first run succeeds without manual intervention.
2. **Resolution Strategy Toggle (Inferred vs. Fixed)**:
   - Support two explicit modes when a model has a limited set of supported resolutions (and seamlessly align with existing sizing controls):
     - **Infer from input image** (`match` / auto-match): for each queued input image, select the supported resolution whose aspect ratio is closest to the input image's natural aspect ratio (with tie-breaking by target size preference).
     - **Fixed supported resolution**: user explicitly chooses one of the model's saved supported `WxH` options (e.g., `1920x1280`, `1600x1600`, `2352x1008`) applied to all queued inputs.
   - Persist the user's chosen strategy and selected resolution in settings.
3. **Original Image Aspect-Ratio Compatibility Preview**:
   - Allow previewing each queued original input image in the target resolution's aspect ratio (both inline in the pipeline and in preview/lightbox) so the user can verify framing/cropping compatibility before running the batch.
   - Show the resolved target `WxH`, aspect ratio label (e.g., `3:2`, `21:9`, `1:1`), and crop/distortion delta badge (e.g., exact match vs. moderate/heavy crop warning) per input image, plus optional visual crop-frame mask overlay on the original image.

---

## 2. Futuristic UI & Mantine v9 Component Integrations

All target packages are verified compatible with `@mantine/core` `^9.8.x` and React `19`:

| Package | Version | Planned Feature Role |
|---|---|---|
| `@mantine/spotlight` | `9.8.2` | Global `Ctrl+K` / `Cmd+K` command palette: jump routes (`/pipeline`, `/gallery`, `/settings`), switch favorite/preset models, toggle generation time or face focus, run/stop batch, download ZIP, open queue items |
| `@mantine/carousel` (+ `embla-carousel`, `embla-carousel-react`) | `9.8.2` | Smooth swipeable/keyboard filmstrip carousel for multi-output strips per input, aspect-ratio compatibility preview carousel across queued inputs, and gallery browsing |
| `@mantine/lightbox` | `9.8.2` | Native Mantine full-screen media lightbox integrated alongside custom zoom/pan, face-focus, and compare inspection modes |
| `@gfazioli/mantine-border-animate` | `3.0.13` | Futuristic animated beam/glow/progress borders on active processing pipeline cards, dropzone hover/drag targets, and featured controls |
| `@gfazioli/mantine-compare` | `1.0.19` | Interactive draggable/hover/diagonal Before/After split slider comparing Original Input vs. Generated Output (upgrading Side-by-Side comparison in Lightbox & cards) |
| `mantine-contextmenu` (+ `clsx`) | `9.8.1` | Desktop-grade right-click context menus on input thumbnails, output cards, and gallery items (Run/Re-run, Preview Aspect Crop, Compare Before/After, Focus Face, Download, Copy Prompt/Seed, Favorite Model, Delete) |
| `@gfazioli/mantine-depth-select` | `2.1.2` | 3D Time-Machine stacked card switcher for browsing favorite/preset models or cycling output variations/history per input |
| `@gfazioli/mantine-led` | `4.0.22` | Live hardware-style telemetry LEDs for API key status, worker/pipeline state (idle/running/error/done), sync vs. async mode, and per-item status indicators |
| `@gfazioli/mantine-lens-select` | `1.0.19` | macOS-Dock / fisheye magnification selector for picking supported model resolutions, aspect ratios, concurrency workers, or quality tiers |
| `@gfazioli/mantine-mask` | `2.0.20` | Interactive spotlight/crop mask for inspecting high-res output details and visualizing the target aspect-ratio crop window over original input images |

### Futuristic Visual Theme Direction
- Cohesive dark cyber-studio palette (deep obsidian canvas, subtle neon cyan/indigo/violet accents, frosted glass panels with hairline borders, crisp monospace telemetry readouts for dimensions/seed/duration/cost).
- Respect reduced motion preferences and preserve readability, keyboard navigation, and existing test accessibility labels.
