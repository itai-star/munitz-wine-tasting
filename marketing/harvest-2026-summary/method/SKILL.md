---
name: munitz-harvest-video
description: Produce Munitz Winery harvest-summary content from the real intake data: five Instagram slides (leaf illustration next to every variety name) and a ~25s vertical atmosphere video (Higgsfield footage + data captions + logo + end card). Use whenever Itai asks for a harvest ("בציר") summary, harvest slides, a harvest atmosphere/reel video, or a data-driven video for the winery. Records the exact workflow, prompts, scripts and pitfalls from the 2026 harvest build (approved by Itai 2026-10-19).
---

# Munitz harvest summary: slides + atmosphere video

Everything below was built and approved for the **2026 harvest** (slides v2, video v3). Reuse the method; only the numbers, dates and variety list change. Respond to Itai in Hebrew (project rule), files delivered to him need ASCII names.

Read first: `brand-dna.md`, `voice-and-style.md`, `visual-style.md` (paths in the global CLAUDE.md). The brand rules below are already applied, don't re-derive them.

## Output locations

- Work folder (the 2026 build, keep as reference): `marketing/harvest-2026-summary/`
  - `assets/leaves/leaf_00..16.png` pencil leaf per variety (reusable, see the index map in `scripts/02-build-slides.cjs`), `assets/logo.png`, `assets/icon-u.png`, `assets/fonts/DavidLibre-*.ttf`
  - `v2/` approved slides (HTML source + PNG), `video/` approved video (`harvest-2026-atmosphere-v3.mp4`) with overlays and clips
- For a new season: copy to `marketing/harvest-<year>-summary/`, never overwrite an approved version, save changes as the next version (v1, v2, v3...).
- Scripts in this skill's `scripts/` are the working originals. Their paths and numbers are hard-coded to 2026: edit the `OUT` path, the variety table (`V`), month totals and captions.

## Step 1: pull the real data

The harvest data is in the app's **production database**, not in the Supabase MCP project (that one has no GrapeIntake table). Query it with the project's Prisma client, reading `.env.local` at runtime only (never print the env file):

```bash
node --env-file=.env.local <scratchpad>/01-harvest-data.cjs     # per variety: kg, bins, deliveries, first/last date
node --env-file=.env.local <scratchpad>/01b-harvest-by-month-and-day.cjs   # per month and per day
```

Run from the project root; the script requires `node_modules/@prisma/client` by absolute path. Print aggregates only.

- Merge typo variants of the same variety before summarising (2026: "קברנה סובניון" and "קברנה סובינון" are one variety, shown as "קברנה סוביניון").
- Sanity check: per-variety kg must sum to the grand total (2026: 24,571 kg = 24.6 tons, 17 varieties, 25 deliveries, first 19.8, last 14.10 as of 19.10).
- State "as of <date>" on every piece, the harvest may still be running.

## Step 2: leaf illustrations (Higgsfield, one per variety)

`mcp__higgsfield__generate_image_batch`, model `gpt_image_2_5`, 1:1, ~0.25 credit each. Prompt pattern (swap the variety and a short leaf description):

> Single botanical pencil illustration of ONE grapevine leaf, <Variety>: <lobes / sinus / teeth description>. Black graphite pencil sketch with fine hatching on plain flat off-white paper, centered, generous empty margin, no text, no other objects, no shadow on the background.

