import { execSync } from "child_process";

export function run(cmd: string): string {
	try {
		return execSync(cmd, {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
			maxBuffer: 100 * 1024 * 1024,
		});
	} catch (e: any) {
		return e?.stderr?.toString() || e?.stdout?.toString() || "";
	}
}

export function log(msg: string) {
	console.error(msg);
}

export function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.round(seconds % 60);
	return `${m}:${String(s).padStart(2, "0")}`;
}
