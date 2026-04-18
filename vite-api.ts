import type { Plugin } from "vite";
import { spawn } from "child_process";
import { existsSync, copyFileSync, readFileSync } from "fs";
import { join, basename } from "path";
import Anthropic from "@anthropic-ai/sdk";

const ROOT = import.meta.dirname || ".";
const PUBLIC = join(ROOT, "public");
const DEMOS = join(PUBLIC, "demos");

const running = new Map<string, { status: string; log: string[] }>();

async function aiReview(video: any): Promise<any> {
  const client = new Anthropic();

  // Build frame content blocks with images
  const imageBlocks: any[] = [];
  if (video.storyboardDir && video.frames?.length) {
    const framesToSend = video.frames.slice(0, 12); // cap at 12 frames
    for (const f of framesToSend) {
      const path = join(DEMOS, video.storyboardDir, f);
      if (existsSync(path)) {
        const data = readFileSync(path).toString("base64");
        const tag = video.visionTags?.find((t: any) => t.frameFile === f);
        imageBlocks.push({
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data },
        });
        imageBlocks.push({
          type: "text",
          text: `Frame: ${f} | Time: ${tag?.time ?? "?"}s | ${tag?.description || "(no description)"}`,
        });
      }
    }
  }

  // Build scene/activity context
  const scenes = video.edl?.scenes || video.scenes || [];
  const sceneText = scenes
    .map((s: any) => `  ${fmtTime(s.start)} → ${fmtTime(s.end)} [${s.activity || "?"}] ${s.description || ""}`)
    .join("\n");

  const transcriptText = video.transcript?.segments
    ?.map((s: any) => `  ${fmtTime(s.start)} ${s.text}`)
    .join("\n") || video.srt || "";

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: [
        ...imageBlocks,
        {
          type: "text",
          text: `You're reviewing raw footage for a developer product video. This is "${video.id}" — a ${video.app} recording (${fmtTime(video.duration)}).

Description: ${video.description || "(none)"}
Tags: ${(video.tags || []).join(", ")}

Scenes:
${sceneText || "(no scene data)"}

${transcriptText ? `Transcript:\n${transcriptText}` : ""}

Review this footage and return JSON:
{
  "usable": [{"time": <seconds>, "what": "...", "why": "..."}],
  "emphasis": [{"time": <seconds>, "what": "...", "strength": "strong|medium|weak"}],
  "script": {
    "suggested_sequence": [{"start": <s>, "end": <s>, "label": "...", "note": "..."}],
    "narrative_arc": "one sentence describing the best story to tell with this footage",
    "repetitive": ["list of things that repeat and should be cut"],
    "missing": ["what would make this stronger if re-shot"]
  },
  "verdict": "one line — is this footage usable and for what"
}

Be direct. No filler. Think like an editor under deadline.
Return ONLY the JSON.`,
        },
      ],
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return { error: "Failed to parse response", raw: text };
}

function fmtTime(s: number | null | undefined): string {
  if (s == null) return "--";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function apiPlugin(): Plugin {
  return {
    name: "premotion-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();

        res.setHeader("Content-Type", "application/json");

        // POST /api/analyze
        if (req.method === "POST" && req.url === "/api/analyze") {
          let body = "";
          for await (const chunk of req) body += chunk;
          const { videoId, sourcePath, filename } = JSON.parse(body);

          if (running.has(videoId)) {
            res.end(JSON.stringify({ ok: false, error: "Already running" }));
            return;
          }

          // Resolve source path
          const expanded = sourcePath?.replace(/^~\//, `${process.env.HOME}/`);
          const demosFile = filename ? join(DEMOS, filename) : null;

          let inputPath: string | null = null;

          if (demosFile && existsSync(demosFile)) {
            inputPath = demosFile;
          } else if (expanded && existsSync(expanded)) {
            // Copy to demos first
            const destName = filename || basename(expanded).replace(/\s+/g, "-").toLowerCase();
            const destPath = join(DEMOS, destName);
            if (!existsSync(destPath)) {
              copyFileSync(expanded, destPath);
            }
            inputPath = destPath;
          }

          if (!inputPath) {
            res.end(JSON.stringify({ ok: false, error: "Source video not found", tried: [expanded, demosFile] }));
            return;
          }

          running.set(videoId, { status: "running", log: [] });

          const proc = spawn("bun", ["run", "scripts/analyze-video.ts", inputPath], {
            cwd: ROOT,
            env: { ...process.env },
          });

          const entry = running.get(videoId)!;

          proc.stdout.on("data", (d) => entry.log.push(d.toString()));
          proc.stderr.on("data", (d) => entry.log.push(d.toString()));

          proc.on("close", (code) => {
            entry.status = code === 0 ? "done" : "error";

            // Rebuild catalog data
            if (code === 0) {
              const rebuild = spawn("bun", ["run", "scripts/build-catalog.ts"], { cwd: ROOT });
              rebuild.on("close", () => {
                entry.log.push("[catalog rebuilt]");
              });
            }
          });

          res.end(JSON.stringify({ ok: true, videoId }));
          return;
        }

        // GET /api/status/:id
        if (req.method === "GET" && req.url?.startsWith("/api/status/")) {
          const id = req.url.slice("/api/status/".length);
          const entry = running.get(id);
          if (!entry) {
            res.end(JSON.stringify({ status: "idle" }));
          } else {
            res.end(JSON.stringify(entry));
            if (entry.status === "done" || entry.status === "error") {
              running.delete(id);
            }
          }
          return;
        }

        // POST /api/review
        if (req.method === "POST" && req.url === "/api/review") {
          let body = "";
          for await (const chunk of req) body += chunk;
          const { videoId } = JSON.parse(body);

          // Load current catalog data
          const catalogPath = join(PUBLIC, "catalog-data.json");
          if (!existsSync(catalogPath)) {
            res.end(JSON.stringify({ ok: false, error: "Run bun run catalog first" }));
            return;
          }
          const catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
          const video = catalog.videos.find((v: any) => v.id === videoId);
          if (!video) {
            res.end(JSON.stringify({ ok: false, error: "Video not found in catalog" }));
            return;
          }

          try {
            const result = await aiReview(video);
            res.end(JSON.stringify({ ok: true, review: result }));
          } catch (err: any) {
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
          return;
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Not found" }));
      });
    },
  };
}