- Submit at most ~8 per call. Larger batches hit `429 rate_limit_reached`; resubmit the failed indexes after the first batch finishes (don't fire two batches in parallel).
- Wait with `jobs_wait` (<=15s per call), download the `result_url`s with curl.
- Honest caveat to tell Itai: leaves of close varieties (e.g. סירה / פטיט סירה) look nearly identical, names carry the distinction.

## Step 3: compositing look (applies to slides and video overlays)

Never let the AI render Hebrew text or the logo. Compose them separately: HTML -> Edge headless screenshot -> (video) ffmpeg overlay.

- Edge: `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=W,H --virtual-time-budget=6000 --screenshot=out.png file:///...html` (URL-encode spaces as `%20`). For transparent overlay PNGs add `--default-background-color=00000000`.
- Fonts: David Libre (Regular/Medium/Bold) from the local fonts folder via `@font-face` (Rokoko is the official Hebrew font but we have no license).
- **Leaf on any colour**: put the pencil leaf through an inline SVG filter that converts to grayscale and maps the paper tones to pure white (`feColorMatrix` luminance + `feComponentTransfer type="table" tableValues="0 0.02 0.05 0.10 0.17 0.27 0.40 0.57 0.78 1 1"`), then `mix-blend-mode: multiply`. Wrap every leaf in a cream "plate" `.disc` with `isolation:isolate; overflow:hidden`, otherwise grey square corners show on transparent overlays.
- Slide look approved by Itai: warm cream-to-peach gradient background (NOT white), subtle paper grain, big logo (176px tall), leaves on soft cream discs, black type with red `#C4143F` only as accent, warm brown secondary text `#6b3f35`, soft red hairline above the footer. **Footer text only**: `יקב מוניץ - יקב בוטיק משפחתי` (no red drops on the sides, no hard black line). Less "technical": leaf size encodes quantity instead of bar charts, month cards with rounded corners.
- The five slides (1080x1350): cover (24.6 tons, 17 varieties, 25 deliveries, first/last variety), top-8 varieties, other 9, month by month (Aug/Sep/Oct kg, deliveries, leaf per variety), all 17 chronologically with first-delivery date + closing question and `לחיי יין ישראלי 🍷`. Built by `scripts/02-build-slides.cjs`.

## Step 4: video footage (Higgsfield, Seedance 2.0)

`mcp__higgsfield__generate_video_batch`, model `seedance_2_0`, `aspect_ratio 9:16`, `resolution 1080p`, `mode std`, `generate_audio true` (native ambient sound is the only audio, Higgsfield has no standalone music). Cost: 5s = 60 credits, 10s = 120. Four scenes:

1. Vineyard at sunrise, mist, slow push-in between the rows (5s). Caption: season summary + `בציר 2026`.
2. Close-up of hands (no face) cutting a cluster of **small, round, blue-black wine grapes, Cabernet style, with waxy bloom, compact berries, "not large table grapes, no red or green berries"** into a crate (5s). Caption `24.6` / `טון ענבים` / `נבצרו ונקלטו ביקב`.
3. Winery courtyard, wooden crate tipped by hands only, **whole intact clusters with stems** tumbling onto a wooden table, **"completely dry: absolutely no liquid, no juice, no wine, no red splashes"** (5s). Caption `25` / `משלוחים מהכרמים` / date range.
4. Macro of dew-covered small dark wine grapes next to a lobed vine leaf, backlit, slow rack focus, **10s** (so every variety can rotate). Caption `17` / `זנים` + rotating leaf rows.

Rules learned:
- Say "no face visible", "no text, no logos". Itai's red line: no generic stock-style people toasting.
- The word "juice" in a prompt produced wine pouring from the crate. Describe grapes only and explicitly forbid liquid; ask for "whole clusters", not berries (berries alone looked like black beads).
- Table-grape look is a real failure: always specify wine-grape traits.
- If a submit returns `Preset "IN THE DARK" was recommended`, resubmit that index with `declined_preset_id` set to the id it returns.
- When a scene is "excellent except one thing", regenerate only that clip (two variants with different camera angles in one batch, pick one) and rebuild; keep the other clips.
- Download clips with curl, contact-sheet them with ffmpeg `fps=...,tile=` and look before assembling.

## Step 5: assemble (ffmpeg, local)

ffmpeg is installed (winget Gyan build, on PATH in Git Bash). `scripts/03-build-video-overlays.cjs` writes the overlay HTML files, render each to a transparent 1080x1920 PNG (end card opaque), then `scripts/04-assemble-video.sh` (run from the video folder) does:

- clips trimmed (5s / 5s / 5s / 9.5s), 30 fps, overlay PNGs with alpha fade in (0.5-1.1s) and out; 0.5s `xfade` between scenes; 3s end card; audio per clip with `acrossfade`, silent tail, `loudnorm=I=-16`, 25.5s total, H.264 CRF 18, AAC, `+faststart`.
- Scene 4: a static overlay (`17` + `זנים` + scrim) plus four row overlays that crossfade every ~2s: 5 varieties first (מרלו, קברנה סוביניון, שיראז, קריניאן, טנט), then 4+4+4 so all 17 appear.
- The script expects clip names `clips/clip0.mp4`, `clips/v2_clip1.mp4`, `clips/v3_clip2b.mp4`, `clips/v2_clip3.mp4`: rename for a new build.
- Look at 5-7 sampled frames (`ffmpeg -ss T -frames:v 1`) before delivering, then delete the check images.

Video look approved by Itai: logo on a cream rounded card at the top (y~170), dark warm scrim at the bottom, numbers in `#FFE38F` (300px+), labels white bold with shadow, small peach rule, text kept clear of the Instagram UI zones (top ~250, bottom ~370), end card = cream-peach gradient with large logo, `בציר <year>`, `יקב מוניץ - יקב בוטיק משפחתי`, `לחיי יין ישראלי 🍷`. Itai asked for a large season-summary caption (80px kicker) and the exact wording `24.6 טון ענבים נבצרו ונקלטו ביקב`.

## Delivery and iteration habits

- Send with SendUserFile, ASCII file names (`slide-1-cover.png`, `harvest-2026-atmosphere-v3.mp4`), `display: render`.
- Say what it cost (credits), what is generic footage rather than their own vineyard, and which scenes are variants kept in reserve.
- Don't leave stray folders: use the scratchpad for temp files, never a short-name path like `C:\ITAIMU~1` (the Write tool creates literal folders there).
