import Anthropic from "@anthropic-ai/sdk";
import type { VideoMeta, SceneBreak, DiffSegment, FrameTag, EditorialResult } from "./types.ts";
import { log, formatTime } from "./utils.ts";

export async function editorialPass(
	meta: VideoMeta,
	breaks: SceneBreak[],
	segments: DiffSegment[],
	tags: FrameTag[],
	provider?: { model?: string },
): Promise<EditorialResult> {
	if (!process.env.ANTHROPIC_API_KEY) {
		const deadTime = segments
			.filter(s => s.classification === "idle" && (s.end - s.start) > 3)
			.map(s => ({
				start: s.start,
				end: s.end,
				duration: Math.round(s.end - s.start),
				reason: "Static screen — no visual changes detected",
			}));

		return { highlights: [], suggestedClips: [], deadTime };
	}

	log("  → Editorial analysis with Sonnet...");
	const client = new Anthropic();
	const llmModel = provider?.model || process.env.LLM_MODEL || "claude-haiku-4-5-20251001";

	const sceneSummary = tags.map(t =>
		`  ${formatTime(t.time)} [${t.contentType}] ${t.description} (tags: ${t.tags.join(", ")})`
	).join("\n");

	const activitySummary = segments.map(s =>
		`  ${formatTime(s.start)}-${formatTime(s.end)} (${Math.round(s.end - s.start)}s): ${s.classification} (diff: ${(s.avgDiff * 100).toFixed(2)}%)`
	).join("\n");

	const response = await client.messages.create({
		model: llmModel,
		max_tokens: 1500,
		messages: [{
			role: "user",
			content: `You are a video editor analyzing a screen recording for a developer content creator.

Video: ${meta.filename} (${formatTime(meta.duration)}, ${meta.width}x${meta.height})

Frame descriptions (at scene breaks):
${sceneSummary}

Activity analysis:
${activitySummary}

Based on this data, provide editorial suggestions as JSON:
{
  "highlights": [{"time": <seconds>, "reason": "...", "frameFile": "frame_NNN.jpg"}],
  "suggestedClips": [{"start": <seconds>, "end": <seconds>, "title": "Short title", "reason": "..."}],
  "deadTime": [{"start": <seconds>, "end": <seconds>, "duration": <seconds>, "reason": "..."}]
}

Rules:
- Suggest 2-4 highlight moments that would work as thumbnails or hook shots
- Suggest 2-3 clips (30-90s each) that would make compelling standalone short videos
- Identify all dead time (static screen, idle waiting) longer than 3 seconds
- Use the actual timecodes from the frame data
- Give clips catchy but descriptive titles

Return ONLY the JSON.`,
		}],
	});

	const text = response.content[0].type === "text" ? response.content[0].text : "{}";
	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (jsonMatch) {
		try {
			return JSON.parse(jsonMatch[0]);
		} catch {}
	}

	return { highlights: [], suggestedClips: [], deadTime: [] };
}
