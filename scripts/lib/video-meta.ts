import { basename } from "path";
import type { VideoMeta } from "./types.ts";
import { run } from "./utils.ts";

export function getVideoMeta(filepath: string): VideoMeta {
	const duration = parseFloat(
		run(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filepath}"`)
	);
	const streamInfo = run(
		`ffprobe -v quiet -show_entries stream=width,height,r_frame_rate -of csv=p=0 "${filepath}"`
	).trim().split("\n")[0];
	const parts = streamInfo.split(",");
	const width = parseInt(parts[0]) || 1920;
	const height = parseInt(parts[1]) || 1080;
	const fpsParts = (parts[2] || "30/1").split("/");
	const fps = Math.round(parseInt(fpsParts[0]) / (parseInt(fpsParts[1]) || 1));

	return {
		path: filepath,
		filename: basename(filepath),
		duration,
		fps,
		width,
		height,
	};
}
