import {
	useCurrentFrame,
	useVideoConfig,
	staticFile,
	delayRender,
	continueRender,
} from "remotion";
import { useEffect, useState, useCallback } from "react";

interface TranscriptSegment {
	start: number;
	end: number;
	speaker: string;
	text: string;
}

interface TranscriptCaptionsProps {
	transcriptFile: string; // path relative to public folder
	enabled?: boolean;
	// Styling
	fontSize?: number;
	fontFamily?: string;
	textColor?: string;
	backgroundColor?: string;
	padding?: number;
	bottomOffset?: number;
	maxWidth?: number;
	// Speaker colors (for when diarization is enabled)
	speakerColors?: Record<string, string>;
	showSpeakerLabel?: boolean;
}

export const TranscriptCaptions: React.FC<TranscriptCaptionsProps> = ({
	transcriptFile,
	enabled = true,
	fontSize = 32,
	fontFamily = "SF Pro Display, system-ui, -apple-system, sans-serif",
	textColor = "#ffffff",
	backgroundColor = "rgba(0, 0, 0, 0.75)",
	padding = 16,
	bottomOffset = 80,
	maxWidth = 900,
	speakerColors = {
		"SPEAKER_00": "#6ae",
		"SPEAKER_01": "#e6a",
		"SPEAKER_02": "#ae6",
		"SPEAKER": "#fff",
	},
	showSpeakerLabel = false,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const [segments, setSegments] = useState<TranscriptSegment[]>([]);
	const [handle] = useState(() => delayRender("Loading transcript..."));

	// Load transcript JSON with delayRender
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

	if (!enabled) {
		return null;
	}

	// Show loading state if segments not loaded yet
	if (segments.length === 0) {
		return null;
	}

	// Current time in seconds
	const currentTime = frame / fps;

	// Find the current segment
	const currentSegment = segments.find(
		(seg) => currentTime >= seg.start && currentTime <= seg.end
	);

	// Debug: show indicator when captions are enabled but no segment matches
	if (!currentSegment) {
		return (
			<div
				style={{
					position: "absolute",
					bottom: 10,
					right: 10,
					backgroundColor: "rgba(255,100,0,0.7)",
					color: "#fff",
					padding: "4px 8px",
					fontSize: 12,
					borderRadius: 4,
					fontFamily: "monospace",
				}}
			>
				CC: {currentTime.toFixed(1)}s (waiting for {segments[0]?.start}s)
			</div>
		);
	}

	const speakerColor = speakerColors[currentSegment.speaker] || textColor;

	return (
		<div
			style={{
				position: "absolute",
				bottom: bottomOffset,
				left: 0,
				right: 0,
				display: "flex",
				justifyContent: "center",
				pointerEvents: "none",
			}}
		>
			<div
				style={{
					maxWidth,
					backgroundColor,
					padding: `${padding}px ${padding * 1.5}px`,
					borderRadius: 8,
					textAlign: "center",
				}}
			>
				{showSpeakerLabel && currentSegment.speaker !== "SPEAKER" && (
					<div
						style={{
							fontSize: fontSize * 0.5,
							color: speakerColor,
							marginBottom: 4,
							fontFamily,
							fontWeight: 600,
							letterSpacing: "0.1em",
							textTransform: "uppercase",
						}}
					>
						{currentSegment.speaker.replace("_", " ")}
					</div>
				)}
				<div
					style={{
						fontSize,
						fontFamily,
						color: showSpeakerLabel ? speakerColor : textColor,
						fontWeight: 500,
						lineHeight: 1.4,
						textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
					}}
				>
					{currentSegment.text}
				</div>
			</div>
		</div>
	);
};
