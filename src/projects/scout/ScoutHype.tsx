import {
	useCurrentFrame,
	useVideoConfig,
	Sequence,
	AbsoluteFill,
	Audio,
	staticFile,
	interpolate,
	OffthreadVideo,
	Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/JetBrainsMono";
import { IPhoneFrame } from "../../components/iPhoneFrame";
import { TacticalIntro } from "../demo-template/TacticalIntro";
import { TacticalOutro } from "../demo-template/TacticalOutro";

const { fontFamily: jetbrains } = loadFont("normal", { weights: ["400", "700"] });

const SCOUT_FPS = 30;
const BG = "#0a0a0e";

// ── CutFlash — white flash overlay on cut transitions ────────────────

const CutFlash: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const flashDuration = 0.12 * fps;
	const opacity = interpolate(frame, [0, flashDuration], [0.85, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	return (
		<AbsoluteFill
			style={{
				backgroundColor: "#ffffff",
				opacity,
				pointerEvents: "none",
				zIndex: 100,
			}}
		/>
	);
};

// ═══════════════════════════════════════════════════════════════════════
// ScoutQuickCut — 25s fast-paced sizzle reel
// 8 rapid cuts showing Scout's breadth: voice input, multi-agent
// orchestration, code analysis, session management.
// ═══════════════════════════════════════════════════════════════════════

export const ScoutQuickCut: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();
	const introFrames = Math.floor(1.5 * fps);
	const outroFrames = Math.floor(3 * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	const cuts: { src: string; phonePct: number }[] = [
		{ src: "demos/scout-qc-1.mp4", phonePct: 0.88 },
		{ src: "demos/scout-qc-2.mp4", phonePct: 0.82 },
		{ src: "demos/scout-qc-3.mp4", phonePct: 0.90 },
		{ src: "demos/scout-qc-4.mp4", phonePct: 0.78 },
		{ src: "demos/scout-qc-5.mp4", phonePct: 0.85 },
		{ src: "demos/scout-qc-6.mp4", phonePct: 0.92 },
		{ src: "demos/scout-qc-7.mp4", phonePct: 0.80 },
		{ src: "demos/scout-qc-8.mp4", phonePct: 0.95 },
	];

	const cutDuration = Math.floor(contentFrames / cuts.length);

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/japan-trap.mp3")}
					volume={(f) => {
						const fadeIn = 0.8 * fps;
						const fadeOut = durationInFrames - 1.5 * fps;
						let vol = 0.25;
						if (f < fadeIn) vol = interpolate(f, [0, fadeIn], [0, 0.25]);
						else if (f > fadeOut)
							vol = interpolate(f, [fadeOut, durationInFrames], [0.25, 0]);
						return vol;
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
					title="SCOUT"
					subtitle="Voice Agent v0.2.46"
					iconSrc="scout-logo.svg"
				/>
			</Sequence>

			{cuts.map((cut, i) => (
				<Sequence
					key={`cut-${i}`}
					name={`Cut-${i + 1}`}
					from={introFrames + i * cutDuration}
					durationInFrames={cutDuration}
				>
					<AbsoluteFill style={{ backgroundColor: BG }}>
						<div
							style={{
								position: "absolute",
								inset: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<IPhoneFrame
								phoneSizePct={cut.phonePct}
								powerOnEffect={i === 0}
							>
								<OffthreadVideo
									src={staticFile(cut.src)}
									startFrom={0}
									style={{
										width: "100%",
										height: "100%",
										objectFit: "cover",
									}}
									volume={0}
								/>
							</IPhoneFrame>
						</div>
					</AbsoluteFill>
				</Sequence>
			))}

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

			<Sequence
				name="Outro"
				from={introFrames + contentFrames}
				durationInFrames={outroFrames}
			>
				<TacticalOutro
					title="SCOUT"
					tagline="Your agents. Your voice. Your code."
					iconSrc="scout-logo.svg"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

export function calculateScoutQuickCutFrames(): number {
	return Math.floor(25 * SCOUT_FPS);
}

// ═══════════════════════════════════════════════════════════════════════
// ScoutFeatureStack — 45s ASK → THINK → ANALYZE → DELIVER promo
// Phone left, big word right, weighted card durations.
// ═══════════════════════════════════════════════════════════════════════

const INTRO_DURATION = 3;
const OUTRO_DURATION = 4;
const TOTAL_DURATION = 45;

interface FeatureCard {
	word: string;
	videoSrc: string;
	startFrom: number;
	weight: number;
	bgColor: string;
	videoVolume: number;
	playbackRate?: number;
}

const CARDS: FeatureCard[] = [
	{ word: "VOICE", videoSrc: "demos/scout-ask.mp4", startFrom: 0, weight: 0.22, bgColor: BG, videoVolume: 0 },
	{ word: "ROUTE", videoSrc: "demos/scout-think.mp4", startFrom: 0, weight: 0.18, bgColor: BG, videoVolume: 0 },
	{ word: "AGENTS", videoSrc: "demos/scout-analyze.mp4", startFrom: 0, weight: 0.22, bgColor: BG, videoVolume: 0 },
	{ word: "DELIVER", videoSrc: "demos/scout-deliver.mp4", startFrom: 90, weight: 0.38, bgColor: BG, videoVolume: 0 },
];

interface FeatureCardCProps {
	videoSrc: string;
	startFrom: number;
	word: string;
	phoneSizePct?: number;
	bgColor?: string;
	stepNumber: number;
	playbackRate?: number;
	videoVolume?: number;
}

const FeatureCardC: React.FC<FeatureCardCProps> = ({
	videoSrc,
	startFrom,
	word,
	phoneSizePct = 0.82,
	bgColor = BG,
	stepNumber,
	playbackRate = 1,
	videoVolume = 0,
}) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const fadeIn = interpolate(frame, [0, 0.4 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	const fadeOut = interpolate(
		frame,
		[durationInFrames - 0.4 * fps, durationInFrames],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	const opacity = fadeIn * fadeOut;

	const phoneSlideX = interpolate(frame, [0, 0.5 * fps], [-60, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	const wordSlideX = interpolate(frame, [0.1 * fps, 0.6 * fps], [40, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	const stepOpacity = interpolate(frame, [0.2 * fps, 0.6 * fps], [0, 0.4], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	}) * fadeOut;

	const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<AbsoluteFill style={{ backgroundColor: bgColor, opacity }}>
			<div
				style={{
					position: "absolute",
					left: -400,
					top: 0,
					width: "100%",
					height: "100%",
					transform: `translateX(${phoneSlideX}px)`,
				}}
			>
				<IPhoneFrame
					phoneSizePct={phoneSizePct}
					powerOnEffect={false}
					showGlow={true}
					glowColor="rgba(120, 160, 255, 0.04)"
				>
					<OffthreadVideo
						src={staticFile(videoSrc)}
						startFrom={startFrom}
						playbackRate={playbackRate}
						style={{ width: "100%", height: "100%", objectFit: "cover" }}
						volume={videoVolume}
					/>
				</IPhoneFrame>
			</div>

			<div
				style={{
					position: "absolute",
					right: 120,
					top: "50%",
					transform: `translateY(-50%) translateX(${wordSlideX}px)`,
					textAlign: "right",
				}}
			>
				<div
					style={{
						fontFamily: jetbrains,
						fontSize: 140,
						fontWeight: 700,
						color: "#e8e8f0",
						letterSpacing: "0.06em",
						lineHeight: 1,
						textShadow: "0 0 80px rgba(120, 160, 255, 0.15)",
					}}
				>
					{word}
				</div>
				<div
					style={{
						marginTop: 16,
						height: 2,
						width: 80,
						backgroundColor: "rgba(160, 170, 190, 0.3)",
						borderRadius: 1,
						marginLeft: "auto",
					}}
				/>
			</div>

			<div
				style={{
					position: "absolute",
					top: 48,
					right: 56,
					opacity: stepOpacity,
					fontFamily: jetbrains,
					fontSize: 14,
					color: "rgba(175, 185, 200, 0.7)",
					letterSpacing: "0.12em",
				}}
			>
				0{stepNumber} / 04
			</div>

			<div
				style={{
					position: "absolute",
					bottom: 40,
					left: 60,
					right: 60,
					height: 2,
					backgroundColor: "rgba(160, 170, 190, 0.1)",
					borderRadius: 1,
					opacity: fadeIn * fadeOut,
				}}
			>
				<div
					style={{
						width: `${progress}%`,
						height: "100%",
						backgroundColor: "rgba(160, 170, 190, 0.4)",
						borderRadius: 1,
					}}
				/>
			</div>

			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.4) 100%)",
					pointerEvents: "none",
				}}
			/>
		</AbsoluteFill>
	);
};

export function calculateScoutFeatureStackFrames(fps: number = SCOUT_FPS): number {
	return Math.floor(TOTAL_DURATION * fps);
}

export const ScoutFeatureStack: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();

	const introFrames = Math.floor(INTRO_DURATION * fps);
	const outroFrames = Math.floor(OUTRO_DURATION * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	const totalWeight = CARDS.reduce((sum, c) => sum + c.weight, 0);
	const cardTimeline: { card: FeatureCard; from: number; duration: number }[] = [];
	let cursor = introFrames;

	CARDS.forEach((card) => {
		const dur = Math.floor((card.weight / totalWeight) * contentFrames);
		cardTimeline.push({ card, from: cursor, duration: dur });
		cursor += dur;
	});

	const outroStart = durationInFrames - outroFrames;
	const sfxVolume = 0.35;

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/japan-trap.mp3")}
					volume={(f) => {
						const fadeInEnd = 1.5 * fps;
						const fadeOutStart = durationInFrames - 2.0 * fps;
						if (f < fadeInEnd)
							return interpolate(f, [0, fadeInEnd], [0, 0.25]);
						if (f > fadeOutStart)
							return interpolate(f, [fadeOutStart, durationInFrames], [0.25, 0]);
						return 0.25;
					}}
				/>
			</Sequence>

			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				<Sequence from={0} durationInFrames={30}>
					<Audio src={staticFile("sfx/tap.wav")} volume={sfxVolume * 0.7} />
				</Sequence>
				{cardTimeline.map(({ from }, i) => (
					<Sequence key={`tap-${i}`} from={from} durationInFrames={30}>
						<Audio src={staticFile("sfx/tap.wav")} volume={sfxVolume * 0.6} />
					</Sequence>
				))}
				<Sequence from={outroStart + Math.floor(0.5 * fps)} durationInFrames={45}>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={sfxVolume * 0.5} />
				</Sequence>
			</Sequence>

			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title="SCOUT"
					subtitle="Voice Agent v0.2.46"
					iconSrc="scout-logo.svg"
				/>
			</Sequence>

			{cardTimeline.map(({ card, from, duration }, i) => (
				<Sequence
					key={`card-${i}`}
					name={`Card-${card.word}`}
					from={from}
					durationInFrames={duration}
				>
					{i > 0 && <CutFlash />}
					<FeatureCardC
						videoSrc={card.videoSrc}
						startFrom={card.startFrom}
						word={card.word}
						bgColor={card.bgColor}
						stepNumber={i + 1}
						playbackRate={card.playbackRate}
						videoVolume={card.videoVolume}
					/>
				</Sequence>
			))}

			<Sequence name="Outro" from={outroStart} durationInFrames={outroFrames}>
				<CutFlash />
				<TacticalOutro
					title="SCOUT"
					tagline="Voice. Route. Agents. Deliver."
					iconSrc="scout-logo.svg"
				/>
			</Sequence>
		</AbsoluteFill>
	);
};
