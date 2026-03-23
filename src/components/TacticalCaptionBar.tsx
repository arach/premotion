import {
	useCurrentFrame,
	useVideoConfig,
	staticFile,
	delayRender,
	continueRender,
} from "remotion";
import { useEffect, useState, useCallback } from "react";
import { loadFont } from "@remotion/google-fonts/JetBrainsMono";

interface TranscriptSegment {
	start: number;
	end: number;
	speaker: string;
	text: string;
}

// Load JetBrains Mono font
const { fontFamily } = loadFont();

interface TacticalCaptionBarProps {
	transcriptFile: string;
	height?: number;
	enabled?: boolean;
	timeOffset?: number;
}

export const TacticalCaptionBar: React.FC<TacticalCaptionBarProps> = ({
	transcriptFile,
	height = 120,
	enabled = true,
	timeOffset = 0,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const [segments, setSegments] = useState<TranscriptSegment[]>([]);
	const [handle] = useState(() => delayRender("Loading transcript..."));

	const fetchTranscript = useCallback(async () => {
		try {
			const response = await fetch(staticFile(transcriptFile));
			const data = await response.json();
			setSegments(data);
			continueRender(handle);
		} catch (err) {
			console.error("Failed to load transcript:", err);
			continueRender(handle);
		}
	}, [transcriptFile, handle]);

	useEffect(() => {
		fetchTranscript();
	}, [fetchTranscript]);

	const currentTime = frame / fps + timeOffset;

	// Find current segment
	const currentSegment = segments.find(
		(seg) => currentTime >= seg.start && currentTime <= seg.end
	);

	// Map speaker to voice label
	const getSpeakerLabel = (speaker: string): string => {
		if (speaker === "SPEAKER_00" || speaker === "SPEAKER") return "VOICE 01";
		if (speaker === "SPEAKER_01") return "VOICE 02";
		if (speaker === "SPEAKER_02") return "VOICE 03";
		return speaker.replace("_", " ");
	};

	// Speaker colors
	const getSpeakerColor = (speaker: string): string => {
		if (speaker === "SPEAKER_00" || speaker === "SPEAKER") return "#7dd3fc"; // sky-300
		if (speaker === "SPEAKER_01") return "#f9a8d4"; // pink-300
		if (speaker === "SPEAKER_02") return "#86efac"; // green-300
		return "#c4b5fd"; // violet-300
	};

	const guideColor = "rgba(180, 190, 210, 0.4)";
	const labelColor = "rgba(180, 190, 210, 0.5)";
	const textColor = "rgba(190, 200, 220, 0.85)";
	const margin = 16; // tighter margin to align with video edges

	// Blinking indicator
	const indicatorOn = Math.floor(frame / (fps * 0.5)) % 2 === 0;

	if (!enabled) return null;

	return (
		<div
			style={{
				height,
				position: "relative",
				display: "flex",
				alignItems: "center",
				fontFamily: `${fontFamily}, SF Mono, Monaco, Consolas, monospace`,
				overflow: "hidden",
				// Matte blurry background
				backgroundColor: "rgba(12, 12, 18, 0.85)",
				backdropFilter: "blur(12px)",
				WebkitBackdropFilter: "blur(12px)",
			}}
		>
			{/* Subtle grid */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: 0.025,
					backgroundImage: `
						linear-gradient(rgba(180, 190, 210, 0.5) 1px, transparent 1px),
						linear-gradient(90deg, rgba(180, 190, 210, 0.5) 1px, transparent 1px)
					`,
					backgroundSize: "40px 40px",
				}}
			/>

			{/* Simple top border line - edge to edge */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: 1,
					backgroundColor: guideColor,
				}}
			/>

			{/* Left side - speaker indicator */}
			<div
				style={{
					width: 180,
					paddingLeft: margin,
					display: "flex",
					flexDirection: "column",
					gap: 6,
				}}
			>
				<div
					style={{
						fontSize: 11,
						color: labelColor,
						letterSpacing: "0.12em",
						fontWeight: 300,
					}}
				>
					SPEAKER
				</div>
				<div
					style={{
						fontSize: 16,
						color: currentSegment
							? getSpeakerColor(currentSegment.speaker)
							: "rgba(180, 190, 210, 0.3)",
						fontWeight: 400,
						letterSpacing: "0.05em",
						display: "flex",
						alignItems: "center",
						gap: 10,
					}}
				>
					{currentSegment && (
						<span
							style={{
								width: 6,
								height: 6,
								borderRadius: "50%",
								backgroundColor: indicatorOn
									? getSpeakerColor(currentSegment.speaker)
									: "transparent",
								border: `1px solid ${getSpeakerColor(currentSegment.speaker)}`,
							}}
						/>
					)}
					{currentSegment ? getSpeakerLabel(currentSegment.speaker) : "STANDBY"}
				</div>
			</div>

			{/* Short vertical separator */}
			<div
				style={{
					width: 1,
					height: 32,
					backgroundColor: guideColor,
					opacity: 0.6,
				}}
			/>

			{/* Main caption area */}
			<div
				style={{
					flex: 1,
					paddingLeft: 28,
					paddingRight: 28,
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					gap: 6,
				}}
			>
				<div
					style={{
						fontSize: 11,
						color: labelColor,
						letterSpacing: "0.12em",
						fontWeight: 300,
					}}
				>
					CAPTION
				</div>
				<div
					style={{
						fontSize: 18,
						color: currentSegment ? textColor : "rgba(180, 190, 210, 0.3)",
						fontWeight: 400,
						lineHeight: 1.4,
						letterSpacing: "0.01em",
					}}
				>
					{currentSegment
						? currentSegment.text
						: segments.length > 0
							? `Waiting for audio @ ${segments[0]?.start.toFixed(1)}s...`
							: "Loading transcript..."}
				</div>
			</div>

			{/* Short vertical separator */}
			<div
				style={{
					width: 1,
					height: 32,
					backgroundColor: guideColor,
					opacity: 0.6,
				}}
			/>

			{/* Right side - timestamp */}
			<div
				style={{
					width: 130,
					paddingRight: margin,
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-end",
					gap: 6,
				}}
			>
				<div
					style={{
						fontSize: 11,
						color: labelColor,
						letterSpacing: "0.12em",
						fontWeight: 300,
					}}
				>
					TIMECODE
				</div>
				<div
					style={{
						fontSize: 16,
						color: textColor,
						fontVariantNumeric: "tabular-nums",
						letterSpacing: "0.05em",
						fontWeight: 400,
					}}
				>
					{formatTimecode(currentTime)}
				</div>
			</div>
		</div>
	);
};

function formatTimecode(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	const frames = Math.floor((seconds % 1) * 30);
	return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
}
