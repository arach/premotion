#!/usr/bin/env node
import { execSync } from "child_process";
import { writeFileSync, readFileSync, existsSync, copyFileSync } from "fs";
import { resolve, basename } from "path";

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
Usage: pnpm quote "<text>" [--handle @username]

Examples:
  pnpm quote "all this is so devs don't force themselves to talk to customers" --handle @badrobot
  pnpm quote "ship it" --voice Zarvox
  pnpm quote "hello world" --audio existing.mp3

Options:
  --audio, -a    Use existing audio file (optional, will generate TTS if not provided)
  --voice, -v    TTS voice (default: Trinoids) - options: Trinoids, Zarvox, Bad News, Cellos, Whisper
  --handle, -h   Username for outro (default: @badrobot)
  --out, -o      Output filename (default: quote-video.mp4)
`);
  process.exit(1);
}

// Parse args
let quote = "";
let audioFile = "";
let voice = "Trinoids";
let handle = "@badrobot";
let outFile = "quote-video.mp4";

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--audio" || arg === "-a") {
    audioFile = args[++i];
  } else if (arg === "--voice" || arg === "-v") {
    voice = args[++i];
  } else if (arg === "--handle" || arg === "-h") {
    handle = args[++i];
  } else if (arg === "--out" || arg === "-o") {
    outFile = args[++i];
  } else if (!arg.startsWith("-")) {
    quote = arg;
  }
}

if (!quote) {
  printUsage();
}

// Generate TTS if no audio provided
function generateTTS(text, voiceName) {
  const publicDir = resolve(process.cwd(), "public");
  const aiffPath = resolve(publicDir, "tts-output.aiff");
  const mp3Path = resolve(publicDir, "tts-output.mp3");

  console.log(`Generating TTS with voice: ${voiceName}...`);
  execSync(`say -v "${voiceName}" -o "${aiffPath}" "${text.replace(/"/g, '\\"')}"`, {
    stdio: "inherit",
  });

  console.log("Converting to mp3...");
  execSync(`ffmpeg -i "${aiffPath}" -codec:a libmp3lame -qscale:a 2 "${mp3Path}" -y 2>/dev/null`, {
    stdio: "inherit",
  });

  // Clean up aiff
  execSync(`rm "${aiffPath}"`);

  return "tts-output.mp3";
}

// Get audio duration
function getAudioDuration(filePath) {
  try {
    const result = execSync(
      `ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`,
      { encoding: "utf-8" }
    );
    return parseFloat(result.trim());
  } catch (e) {
    console.error("Error getting audio duration. Is ffprobe installed?");
    process.exit(1);
  }
}

// Convert audio to mp3 if needed
function ensureMp3(filePath) {
  const publicDir = resolve(process.cwd(), "public");
  const ext = filePath.split(".").pop().toLowerCase();
  const baseName = basename(filePath, `.${ext}`);
  const mp3Path = resolve(publicDir, `${baseName}.mp3`);

  if (ext === "mp3") {
    const dest = resolve(publicDir, basename(filePath));
    if (resolve(filePath) !== dest) {
      copyFileSync(filePath, dest);
    }
    return basename(filePath);
  }

  console.log("Converting audio to mp3...");
  execSync(`ffmpeg -i "${filePath}" -codec:a libmp3lame -qscale:a 2 "${mp3Path}" -y`, {
    stdio: "inherit",
  });
  return `${baseName}.mp3`;
}

// Generate word timings
function generateWordTimings(text, durationSeconds, fps = 30) {
  const words = text.split(/\s+/).filter(Boolean);
  const totalFrames = Math.floor(durationSeconds * fps);
  const framesPerWord = totalFrames / words.length;

  return words.map((word, i) => ({
    word,
    start: Math.floor(i * framesPerWord),
    end: Math.floor((i + 1) * framesPerWord),
  }));
}

// Main
console.log(`\nCreating quote video...`);
console.log(`Quote: "${quote}"`);
console.log(`Handle: ${handle}\n`);

// Process audio - generate TTS if not provided
let mp3File;
if (audioFile) {
  mp3File = ensureMp3(audioFile);
} else {
  mp3File = generateTTS(quote, voice);
}
const duration = getAudioDuration(resolve("public", mp3File));
console.log(`Audio duration: ${duration.toFixed(2)}s`);

// Generate timings
const timings = generateWordTimings(quote, duration);
const totalFrames = Math.floor(duration * 30) + 90; // Add 3s for outro

// Update QuoteVideo.tsx with new words
const quoteVideoPath = resolve(process.cwd(), "src/QuoteVideo.tsx");
let quoteVideoContent = readFileSync(quoteVideoPath, "utf-8");

// Replace WORDS array
const wordsArrayStr = `const WORDS = [\n${timings
  .map((w) => `  { word: "${w.word}", start: ${w.start}, end: ${w.end} },`)
  .join("\n")}\n];`;

quoteVideoContent = quoteVideoContent.replace(
  /const WORDS = \[[\s\S]*?\];/,
  wordsArrayStr
);

// Update outroStart
const outroStart = Math.floor(duration * 30) + 5;
quoteVideoContent = quoteVideoContent.replace(
  /const outroStart = \d+;/,
  `const outroStart = ${outroStart};`
);

writeFileSync(quoteVideoPath, quoteVideoContent);

// Update Root.tsx with new props and duration
const rootPath = resolve(process.cwd(), "src/Root.tsx");
let rootContent = readFileSync(rootPath, "utf-8");

// Update both QuoteVideo and QuoteVideoX durations
rootContent = rootContent.replace(
  /(<Composition\s+id="QuoteVideo"[\s\S]*?durationInFrames=\{)\d+(\})/,
  `$1${totalFrames}$2`
);
rootContent = rootContent.replace(
  /(<Composition\s+id="QuoteVideoX"[\s\S]*?durationInFrames=\{)\d+(\})/,
  `$1${totalFrames}$2`
);

rootContent = rootContent.replace(
  /audioFile: "[^"]+"/g,
  `audioFile: "${mp3File}"`
);

rootContent = rootContent.replace(
  /handle: "[^"]+"/g,
  `handle: "${handle}"`
);

writeFileSync(rootPath, rootContent);

console.log(`\nRendering videos...`);

// Render square version
const baseName = outFile.replace(/\.mp4$/, "");
execSync(`npx remotion render QuoteVideo out/${baseName}-square.mp4`, {
  stdio: "inherit",
});

// Render horizontal version for X
execSync(`npx remotion render QuoteVideoX out/${baseName}-x.mp4`, {
  stdio: "inherit",
});

console.log(`\nDone!`);
console.log(`  Square (1080x1080): out/${baseName}-square.mp4`);
console.log(`  X/Twitter (1280x720): out/${baseName}-x.mp4`);
