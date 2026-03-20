import { existsSync, readFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { SceneBreak, DiffSegment, FrameTag, VisionProvider } from "./types.ts";
import { log, formatTime } from "./utils.ts";

const VISION_PROMPT = `Describe this screen recording frame in 1-2 sentences. What app/tool is shown? What action is happening? Return JSON only: {"tags": ["tag1", "tag2"], "description": "...", "contentType": "code-editor|terminal|browser|ui-demo|slide|transition|desktop|other"}`;

export function createAnthropicVision(model?: string): VisionProvider {
	const llmModel = model || process.env.LLM_MODEL || "claude-haiku-4-5-20251001";
	const client = new Anthropic();

	return async (framePath: string, prompt: string) => {
		const imageData = readFileSync(framePath).toString("base64");

		const response = await client.messages.create({
			model: llmModel,
			max_tokens: 300,
			messages: [{
				role: "user",
				content: [
					{
						type: "image",
						source: { type: "base64", media_type: "image/jpeg", data: imageData },
					},
					{ type: "text", text: prompt },
				],
			}],
		});

		const text = response.content[0].type === "text" ? response.content[0].text : "";
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);
			return {
				tags: parsed.tags || [],
				description: parsed.description || "",
				contentType: parsed.contentType || "other",
			};
		}

		return { tags: [], description: "", contentType: "other" };
	};
}

export async function tagFrames(
	breaks: SceneBreak[],
	segments: DiffSegment[],
	outDir: string,
	provider: VisionProvider,
): Promise<FrameTag[]> {
	log("\nLayer 3: Claude vision analysis...");

	const framesToAnalyze = breaks.filter(b => {
		const seg = segments.find(s => b.time >= s.start && b.time < s.end);
		if (!seg) return true;
		if (seg.classification === "idle" && b.score < 0.03) return false;
		return true;
	});

	log(`  → Analyzing ${framesToAnalyze.length} frames with vision (skipped ${breaks.length - framesToAnalyze.length} idle frames)`);

	const tags: FrameTag[] = [];
	const batchSize = 5;

	for (let i = 0; i < framesToAnalyze.length; i += batchSize) {
		const batch = framesToAnalyze.slice(i, i + batchSize);
		const progress = Math.min(i + batchSize, framesToAnalyze.length);
		process.stderr.write(`\r  → Tagging frames... ${progress}/${framesToAnalyze.length}`);

		const results = await Promise.all(
			batch.map(async (b) => {
				const framePath = join(outDir, b.frameFile);
				if (!existsSync(framePath)) return null;

				try {
					const result = await provider(framePath, VISION_PROMPT);
					return {
						frameFile: b.frameFile,
						time: b.time,
						tags: result.tags,
						description: result.description,
						contentType: result.contentType,
					} as FrameTag;
				} catch (err: any) {
					if (err?.status === 429) {
						await new Promise(r => setTimeout(r, 2000));
						return null;
					}
				}
				return {
					frameFile: b.frameFile,
					time: b.time,
					tags: [],
					description: `Frame at ${formatTime(b.time)}`,
					contentType: "unknown",
				} as FrameTag;
			})
		);

		tags.push(...results.filter((r): r is FrameTag => r !== null));
	}

	log("");

	for (const b of breaks) {
		if (!tags.find(t => t.frameFile === b.frameFile)) {
			const seg = segments.find(s => b.time >= s.start && b.time < s.end);
			tags.push({
				frameFile: b.frameFile,
				time: b.time,
				tags: ["idle"],
				description: `Idle frame at ${formatTime(b.time)}`,
				contentType: seg?.classification === "idle" ? "idle" : "other",
			});
		}
	}

	tags.sort((a, b) => a.time - b.time);
	return tags;
}
