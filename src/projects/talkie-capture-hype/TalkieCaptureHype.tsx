import {
	useVideoConfig,
	Sequence,
	AbsoluteFill,
	Audio,
	staticFile,
	interpolate,
	OffthreadVideo,
	useCurrentFrame,
	Easing,
} from "remotion";
import { IPhoneFrame } from "../../components/iPhoneFrame";
import { TacticalIntro } from "../demo-template/TacticalIntro";
import { TacticalOutro } from "../demo-template/TacticalOutro";

const SRC_FPS = 60;

const FeatureLabel: React.FC<{
	text: string;
	delay?: number;
	fadeOutBefore?: number;
}> = ({ text, delay = 0, fadeOutBefore }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const fadeIn = interpolate(
		frame,
		[delay, delay + 0.5 * fps],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);
	const fadeOut = fadeOutBefore != null
		? interpolate(frame, [fadeOutBefore - 0.4 * fps, fadeOutBefore], [1, 0], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
			})
		: 1;
	const y = interpolate(frame, [delay, delay + 0.5 * fps], [10, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	return (
		<div
			style={{
				position: "absolute",
				bottom: 55,
				left: 0,
				right: 0,
				textAlign: "center",
				opacity: fadeIn * fadeOut,
				transform: `translateY(${y}px)`,
				fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
				color: "#e0e0e8",
				fontSize: 20,
				fontWeight: 500,
				letterSpacing: "0.06em",
				textShadow: "0 2px 20px rgba(0,0,0,0.8)",
			}}
		>
			{text}
		</div>
	);
};

// ─── Hype 1: "Capture" (~30s) ───────────────────────────────────────
// Story: Scan a book page → see the extracted text → capture detail → voice reads it
// Source: V1 for scan/OCR/capture, readout-1 for TTS payoff
//   V1 7-17s   = Google Lens scanning
//   V1 26-36s  = Document scanner + OCR result
//   V1 52-56s  = Capture detail (Photo, 271 words)
//   readout-1 120s = TTS player reading captured text aloud
export const HypeCaptureAnything: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(2 * fps);
	const outroFrames = Math.floor(4 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	// Beat 1: Scanning the book (10s) → source 7-17s
	const beat1 = Math.floor(10 * fps);
	// Beat 2: Scanner confirmation + OCR result (9s) → source 26-35s
	const beat2 = Math.floor(9 * fps);
	// Beat 3: Capture detail with metadata (rest) → source 52-62s
	const beat3 = contentFrames - beat1 - beat2;

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/frequency-synthwave.mp3")}
					volume={(f) => {
						const fadeIn = 1.5 * fps;
						const fadeOut = durationInFrames - 1.5 * fps;
						if (f < fadeIn) return interpolate(f, [0, fadeIn], [0, 0.4]);
						if (f > fadeOut)
							return interpolate(f, [fadeOut, durationInFrames], [0.4, 0]);
						return 0.4;
					}}
				/>
			</Sequence>

			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				<Sequence from={introFrames} durationInFrames={30}>
					<Audio src={staticFile("sfx/tap.wav")} volume={0.25} />
				</Sequence>
				<Sequence from={introFrames + beat1} durationInFrames={30}>
					<Audio src={staticFile("sfx/biometric_scan.wav")} volume={0.2} />
				</Sequence>
				<Sequence from={introFrames + beat1 + beat2} durationInFrames={30}>
					<Audio src={staticFile("sfx/synaptic_fire.wav")} volume={0.18} />
				</Sequence>
				<Sequence
					from={introFrames + contentFrames + Math.floor(0.5 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.3} />
				</Sequence>
			</Sequence>

			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="Capture // Scan Anything"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{/* Beat 1: Scanning the book with Google Lens (cut 1s at comp 7s / src 12s) */}
			<Sequence name="Scan-A" from={introFrames} durationInFrames={Math.floor(5 * fps)}>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={0.85} powerOnEffect>
						<OffthreadVideo
							src={staticFile("demos/talkie-capture-scan.mp4")}
							startFrom={7 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<FeatureLabel text="Scan any page" delay={1 * fps} fadeOutBefore={beat1 - 0.3 * fps} />
				</AbsoluteFill>
			</Sequence>
			<Sequence name="Scan-B" from={introFrames + Math.floor(5 * fps)} durationInFrames={beat1 - Math.floor(5 * fps)}>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={0.85} powerOnEffect={false}>
						<OffthreadVideo
							src={staticFile("demos/talkie-capture-scan.mp4")}
							startFrom={13 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<FeatureLabel text="Scan any page" delay={0} fadeOutBefore={(beat1 - Math.floor(5 * fps)) - 0.3 * fps} />
				</AbsoluteFill>
			</Sequence>

			{/* Beat 2: Document captured → OCR text appears */}
			<Sequence
				name="OCR-Result"
				from={introFrames + beat1}
				durationInFrames={beat2}
			>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={0.85} powerOnEffect={false}>
						<OffthreadVideo
							src={staticFile("demos/talkie-capture-scan.mp4")}
							startFrom={26 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<FeatureLabel text="Instant text extraction" delay={1 * fps} fadeOutBefore={beat2 - 0.3 * fps} />
				</AbsoluteFill>
			</Sequence>

			{/* Beat 3: Capture detail — metadata, word count, AI Commands available */}
			<Sequence
				name="Capture-Detail"
				from={introFrames + beat1 + beat2}
				durationInFrames={beat3}
			>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={0.85} powerOnEffect={false}>
						<OffthreadVideo
							src={staticFile("demos/talkie-capture-scan.mp4")}
							startFrom={52 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={1}
						/>
					</IPhoneFrame>
					<FeatureLabel text="271 words captured" delay={0.8 * fps} />
				</AbsoluteFill>
			</Sequence>

			<Sequence
				name="Outro"
				from={introFrames + contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Capture Anything"
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

// ─── Hype 2: "Voice + AI" (~35s) ────────────────────────────────────
// Story: Open captured text → AI Commands → ask a question → AI responds → voice reads it aloud
// Source: V1 for setup, V2 for AI flow, readout-1 for TTS payoff
//   V1 55-65s  = Capture detail with AI Commands docked
//   V2 5-15s   = Model selector + Quick Commands
//   V2 18-30s  = User question + AI response streaming
//   readout-1 108s = TTS player visible — progress bar 0:00/2:42, play/pause, 1x speed
export const HypeAIReadsForYou: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(2 * fps);
	const outroFrames = Math.floor(4 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	// Beat 1: Capture with AI Commands panel (4s) → V1 55s
	const beat1 = Math.floor(4 * fps);
	// Beat 2: AI Commands setup — model, Quick Commands (5s) → V2 8s (skip movement at 7-8s)
	const beat2 = Math.floor(5 * fps);
	// Beat 3: Question + AI response streaming (8s) → V2 18s
	const beat3 = Math.floor(8 * fps);
	// Beat 4: Voice reads aloud — TTS with progress bar (rest) → readout-1 108s
	const beat4 = contentFrames - beat1 - beat2 - beat3;

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/instrumental-synthwave.mp3")}
					volume={(f) => {
						const fadeIn = 1.5 * fps;
						const fadeOut = durationInFrames - 1.5 * fps;
						const voiceStart = introFrames + beat1 + beat2 + beat3;
						const voiceEnd = introFrames + contentFrames;

						let vol = 0.4;
						if (f < fadeIn) vol = interpolate(f, [0, fadeIn], [0, 0.4]);
						else if (f > fadeOut)
							vol = interpolate(f, [fadeOut, durationInFrames], [0.4, 0]);

						const duck = interpolate(
							f,
							[voiceStart - 0.5 * fps, voiceStart, voiceEnd - fps, voiceEnd],
							[1, 0.12, 0.12, 1],
							{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
						);
						return vol * duck;
					}}
				/>
			</Sequence>

			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				<Sequence from={introFrames} durationInFrames={30}>
					<Audio src={staticFile("sfx/tap.wav")} volume={0.25} />
				</Sequence>
				<Sequence from={introFrames + beat1 + beat2} durationInFrames={30}>
					<Audio src={staticFile("sfx/synaptic_fire.wav")} volume={0.2} />
				</Sequence>
				<Sequence from={introFrames + beat1 + beat2 + beat3} durationInFrames={30}>
					<Audio src={staticFile("sfx/quantum_cascade.wav")} volume={0.18} />
				</Sequence>
				<Sequence
					from={introFrames + contentFrames + Math.floor(0.5 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.3} />
				</Sequence>
			</Sequence>

			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="Voice + AI // GPT-5.2"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{/* Beat 1: Captured text with "AI Commands" panel visible */}
			<Sequence name="Setup" from={introFrames} durationInFrames={beat1}>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={0.85} powerOnEffect>
						<OffthreadVideo
							src={staticFile("demos/talkie-capture-scan.mp4")}
							startFrom={55 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<FeatureLabel text="Your captured text" delay={0.8 * fps} fadeOutBefore={beat1 - 0.3 * fps} />
				</AbsoluteFill>
			</Sequence>

			{/* Beat 2: AI Commands — model selector, Quick Commands (skip movement at src 7-8s) */}
			<Sequence
				name="AI-Setup"
				from={introFrames + beat1}
				durationInFrames={beat2}
			>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={0.85} powerOnEffect={false}>
						<OffthreadVideo
							src={staticFile("demos/talkie-ai-commands.mp4")}
							startFrom={8 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<FeatureLabel text="Ask anything about it" delay={1 * fps} fadeOutBefore={beat2 - 0.3 * fps} />
				</AbsoluteFill>
			</Sequence>

			{/* Beat 3: Question typed → AI response streams */}
			<Sequence
				name="AI-Response"
				from={introFrames + beat1 + beat2}
				durationInFrames={beat3}
			>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={0.85} powerOnEffect={false}>
						<OffthreadVideo
							src={staticFile("demos/talkie-ai-commands.mp4")}
							startFrom={18 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<FeatureLabel text="AI analyzes your text" delay={1.5 * fps} fadeOutBefore={beat3 - 0.3 * fps} />
				</AbsoluteFill>
			</Sequence>

			{/* Beat 4: Voice reads aloud — TTS player, music ducks, normalized audio track */}
			<Sequence
				name="Voice-Reads"
				from={introFrames + beat1 + beat2 + beat3}
				durationInFrames={beat4}
			>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={0.85} powerOnEffect={false}>
						<OffthreadVideo
							src={staticFile("demos/talkie-readout-1.mp4")}
							startFrom={120 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<FeatureLabel text="Then hear it spoken aloud" delay={0.8 * fps} />
				</AbsoluteFill>
				<Audio
					src={staticFile("demos/talkie-readout-1-audio.mp3")}
					startFrom={Math.floor(120 * fps)}
					volume={1}
				/>
			</Sequence>

			<Sequence
				name="Outro"
				from={introFrames + contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Voice + AI"
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

// ─── Chapter Title — big centered word for act transitions ─────────
const ChapterTitle: React.FC<{
	word: string;
	delay?: number;
	holdDuration: number;
}> = ({ word, delay = 0, holdDuration }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const fadeIn = interpolate(frame, [delay, delay + 0.4 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const fadeOut = interpolate(
		frame,
		[delay + holdDuration - 0.4 * fps, delay + holdDuration],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const scale = interpolate(frame, [delay, delay + 0.4 * fps], [1.15, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				opacity: fadeIn * fadeOut,
				transform: `scale(${scale})`,
				pointerEvents: "none",
				zIndex: 10,
			}}
		>
			<span
				style={{
					fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
					color: "white",
					fontSize: 52,
					fontWeight: 700,
					letterSpacing: "0.22em",
					textShadow:
						"0 0 60px rgba(255,255,255,0.25), 0 4px 40px rgba(0,0,0,0.9)",
				}}
			>
				{word}
			</span>
		</div>
	);
};

// ─── Cut Flash — white burst on hard cuts ──────────────────────────
const CutFlash: React.FC = () => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [0, 3], [0.6, 0], {
		extrapolateRight: "clamp",
	});
	return (
		<AbsoluteFill
			style={{ backgroundColor: "white", opacity, pointerEvents: "none" }}
		/>
	);
};

// ─── Hype 3: "The Knowledge Loop" (~40s) ──────────────────────────────
// Concept: One unbroken journey — physical page → spoken intelligence
// Three acts matching the tagline: CAPTURE → UNDERSTAND → LISTEN
// Source: readout-2 exclusively (QE2 book → FOMC question → GPT-5.2 → TTS)
//   readout-2 17-30s  = Scanner viewfinder, edge detection, auto-capture
//   readout-2 84-101s = AI Commands, FOMC question, GPT-5.2 streaming
//   readout-2 122-140s = TTS reading FOMC response aloud
export const HypeKnowledgeLoop: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(2.5 * fps);
	const outroFrames = Math.floor(5 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	const act1 = Math.floor(8 * fps);
	const act2 = Math.floor(10 * fps);
	const act3 = contentFrames - act1 - act2;

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/last-trip-60s.mp3")}
					volume={(f) => {
						const fadeIn = 2 * fps;
						const fadeOut = durationInFrames - 2 * fps;
						const voiceStart = introFrames + act1 + act2;
						const voiceEnd = introFrames + contentFrames;

						let vol = 0.35;
						if (f < fadeIn) vol = interpolate(f, [0, fadeIn], [0, 0.35]);
						else if (f > fadeOut)
							vol = interpolate(f, [fadeOut, durationInFrames], [0.35, 0]);

						const duck = interpolate(
							f,
							[voiceStart - 0.5 * fps, voiceStart, voiceEnd - fps, voiceEnd],
							[1, 0.15, 0.15, 1],
							{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
						);
						return vol * duck;
					}}
				/>
			</Sequence>

			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				<Sequence from={introFrames} durationInFrames={30}>
					<Audio src={staticFile("sfx/biometric_scan.wav")} volume={0.25} />
				</Sequence>
				<Sequence from={introFrames + act1} durationInFrames={30}>
					<Audio src={staticFile("sfx/synaptic_fire.wav")} volume={0.2} />
				</Sequence>
				<Sequence from={introFrames + act1 + act2} durationInFrames={30}>
					<Audio src={staticFile("sfx/quantum_cascade.wav")} volume={0.18} />
				</Sequence>
				<Sequence
					from={introFrames + contentFrames + Math.floor(0.5 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.3} />
				</Sequence>
			</Sequence>

			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="Capture. Understand. Listen."
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{/* Act 1: CAPTURE — Scanner viewfinder → edge detection → auto-capture */}
			<Sequence name="Capture" from={introFrames} durationInFrames={act1}>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={0.85} powerOnEffect>
						<OffthreadVideo
							src={staticFile("demos/talkie-readout-2.mp4")}
							startFrom={17 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<ChapterTitle
						word="CAPTURE"
						delay={Math.floor(0.3 * fps)}
						holdDuration={Math.floor(2.5 * fps)}
					/>
					<FeatureLabel
						text="Point. Scan. Done."
						delay={3 * fps}
						fadeOutBefore={act1 - 0.3 * fps}
					/>
				</AbsoluteFill>
			</Sequence>

			{/* Act 2: UNDERSTAND — AI Commands, question typed, GPT-5.2 streams answer */}
			<Sequence
				name="Understand"
				from={introFrames + act1}
				durationInFrames={act2}
			>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={0.85} powerOnEffect={false}>
						<OffthreadVideo
							src={staticFile("demos/talkie-readout-2.mp4")}
							startFrom={84 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<ChapterTitle
						word="UNDERSTAND"
						delay={Math.floor(0.3 * fps)}
						holdDuration={Math.floor(2.5 * fps)}
					/>
					<FeatureLabel
						text="GPT-5.2 answers anything"
						delay={3 * fps}
						fadeOutBefore={act2 - 0.3 * fps}
					/>
				</AbsoluteFill>
			</Sequence>

			{/* Act 3: LISTEN — TTS reads the response aloud with normalized audio */}
			<Sequence
				name="Listen"
				from={introFrames + act1 + act2}
				durationInFrames={act3}
			>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={0.85} powerOnEffect={false}>
						<OffthreadVideo
							src={staticFile("demos/talkie-readout-2.mp4")}
							startFrom={122 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<ChapterTitle
						word="LISTEN"
						delay={Math.floor(0.3 * fps)}
						holdDuration={Math.floor(2.5 * fps)}
					/>
					<FeatureLabel text="Hear it read aloud" delay={3 * fps} />
				</AbsoluteFill>
				<Audio
					src={staticFile("demos/talkie-readout-2-audio.mp3")}
					startFrom={Math.floor(122 * fps)}
					volume={1}
				/>
			</Sequence>

			<Sequence
				name="Outro"
				from={introFrames + contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Capture. Understand. Listen."
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

// ─── Hype 4: "Quick Cut" (~25s) ───────────────────────────────────────
// Concept: Agency sizzle reel — rapid-fire montage across all Talkie features
// 8 hard cuts with white flash transitions, tap SFX on beat, japan-trap energy
// Sources: captures-books, readout-2, capture-scan, ai-commands, readout-1
export const HypeQuickCut: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(1.5 * fps);
	const outroFrames = Math.floor(3.5 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	const cuts: {
		src: string;
		from: number;
		label: string | null;
		phonePct: number;
	}[] = [
		{ src: "demos/talkie-captures-books.mp4", from: 5, label: "Your library", phonePct: 0.88 },
		{ src: "demos/talkie-readout-2.mp4", from: 20, label: "Scan anything", phonePct: 0.85 },
		{ src: "demos/talkie-readout-2.mp4", from: 27, label: null, phonePct: 0.85 },
		{ src: "demos/talkie-capture-scan.mp4", from: 30, label: "Extract text", phonePct: 0.82 },
		{ src: "demos/talkie-ai-commands.mp4", from: 8, label: "Ask AI", phonePct: 0.88 },
		{ src: "demos/talkie-ai-commands.mp4", from: 20, label: null, phonePct: 0.85 },
		{ src: "demos/talkie-readout-1.mp4", from: 125, label: "Listen", phonePct: 0.82 },
		{ src: "demos/talkie-readout-2.mp4", from: 60, label: "All your text", phonePct: 0.88 },
	];

	const cutDuration = Math.floor(contentFrames / cuts.length);

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/japan-trap.mp3")}
					volume={(f) => {
						const fadeIn = 0.8 * fps;
						const fadeOut = durationInFrames - 1.5 * fps;
						const ttsStart = introFrames + 6 * cutDuration;
						const ttsEnd = ttsStart + cutDuration;

						let vol = 0.45;
						if (f < fadeIn) vol = interpolate(f, [0, fadeIn], [0, 0.45]);
						else if (f > fadeOut)
							vol = interpolate(f, [fadeOut, durationInFrames], [0.45, 0]);

						const duck = interpolate(
							f,
							[ttsStart - 5, ttsStart, ttsEnd - 5, ttsEnd],
							[1, 0.2, 0.2, 1],
							{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
						);
						return vol * duck;
					}}
				/>
			</Sequence>

			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{cuts.map((_, i) => (
					<Sequence
						key={`tap-${i}`}
						from={introFrames + i * cutDuration}
						durationInFrames={15}
					>
						<Audio src={staticFile("sfx/tap.wav")} volume={0.3} />
					</Sequence>
				))}
				<Sequence
					from={introFrames + contentFrames + Math.floor(0.3 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.35} />
				</Sequence>
			</Sequence>

			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="Everything in one app"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{cuts.map((cut, i) => (
				<Sequence
					key={`cut-${i}`}
					name={`Cut-${i + 1}`}
					from={introFrames + i * cutDuration}
					durationInFrames={cutDuration}
				>
					<AbsoluteFill>
						<IPhoneFrame
							phoneSizePct={cut.phonePct}
							powerOnEffect={i === 0}
						>
							<OffthreadVideo
								src={staticFile(cut.src)}
								startFrom={Math.floor(cut.from * SRC_FPS)}
								style={{
									width: "100%",
									height: "100%",
									objectFit: "cover",
								}}
								volume={0}
							/>
						</IPhoneFrame>
						{cut.label && (
							<FeatureLabel
								text={cut.label}
								delay={Math.floor(0.2 * fps)}
								fadeOutBefore={cutDuration - Math.floor(0.2 * fps)}
							/>
						)}
					</AbsoluteFill>
				</Sequence>
			))}

			{/* White flash on each cut transition */}
			{cuts.map((_, i) =>
				i > 0 ? (
					<Sequence
						key={`flash-${i}`}
						from={introFrames + i * cutDuration}
						durationInFrames={4}
					>
						<CutFlash />
					</Sequence>
				) : null,
			)}

			{/* Brief TTS audio burst on the "Listen" cut */}
			<Sequence
				name="TTS-Burst"
				from={introFrames + 6 * cutDuration}
				durationInFrames={cutDuration}
			>
				<Audio
					src={staticFile("demos/talkie-readout-1-audio.mp3")}
					startFrom={Math.floor(125 * fps)}
					volume={0.8}
				/>
			</Sequence>

			<Sequence
				name="Outro"
				from={introFrames + contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Capture. Understand. Listen."
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

// ─── Hype 5: "The Narrator" (~30s) ────────────────────────────────────
// Concept: VO-driven cinematic product spot — warm British narrator tells the story
// while sparse, slow visuals inside the phone frame support the voiceover.
// Think Apple "Designed in California" energy. Only 3 slow beats — the VO is the star.
// Source: readout-2 exclusively (QE2 book scan → AI → TTS reading)
//   readout-2 17s  = Scanner viewfinder, slow pan over book
//   readout-2 84s  = AI Commands, GPT-5.2 streaming response
//   readout-2 122s = TTS reading response aloud
// VO: George (ElevenLabs) — "Every day, you walk past words…"

// ─── Cinematic vignette — dark border overlay ─────────────────────────
const CinematicVignette: React.FC = () => {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				zIndex: 5,
				background:
					"radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)",
			}}
		/>
	);
};

// ─── Narrator text overlay — typed line that fades with the VO ────────
const NarratorLine: React.FC<{
	text: string;
	from: number;
	hold: number;
}> = ({ text, from, hold }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const fadeIn = interpolate(frame, [from, from + 0.6 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const fadeOut = interpolate(
		frame,
		[from + hold - 0.5 * fps, from + hold],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const y = interpolate(frame, [from, from + 0.6 * fps], [12, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	return (
		<div
			style={{
				position: "absolute",
				bottom: 110,
				left: 0,
				right: 0,
				textAlign: "center",
				opacity: fadeIn * fadeOut,
				transform: `translateY(${y}px)`,
				fontFamily: "Georgia, 'Times New Roman', serif",
				color: "rgba(255,255,255,0.85)",
				fontSize: 22,
				fontWeight: 400,
				fontStyle: "italic",
				letterSpacing: "0.02em",
				lineHeight: 1.6,
				textShadow: "0 2px 30px rgba(0,0,0,0.9)",
				padding: "0 200px",
			}}
		>
			{text}
		</div>
	);
};

export const HypeNarrator: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const frame = useCurrentFrame();

	// ── Timing layout (30s = 900f @ 30fps) ──
	const introFrames = Math.floor(2.5 * fps);   // 75f  — TacticalIntro
	const outroFrames = Math.floor(4 * fps);      // 120f — TacticalOutro
	const contentFrames = durationInFrames - introFrames - outroFrames;

	// Three slow beats inside the phone frame
	const beat1 = Math.floor(8 * fps);   // 240f — Scanning (readout-2 @ 17s)
	const beat2 = Math.floor(7 * fps);   // 210f — AI processing (readout-2 @ 84s)
	const beat3 = contentFrames - beat1 - beat2; // rest — TTS payoff (readout-2 @ 122s)

	// VO starts 1s into the content (after intro settles)
	const voStart = introFrames + Math.floor(1 * fps);
	const voDuration = Math.floor(15.7 * fps); // ~15.7s VO

	// ── Slow phone scale drift for cinematic feel ──
	const phoneScale = interpolate(
		frame,
		[introFrames, introFrames + contentFrames],
		[0.82, 0.88],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
	);

	return (
		<AbsoluteFill style={{ backgroundColor: "#08080c" }}>
			{/* ── Music: futuristic-synthwave at low volume, ducked under VO ── */}
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/futuristic-synthwave.mp3")}
					volume={(f) => {
						const fadeIn = 2 * fps;
						const fadeOut = durationInFrames - 2 * fps;

						// Base volume — low background bed
						let vol = 0.18;
						if (f < fadeIn) vol = interpolate(f, [0, fadeIn], [0, 0.18]);
						else if (f > fadeOut)
							vol = interpolate(f, [fadeOut, durationInFrames], [0.18, 0]);

						// Duck music during VO — drop to ~0.06
						const duck = interpolate(
							f,
							[
								voStart - 0.5 * fps,
								voStart,
								voStart + voDuration - fps,
								voStart + voDuration,
							],
							[1, 0.35, 0.35, 1],
							{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
						);
						return vol * duck;
					}}
				/>
			</Sequence>

			{/* ── Narrator Voiceover — the star of the show ── */}
			<Sequence name="VO" from={voStart} durationInFrames={voDuration + Math.floor(1 * fps)}>
				<Audio
					src={staticFile("demos/hype-narrator-vo.mp3")}
					volume={(f) => {
						const localDur = voDuration + Math.floor(1 * fps);
						const vFadeIn = interpolate(f, [0, 0.3 * fps], [0, 1], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						});
						const vFadeOut = interpolate(
							f,
							[localDur - 0.5 * fps, localDur],
							[1, 0],
							{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
						);
						return 1.0 * vFadeIn * vFadeOut;
					}}
				/>
			</Sequence>

			{/* ── Subtle SFX ── */}
			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{/* Soft scan on beat 1 entry */}
				<Sequence from={introFrames} durationInFrames={45}>
					<Audio src={staticFile("sfx/biometric_scan.wav")} volume={0.12} />
				</Sequence>
				{/* Synaptic fire on beat 2 — AI kicks in */}
				<Sequence from={introFrames + beat1} durationInFrames={40}>
					<Audio src={staticFile("sfx/synaptic_fire.wav")} volume={0.1} />
				</Sequence>
				{/* Quantum cascade on beat 3 — TTS begins */}
				<Sequence from={introFrames + beat1 + beat2} durationInFrames={40}>
					<Audio src={staticFile("sfx/quantum_cascade.wav")} volume={0.08} />
				</Sequence>
				{/* Outro cortex wave */}
				<Sequence
					from={introFrames + contentFrames + Math.floor(0.5 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.2} />
				</Sequence>
			</Sequence>

			{/* ── Intro: TacticalIntro ── */}
			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="Capture. Understand. Listen."
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{/* ── Beat 1: Slow scan — book scanning, edge detection ── */}
			<Sequence name="Beat1-Scan" from={introFrames} durationInFrames={beat1}>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={phoneScale} powerOnEffect>
						<OffthreadVideo
							src={staticFile("demos/talkie-readout-2.mp4")}
							startFrom={17 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<CinematicVignette />
					<NarratorLine
						text="Every day, you walk past words that could change everything."
						from={Math.floor(1 * fps)}
						hold={Math.floor(6 * fps)}
					/>
				</AbsoluteFill>
			</Sequence>

			{/* ── Beat 2: AI processing — commands, GPT streaming ── */}
			<Sequence
				name="Beat2-AI"
				from={introFrames + beat1}
				durationInFrames={beat2}
			>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={phoneScale} powerOnEffect={false}>
						<OffthreadVideo
							src={staticFile("demos/talkie-readout-2.mp4")}
							startFrom={84 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<CinematicVignette />
					<NarratorLine
						text="Capture it instantly. Understand it deeply."
						from={Math.floor(0.5 * fps)}
						hold={Math.floor(5.5 * fps)}
					/>
				</AbsoluteFill>
			</Sequence>

			{/* ── Beat 3: TTS reading — the payoff ── */}
			<Sequence
				name="Beat3-TTS"
				from={introFrames + beat1 + beat2}
				durationInFrames={beat3}
			>
				<AbsoluteFill>
					<IPhoneFrame phoneSizePct={phoneScale} powerOnEffect={false}>
						<OffthreadVideo
							src={staticFile("demos/talkie-readout-2.mp4")}
							startFrom={122 * SRC_FPS}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
							volume={0}
						/>
					</IPhoneFrame>
					<CinematicVignette />
					{/* Brief burst of TTS audio for the "hear it" moment */}
					<Audio
						src={staticFile("demos/talkie-readout-2-audio.mp3")}
						startFrom={Math.floor(122 * fps)}
						volume={(f) => {
							// Gentle fade in/out for the TTS burst
							const burstLen = beat3;
							const bIn = interpolate(f, [0, 0.5 * fps], [0, 0.5], {
								extrapolateLeft: "clamp",
								extrapolateRight: "clamp",
							});
							const bOut = interpolate(
								f,
								[burstLen - 1 * fps, burstLen],
								[0.5, 0],
								{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
							);
							return Math.min(bIn, bOut);
						}}
					/>
					<NarratorLine
						text="And hear it read back — beautifully."
						from={Math.floor(0.3 * fps)}
						hold={Math.floor(4 * fps)}
					/>
				</AbsoluteFill>
			</Sequence>

			{/* ── "This is Talkie" text — appears near end of content ── */}
			<Sequence
				name="Tagline"
				from={introFrames + contentFrames - Math.floor(2.5 * fps)}
				durationInFrames={Math.floor(2.5 * fps)}
			>
				<ChapterTitle
					word="THIS IS TALKIE"
					delay={0}
					holdDuration={Math.floor(2.5 * fps)}
				/>
			</Sequence>

			{/* ── Outro ── */}
			<Sequence
				name="Outro"
				from={introFrames + contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Capture. Understand. Listen."
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

export const HYPE_FPS = 30;

export function calculateHype1Frames(): number {
	return Math.floor(30 * HYPE_FPS);
}

export function calculateHype2Frames(): number {
	return Math.floor(35 * HYPE_FPS);
}

export function calculateHype3Frames(): number {
	return Math.floor(40 * HYPE_FPS);
}

export function calculateHype4Frames(): number {
	return Math.floor(25 * HYPE_FPS);
}

export function calculateHypeNarratorFrames(): number {
	return Math.floor(30 * HYPE_FPS);
}

// ─── Tagline Flash — staggered CAPTURE. UNDERSTAND. LISTEN. ────────
const TaglineFlash: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, height, durationInFrames } = useVideoConfig();
	const words = ["CAPTURE.", "UNDERSTAND.", "LISTEN."];
	const stagger = Math.floor(0.35 * fps);
	const fadeOut = interpolate(
		frame,
		[durationInFrames - 0.4 * fps, durationInFrames],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const scanlineY = (frame * 2.5) % height;
	return (
		<AbsoluteFill
			style={{
				backgroundColor: "#0a0a0e",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: 20,
				opacity: fadeOut,
			}}
		>
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: 0.025,
					backgroundImage: `
						linear-gradient(rgba(160, 170, 190, 0.35) 1px, transparent 1px),
						linear-gradient(90deg, rgba(160, 170, 190, 0.35) 1px, transparent 1px)
					`,
					backgroundSize: "50px 50px",
				}}
			/>
			<div
				style={{
					position: "absolute",
					top: scanlineY,
					left: 0,
					right: 0,
					height: 1,
					backgroundColor: "rgba(160, 170, 190, 0.025)",
				}}
			/>
			{words.map((word, i) => {
				const d = i * stagger;
				const wordOpacity = interpolate(frame, [d, d + 0.4 * fps], [0, 1], {
					extrapolateLeft: "clamp",
					extrapolateRight: "clamp",
					easing: Easing.out(Easing.cubic),
				});
				const wordScale = interpolate(frame, [d, d + 0.4 * fps], [1.15, 1], {
					extrapolateLeft: "clamp",
					extrapolateRight: "clamp",
					easing: Easing.out(Easing.cubic),
				});
				return (
					<span
						key={word}
						style={{
							fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
							color: "white",
							fontSize: 52,
							fontWeight: 700,
							letterSpacing: "0.22em",
							textShadow: "0 0 60px rgba(255,255,255,0.25), 0 4px 40px rgba(0,0,0,0.9)",
							opacity: wordOpacity,
							transform: `scale(${wordScale})`,
						}}
					>
						{word}
					</span>
				);
			})}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.45) 100%)",
					pointerEvents: "none",
				}}
			/>
		</AbsoluteFill>
	);
};

// ─── Sizzle Content Cut — IPhoneFrame with subtle zoom drift ───────
const SizzleContentCut: React.FC<{
	videoSrc: string;
	startFrom: number;
	cutFrames: number;
	phonePct: number;
	powerOn: boolean;
}> = ({ videoSrc, startFrom, cutFrames, phonePct, powerOn }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const drift = interpolate(frame, [0, cutFrames], [1.0, 1.025], {
		extrapolateRight: "clamp",
		easing: Easing.inOut(Easing.cubic),
	});
	return (
		<AbsoluteFill style={{ transform: `scale(${drift})` }}>
			<IPhoneFrame phoneSizePct={phonePct} powerOnEffect={powerOn}>
				<OffthreadVideo
					src={staticFile(videoSrc)}
					startFrom={Math.floor(startFrom * SRC_FPS)}
					style={{ width: "100%", height: "100%", objectFit: "cover" }}
					volume={0}
				/>
			</IPhoneFrame>
		</AbsoluteFill>
	);
};

// ─── Hype 7: "The Sizzle" (~35s) ──────────────────────────────────
// Concept: VO-narrated rapid montage — punchy lines synced to visual cuts
// 6 hard cuts with flash transitions, japan-trap beat, Liam VO
const SIZZLE_CUTS: {
	videoSrc: string;
	startFrom: number;
	duration: number;
	phonePct: number;
}[] = [
	{ videoSrc: "demos/talkie-captures-books.mp4", startFrom: 5, duration: 3, phonePct: 0.82 },
	{ videoSrc: "demos/talkie-readout-2.mp4", startFrom: 20, duration: 3, phonePct: 0.86 },
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 30, duration: 3, phonePct: 0.80 },
	{ videoSrc: "demos/talkie-ai-commands.mp4", startFrom: 10, duration: 4, phonePct: 0.88 },
	{ videoSrc: "demos/talkie-ai-commands.mp4", startFrom: 20, duration: 4, phonePct: 0.84 },
	{ videoSrc: "demos/talkie-readout-1.mp4", startFrom: 125, duration: 5, phonePct: 0.90 },
];

export const HypeSizzle: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(2 * fps);
	const outroFrames = Math.floor(4 * fps);
	const taglineFrames = Math.floor(3 * fps);

	let cursor = introFrames;
	const cutSeqs = SIZZLE_CUTS.map((cut, i) => {
		const frames = Math.floor(cut.duration * fps);
		const from = cursor;
		cursor += frames;
		return { ...cut, from, frames, index: i };
	});
	const taglineStart = cursor;
	const outroStart = taglineStart + taglineFrames;

	const voStart = Math.floor(1.0 * fps);
	const voDuration = Math.floor(17.0 * fps);
	const voEnd = voStart + voDuration;

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/japan-trap.mp3")}
					volume={(f) => {
						const fadeIn = 1.0 * fps;
						const fadeOut = durationInFrames - 2.0 * fps;
						let vol = 0.3;
						if (f < fadeIn) vol = interpolate(f, [0, fadeIn], [0, 0.3]);
						else if (f > fadeOut)
							vol = interpolate(f, [fadeOut, durationInFrames], [0.3, 0]);

						if (f >= voStart && f <= voEnd) {
							const duckIn = interpolate(f, [voStart, voStart + 8], [1, 0], {
								extrapolateLeft: "clamp",
								extrapolateRight: "clamp",
							});
							const duckOut = interpolate(f, [voEnd - 8, voEnd], [0, 1], {
								extrapolateLeft: "clamp",
								extrapolateRight: "clamp",
							});
							vol *= interpolate(
								Math.max(duckIn, duckOut),
								[0, 1],
								[0.08 / 0.3, 1],
							);
						}
						return vol;
					}}
				/>
			</Sequence>

			<Sequence name="VO" from={voStart} durationInFrames={voDuration + fps}>
				<Audio src={staticFile("demos/hype-sizzle-vo.mp3")} volume={1.0} />
			</Sequence>

			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{cutSeqs.map(({ from, index }) => (
					<Sequence key={`tap-${index}`} from={from} durationInFrames={15}>
						<Audio src={staticFile("sfx/tap.wav")} volume={0.25} />
					</Sequence>
				))}
				<Sequence from={taglineStart} durationInFrames={15}>
					<Audio src={staticFile("sfx/tap.wav")} volume={0.25} />
				</Sequence>
				<Sequence
					from={outroStart + Math.floor(0.5 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.3} />
				</Sequence>
			</Sequence>

			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="See. Scan. Listen."
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{cutSeqs.map(({ videoSrc, startFrom, from, frames, phonePct, index }) => (
				<Sequence
					key={`cut-${index}`}
					name={`Cut-${index + 1}`}
					from={from}
					durationInFrames={frames}
				>
					<SizzleContentCut
						videoSrc={videoSrc}
						startFrom={startFrom}
						cutFrames={frames}
						phonePct={phonePct}
						powerOn={index === 0}
					/>
				</Sequence>
			))}

			{cutSeqs.map(({ from, index }) => (
				<Sequence key={`flash-${index}`} from={from} durationInFrames={4}>
					<CutFlash />
				</Sequence>
			))}
			<Sequence from={taglineStart} durationInFrames={4}>
				<CutFlash />
			</Sequence>

			{(() => {
				const cut6 = cutSeqs[5];
				if (!cut6) return null;
				return (
					<Sequence
						name="TTS-Burst"
						from={cut6.from + Math.floor(0.5 * fps)}
						durationInFrames={cut6.frames}
					>
						<Audio
							src={staticFile("demos/talkie-readout-1-audio.mp3")}
							startFrom={Math.floor(125 * fps)}
							volume={(f) => {
								const fadeIn = interpolate(f, [0, 10], [0, 0.4], {
									extrapolateLeft: "clamp",
									extrapolateRight: "clamp",
								});
								const fadeOut = interpolate(
									f,
									[cut6.frames - 15, cut6.frames],
									[0.4, 0],
									{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
								);
								return Math.min(fadeIn, fadeOut);
							}}
						/>
					</Sequence>
				);
			})()}

			<Sequence name="Tagline" from={taglineStart} durationInFrames={taglineFrames}>
				<TaglineFlash />
			</Sequence>

			<Sequence name="Outro" from={outroStart} durationInFrames={outroFrames}>
				<TacticalOutro
					title="TALKIE"
					tagline="Capture. Understand. Listen."
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

export function calculateHypeSizzleFrames(): number {
	return Math.floor(35 * HYPE_FPS);
}

// ─── Hype 8: "Rapid Fire" (~20s) ─────────────────────────────────────
// Concept: Ultra-fast cut reel — the fastest in the suite. Pure energy.
// 12+ hard cuts at ~1-1.5s each, varied phone sizes, scale drift on every cut,
// CutFlash + tap SFX on every transition. No text overlays until brief final tag.
// Music: frequency-synthwave at 0.4. No VO.

const RAPID_FIRE_CUTS: {
	videoSrc: string;
	startFrom: number;
	phonePct: number;
}[] = [
	{ videoSrc: "demos/talkie-captures-books.mp4", startFrom: 5, phonePct: 0.88 },
	{ videoSrc: "demos/talkie-readout-2.mp4", startFrom: 20, phonePct: 0.78 },
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 13, phonePct: 0.92 },
	{ videoSrc: "demos/talkie-ai-commands.mp4", startFrom: 10, phonePct: 0.82 },
	{ videoSrc: "demos/talkie-ios-demo-trimmed.mp4", startFrom: 8, phonePct: 0.90 },
	{ videoSrc: "demos/talkie-readout-1.mp4", startFrom: 125, phonePct: 0.76 },
	{ videoSrc: "demos/talkie-overview-latest.mp4", startFrom: 15, phonePct: 0.88 },
	{ videoSrc: "demos/talkie-dashboard-2026-03-26.mp4", startFrom: 5, phonePct: 0.80 },
	{ videoSrc: "demos/talkie-readout-2.mp4", startFrom: 84, phonePct: 0.95 },
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 30, phonePct: 0.78 },
	{ videoSrc: "demos/talkie-ai-commands.mp4", startFrom: 20, phonePct: 0.86 },
	{ videoSrc: "demos/talkie-ios-demo-trimmed2.mp4", startFrom: 5, phonePct: 0.92 },
	{ videoSrc: "demos/talkie-readout-1.mp4", startFrom: 108, phonePct: 0.82 },
];

// ─── Rapid cut — IPhoneFrame with quick scale punch ───────────────────
const RapidCut: React.FC<{
	videoSrc: string;
	startFrom: number;
	cutFrames: number;
	phonePct: number;
	powerOn: boolean;
}> = ({ videoSrc, startFrom, cutFrames, phonePct, powerOn }) => {
	const frame = useCurrentFrame();
	const drift = interpolate(frame, [0, cutFrames], [1.0, 1.02], {
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	return (
		<AbsoluteFill style={{ transform: `scale(${drift})` }}>
			<IPhoneFrame phoneSizePct={phonePct} powerOnEffect={powerOn}>
				<OffthreadVideo
					src={staticFile(videoSrc)}
					startFrom={Math.floor(startFrom * SRC_FPS)}
					style={{ width: "100%", height: "100%", objectFit: "cover" }}
					volume={0}
				/>
			</IPhoneFrame>
		</AbsoluteFill>
	);
};

export const HypeRapidFire: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(1.5 * fps);
	const outroFrames = Math.floor(2 * fps);
	const tagFrames = Math.floor(1.5 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames - tagFrames;

	const cutDuration = Math.floor(contentFrames / RAPID_FIRE_CUTS.length);

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			{/* ── Music: frequency-synthwave, 0.4 vol, fade in/out ── */}
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/frequency-synthwave.mp3")}
					volume={(f) => {
						const fadeIn = 0.8 * fps;
						const fadeOut = durationInFrames - 1.0 * fps;
						if (f < fadeIn) return interpolate(f, [0, fadeIn], [0, 0.4]);
						if (f > fadeOut)
							return interpolate(f, [fadeOut, durationInFrames], [0.4, 0]);
						return 0.4;
					}}
				/>
			</Sequence>

			{/* ── SFX: tap on every cut + cortex wave on outro ── */}
			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{RAPID_FIRE_CUTS.map((_, i) => (
					<Sequence
						key={`tap-${i}`}
						from={introFrames + i * cutDuration}
						durationInFrames={15}
					>
						<Audio src={staticFile("sfx/tap.wav")} volume={0.3} />
					</Sequence>
				))}
				<Sequence
					from={introFrames + contentFrames + tagFrames + Math.floor(0.3 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.35} />
				</Sequence>
			</Sequence>

			{/* ── Intro ── */}
			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="Rapid. Fire."
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{/* ── Rapid cuts — 13 hard cuts with varied phone sizes ── */}
			{RAPID_FIRE_CUTS.map((cut, i) => (
				<Sequence
					key={`cut-${i}`}
					name={`Cut-${i + 1}`}
					from={introFrames + i * cutDuration}
					durationInFrames={cutDuration}
				>
					<RapidCut
						videoSrc={cut.videoSrc}
						startFrom={cut.startFrom}
						cutFrames={cutDuration}
						phonePct={cut.phonePct}
						powerOn={i === 0}
					/>
				</Sequence>
			))}

			{/* ── CutFlash on every transition after the first cut ── */}
			{RAPID_FIRE_CUTS.map((_, i) =>
				i > 0 ? (
					<Sequence
						key={`flash-${i}`}
						from={introFrames + i * cutDuration}
						durationInFrames={3}
					>
						<CutFlash />
					</Sequence>
				) : null,
			)}

			{/* ── Final tag: "TALKIE" centered with glow ── */}
			<Sequence
				name="FinalTag"
				from={introFrames + contentFrames}
				durationInFrames={tagFrames}
			>
				<RapidFireTag />
			</Sequence>

			{/* ── Outro ── */}
			<Sequence
				name="Outro"
				from={introFrames + contentFrames + tagFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Rapid. Fire."
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

// ─── Rapid Fire final tag — big "TALKIE" with glow ──────────────────
const RapidFireTag: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();
	const fadeIn = interpolate(frame, [0, 0.3 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const fadeOut = interpolate(
		frame,
		[durationInFrames - 0.3 * fps, durationInFrames],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const scale = interpolate(frame, [0, 0.3 * fps], [1.1, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	return (
		<AbsoluteFill
			style={{
				backgroundColor: "#0a0a0e",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				opacity: fadeIn * fadeOut,
			}}
		>
			<span
				style={{
					fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
					color: "white",
					fontSize: 72,
					fontWeight: 700,
					letterSpacing: "0.25em",
					transform: `scale(${scale})`,
					textShadow:
						"0 0 80px rgba(255,255,255,0.35), 0 0 160px rgba(255,255,255,0.15), 0 4px 40px rgba(0,0,0,0.9)",
				}}
			>
				TALKIE
			</span>
		</AbsoluteFill>
	);
};

export function calculateHypeRapidFireFrames(): number {
	return Math.floor(20 * HYPE_FPS);
}

// ─── Chapter Label — letter-spacing animated label for slow-burn takes ─
const SlowBurnChapterLabel: React.FC<{
	text: string;
	fadeInStart: number;
	fadeInDuration: number;
	fadeOutStart: number;
	fadeOutDuration: number;
}> = ({ text, fadeInStart, fadeInDuration, fadeOutStart, fadeOutDuration }) => {
	const frame = useCurrentFrame();
	const fadeIn = interpolate(frame, [fadeInStart, fadeInStart + fadeInDuration], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const fadeOut = interpolate(frame, [fadeOutStart, fadeOutStart + fadeOutDuration], [1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const spacing = interpolate(frame, [fadeInStart, fadeInStart + fadeInDuration], [0.5, 0.3], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	return (
		<div
			style={{
				position: "absolute",
				bottom: 70,
				left: 0,
				right: 0,
				textAlign: "center",
				opacity: fadeIn * fadeOut,
				fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
				color: "rgba(255,255,255,0.75)",
				fontSize: 18,
				fontWeight: 600,
				letterSpacing: `${spacing}em`,
				textTransform: "uppercase",
				textShadow: "0 2px 24px rgba(0,0,0,0.9)",
				pointerEvents: "none",
				zIndex: 10,
			}}
		>
			{text}
		</div>
	);
};

// ─── Hype 9: "Slow Burn" (~30s) ──────────────────────────────────────
// Concept: Cinematic single-source deep dive — long takes, dramatic scale,
// moody pacing. The opposite of fast-cut. Like a luxury product ad.
// Three unhurried takes with crossfade transitions, vignette overlays,
// gentle camera motion (zoom, pull, sway).
// Source: readout-2 for the zoom-in, capture-scan for the pull, readout-1 for sway
export const HypeSlowBurn: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const frame = useCurrentFrame();

	// ── Timing layout (30s = 900f @ 30fps) ──
	const introFrames = Math.floor(2 * fps);    // 60f
	const outroFrames = Math.floor(4 * fps);    // 120f
	const contentFrames = durationInFrames - introFrames - outroFrames;

	const take1 = Math.floor(9 * fps);   // 270f — slow zoom in
	const take2 = Math.floor(8 * fps);   // 240f — slow pull out
	const take3 = contentFrames - take1 - take2; // rest — gentle sway

	// Crossfade overlap (5 frames)
	const xfade = 5;

	// ── Take 1: Slow zoom from phoneSizePct 0.80, scale 1.0 → 1.08 ──
	const take1Scale = interpolate(
		frame,
		[introFrames, introFrames + take1],
		[1.0, 1.08],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
	);

	// ── Take 2: Slow pull, scale from 1.05 → 1.0 ──
	const take2Start = introFrames + take1;
	const take2Scale = interpolate(
		frame,
		[take2Start, take2Start + take2],
		[1.05, 1.0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
	);

	// ── Take 3: Gentle sway using sin wave ──
	const take3Start = introFrames + take1 + take2;
	const take3Progress = take3 > 0 ? Math.max(0, frame - take3Start) / take3 : 0;
	const swayX = Math.sin(take3Progress * Math.PI * 2) * 12; // 12px amplitude

	// ── Crossfade opacity helpers ──
	const take1Opacity = interpolate(
		frame,
		[introFrames + take1 - xfade, introFrames + take1],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const take2FadeIn = interpolate(
		frame,
		[take2Start - xfade, take2Start],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const take2FadeOut = interpolate(
		frame,
		[take2Start + take2 - xfade, take2Start + take2],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const take3FadeIn = interpolate(
		frame,
		[take3Start - xfade, take3Start],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	return (
		<AbsoluteFill style={{ backgroundColor: "#08080c" }}>
			{/* ── Music: futuristic-synthwave, low & moody, long fades ── */}
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/futuristic-synthwave.mp3")}
					volume={(f) => {
						const fadeIn = 2 * fps;
						const fadeOut = durationInFrames - 2 * fps;
						let vol = 0.35;
						if (f < fadeIn) vol = interpolate(f, [0, fadeIn], [0, 0.35]);
						else if (f > fadeOut)
							vol = interpolate(f, [fadeOut, durationInFrames], [0.35, 0]);
						return vol;
					}}
				/>
			</Sequence>

			{/* ── SFX: cortex_wave on each cut transition (smooth, no taps) ── */}
			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				<Sequence from={introFrames + take1 - xfade} durationInFrames={45}>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.15} />
				</Sequence>
				<Sequence from={introFrames + take1 + take2 - xfade} durationInFrames={45}>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.15} />
				</Sequence>
			</Sequence>

			{/* ── Intro ── */}
			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="Deep Dive"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{/* ── Take 1: Long zoom — readout-2, slow push in with vignette ── */}
			<Sequence name="Take1-Zoom" from={introFrames} durationInFrames={take1}>
				<AbsoluteFill style={{ opacity: take1Opacity }}>
					<AbsoluteFill style={{ transform: `scale(${take1Scale})` }}>
						<IPhoneFrame phoneSizePct={0.80} powerOnEffect>
							<OffthreadVideo
								src={staticFile("demos/talkie-readout-2.mp4")}
								startFrom={17 * SRC_FPS}
								style={{ width: "100%", height: "100%", objectFit: "cover" }}
								volume={0}
							/>
						</IPhoneFrame>
					</AbsoluteFill>
					{/* Cinematic vignette */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							pointerEvents: "none",
							zIndex: 5,
							background:
								"radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)",
						}}
					/>
				</AbsoluteFill>
			</Sequence>

			{/* ── Take 2: Slow pull — capture-scan, reverse zoom + SCAN label ── */}
			<Sequence
				name="Take2-Pull"
				from={take2Start - xfade}
				durationInFrames={take2 + xfade}
			>
				<AbsoluteFill style={{ opacity: take2FadeIn * take2FadeOut }}>
					<AbsoluteFill style={{ transform: `scale(${take2Scale})` }}>
						<IPhoneFrame phoneSizePct={0.85} powerOnEffect={false}>
							<OffthreadVideo
								src={staticFile("demos/talkie-capture-scan.mp4")}
								startFrom={20 * SRC_FPS}
								style={{ width: "100%", height: "100%", objectFit: "cover" }}
								volume={0}
							/>
						</IPhoneFrame>
					</AbsoluteFill>
					{/* Cinematic vignette */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							pointerEvents: "none",
							zIndex: 5,
							background:
								"radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)",
						}}
					/>
					<SlowBurnChapterLabel
						text="SCAN"
						fadeInStart={Math.floor(1.5 * fps)}
						fadeInDuration={Math.floor(1 * fps)}
						fadeOutStart={Math.floor(5.5 * fps)}
						fadeOutDuration={Math.floor(1 * fps)}
					/>
				</AbsoluteFill>
			</Sequence>

			{/* ── Take 3: Gentle sway — readout-1, horizontal sin drift ── */}
			<Sequence
				name="Take3-Sway"
				from={take3Start - xfade}
				durationInFrames={take3 + xfade}
			>
				<AbsoluteFill style={{ opacity: take3FadeIn }}>
					<AbsoluteFill style={{ transform: `translateX(${swayX}px)` }}>
						<IPhoneFrame phoneSizePct={0.90} powerOnEffect={false}>
							<OffthreadVideo
								src={staticFile("demos/talkie-readout-1.mp4")}
								startFrom={108 * SRC_FPS}
								style={{ width: "100%", height: "100%", objectFit: "cover" }}
								volume={0}
							/>
						</IPhoneFrame>
					</AbsoluteFill>
					{/* Cinematic vignette */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							pointerEvents: "none",
							zIndex: 5,
							background:
								"radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)",
						}}
					/>
				</AbsoluteFill>
			</Sequence>

			{/* ── Outro ── */}
			<Sequence
				name="Outro"
				from={introFrames + contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Capture. Understand. Listen."
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

export function calculateHypeSlowBurnFrames(): number {
	return Math.floor(30 * HYPE_FPS);
}

// ─── FeatureCard — phone on one side, big word on the other ──────────
const FeatureCard: React.FC<{
	videoSrc: string;
	startFrom: number;
	word: string;
	phoneSizePct: number;
	phoneLeft: boolean;
	bgColor: string;
}> = ({ videoSrc, startFrom, word, phoneSizePct, phoneLeft, bgColor }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Word animation: scale 1.3→1.0, opacity 0→1 over 0.3s
	const animFrames = Math.floor(0.3 * fps);
	const wordOpacity = interpolate(frame, [0, animFrames], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const wordScale = interpolate(frame, [0, animFrames], [1.3, 1.0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	const phoneShift = phoneLeft ? -400 : 400;

	return (
		<AbsoluteFill style={{ backgroundColor: bgColor }}>
			{/* Phone — shifted from center via transform */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					transform: `translateX(${phoneShift}px)`,
					zIndex: 1,
				}}
			>
				<IPhoneFrame phoneSizePct={phoneSizePct} powerOnEffect={false}>
					<OffthreadVideo
						src={staticFile(videoSrc)}
						startFrom={startFrom}
						style={{ width: "100%", height: "100%", objectFit: "cover" }}
						volume={0}
					/>
				</IPhoneFrame>
			</div>

			{/* Word — on the opposite side, above phone */}
			<div
				style={{
					position: "absolute",
					top: 0,
					bottom: 0,
					left: phoneLeft ? "50%" : 0,
					right: phoneLeft ? 0 : "50%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					zIndex: 2,
				}}
			>
				<span
					style={{
						fontFamily: "'JetBrains Mono', monospace",
						color: "white",
						fontSize: 110,
						fontWeight: 800,
						letterSpacing: "0.08em",
						opacity: wordOpacity,
						transform: `scale(${wordScale})`,
						textShadow:
							"0 0 80px rgba(255,255,255,0.15), 0 4px 60px rgba(0,0,0,0.9)",
					}}
				>
					{word}
				</span>
			</div>
		</AbsoluteFill>
	);
};

// ─── Hype 10: "Feature Stack" (~30s) ─────────────────────────────────
// Concept: Bold feature showcase — 5 cards with phone + big word label
// Alternating phone left/right, subtle background color shifts, cut flash + tap SFX
// Music: instrumental-synthwave at 0.35. No VO.
export const HypeFeatureStack: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(2 * fps);
	const outroFrames = Math.floor(4 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	const cards: {
		word: string;
		videoSrc: string;
		startFrom: number;
		phoneSizePct: number;
		bgColor: string;
	}[] = [
		{
			word: "CAPTURE",
			videoSrc: "demos/talkie-capture-scan.mp4",
			startFrom: 5 * SRC_FPS,
			phoneSizePct: 0.82,
			bgColor: "#0e0e0e",
		},
		{
			word: "READ",
			videoSrc: "demos/talkie-capture-scan.mp4",
			startFrom: 30 * SRC_FPS,
			phoneSizePct: 0.85,
			bgColor: "#111111",
		},
		{
			word: "LISTEN",
			videoSrc: "demos/talkie-readout-1.mp4",
			startFrom: 125 * SRC_FPS,
			phoneSizePct: 0.88,
			bgColor: "#0d0d0d",
		},
		{
			word: "EXPLORE",
			videoSrc: "demos/talkie-ai-commands.mp4",
			startFrom: 10 * SRC_FPS,
			phoneSizePct: 0.90,
			bgColor: "#101010",
		},
	];

	const cardDuration = Math.floor(contentFrames / cards.length);

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			{/* Music: instrumental-synthwave at 0.35 with fade in/out */}
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/instrumental-synthwave.mp3")}
					volume={(f) => {
						const fadeIn = 1.5 * fps;
						const fadeOut = durationInFrames - 1.5 * fps;
						if (f < fadeIn)
							return interpolate(f, [0, fadeIn], [0, 0.35]);
						if (f > fadeOut)
							return interpolate(
								f,
								[fadeOut, durationInFrames],
								[0.35, 0],
							);
						return 0.35;
					}}
				/>
			</Sequence>

			{/* SFX: tap on each card transition + cortex wave on outro */}
			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{cards.map((_, i) => (
					<Sequence
						key={`tap-${i}`}
						from={introFrames + i * cardDuration}
						durationInFrames={15}
					>
						<Audio src={staticFile("sfx/tap.wav")} volume={0.3} />
					</Sequence>
				))}
				<Sequence
					from={introFrames + contentFrames + Math.floor(0.5 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.3} />
				</Sequence>
			</Sequence>

			{/* Intro */}
			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="Everything. Captured."
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{/* Feature cards — odd cards phone-left, even cards phone-right */}
			{cards.map((card, i) => (
				<Sequence
					key={`card-${i}`}
					name={`Card-${card.word}`}
					from={introFrames + i * cardDuration}
					durationInFrames={cardDuration}
				>
					<FeatureCard
						videoSrc={card.videoSrc}
						startFrom={card.startFrom}
						word={card.word}
						phoneSizePct={card.phoneSizePct}
						phoneLeft={i % 2 === 0}
						bgColor={card.bgColor}
					/>
				</Sequence>
			))}

			{/* LISTEN card audio — readout playback */}
			<Sequence
				name="ListenAudio"
				from={introFrames + 2 * cardDuration}
				durationInFrames={cardDuration}
			>
				<Audio
					src={staticFile("demos/talkie-readout-1-audio.mp3")}
					startFrom={Math.floor(125 * 30)}
					volume={(f) => {
						const fadeIn = interpolate(f, [0, 15], [0, 0.5], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						});
						const fadeOut = interpolate(
							f,
							[cardDuration - 10, cardDuration],
							[0.5, 0],
							{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
						);
						return Math.min(fadeIn, fadeOut);
					}}
				/>
			</Sequence>

			{/* Cut flash between cards */}
			{cards.map((_, i) =>
				i > 0 ? (
					<Sequence
						key={`flash-${i}`}
						from={introFrames + i * cardDuration}
						durationInFrames={4}
					>
						<CutFlash />
					</Sequence>
				) : null,
			)}

			{/* Outro */}
			<Sequence
				name="Outro"
				from={introFrames + contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Capture. Understand. Listen."
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

export function calculateHypeFeatureStackFrames(): number {
	return Math.floor(30 * HYPE_FPS);
}

// ─── Hype 11: "Feature Stack B" (~35s) ─────────────────────────────────
// Concept: Expanded feature showcase — 5 cards with deeper feature coverage
// SCAN → EXTRACT → LISTEN → ASK → UNDERSTAND
// Wider phone separation (±450px), subtle gradient shift across cards
// Music: futuristic-synthwave at 0.35. No VO.
export const HypeFeatureStackB: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(2 * fps);
	const outroFrames = Math.floor(4 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	const cards: {
		word: string;
		videoSrc: string;
		startFrom: number;
		phoneSizePct: number;
		bgColor: string;
	}[] = [
		{
			word: "SCAN",
			videoSrc: "demos/talkie-capture-scan.mp4",
			startFrom: 7 * SRC_FPS,
			phoneSizePct: 0.82,
			bgColor: "#0c0c0e",
		},
		{
			word: "EXTRACT",
			videoSrc: "demos/talkie-capture-scan.mp4",
			startFrom: 40 * SRC_FPS,
			phoneSizePct: 0.84,
			bgColor: "#0e0e10",
		},
		{
			word: "LISTEN",
			videoSrc: "demos/talkie-readout-1.mp4",
			startFrom: 130 * SRC_FPS,
			phoneSizePct: 0.86,
			bgColor: "#101014",
		},
		{
			word: "ASK",
			videoSrc: "demos/talkie-ai-commands.mp4",
			startFrom: 10 * SRC_FPS,
			phoneSizePct: 0.88,
			bgColor: "#0e0e10",
		},
		{
			word: "UNDERSTAND",
			videoSrc: "demos/talkie-ai-commands.mp4",
			startFrom: 35 * SRC_FPS,
			phoneSizePct: 0.85,
			bgColor: "#0c0c0e",
		},
	];

	const cardDuration = Math.floor(contentFrames / cards.length);

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			{/* Music: futuristic-synthwave at 0.35 with fade in/out */}
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/futuristic-synthwave.mp3")}
					volume={(f) => {
						const fadeIn = 1.5 * fps;
						const fadeOut = durationInFrames - 1.5 * fps;
						if (f < fadeIn)
							return interpolate(f, [0, fadeIn], [0, 0.35]);
						if (f > fadeOut)
							return interpolate(
								f,
								[fadeOut, durationInFrames],
								[0.35, 0],
							);
						return 0.35;
					}}
				/>
			</Sequence>

			{/* SFX: tap on each card transition + cortex wave on outro */}
			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{cards.map((_, i) => (
					<Sequence
						key={`tap-${i}`}
						from={introFrames + i * cardDuration}
						durationInFrames={15}
					>
						<Audio src={staticFile("sfx/tap.wav")} volume={0.3} />
					</Sequence>
				))}
				<Sequence
					from={introFrames + contentFrames + Math.floor(0.5 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.3} />
				</Sequence>
			</Sequence>

			{/* Intro */}
			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="The Full Pipeline"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{/* Feature cards — odd cards phone-left, even cards phone-right */}
			{cards.map((card, i) => (
				<Sequence
					key={`card-${i}`}
					name={`Card-${card.word}`}
					from={introFrames + i * cardDuration}
					durationInFrames={cardDuration}
				>
					<FeatureCardB
						videoSrc={card.videoSrc}
						startFrom={card.startFrom}
						word={card.word}
						phoneSizePct={card.phoneSizePct}
						phoneLeft={i % 2 === 0}
						bgColor={card.bgColor}
					/>
				</Sequence>
			))}

			{/* LISTEN card audio — readout playback */}
			<Sequence
				name="ListenAudio"
				from={introFrames + 2 * cardDuration}
				durationInFrames={cardDuration}
			>
				<Audio
					src={staticFile("demos/talkie-readout-1-audio.mp3")}
					startFrom={Math.floor(130 * 30)}
					volume={(f) => {
						const fadeIn = interpolate(f, [0, 15], [0, 0.5], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						});
						const fadeOut = interpolate(
							f,
							[cardDuration - 10, cardDuration],
							[0.5, 0],
							{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
						);
						return Math.min(fadeIn, fadeOut);
					}}
				/>
			</Sequence>

			{/* Cut flash between cards */}
			{cards.map((_, i) =>
				i > 0 ? (
					<Sequence
						key={`flash-${i}`}
						from={introFrames + i * cardDuration}
						durationInFrames={4}
					>
						<CutFlash />
					</Sequence>
				) : null,
			)}

			{/* Outro */}
			<Sequence
				name="Outro"
				from={introFrames + contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Scan. Extract. Listen. Ask. Understand."
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

// ─── FeatureCardB — wider phone separation (±450px) ─────────────────
const FeatureCardB: React.FC<{
	videoSrc: string;
	startFrom: number;
	word: string;
	phoneSizePct: number;
	phoneLeft: boolean;
	bgColor: string;
}> = ({ videoSrc, startFrom, word, phoneSizePct, phoneLeft, bgColor }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Word animation: scale 1.3→1.0, opacity 0→1 over 0.3s
	const animFrames = Math.floor(0.3 * fps);
	const wordOpacity = interpolate(frame, [0, animFrames], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const wordScale = interpolate(frame, [0, animFrames], [1.3, 1.0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	const phoneShift = phoneLeft ? -450 : 450;

	return (
		<AbsoluteFill style={{ backgroundColor: bgColor }}>
			{/* Phone — shifted from center via transform */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					transform: `translateX(${phoneShift}px)`,
					zIndex: 1,
				}}
			>
				<IPhoneFrame phoneSizePct={phoneSizePct} powerOnEffect={false}>
					<OffthreadVideo
						src={staticFile(videoSrc)}
						startFrom={startFrom}
						style={{ width: "100%", height: "100%", objectFit: "cover" }}
						volume={0}
					/>
				</IPhoneFrame>
			</div>

			{/* Word — on the opposite side, above phone */}
			<div
				style={{
					position: "absolute",
					top: 0,
					bottom: 0,
					left: phoneLeft ? "50%" : 0,
					right: phoneLeft ? 0 : "50%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					zIndex: 2,
				}}
			>
				<span
					style={{
						fontFamily: "'JetBrains Mono', monospace",
						color: "white",
						fontSize: 110,
						fontWeight: 800,
						letterSpacing: "0.08em",
						opacity: wordOpacity,
						transform: `scale(${wordScale})`,
						textShadow:
							"0 0 80px rgba(255,255,255,0.15), 0 4px 60px rgba(0,0,0,0.9)",
					}}
				>
					{word}
				</span>
			</div>
		</AbsoluteFill>
	);
};

export function calculateHypeFeatureStackBFrames(): number {
	return Math.floor(35 * HYPE_FPS);
}

// ─── Countdown Number — corner step indicator ─────────────────────────
const CountdownNumber: React.FC<{
	number: number;
}> = ({ number }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const animFrames = Math.floor(0.4 * fps);
	const opacity = interpolate(frame, [0, animFrames], [0, 0.35], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const scale = interpolate(frame, [0, animFrames], [1.5, 1.0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	return (
		<div
			style={{
				position: "absolute",
				top: 60,
				right: 80,
				fontFamily: "'JetBrains Mono', monospace",
				color: "white",
				fontSize: 180,
				fontWeight: 900,
				opacity,
				transform: `scale(${scale})`,
				lineHeight: 1,
				zIndex: 3,
				pointerEvents: "none",
			}}
		>
			{number}
		</div>
	);
};

// ─── FeatureCardC — phone always left, word always right, larger ─────
const FeatureCardC: React.FC<{
	videoSrc: string;
	startFrom: number;
	word: string;
	phoneSizePct: number;
	bgColor: string;
	stepNumber: number;
	playbackRate?: number;
	videoVolume?: number;
}> = ({ videoSrc, startFrom, word, phoneSizePct, bgColor, stepNumber, playbackRate, videoVolume }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Word animation: scale 1.3→1.0, opacity 0→1 over 0.3s
	const animFrames = Math.floor(0.3 * fps);
	const wordOpacity = interpolate(frame, [0, animFrames], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const wordScale = interpolate(frame, [0, animFrames], [1.3, 1.0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	// Phone always on the left
	const phoneShift = -400;

	return (
		<AbsoluteFill style={{ backgroundColor: bgColor }}>
			{/* Phone — always shifted left */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					transform: `translateX(${phoneShift}px)`,
					zIndex: 1,
				}}
			>
				<IPhoneFrame phoneSizePct={phoneSizePct} powerOnEffect={false}>
					<OffthreadVideo
						src={staticFile(videoSrc)}
						startFrom={startFrom}
						playbackRate={playbackRate ?? 1}
						style={{ width: "100%", height: "100%", objectFit: "cover" }}
						volume={videoVolume ?? 0}
					/>
				</IPhoneFrame>
			</div>

			{/* Word — always on the right side */}
			<div
				style={{
					position: "absolute",
					top: 0,
					bottom: 0,
					left: "50%",
					right: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					zIndex: 2,
				}}
			>
				<span
					style={{
						fontFamily: "'JetBrains Mono', monospace",
						color: "white",
						fontSize: 140,
						fontWeight: 800,
						letterSpacing: "0.08em",
						opacity: wordOpacity,
						transform: `scale(${wordScale})`,
						textShadow:
							"0 0 80px rgba(255,255,255,0.15), 0 4px 60px rgba(0,0,0,0.9)",
					}}
				>
					{word}
				</span>
			</div>

			{/* Countdown number in the top-right corner */}
			<CountdownNumber number={stepNumber} />
		</AbsoluteFill>
	);
};

// ─── Hype 12: "Feature Stack C" (~25s) ─────────────────────────────────
// Concept: Punchy core pipeline — 3 cards, larger phone, consistent left layout
// CAPTURE → READ → LISTEN — the essential flow
// Phone always LEFT, word always RIGHT, countdown numbers in corner
// Music: japan-trap at 0.4. No VO.
export const HypeFeatureStackC: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(2 * fps);
	const outroFrames = Math.floor(3 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	const cards: {
		word: string;
		videoSrc: string;
		startFrom: number;
		phoneSizePct: number;
		bgColor: string;
		durationWeight: number;
	}[] = [
		{
			word: "CAPTURE",
			videoSrc: "demos/talkie-capture-scan.mp4",
			startFrom: 7 * SRC_FPS,
			phoneSizePct: 0.90,
			bgColor: "#0d0d0f",
			durationWeight: 0.25,
		},
		{
			word: "READ",
			videoSrc: "demos/talkie-capture-scan.mp4",
			startFrom: 30 * SRC_FPS,
			phoneSizePct: 0.90,
			bgColor: "#0e0e10",
			durationWeight: 0.375,
		},
		{
			word: "LISTEN",
			videoSrc: "demos/talkie-readout-1.mp4",
			startFrom: 125 * SRC_FPS,
			phoneSizePct: 0.90,
			bgColor: "#0d0d0f",
			durationWeight: 0.375,
		},
	];

	const cardDurations = cards.map((c) => Math.floor(contentFrames * c.durationWeight));
	const cardOffsets = cardDurations.reduce<number[]>((acc, d, i) => {
		acc.push(i === 0 ? 0 : acc[i - 1] + cardDurations[i - 1]);
		return acc;
	}, []);

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			{/* Music: japan-trap at 0.4 with fade in/out */}
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/japan-trap.mp3")}
					volume={(f) => {
						const fadeIn = 1.0 * fps;
						const fadeOut = durationInFrames - 1.5 * fps;
						if (f < fadeIn)
							return interpolate(f, [0, fadeIn], [0, 0.4]);
						if (f > fadeOut)
							return interpolate(
								f,
								[fadeOut, durationInFrames],
								[0.4, 0],
							);
						return 0.4;
					}}
				/>
			</Sequence>

			{/* SFX: tap on each card transition + cortex wave on outro */}
			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{cards.map((_, i) => (
					<Sequence
						key={`tap-${i}`}
						from={introFrames + cardOffsets[i]}
						durationInFrames={15}
					>
						<Audio src={staticFile("sfx/tap.wav")} volume={0.35} />
					</Sequence>
				))}
				<Sequence
					from={introFrames + contentFrames + Math.floor(0.3 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.35} />
				</Sequence>
			</Sequence>

			{/* Intro */}
			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="Three Steps. Done."
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{/* Feature cards — phone always left, word always right */}
			{cards.map((card, i) => (
				<Sequence
					key={`card-${i}`}
					name={`Card-${card.word}`}
					from={introFrames + cardOffsets[i]}
					durationInFrames={cardDurations[i]}
				>
					<FeatureCardC
						videoSrc={card.videoSrc}
						startFrom={card.startFrom}
						word={card.word}
						phoneSizePct={card.phoneSizePct}
						bgColor={card.bgColor}
						stepNumber={i + 1}
					/>
				</Sequence>
			))}

			{/* LISTEN card audio — readout playback */}
			<Sequence
				name="ListenAudio"
				from={introFrames + cardOffsets[2]}
				durationInFrames={cardDurations[2]}
			>
				<Audio
					src={staticFile("demos/talkie-readout-1-audio.mp3")}
					startFrom={Math.floor(125 * 30)}
					volume={(f) => {
						const dur = cardDurations[2];
						const fadeIn = interpolate(f, [0, 15], [0, 0.6], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						});
						const fadeOut = interpolate(
							f,
							[dur - 10, dur],
							[0.6, 0],
							{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
						);
						return Math.min(fadeIn, fadeOut);
					}}
				/>
			</Sequence>

			{/* Cut flash between cards */}
			{cards.map((_, i) =>
				i > 0 ? (
					<Sequence
						key={`flash-${i}`}
						from={introFrames + cardOffsets[i]}
						durationInFrames={4}
					>
						<CutFlash />
					</Sequence>
				) : null,
			)}

			{/* Outro */}
			<Sequence
				name="Outro"
				from={introFrames + contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Capture. Read. Listen."
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

export function calculateHypeFeatureStackCFrames(): number {
	return Math.floor(25 * HYPE_FPS);
}

// ─── Hype 12b: "Feature Stack C — Baudrillard" (~45s) ──────────────────
// 4-card variation: CAPTURE → READ → LISTEN → UNDERSTAND
// UNDERSTAND is split: 2:44-3:03 at 2x (response streaming), 3:03-3:18 at 1x (TTS readback)
export const HypeFeatureStackCBaudrillard: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(2 * fps);
	const outroFrames = Math.floor(3 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	const baudrillardSrc1 = "demos/talkie-capture-baudrillard.mp4";
	const baudrillardSrc2 = "demos/talkie-capture-baudrillard-2.mp4";

	const cards = [
		{ word: "CAPTURE", videoSrc: baudrillardSrc1, startFrom: 7 * SRC_FPS, bgColor: "#0d0d0f", weight: 0.10, videoVolume: 0 },
		{ word: "READ", videoSrc: baudrillardSrc1, startFrom: 28 * SRC_FPS, bgColor: "#0e0e10", weight: 0.15, videoVolume: 0 },
		{ word: "LISTEN", videoSrc: "demos/baudrillard-listen.mp4", startFrom: 0, bgColor: "#0d0d0f", weight: 0.30, videoVolume: 0.7 },
	];

	const cardDurations = cards.map((c) => Math.floor(contentFrames * c.weight));
	const cardOffsets = cardDurations.reduce<number[]>((acc, d, i) => {
		acc.push(i === 0 ? 0 : acc[i - 1] + cardDurations[i - 1]);
		return acc;
	}, []);

	// UNDERSTAND: 2x clip is 22s source at 2x = 11s composition
	const understand2xFrames = Math.floor(11 * fps);
	const understandStart = introFrames + cardOffsets[2] + cardDurations[2];
	const understand1xFrames = contentFrames - (cardOffsets[2] + cardDurations[2]) - understand2xFrames;

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/japan-trap.mp3")}
					volume={(f) => {
						const fadeIn = 1.0 * fps;
						const fadeOut = durationInFrames - 1.5 * fps;
						if (f < fadeIn)
							return interpolate(f, [0, fadeIn], [0, 0.25]);
						if (f > fadeOut)
							return interpolate(f, [fadeOut, durationInFrames], [0.25, 0]);
						return 0.25;
					}}
				/>
			</Sequence>

			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{cards.map((_, i) => (
					<Sequence key={`tap-${i}`} from={introFrames + cardOffsets[i]} durationInFrames={15}>
						<Audio src={staticFile("sfx/tap.wav")} volume={0.35} />
					</Sequence>
				))}
				<Sequence from={understandStart} durationInFrames={15}>
					<Audio src={staticFile("sfx/tap.wav")} volume={0.35} />
				</Sequence>
				<Sequence from={introFrames + contentFrames + Math.floor(0.3 * fps)} durationInFrames={45}>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.35} />
				</Sequence>
			</Sequence>

			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro title="TALKIE" subtitle="Baudrillard, Read Aloud" iconSrc="talkie-icon-1024.png" />
			</Sequence>

			{cards.map((card, i) => (
				<Sequence key={`card-${i}`} name={`Card-${card.word}`} from={introFrames + cardOffsets[i]} durationInFrames={cardDurations[i]}>
					<FeatureCardC videoSrc={card.videoSrc} startFrom={card.startFrom} word={card.word} phoneSizePct={0.90} bgColor={card.bgColor} stepNumber={i + 1} videoVolume={card.videoVolume} />
				</Sequence>
			))}

			{/* UNDERSTAND part 1: 2:44-3:03 at 2x — response streaming in */}
			<Sequence name="Card-UNDERSTAND-2x" from={understandStart} durationInFrames={understand2xFrames}>
				<FeatureCardC videoSrc="demos/baudrillard-understand-2x.mp4" startFrom={0} word="UNDERSTAND" phoneSizePct={0.90} bgColor="#0e0e10" stepNumber={4} playbackRate={2} videoVolume={0} />
			</Sequence>

			{/* UNDERSTAND part 2: TTS reading aloud (pre-cut with Pause visible) */}
			<Sequence name="Card-UNDERSTAND-1x" from={understandStart + understand2xFrames} durationInFrames={understand1xFrames}>
				<FeatureCardC videoSrc="demos/baudrillard-understand-1x.mp4" startFrom={0} word="UNDERSTAND" phoneSizePct={0.90} bgColor="#0e0e10" stepNumber={4} videoVolume={0.7} />
			</Sequence>

			{/* Cut flashes between cards */}
			{cards.map((_, i) => i > 0 ? (
				<Sequence key={`flash-${i}`} from={introFrames + cardOffsets[i]} durationInFrames={4}><CutFlash /></Sequence>
			) : null)}
			<Sequence from={understandStart} durationInFrames={4}><CutFlash /></Sequence>

			<Sequence name="Outro" from={introFrames + contentFrames} durationInFrames={outroFrames}>
				<TacticalOutro title="TALKIE" tagline="Capture. Read. Listen. Understand." releaseDate="Available Now" iconSrc="talkie-icon-1024.png" />
			</Sequence>
		</AbsoluteFill>
	);
};

export function calculateHypeFeatureStackCBaudrillardFrames(): number {
	return Math.floor(45 * HYPE_FPS);
}

// ─── Hype 11: "Quick Cut B" (~25s) ─────────────────────────────────────
// Concept: Same 8-cut rapid montage format as HypeQuickCut but with different
// source clips, futuristic-synthwave music, and a CAPTURE → READ → LISTEN
// pipeline narrative. Phone sizes vary more aggressively (0.70–0.95).
export const HypeQuickCutB: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(1.5 * fps);
	const outroFrames = Math.floor(3.5 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	const cuts: {
		src: string;
		from: number;
		label: string | null;
		phonePct: number;
	}[] = [
		// Cuts 1-3: CAPTURE pipeline — scanning & capturing
		{ src: "demos/talkie-capture-scan.mp4", from: 10, label: "Point & scan", phonePct: 0.92 },
		{ src: "demos/talkie-captures-books.mp4", from: 12, label: "Auto-capture", phonePct: 0.78 },
		{ src: "demos/talkie-readout-2.mp4", from: 17, label: null, phonePct: 0.70 },
		// Cuts 4-5: READ pipeline — text extraction & OCR
		{ src: "demos/talkie-capture-scan.mp4", from: 26, label: "Extract text", phonePct: 0.85 },
		{ src: "demos/talkie-capture-scan.mp4", from: 52, label: "271 words", phonePct: 0.95 },
		// Cuts 6-8: LISTEN pipeline — TTS playback
		{ src: "demos/talkie-readout-1.mp4", from: 120, label: "Play it back", phonePct: 0.80 },
		{ src: "demos/talkie-readout-2.mp4", from: 130, label: null, phonePct: 0.73 },
		{ src: "demos/talkie-readout-1.mp4", from: 140, label: "Listen anywhere", phonePct: 0.90 },
	];

	const cutDuration = Math.floor(contentFrames / cuts.length);

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/futuristic-synthwave.mp3")}
					volume={(f) => {
						const fadeIn = 0.8 * fps;
						const fadeOut = durationInFrames - 1.5 * fps;
						const ttsStart = introFrames + 5 * cutDuration;
						const ttsEnd = ttsStart + cutDuration;

						let vol = 0.45;
						if (f < fadeIn) vol = interpolate(f, [0, fadeIn], [0, 0.45]);
						else if (f > fadeOut)
							vol = interpolate(f, [fadeOut, durationInFrames], [0.45, 0]);

						const duck = interpolate(
							f,
							[ttsStart - 5, ttsStart, ttsEnd - 5, ttsEnd],
							[1, 0.2, 0.2, 1],
							{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
						);
						return vol * duck;
					}}
				/>
			</Sequence>

			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{cuts.map((_, i) => (
					<Sequence
						key={`tap-${i}`}
						from={introFrames + i * cutDuration}
						durationInFrames={15}
					>
						<Audio src={staticFile("sfx/tap.wav")} volume={0.3} />
					</Sequence>
				))}
				<Sequence
					from={introFrames + contentFrames + Math.floor(0.3 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.35} />
				</Sequence>
			</Sequence>

			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="Capture // Read // Listen"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{cuts.map((cut, i) => (
				<Sequence
					key={`cut-${i}`}
					name={`Cut-${i + 1}`}
					from={introFrames + i * cutDuration}
					durationInFrames={cutDuration}
				>
					<AbsoluteFill>
						<IPhoneFrame
							phoneSizePct={cut.phonePct}
							powerOnEffect={i === 0}
						>
							<OffthreadVideo
								src={staticFile(cut.src)}
								startFrom={Math.floor(cut.from * SRC_FPS)}
								style={{
									width: "100%",
									height: "100%",
									objectFit: "cover",
								}}
								volume={0}
							/>
						</IPhoneFrame>
						{cut.label && (
							<FeatureLabel
								text={cut.label}
								delay={Math.floor(0.2 * fps)}
								fadeOutBefore={cutDuration - Math.floor(0.2 * fps)}
							/>
						)}
					</AbsoluteFill>
				</Sequence>
			))}

			{/* White flash on each cut transition */}
			{cuts.map((_, i) =>
				i > 0 ? (
					<Sequence
						key={`flash-${i}`}
						from={introFrames + i * cutDuration}
						durationInFrames={4}
					>
						<CutFlash />
					</Sequence>
				) : null,
			)}

			{/* Brief TTS audio burst on the first "Listen" cut */}
			<Sequence
				name="TTS-Burst"
				from={introFrames + 5 * cutDuration}
				durationInFrames={cutDuration}
			>
				<Audio
					src={staticFile("demos/talkie-readout-1-audio.mp3")}
					startFrom={Math.floor(120 * fps)}
					volume={0.8}
				/>
			</Sequence>

			<Sequence
				name="Outro"
				from={introFrames + contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Capture. Read. Listen."
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

export function calculateHypeQuickCutBFrames(): number {
	return Math.floor(25 * HYPE_FPS);
}

// ─── Cut Label Flash — brief centered word on cut transitions ─────────
const CutLabelFlash: React.FC<{
	text: string;
	durationFrames: number;
}> = ({ text, durationFrames }) => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [0, 1, durationFrames - 1, durationFrames], [0, 1, 1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const scale = interpolate(frame, [0, 1], [1.2, 1.0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	return (
		<AbsoluteFill
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				pointerEvents: "none",
				zIndex: 20,
			}}
		>
			<span
				style={{
					fontFamily: "'JetBrains Mono', monospace",
					color: "white",
					fontSize: 48,
					fontWeight: 700,
					letterSpacing: "0.25em",
					opacity,
					transform: `scale(${scale})`,
					textShadow:
						"0 0 40px rgba(255,255,255,0.4), 0 2px 20px rgba(0,0,0,0.9)",
				}}
			>
				{text}
			</span>
		</AbsoluteFill>
	);
};

// ─── Hype 12: "Quick Cut C" (~30s) ─────────────────────────────────────
// Concept: 10-cut montage (slightly longer than standard QuickCut) with
// last-trip-60s music. Mixed sources across capture-scan, readout, and
// ai-commands. Each cut has a brief 3-frame text label flash showing the
// feature name in JetBrains Mono.
export const HypeQuickCutC: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(1.5 * fps);
	const outroFrames = Math.floor(3.5 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	const cuts: {
		src: string;
		from: number;
		label: string;
		phonePct: number;
	}[] = [
		{ src: "demos/talkie-capture-scan.mp4", from: 7, label: "SCAN", phonePct: 0.88 },
		{ src: "demos/talkie-capture-scan.mp4", from: 15, label: "SCAN", phonePct: 0.82 },
		{ src: "demos/talkie-readout-2.mp4", from: 25, label: "READ", phonePct: 0.90 },
		{ src: "demos/talkie-capture-scan.mp4", from: 35, label: "READ", phonePct: 0.78 },
		{ src: "demos/talkie-ai-commands.mp4", from: 5, label: "ASK", phonePct: 0.85 },
		{ src: "demos/talkie-ai-commands.mp4", from: 15, label: "ASK", phonePct: 0.92 },
		{ src: "demos/talkie-ai-commands.mp4", from: 30, label: "ASK", phonePct: 0.80 },
		{ src: "demos/talkie-readout-1.mp4", from: 110, label: "LISTEN", phonePct: 0.86 },
		{ src: "demos/talkie-readout-2.mp4", from: 125, label: "LISTEN", phonePct: 0.75 },
		{ src: "demos/talkie-readout-1.mp4", from: 135, label: "LISTEN", phonePct: 0.95 },
	];

	const cutDuration = Math.floor(contentFrames / cuts.length);
	const labelFlashFrames = 3;

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/last-trip-60s.mp3")}
					volume={(f) => {
						const fadeIn = 0.8 * fps;
						const fadeOut = durationInFrames - 1.5 * fps;
						const ttsStart = introFrames + 7 * cutDuration;
						const ttsEnd = ttsStart + cutDuration;

						let vol = 0.4;
						if (f < fadeIn) vol = interpolate(f, [0, fadeIn], [0, 0.4]);
						else if (f > fadeOut)
							vol = interpolate(f, [fadeOut, durationInFrames], [0.4, 0]);

						const duck = interpolate(
							f,
							[ttsStart - 5, ttsStart, ttsEnd - 5, ttsEnd],
							[1, 0.25, 0.25, 1],
							{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
						);
						return vol * duck;
					}}
				/>
			</Sequence>

			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{cuts.map((_, i) => (
					<Sequence
						key={`tap-${i}`}
						from={introFrames + i * cutDuration}
						durationInFrames={15}
					>
						<Audio src={staticFile("sfx/tap.wav")} volume={0.3} />
					</Sequence>
				))}
				<Sequence
					from={introFrames + contentFrames + Math.floor(0.3 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.35} />
				</Sequence>
			</Sequence>

			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="Scan // Ask // Listen"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{cuts.map((cut, i) => (
				<Sequence
					key={`cut-${i}`}
					name={`Cut-${i + 1}`}
					from={introFrames + i * cutDuration}
					durationInFrames={cutDuration}
				>
					<AbsoluteFill>
						<IPhoneFrame
							phoneSizePct={cut.phonePct}
							powerOnEffect={i === 0}
						>
							<OffthreadVideo
								src={staticFile(cut.src)}
								startFrom={Math.floor(cut.from * SRC_FPS)}
								style={{
									width: "100%",
									height: "100%",
									objectFit: "cover",
								}}
								volume={0}
							/>
						</IPhoneFrame>
					</AbsoluteFill>
				</Sequence>
			))}

			{/* White flash + feature label on each cut transition */}
			{cuts.map((cut, i) =>
				i > 0 ? (
					<Sequence
						key={`flash-${i}`}
						from={introFrames + i * cutDuration}
						durationInFrames={Math.max(4, labelFlashFrames + 1)}
					>
						<CutFlash />
						<CutLabelFlash text={cut.label} durationFrames={labelFlashFrames} />
					</Sequence>
				) : null,
			)}

			{/* Brief TTS audio burst on the first "LISTEN" cut */}
			<Sequence
				name="TTS-Burst"
				from={introFrames + 7 * cutDuration}
				durationInFrames={cutDuration}
			>
				<Audio
					src={staticFile("demos/talkie-readout-1-audio.mp3")}
					startFrom={Math.floor(110 * fps)}
					volume={0.8}
				/>
			</Sequence>

			<Sequence
				name="Outro"
				from={introFrames + contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Scan. Ask. Listen."
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

export function calculateHypeQuickCutCFrames(): number {
	return Math.floor(30 * HYPE_FPS);
}
// ─── Hype RapidFire B: "Capture Pipeline" (~20s) ───────────────────────
// Concept: Focused capture→read pipeline reel. Same 13-cut ultra-fast energy
// as HypeRapidFire but using ONLY capture-scan and readout-1 sources —
// showing the complete scan-to-read journey. Japan-trap for different energy.
// More aggressive scale drift (1.0→1.04), alternating large/small phone sizes.

const RAPID_FIRE_B_CUTS: {
	videoSrc: string;
	startFrom: number;
	phonePct: number;
}[] = [
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 5, phonePct: 0.90 },
	{ videoSrc: "demos/talkie-readout-1.mp4", startFrom: 10, phonePct: 0.72 },
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 13, phonePct: 0.90 },
	{ videoSrc: "demos/talkie-readout-1.mp4", startFrom: 30, phonePct: 0.72 },
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 26, phonePct: 0.90 },
	{ videoSrc: "demos/talkie-readout-1.mp4", startFrom: 60, phonePct: 0.72 },
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 35, phonePct: 0.90 },
	{ videoSrc: "demos/talkie-readout-1.mp4", startFrom: 90, phonePct: 0.72 },
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 52, phonePct: 0.90 },
	{ videoSrc: "demos/talkie-readout-1.mp4", startFrom: 108, phonePct: 0.72 },
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 70, phonePct: 0.90 },
	{ videoSrc: "demos/talkie-readout-1.mp4", startFrom: 125, phonePct: 0.72 },
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 90, phonePct: 0.90 },
];

// ─── Rapid cut B — IPhoneFrame with aggressive 1.0→1.04 scale drift ────
const RapidCutB: React.FC<{
	videoSrc: string;
	startFrom: number;
	cutFrames: number;
	phonePct: number;
	powerOn: boolean;
}> = ({ videoSrc, startFrom, cutFrames, phonePct, powerOn }) => {
	const frame = useCurrentFrame();
	const drift = interpolate(frame, [0, cutFrames], [1.0, 1.04], {
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	return (
		<AbsoluteFill style={{ transform: `scale(${drift})` }}>
			<IPhoneFrame phoneSizePct={phonePct} powerOnEffect={powerOn}>
				<OffthreadVideo
					src={staticFile(videoSrc)}
					startFrom={Math.floor(startFrom * SRC_FPS)}
					style={{ width: "100%", height: "100%", objectFit: "cover" }}
					volume={0}
				/>
			</IPhoneFrame>
		</AbsoluteFill>
	);
};

export const HypeRapidFireB: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(1.5 * fps);
	const outroFrames = Math.floor(2 * fps);
	const tagFrames = Math.floor(1.5 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames - tagFrames;

	const cutDuration = Math.floor(contentFrames / RAPID_FIRE_B_CUTS.length);

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			{/* ── Music: japan-trap, 0.4 vol, fade in/out ── */}
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/japan-trap.mp3")}
					volume={(f) => {
						const fadeIn = 0.8 * fps;
						const fadeOut = durationInFrames - 1.0 * fps;
						if (f < fadeIn) return interpolate(f, [0, fadeIn], [0, 0.4]);
						if (f > fadeOut)
							return interpolate(f, [fadeOut, durationInFrames], [0.4, 0]);
						return 0.4;
					}}
				/>
			</Sequence>

			{/* ── SFX: tap on every cut + cortex wave on outro ── */}
			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{RAPID_FIRE_B_CUTS.map((_, i) => (
					<Sequence
						key={`tap-${i}`}
						from={introFrames + i * cutDuration}
						durationInFrames={15}
					>
						<Audio src={staticFile("sfx/tap.wav")} volume={0.3} />
					</Sequence>
				))}
				<Sequence
					from={introFrames + contentFrames + tagFrames + Math.floor(0.3 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.35} />
				</Sequence>
			</Sequence>

			{/* ── Intro ── */}
			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="TALKIE"
					subtitle="Capture // Read"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>

			{/* ── Rapid cuts — 13 hard cuts alternating large/small phone ── */}
			{RAPID_FIRE_B_CUTS.map((cut, i) => (
				<Sequence
					key={`cut-${i}`}
					name={`Cut-${i + 1}`}
					from={introFrames + i * cutDuration}
					durationInFrames={cutDuration}
				>
					<RapidCutB
						videoSrc={cut.videoSrc}
						startFrom={cut.startFrom}
						cutFrames={cutDuration}
						phonePct={cut.phonePct}
						powerOn={i === 0}
					/>
				</Sequence>
			))}

			{/* ── CutFlash on every transition after the first cut ── */}
			{RAPID_FIRE_B_CUTS.map((_, i) =>
				i > 0 ? (
					<Sequence
						key={`flash-${i}`}
						from={introFrames + i * cutDuration}
						durationInFrames={3}
					>
						<CutFlash />
					</Sequence>
				) : null,
			)}

			{/* ── Final tag: "TALKIE" centered with glow ── */}
			<Sequence
				name="FinalTag"
				from={introFrames + contentFrames}
				durationInFrames={tagFrames}
			>
				<RapidFireTag />
			</Sequence>

			{/* ── Outro ── */}
			<Sequence
				name="Outro"
				from={introFrames + contentFrames + tagFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Capture // Read"
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

export function calculateHypeRapidFireBFrames(): number {
	return Math.floor(20 * HYPE_FPS);
}

// ─── Hype RapidFire C: "Capture Blitz" (~15s) ─────────────────────────
// Concept: Absolute maximum speed — 10 cuts in 15 seconds (~1.1s per cut).
// Pure "capturing" montage using only capture-scan and captures-books.
// No intro — starts immediately with first cut. 2s outro only.
// Subtle pulse: each cut's phone scales from 0.85→0.88 over its duration.
// Music: instrumental-synthwave. No VO, no text overlays.

const RAPID_FIRE_C_CUTS: {
	videoSrc: string;
	startFrom: number;
}[] = [
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 5 },
	{ videoSrc: "demos/talkie-readout-1.mp4", startFrom: 125 },
	{ videoSrc: "demos/talkie-captures-books.mp4", startFrom: 10 },
	{ videoSrc: "demos/talkie-ai-commands.mp4", startFrom: 10 },
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 30 },
	{ videoSrc: "demos/talkie-readout-2.mp4", startFrom: 20 },
	{ videoSrc: "demos/talkie-ios-demo-trimmed.mp4", startFrom: 8 },
	{ videoSrc: "demos/talkie-ai-commands.mp4", startFrom: 30 },
	{ videoSrc: "demos/talkie-capture-scan.mp4", startFrom: 52 },
	{ videoSrc: "demos/talkie-readout-1.mp4", startFrom: 108 },
];

// ─── Pulse cut C — IPhoneFrame with subtle 0.85→0.88 phone pulse ───────
const RapidCutC: React.FC<{
	videoSrc: string;
	startFrom: number;
	cutFrames: number;
	powerOn: boolean;
}> = ({ videoSrc, startFrom, cutFrames, powerOn }) => {
	const frame = useCurrentFrame();
	const phonePulse = interpolate(frame, [0, cutFrames], [0.85, 0.88], {
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	return (
		<AbsoluteFill>
			<IPhoneFrame phoneSizePct={phonePulse} powerOnEffect={powerOn}>
				<OffthreadVideo
					src={staticFile(videoSrc)}
					startFrom={Math.floor(startFrom * SRC_FPS)}
					style={{ width: "100%", height: "100%", objectFit: "cover" }}
					volume={0}
				/>
			</IPhoneFrame>
		</AbsoluteFill>
	);
};

export const HypeRapidFireC: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const outroFrames = Math.floor(2 * fps);
	const contentFrames = durationInFrames - outroFrames;

	const cutDuration = Math.floor(contentFrames / RAPID_FIRE_C_CUTS.length);

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			{/* ── Music: instrumental-synthwave, 0.45 vol, fast fade in/out ── */}
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/instrumental-synthwave.mp3")}
					volume={(f) => {
						const fadeIn = 0.5 * fps;
						const fadeOut = durationInFrames - 1.0 * fps;
						if (f < fadeIn) return interpolate(f, [0, fadeIn], [0, 0.45]);
						if (f > fadeOut)
							return interpolate(f, [fadeOut, durationInFrames], [0.45, 0]);
						return 0.45;
					}}
				/>
			</Sequence>

			{/* ── SFX: tap on every cut + cortex wave on outro ── */}
			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{RAPID_FIRE_C_CUTS.map((_, i) => (
					<Sequence
						key={`tap-${i}`}
						from={i * cutDuration}
						durationInFrames={15}
					>
						<Audio src={staticFile("sfx/tap.wav")} volume={0.3} />
					</Sequence>
				))}
				<Sequence
					from={contentFrames + Math.floor(0.3 * fps)}
					durationInFrames={45}
				>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={0.35} />
				</Sequence>
			</Sequence>

			{/* ── No intro — cuts start immediately ── */}

			{/* ── Rapid cuts — 10 hard cuts with pulse phone size ── */}
			{RAPID_FIRE_C_CUTS.map((cut, i) => (
				<Sequence
					key={`cut-${i}`}
					name={`Cut-${i + 1}`}
					from={i * cutDuration}
					durationInFrames={cutDuration}
				>
					<RapidCutC
						videoSrc={cut.videoSrc}
						startFrom={cut.startFrom}
						cutFrames={cutDuration}
						powerOn={i === 0}
					/>
				</Sequence>
			))}

			{/* ── CutFlash on every transition after the first cut ── */}
			{RAPID_FIRE_C_CUTS.map((_, i) =>
				i > 0 ? (
					<Sequence
						key={`flash-${i}`}
						from={i * cutDuration}
						durationInFrames={3}
					>
						<CutFlash />
					</Sequence>
				) : null,
			)}

			{/* ── Outro (2s) — no tag, just outro ── */}
			<Sequence
				name="Outro"
				from={contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="TALKIE"
					tagline="Capture Everything"
					releaseDate="Available Now"
					iconSrc="talkie-icon-1024.png"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

export function calculateHypeRapidFireCFrames(): number {
	return Math.floor(15 * HYPE_FPS);
}
