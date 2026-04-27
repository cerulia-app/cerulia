---
name: appview-image-assets
description: "Use when: implementing appview features that reference image files (portraits, icons, logos, background images, decorative images) that do not yet exist in appview/static/. Creates transparent PNG placeholders at the target paths so implementation proceeds without broken img tags, then writes IMAGE-REQUESTS.md with production-ready specs. The user replaces each placeholder by renaming an externally created image to the exact placeholder filename. Use for: missing image assets, image stubs, image placeholders, asset requests to user, broken image, image not found."
argument-hint: "Describe the feature being implemented and list the images it needs"
---

# AppView Image Assets

## What This Skill Does

When implementation needs an image that does not yet exist:

1. Runs [create-placeholder.mjs](./scripts/create-placeholder.mjs) to place a transparent PNG at each target path at the intended display resolution — `<img>` tags render without errors and layout reflects real dimensions immediately.
2. Uses [manage-image-requests.mjs](./scripts/manage-image-requests.mjs) to append a detailed per-image spec to `IMAGE-REQUESTS.md` at the workspace root.

The user creates the real image externally (by hand or using a generative AI tool), renames it to match the placeholder filename, and drops it into `appview/static/`. No code changes are required.

## Scripts

| Script | Purpose |
|--------|---------|
| [create-placeholder.mjs](./scripts/create-placeholder.mjs) | Generate a transparent PNG at a given path and resolution |
| [manage-image-requests.mjs](./scripts/manage-image-requests.mjs) | Add / get / delete / update / list entries in IMAGE-REQUESTS.md |

## Procedure

### Step 1 — Identify Required Images

For each image the feature needs, determine:

- **Target path**: path relative to `appview/static/` (e.g., `images/character-portrait.png`). This becomes the `src` in `<img src="/images/character-portrait.png">`.
- **Display size**: the CSS-rendered width × height in pixels at which this image is displayed. Use this as the placeholder resolution.
- **Display context**: which Svelte component renders it and the CSS role (background, `<img>`, `object-fit`, etc.).
- **Visual role**: portrait, logo, icon, background, decoration, etc.

### Step 2 — Create Placeholders

For each image, run from the workspace root. Include the intended display resolution so layout matches production dimensions during development:

```sh
node .github/skills/appview-image-assets/scripts/create-placeholder.mjs appview/static/<relative-path> <width> <height>
```

Example:
```sh
node .github/skills/appview-image-assets/scripts/create-placeholder.mjs appview/static/images/character-portrait.png 240 320
```

The script generates a `width×height` fully-transparent PNG and creates any missing parent directories. If a file already exists at the path, the script skips it without overwriting.

When the display size is not known at the time of implementation, omit the dimensions (defaults to 1×1). Update the placeholder later by deleting the file and re-running the script with explicit dimensions.

### Step 3 — Implement Using Placeholder Paths

Reference each image by its final URL path (e.g., `<img src="/images/character-portrait.png" alt="...">`). Do not add `onerror` fallbacks or conditional rendering for missing images — the placeholder guarantees the file exists.

### Step 4 — Register Entries in IMAGE-REQUESTS.md

For each image, write the entry as a markdown file following [image-request-template.md](./references/image-request-template.md), then append it to `IMAGE-REQUESTS.md` via the management script.

**Workflow:**

1. Write the entry content to a temporary file (e.g., `.tmp-image-request.md`) using the `create_file` tool.
2. Run:
   ```sh
   node .github/skills/appview-image-assets/scripts/manage-image-requests.mjs add .tmp-image-request.md
   ```
3. Delete the temporary file:
   ```sh
   Remove-Item .tmp-image-request.md
   ```

**Other operations:**

```sh
# Print the entry for a specific image (suffix match accepted)
node .github/skills/appview-image-assets/scripts/manage-image-requests.mjs get images/character-portrait.png

# Replace an entry (write the updated content to a temp file first)
node .github/skills/appview-image-assets/scripts/manage-image-requests.mjs update images/character-portrait.png .tmp-image-request.md

# Remove an entry
node .github/skills/appview-image-assets/scripts/manage-image-requests.mjs delete images/character-portrait.png

# List all registered images
node .github/skills/appview-image-assets/scripts/manage-image-requests.mjs list
```

The `<image-path>` argument for `get`, `delete`, and `update` accepts a suffix match: `appview/static/images/portrait.png`, `images/portrait.png`, and `portrait.png` all resolve to the same entry.

**Entry quality requirements** (fill every field — the user may pass IMAGE-REQUESTS.md directly to a generative AI tool):
- **構図・レイアウト**: frame, subject positioning, safe zones, crop behaviour.
- **被写体・コンテンツ**: concrete subject — for characters: species, build, clothing, expression, pose; for objects: shape, material, elements. No ASCII art.
- **スタイル・テイスト**: art style name, line quality, shading depth, light direction, 3–5 descriptive adjectives.
- **配色ガイドライン**: hex values or precise color names, colors to avoid, relationship to the UI palette.
- **背景・前提情報**: display context, why the image exists, intended viewer impression.
- **生成 AI への追加指示**: positive prompt keywords, quality modifiers, NG (negative) elements.

### Step 5 — Report to User

List each placeholder path and resolution that was created, then state:

> 画像のプレースホルダーを作成しました。`IMAGE-REQUESTS.md` に各画像の制作仕様を記載しています。外部で画像を作成したら、各プレースホルダーと同じファイル名に変更して `appview/static/` 内のファイルを置き換えてください。コードの変更は不要です。

## Notes

- If an image requires separate dark-mode and light-mode variants, create a separate placeholder and IMAGE-REQUESTS.md entry for each variant.
- If a portrait is placed over a non-uniform background in the UI, set **透過: 必要** and note the UI background color in **配色ガイドライン**.
- Do not create placeholders for images that users upload at runtime (e.g., user-provided character portraits stored via AT Protocol blobs). Placeholders are only for static assets bundled with the appview.
