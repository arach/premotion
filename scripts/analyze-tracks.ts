import { execSync } from "child_process";
import { readdirSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TRACKS_DIR = join(__dirname, "../public/tracks");

interface TrackAnalysis {
	name: string;
	file: string;
	duration: number;
	bitrate: number;
	volumePerSecond: { sec: number; dbfs: number }[];
	silencePoints: number[];
	recommendations: {
		intro3s: { start: number; note: string };
		intro7s: { start: number; note: string };
		bump30s: { start: number; end: number; note: string };
		bump60s: { start: number; end: number; note: string };
		drops: { time: number; intensity: string }[];
	};
}

function run(cmd: string): string {
	try {
		return execSync(cmd, {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
			maxBuffer: 50 * 1024 * 1024,
		});
	} catch (e: any) {
		// ffmpeg writes to stderr, capture that
		return e?.stderr?.toString() || e?.stdout?.toString() || "";
	}
}

function getVolumePerSecond(filepath: string, durationInt: number): { sec: number; dbfs: number }[] {
	// Use astats per-frame RMS, then average per second (single ffmpeg call)
	const out = run(
		`ffmpeg -i "${filepath}" -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null /dev/null 2>/dev/null`
	);

	// Parse frame timestamps and RMS values
	const entries: { time: number; rms: number }[] = [];
	const lines = out.split("\n");
	let currentTime = 0;
	for (const line of lines) {
		const timeMatch = line.match(/pts_time:([\d.]+)/);
		if (timeMatch) {
			currentTime = parseFloat(timeMatch[1]);
		}
		const rmsMatch = line.match(/RMS_level=([-\d.]+)/);
		if (rmsMatch) {
			const rms = parseFloat(rmsMatch[1]);
			if (rms > -100) { // skip -inf/silence values
				entries.push({ time: currentTime, rms });
			}
		}
	}

	// Average per second
	const volumePerSecond: { sec: number; dbfs: number }[] = [];
	for (let sec = 0; sec < durationInt; sec++) {
		const inRange = entries.filter((e) => e.time >= sec && e.time < sec + 1);
		if (inRange.length > 0) {
			const avg = inRange.reduce((sum, e) => sum + e.rms, 0) / inRange.length;
			volumePerSecond.push({ sec, dbfs: Math.round(avg * 10) / 10 });
		}
	}

	return volumePerSecond;
}

function analyzeTrack(filepath: string): TrackAnalysis {
	const name = basename(filepath, ".mp3");
	const file = `tracks/${basename(filepath)}`;

	// Duration & bitrate
	const duration = parseFloat(
		run(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filepath}"`)
	);
	const bitrate = Math.round(
		parseInt(run(`ffprobe -v quiet -show_entries format=bit_rate -of csv=p=0 "${filepath}"`)) / 1000
	);

	const durationInt = Math.floor(duration);

	// Volume per second (single ffmpeg call via ebur128)
	console.error(`    → measuring loudness...`);
	const volumePerSecond = getVolumePerSecond(filepath, durationInt);

	// Silence detection (single ffmpeg call)
	console.error(`    → detecting silence...`);
	const silenceOut = run(
		`ffmpeg -i "${filepath}" -af "silencedetect=noise=-35dB:d=0.3" -f null - 2>&1`
	);
	const silencePoints: number[] = [];
	for (const match of silenceOut.matchAll(/silence_start:\s*([\d.]+)/g)) {
		silencePoints.push(parseFloat(match[1]));
	}

	// Find drops (sudden volume increases — good for transitions)
	const drops: { time: number; intensity: string }[] = [];
	for (let i = 1; i < volumePerSecond.length; i++) {
		const diff = volumePerSecond[i].dbfs - volumePerSecond[i - 1].dbfs;
		if (diff > 4) {
			drops.push({
				time: volumePerSecond[i].sec,
				intensity: diff > 8 ? "hard" : diff > 6 ? "medium" : "soft",
			});
		}
	}

	// Find energy ramps (sections where volume builds — good for intros)
	let bestIntroStart = 0;
	let bestBuildup = 0;
	for (let i = 0; i < Math.min(volumePerSecond.length - 3, 10); i++) {
		const avg3 = (volumePerSecond[i].dbfs + volumePerSecond[i + 1].dbfs + volumePerSecond[i + 2].dbfs) / 3;
		const buildup = volumePerSecond[Math.min(i + 5, volumePerSecond.length - 1)].dbfs - avg3;
		if (buildup > bestBuildup) {
			bestBuildup = buildup;
			bestIntroStart = volumePerSecond[i].sec;
		}
	}

	// Find best 30s and 60s windows (highest average energy)
	const findBestWindow = (windowSec: number) => {
		let bestStart = 0;
		let bestAvg = -Infinity;
		for (let i = 0; i <= volumePerSecond.length - windowSec; i++) {
			const slice = volumePerSecond.slice(i, i + windowSec);
			const avg = slice.reduce((sum, v) => sum + v.dbfs, 0) / slice.length;
			if (avg > bestAvg) {
				bestAvg = avg;
				bestStart = volumePerSecond[i].sec;
			}
		}
		return { start: bestStart, end: bestStart + windowSec, avg: bestAvg };
	};

	const best30 = duration >= 30 ? findBestWindow(30) : { start: 0, end: Math.min(30, durationInt), avg: -Infinity };
	const best60 = duration >= 60 ? findBestWindow(60) : { start: 0, end: Math.min(60, durationInt), avg: -Infinity };

	return {
		name,
		file,
		duration: Math.round(duration * 10) / 10,
		bitrate,
		volumePerSecond,
		silencePoints,
		recommendations: {
			intro3s: {
				start: bestIntroStart,
				note: bestBuildup > 4 ? "Strong buildup from this point" : "Starts with energy here",
			},
			intro7s: {
				start: Math.max(0, bestIntroStart - 2),
				note: "Extended intro — gives more runway for buildup",
			},
			bump30s: {
				start: best30.start,
				end: best30.end,
				note: `Highest energy 30s window (avg ${best30.avg.toFixed(1)} LUFS)`,
			},
			bump60s: {
				start: best60.start,
				end: best60.end,
				note: `Highest energy 60s window`,
			},
			drops: drops.slice(0, 6),
		},
	};
}

// Main
console.error("Analyzing tracks...\n");

const tracks = readdirSync(TRACKS_DIR)
	.filter((f) => f.endsWith(".mp3"))
	.map((f) => {
		const filepath = join(TRACKS_DIR, f);
		console.error(`  ${f} (${Math.round(parseFloat(run(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filepath}"`)))}s)`);
		return analyzeTrack(filepath);
	});

// Output summary
console.log("\n=== TRACK ANALYSIS ===\n");

for (const t of tracks) {
	const energyBar = (dbfs: number) => {
		const normalized = Math.max(0, Math.min(20, (dbfs + 50) * 0.5)); // -50 to -10 range → 0-20
		return "█".repeat(Math.round(normalized)) + "░".repeat(20 - Math.round(normalized));
	};

	console.log(`── ${t.name} ──`);
	console.log(`   File: ${t.file}`);
	console.log(`   Duration: ${t.duration}s | Bitrate: ${t.bitrate}kbps`);
	console.log(`   Drops: ${t.recommendations.drops.map((d) => `${d.time}s(${d.intensity})`).join(", ") || "none detected"}`);
	console.log(`   Silence points: ${t.silencePoints.map((s) => `${s.toFixed(1)}s`).join(", ") || "none"}`);
	console.log(`   3s intro from: ${t.recommendations.intro3s.start}s — ${t.recommendations.intro3s.note}`);
	console.log(`   7s intro from: ${t.recommendations.intro7s.start}s`);
	console.log(`   Best 30s: ${t.recommendations.bump30s.start}-${t.recommendations.bump30s.end}s — ${t.recommendations.bump30s.note}`);
	console.log(`   Best 60s: ${t.recommendations.bump60s.start}-${t.recommendations.bump60s.end}s`);
	console.log(`   Energy profile:`);

	// Show energy per 5 seconds as a visual bar, plus drops
	for (const v of t.volumePerSecond) {
		if (v.sec % 5 === 0 || t.recommendations.drops.some((d) => d.time === v.sec)) {
			const marker = t.recommendations.drops.some((d) => d.time === v.sec) ? " ← DROP" : "";
			console.log(`     ${String(v.sec).padStart(3)}s ${energyBar(v.dbfs)} ${v.dbfs.toFixed(1)}dB${marker}`);
		}
	}
	console.log("");
}
