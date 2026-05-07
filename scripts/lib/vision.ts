import { execFile } from "child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
	AskMoondreamOnVideoFramesOptions,
	MoondreamMouseObservation,
	MoondreamVideoFrameObservations,
	SceneBreak,
	DiffSegment,
	FrameTag,
	VisionProvider,
} from "./types.ts";
import { log, formatTime } from "./utils.ts";

const VISION_PROMPT = `Describe this screen recording frame in 1-2 sentences. What app/tool is shown? What action is happening? Return JSON only: {"tags": ["tag1", "tag2"], "description": "...", "contentType": "code-editor|terminal|browser|ui-demo|slide|transition|desktop|other"}`;
const DEFAULT_MOONDREAM_QUESTION = "Is there a mouse cursor or mouse gesture visible in this frame? If yes, describe its location and what action it appears to indicate. Return concise JSON.";

interface AnthropicVisionOptions {
	model?: string;
	apiKey?: string;
	baseURL?: string;
	provider?: string;
}

function sanitizeResponse(response: unknown): unknown {
	try {
		const parsed = JSON.parse(JSON.stringify(response));
		return {
			id: parsed.id,
			type: parsed.type,
			role: parsed.role,
			model: parsed.model,
			content: parsed.content,
			stop_reason: parsed.stop_reason,
			stop_sequence: parsed.stop_sequence,
			usage: parsed.usage,
		};
	} catch {
		return null;
	}
}

function extractText(result: any): string {
	const content = Array.isArray(result?.content) ? result.content : [];
	return content
		.filter((item: any) => item?.type === "text" && typeof item.text === "string")
		.map((item: any) => item.text)
		.join("\n");
}

function parseVisionJson(text: string) {
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced?.[1] ?? text;
	const jsonMatch = candidate.match(/\{[\s\S]*\}/);
	if (!jsonMatch) return null;
	try {
		return JSON.parse(jsonMatch[0]);
	} catch {
		return null;
	}
}

function execFileText(command: string, args: string[], options?: { signal?: AbortSignal }): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(command, args, {
			encoding: "utf-8",
			maxBuffer: 100 * 1024 * 1024,
			signal: options?.signal,
		}, (error, stdout, stderr) => {
			if (error) {
				const message = stderr?.toString().trim() || stdout?.toString().trim() || error.message;
				reject(new Error(message));
				return;
			}
			resolve(stdout);
		});
	});
}

