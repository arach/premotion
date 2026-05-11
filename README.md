# premotion

**[arach.github.io/premotion](https://arach.github.io/premotion/)** · AI-driven video composition.

Premotion is a Hudson-shelled studio for video, music, and motion graphics with an agentic review loop. Mark up a take, write what you want changed, and the agent rewrites the source — whether it's a Remotion video, a Hyperframe motion graphic, a music track, or an animated logo.

## What it is

Three parts:

- **Catalog** — every capture indexed with scenes, transcripts, vision tags, and storyboard frames. Audio tracks, animated logos, and rendered Hyperframes live alongside the videos.
- **Reviewer** — annotate frames with timestamped rects, zooms, and general feedback. Leave feedback on music tracks and motion graphics the same way.
- **Composer** — two engines: **Remotion** for programmatic video (TSX), and **Hyperframes** for single-file HTML/CSS/JS motion graphics. Music tracks generate from prompts. Logos animate from an SVG drop. All of it lives in the repo as source.

The agent runs the revise loop in two stages: `revise-brief` reads your notes plus the source and writes a small plan; you confirm or edit; `revise-render` rewrites the source and queues the new take. The same loop drives `logo-brief` / `logo-render` for animated logos and the music-revise flow for tracks.

Compositions are text, not a timeline.

## The cycle

1. **Capture.** Drop a screen recording in `public/inbox/` or render a fresh composition with `bun run studio`. The catalog scanner picks it up on next build.
2. **Review.** Open the take in the catalog detail view or the full-screen review modal. Drop annotations on the frames that need changes. Leave general notes for anything that isn't a single moment.
3. **Revise.** Submit the notes. `revise-brief` proposes a change plan; you confirm or edit. `revise-render` rewrites the composition and queues a new job.
4. **Ship.** Compare takes side-by-side. The catalog stages live moves: `source` → `wip` → `final`. Hand off the final MP4 or the source TSX — they always agree.

## Quick start

```sh
git clone github.com/arach/premotion && cd premotion
bun install
bun run dev              # catalog studio at http://localhost:3100
bun run studio           # Remotion studio with live preview + render queue
```

## Project layout

```
app/                 Next.js app router — the catalog studio
catalog/             Provider + slots that fill the Hudson shell
  PlayerContext.tsx  thin adapter over hudsonkit/player
  slots/             LogoStudio, MusicView, VideoDetail, ReviewPlayer, etc.
services/jobs/       Job worker + LLM dispatch (revise-brief, revise-render,
                     logo-brief, logo-render, generate, render)
src/                 Remotion compositions, intros, project folders
  intros/            Bundled motion intros
  projects/          Per-project composition trees
  Root.tsx           registers compositions for the main Studio
  studio.logos.ts    `bun run studio:logos` — focused loadout
  studio.templates.ts `bun run studio:templates` — focused loadout
lib/                 Shared types and helpers
scripts/             Catalog build + composition registry generator
public/              Static assets, demos, tracks, inbox, brand
docs/                Landing page (deployed to GitHub Pages)
hyperframes/         Per-project Hyperframe reels (codex, evidence, work)
tools/
  hyperframes-toolkit/  Brand-native HTML/CSS motion-effect library
```

## Key features that landed recently

- **Full media player** (`hudsonkit/player`) — single `<video>` element owned by `PlayerProvider`, plays audio too, queue with shuffle/repeat, position persistence, OS media keys via Media Session, element + Document Picture-in-Picture, global keyboard shortcuts. Extracted to `hudsonkit/player` so other apps consume the same primitive.
- **Logo composition framework** — drag-and-drop SVG (or prompt-only), `logo-brief` synthesizes a motion plan, `logo-render` writes a complete Hyperframe HTML document. Same review-and-revise loop as video.
- **Two-stage revise** — `revise-brief` proposes the change plan in markdown before regenerating, so you approve intent before burning render cycles.
- **Generated compositions registry** — `bun run scripts/generate-compositions-registry.ts` scans `.compositions/<id>/Composition.tsx` and exposes them under a `Generated` folder in the main Remotion studio.

## Stack

- **Remotion** — programmatic video as React
- **Hyperframes** — single-file HTML/CSS/JS motion graphics; the output is also the deliverable
- **Hudson** ([hudsonkit](https://github.com/arach/hudson)) — chrome, slots, app shell, and the media player
- **Next.js 16** — the catalog studio runtime
- **Bun** — install, scripts, render workers
- **Anthropic / AI SDK** — the revise loop runs against your model of choice

## License

Personal project; see [LICENSE](./LICENSE) if present, otherwise rights reserved.
