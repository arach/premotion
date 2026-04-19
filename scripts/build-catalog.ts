import { readFileSync, readdirSync, existsSync, writeFileSync, copyFileSync } from "fs";
import { join, basename } from "path";

const ROOT = join(import.meta.dirname || ".", "..");
const PUBLIC = join(ROOT, "public");
const DEMOS = join(PUBLIC, "demos");
const CATALOG = join(ROOT, "catalog");
const TRANSCRIPTS = join(ROOT, "transcripts");

interface CatalogData {
  meta: { generatedAt: string; videoCount: number };
  videos: any[];
}

const catalog = JSON.parse(readFileSync(join(CATALOG, "videos.json"), "utf-8"));

const videos = catalog.videos.map((video: any) => {
  const entry: any = { ...video };

  // Load EDL if storyboard exists
  if (video.storyboardDir) {
    const edlPath = join(DEMOS, video.storyboardDir, "edl.json");
    if (existsSync(edlPath)) {
      entry.edl = JSON.parse(readFileSync(edlPath, "utf-8"));
    }

    // Load vision tags cache
    const tagsPath = join(DEMOS, video.storyboardDir, ".cache-layer3-tags.json");
    if (existsSync(tagsPath)) {
      entry.visionTags = JSON.parse(readFileSync(tagsPath, "utf-8"));
    } else {
      // Fall back to layer1 breaks for frame-to-timestamp mapping
      const breaksPath = join(DEMOS, video.storyboardDir, ".cache-layer1-breaks.json");
      if (existsSync(breaksPath)) {
        const breaks: { time: number; frameFile: string }[] = JSON.parse(readFileSync(breaksPath, "utf-8"));
        entry.visionTags = breaks.map(b => ({
          frameFile: b.frameFile,
          time: b.time,
          tags: [],
          description: "",
          contentType: "",
        }));
      }
    }

    // Count frames
    const storyDir = join(DEMOS, video.storyboardDir);
    if (existsSync(storyDir)) {
      const frames = readdirSync(storyDir).filter(f => f.startsWith("frame_") && f.endsWith(".jpg"));
      entry.frameCount = frames.length;
      entry.frames = frames.sort();

      // Last resort: infer timestamps from duration and frame count
      if (!entry.visionTags && frames.length > 0 && video.duration) {
        entry.visionTags = frames.sort().map((f: string, i: number) => ({
          frameFile: f,
          time: frames.length > 1 ? (i / (frames.length - 1)) * video.duration : 0,
          tags: [],
          description: "",
          contentType: "",
        }));
      }
    }
  }

  // Load transcript if matching file exists
  const transcriptName = video.filename.replace(/\.(mp4|mov|webm)$/, ".json");
  const transcriptPath = join(TRANSCRIPTS, transcriptName);
  if (existsSync(transcriptPath)) {
    entry.transcript = JSON.parse(readFileSync(transcriptPath, "utf-8"));
  }

  // Also check by id-based naming
  const altTranscriptPath = join(TRANSCRIPTS, `${video.id}.json`);
  if (!entry.transcript && existsSync(altTranscriptPath)) {
    entry.transcript = JSON.parse(readFileSync(altTranscriptPath, "utf-8"));
  }

  // Check for SRT transcripts
  const srtName = video.filename.replace(/\.(mp4|mov|webm)$/, ".srt");
  const srtPath = join(TRANSCRIPTS, srtName);
  if (existsSync(srtPath)) {
    entry.srt = readFileSync(srtPath, "utf-8");
  }

  return entry;
});

// Also gather orphan storyboards (dirs not referenced by any video)
const allStoryboardDirs = readdirSync(DEMOS).filter(
  d => d.startsWith("storyboard-") && existsSync(join(DEMOS, d, "frame_001.jpg"))
);
const referencedDirs = new Set(catalog.videos.map((v: any) => v.storyboardDir).filter(Boolean));
const orphanStoryboards = allStoryboardDirs
  .filter(d => !referencedDirs.has(d))
  .map(d => {
    const dir = join(DEMOS, d);
    const frames = readdirSync(dir).filter(f => f.startsWith("frame_") && f.endsWith(".jpg")).sort();
    const edlPath = join(dir, "edl.json");
    const tagsPath = join(dir, ".cache-layer3-tags.json");
    return {
      storyboardDir: d,
      frameCount: frames.length,
      frames,
      edl: existsSync(edlPath) ? JSON.parse(readFileSync(edlPath, "utf-8")) : null,
      visionTags: existsSync(tagsPath) ? JSON.parse(readFileSync(tagsPath, "utf-8")) : null,
    };
  });

const output: CatalogData = {
  meta: {
    generatedAt: new Date().toISOString(),
    videoCount: videos.length,
  },
  videos,
};

if (orphanStoryboards.length > 0) {
  (output as any).orphanStoryboards = orphanStoryboards;
}

// Load curated snippets if available
const curatedPath = join(CATALOG, "curated-snippets.json");
let curatedCount = 0;
if (existsSync(curatedPath)) {
  const curated = JSON.parse(readFileSync(curatedPath, "utf-8"));
  curatedCount = curated.snippets?.length || 0;

  // Copy curated snippets JSON to public for separate loading
  const curatedOutPath = join(PUBLIC, "curated-snippets.json");
  copyFileSync(curatedPath, curatedOutPath);
  console.log(`Curated snippets copied to ${curatedOutPath}`);
}

const outPath = join(PUBLIC, "catalog-data.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`Catalog data written to ${outPath}`);
console.log(`  ${videos.length} videos`);
console.log(`  ${videos.filter((v: any) => v.edl).length} with EDLs`);
console.log(`  ${videos.filter((v: any) => v.visionTags).length} with vision tags`);
console.log(`  ${videos.filter((v: any) => v.transcript || v.srt).length} with transcripts`);
console.log(`  ${orphanStoryboards.length} orphan storyboards`);
console.log(`  ${curatedCount} curated snippets`);