function extractJsonObject(text: string): Record<string, unknown> | null {
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced?.[1] ?? text;
	const jsonMatch = candidate.match(/\{[\s\S]*\}/);
	if (!jsonMatch) return null;
	try {
		const parsed = JSON.parse(jsonMatch[0]);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function booleanValue(value: unknown): boolean | undefined {
	if (typeof value === "boolean") return value;
	if (typeof value !== "string") return undefined;
	const normalized = value.trim().toLowerCase();
	if (["yes", "true", "visible", "present"].includes(normalized)) return true;
	if (["no", "false", "hidden", "absent", "none"].includes(normalized)) return false;
	return undefined;
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function mouseFromParsedAnswer(parsed: Record<string, unknown> | null, answer: string): MoondreamMouseObservation | undefined {
	if (!parsed) {
		if (/\b(no|not|none|absent)\b/i.test(answer) && /\b(mouse|cursor|gesture)\b/i.test(answer)) {
			return { visible: false };
		}
		if (/\b(mouse|cursor|gesture)\b/i.test(answer)) {
			return { visible: true, description: answer.trim() };
		}
		return undefined;
	}

	const mouse = parsed.mouse && typeof parsed.mouse === "object" && !Array.isArray(parsed.mouse)
		? parsed.mouse as Record<string, unknown>
		: parsed;
	const observation: MoondreamMouseObservation = {};

	observation.visible = booleanValue(
		mouse.visible ??
		mouse.cursorVisible ??
		mouse.cursor_visible ??
		mouse.mouseVisible ??
		mouse.mouse_visible ??
		mouse.present
	);
	observation.gesture = booleanValue(
		mouse.gesture ??
		mouse.gestureVisible ??
		mouse.gesture_visible ??
		mouse.actionVisible ??
		mouse.action_visible
	);
	observation.description =
		stringValue(mouse.description) ??
		stringValue(mouse.action) ??
		stringValue(mouse.answer);
	observation.location =
		stringValue(mouse.location) ??
		stringValue(mouse.position);

	return Object.values(observation).some(value => value !== undefined) ? observation : undefined;
}

async function extractVideoFrames(options: {
	videoPath: string;
	fpsRate: number;
	outputDir?: string;
	maxFrames?: number;
	signal?: AbortSignal;
}) {
	const outDir = options.outputDir || mkdtempSync(join(tmpdir(), "moondream-video-frames-"));
	mkdirSync(outDir, { recursive: true });

	const args = [
		"-hide_banner",
		"-loglevel",
		"error",
		"-y",
		"-i",
		options.videoPath,
		"-vf",
		`fps=${options.fpsRate},scale=960:-1`,
		...(options.maxFrames ? ["-frames:v", String(options.maxFrames)] : []),
		"-q:v",
		"2",
		join(outDir, "frame_%06d.jpg"),
	];

	await execFileText("ffmpeg", args, { signal: options.signal });

	return readdirSync(outDir)
		.filter(file => /^frame_\d+\.jpg$/.test(file))
		.sort()
		.map((file, index) => ({
			index: index + 1,
			time: Math.round((index / options.fpsRate) * 1000) / 1000,
			framePath: join(outDir, file),
		}));
}

async function queryMoondreamFrame(options: {
	framePath: string;
	question: string;
	apiKey: string;
	model?: string;
	signal?: AbortSignal;
}) {
	const imageData = readFileSync(options.framePath).toString("base64");
	const response = await fetch("https://api.moondream.ai/v1/query", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Moondream-Auth": options.apiKey,
		},
		body: JSON.stringify({
			image_url: `data:image/jpeg;base64,${imageData}`,
			question: options.question,
			// Optional passthrough for Moondream Cloud model/finetune selectors.
			...(options.model ? { model: options.model } : {}),
		}),
		signal: options.signal,
	});
	const text = await response.text();
	let raw: unknown = text;
	try {
		raw = JSON.parse(text);
	} catch {
		// Moondream usually returns JSON; keep non-JSON bodies for error diagnostics.
	}

	if (!response.ok) {
		throw new Error(`Moondream query failed (${response.status} ${response.statusText}): ${text}`);
	}

	const answer = typeof raw === "object" && raw !== null && "answer" in raw && typeof raw.answer === "string"
		? raw.answer
		: text;

	return { answer, raw };
}

export async function askMoondreamOnVideoFrames(
	options: AskMoondreamOnVideoFramesOptions,
): Promise<MoondreamVideoFrameObservations> {
	const fpsRate = options.fpsRate ?? 0.5;
	if (!Number.isFinite(fpsRate) || fpsRate <= 0) {
		throw new Error(`fpsRate must be a positive number, received ${options.fpsRate}`);
	}
	if (options.maxFrames !== undefined && (!Number.isInteger(options.maxFrames) || options.maxFrames <= 0)) {
		throw new Error(`maxFrames must be a positive integer, received ${options.maxFrames}`);
	}

	const apiKey = options.apiKey || process.env.MOONDREAM_API_KEY;
	if (!apiKey) {
		throw new Error("Moondream API key is required. Pass apiKey or set MOONDREAM_API_KEY.");
	}

	const question = options.question || DEFAULT_MOONDREAM_QUESTION;
	const frames = await extractVideoFrames({
		videoPath: options.videoPath,
		fpsRate,
		outputDir: options.outputDir,
		maxFrames: options.maxFrames,
		signal: options.signal,
	});

	const observations: MoondreamVideoFrameObservations["frames"] = [];
	for (const frame of frames) {
		options.signal?.throwIfAborted();
		const result = await queryMoondreamFrame({
			framePath: frame.framePath,
			question,
			apiKey,
			model: options.model,
			signal: options.signal,
		});
		const parsed = extractJsonObject(result.answer);
		observations.push({
			...frame,
			answer: result.answer,
			raw: result.raw,
			mouse: mouseFromParsedAnswer(parsed, result.answer),
		});
	}

	return {
		videoPath: options.videoPath,
		fpsRate,
		question,
		frames: observations,
	};
}

export function createMiniMaxMcpVision(options: {
	apiKey: string;
	host?: string;
	command?: string;
	args?: string[];
}): VisionProvider & { close?: () => Promise<void> } {
	let client: Client | null = null;
	let connectPromise: Promise<Client> | null = null;

	const getClient = async () => {
		if (client) return client;
		if (connectPromise) return connectPromise;
		connectPromise = (async () => {
			const env: Record<string, string> = {};
			for (const [key, value] of Object.entries(process.env)) {
				if (typeof value === "string") env[key] = value;
			}
			env.MINIMAX_API_KEY = options.apiKey;
			env.MINIMAX_API_HOST = options.host || "https://api.minimax.io";

			const nextClient = new Client({ name: "premotion-analyzer", version: "0.0.1" });
			const transport = new StdioClientTransport({
				command: options.command || "uvx",
				args: options.args || ["minimax-coding-plan-mcp", "-y"],
				env,
			});
			await nextClient.connect(transport);
			client = nextClient;
			return nextClient;
		})();
		return connectPromise;
	};

	const provider: VisionProvider & { close?: () => Promise<void> } = async (framePath, prompt) => {
		const mcp = await getClient();
		const result = await mcp.callTool({
			name: "understand_image",
			arguments: {
				image_source: resolve(framePath),
				prompt,
			},
		});
		const rawText = extractText(result);
		const parsed = parseVisionJson(rawText) ?? {};
		return {
			tags: Array.isArray(parsed.tags) ? parsed.tags : [],
			description: typeof parsed.description === "string" ? parsed.description : rawText,
			contentType: typeof parsed.contentType === "string" ? parsed.contentType : "other",
			provider: "MiniMax MCP",
			model: "understand_image",
			rawText,
			rawResponse: result,
			error: result.isError ? rawText : undefined,
		};
	};

	provider.close = async () => {
		if (!client) return;
		await client.close();
		client = null;
		connectPromise = null;
	};

	return provider;
}

export function createAnthropicVision(options?: string | AnthropicVisionOptions): VisionProvider {
	const config = typeof options === "string" ? { model: options } : options ?? {};
	const llmModel = config.model || process.env.LLM_MODEL || "claude-haiku-4-5-20251001";
	const client = new Anthropic({
		apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
		...(config.baseURL || process.env.ANTHROPIC_BASE_URL
			? { baseURL: config.baseURL || process.env.ANTHROPIC_BASE_URL }
			: {}),
	});
	const provider = config.provider || (config.baseURL?.includes("minimax") ? "MiniMax" : "Anthropic");

	return async (framePath: string, prompt: string) => {
		const imageData = readFileSync(framePath).toString("base64");

		const response = await client.messages.create({
			model: llmModel,
			max_tokens: 1000,
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

		const text = response.content
			.filter((block): block is Anthropic.TextBlock => block.type === "text")
			.map(block => block.text)
			.join("\n");
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);
			return {
				tags: parsed.tags || [],
				description: parsed.description || "",
				contentType: parsed.contentType || "other",
				provider,
				model: response.model || llmModel,
				rawText: text,
				rawResponse: sanitizeResponse(response),
			};
		}

		return {
			tags: [],
			description: "",
			contentType: "other",
			provider,
			model: response.model || llmModel,
			rawText: text,
			rawResponse: sanitizeResponse(response),
		};
	};
}

export async function tagFrames(
	breaks: SceneBreak[],
	segments: DiffSegment[],
	outDir: string,
	provider: VisionProvider,
	options?: { analyzeAllFrames?: boolean },
): Promise<FrameTag[]> {
	log("\nLayer 3: Vision analysis...");

	const framesToAnalyze = options?.analyzeAllFrames
		? breaks
		: breaks.filter(b => {
			const seg = segments.find(s => b.time >= s.start && b.time < s.end);
			if (!seg) return true;
			if (seg.classification === "idle" && b.score < 0.03) return false;
			return true;
		});

	log(`  → Analyzing ${framesToAnalyze.length} frames with vision (skipped ${breaks.length - framesToAnalyze.length} idle frames)`);

	const tags: FrameTag[] = [];
	const batchSize = options?.analyzeAllFrames ? 1 : 5;

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
						provider: result.provider,
						model: result.model,
						prompt: VISION_PROMPT,
						rawText: result.rawText,
						rawResponse: result.rawResponse,
						error: result.error,
					} as FrameTag;
				} catch (err: any) {
					if (err?.status === 429) {
						await new Promise(r => setTimeout(r, 2000));
					}
					return {
						frameFile: b.frameFile,
						time: b.time,
						tags: [],
						description: `Frame at ${formatTime(b.time)}`,
						contentType: "unknown",
						prompt: VISION_PROMPT,
						error: err?.message || String(err),
					} as FrameTag;
				}
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
				prompt: VISION_PROMPT,
			});
		}
	}

	tags.sort((a, b) => a.time - b.time);
	return tags;
}
