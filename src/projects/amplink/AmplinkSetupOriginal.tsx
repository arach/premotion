import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	Sequence,
	AbsoluteFill,
	Audio,
	OffthreadVideo,
	spring,
	Easing,
} from "remotion";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";
import { loadFont as loadDisplay } from "@remotion/google-fonts/InstrumentSerif";
import { ScanEffect } from "../../components/ScanEffect";

const { fontFamily: mono } = loadMono("normal", { weights: ["400"] });
const { fontFamily: display } = loadDisplay("normal", { weights: ["400"] });

const AMBER = "200, 95, 50";
const HUD_COLOR = "200, 160, 120";
const BG = "#08080b";

const STEPS = [
	{ label: "Clone", command: "git clone arach/amplink.git" },
	{ label: "Install", command: "bun install" },
	{ label: "Init", command: "bun run init" },
	{ label: "Deploy", command: "bun run setup:cloudflare" },
	{ label: "Pair", command: "bun run amplink pair" },
];

// ─── Typing terminal step ───
const TerminalStep: React.FC<{
	command: string;
	label: string;
	stepNumber: number;
}> = ({ command, label, stepNumber }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Typing animation
	const typingDuration = 0.6 * fps;
	const typedChars = Math.floor(
		interpolate(frame, [0.2 * fps, 0.2 * fps + typingDuration], [0, command.length], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		}),
	);
	const displayText = command.slice(0, typedChars);
	const cursorVisible = Math.floor(frame / (fps * 0.35)) % 2 === 0;
	const isDoneTyping = typedChars >= command.length;

	// Fade in the whole block
	const fadeIn = interpolate(frame, [0, 0.25 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const slideUp = interpolate(frame, [0, 0.25 * fps], [20, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	// Label appears after typing finishes
	const labelOpacity = interpolate(
		frame,
		[0.2 * fps + typingDuration + 4, 0.2 * fps + typingDuration + 14],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	// Success checkmark
	const checkScale = spring({
		frame: frame - (0.2 * fps + typingDuration + 8),
		fps,
		config: { damping: 12, stiffness: 200, mass: 0.5 },
	});

	return (
		<AbsoluteFill
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				opacity: fadeIn,
				transform: `translateY(${slideUp}px)`,
			}}
		>
			{/* Step badge + label */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 14,
					marginBottom: 28,
					opacity: labelOpacity,
				}}
			>
				<div
					style={{
						width: 36,
						height: 36,
						borderRadius: 9,
						backgroundColor: `rgba(${AMBER}, 0.85)`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontFamily: mono,
						fontSize: 16,
						color: "#fff",
					}}
				>
					{stepNumber}
				</div>
				<div
					style={{
						fontFamily: mono,
						fontSize: 14,
						color: `rgba(${HUD_COLOR}, 0.7)`,
						letterSpacing: "0.1em",
						textTransform: "uppercase",
					}}
				>
					{label}
				</div>
				{/* Checkmark */}
				<div
					style={{
						opacity: checkScale,
						transform: `scale(${checkScale})`,
						color: `rgba(${AMBER}, 0.9)`,
						fontSize: 18,
					}}
				>
					✓
				</div>
			</div>

			{/* Terminal line */}
			<div
				style={{
					backgroundColor: "rgba(0, 0, 0, 0.55)",
					backdropFilter: "blur(16px)",
					WebkitBackdropFilter: "blur(16px)",
					borderRadius: 14,
					padding: "18px 32px",
					border: `1px solid rgba(${AMBER}, 0.15)`,
					minWidth: 420,
				}}
			>
				<div
					style={{
						fontFamily: mono,
						fontSize: 22,
						color: "#e8e4e0",
						letterSpacing: "0.02em",
					}}
				>
					<span style={{ color: `rgba(${AMBER}, 0.7)`, marginRight: 10 }}>$</span>
					<span>{displayText}</span>
					{(!isDoneTyping || cursorVisible) && (
						<span
							style={{
								color: `rgba(${HUD_COLOR}, ${isDoneTyping ? 0 : 0.6})`,
								marginLeft: 1,
							}}
						>
							▋
						</span>
					)}
				</div>
			</div>
		</AbsoluteFill>
	);
};

// ─── Main Composition ───
export const AmplinkSetupOriginal: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	// === TIMING ===
	const introDuration = Math.floor(2.5 * fps);
	const outroDuration = Math.floor(2.5 * fps);
	const qrDuration = Math.floor(3 * fps); // 3s QR code screen
	const contentFrames = durationInFrames - introDuration - outroDuration - qrDuration;
	const stepDuration = Math.floor(contentFrames / STEPS.length);
	const qrStart = introDuration + STEPS.length * stepDuration;

	// === INTRO ===
	const introLogoOpacity = interpolate(
		frame,
		[0.2 * fps, 0.6 * fps, introDuration - 0.4 * fps, introDuration],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const introScale = spring({
		frame: frame - 0.2 * fps,
		fps,
		config: { damping: 22, stiffness: 80, mass: 1 },
	});
	const introTitleOpacity = interpolate(
		frame,
		[0.7 * fps, 1.2 * fps, introDuration - 0.4 * fps, introDuration],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const introTitleY = interpolate(frame, [0.7 * fps, 1.2 * fps], [14, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const subtitleOpacity = interpolate(
		frame,
		[1.2 * fps, 1.7 * fps, introDuration - 0.4 * fps, introDuration],
		[0, 0.55, 0.55, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	// === OUTRO ===
	const outroStart = durationInFrames - outroDuration;
	const outroOpacity = interpolate(
		frame,
		[outroStart, outroStart + 0.5 * fps],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const outroScale = spring({
		frame: frame - outroStart,
		fps,
		config: { damping: 20, stiffness: 100 },
	});

	// Ambient glow pulse
	const glowOpacity = interpolate(
		Math.sin(frame / 30),
		[-1, 1],
		[0.03, 0.06],
	);

	// Step start offsets
	const stepStarts = STEPS.map((_, i) => introDuration + i * stepDuration);

	// Scan on step transitions
	const currentStep = Math.floor((frame - introDuration) / stepDuration);
	const stepLocalFrame = frame - introDuration - currentStep * stepDuration;
	const showScan = frame >= introDuration && frame < outroStart && stepLocalFrame < 8;
	const scanProgress = showScan
		? interpolate(stepLocalFrame, [0, 7], [0, 1], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
			})
		: 0;

	const musicVolume = 0.35;
	const sfxVolume = 0.3;

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			{/* Background Music */}
			<Audio
				src={staticFile("tracks/futuristic-synthwave.mp3")}
				volume={(f) => {
					const fadeInEnd = 1.0 * fps;
					if (f < fadeInEnd)
						return interpolate(f, [0, fadeInEnd], [0, musicVolume]);
					const fadeOutStart = durationInFrames - 1.5 * fps;
					if (f > fadeOutStart)
						return interpolate(
							f,
							[fadeOutStart, durationInFrames],
							[musicVolume, 0],
						);
					return musicVolume;
				}}
			/>

			{/* SFX */}
			<Sequence from={0} durationInFrames={30}>
				<Audio src={staticFile("sfx/tap.wav")} volume={sfxVolume * 0.7} />
			</Sequence>
			<Sequence from={outroStart + Math.floor(0.5 * fps)} durationInFrames={45}>
				<Audio
					src={staticFile("sfx/cortex_wave.wav")}
					volume={sfxVolume * 0.5}
				/>
			</Sequence>

			{/* Ambient glow */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: `radial-gradient(ellipse 40% 50% at 50% 50%, rgba(${AMBER}, ${glowOpacity}) 0%, transparent 70%)`,
					zIndex: 0,
				}}
			/>

			{/* Scan flash on step transitions */}
			{showScan && (
				<ScanEffect
					direction="horizontal"
					progress={scanProgress}
					intensity={0.4}
					color={AMBER}
					showTrail
				/>
			)}

			{/* === INTRO === */}
			<Sequence from={0} durationInFrames={introDuration}>
				<AbsoluteFill
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<div
						style={{
							opacity: introLogoOpacity,
							transform: `scale(${interpolate(introScale, [0, 1], [0.9, 1])})`,
						}}
					>
						<Img
							src={staticFile("amplink-logo.svg")}
							style={{ width: 220, height: 220 }}
						/>
					</div>
					<div
						style={{
							marginTop: 28,
							opacity: introTitleOpacity,
							transform: `translateY(${introTitleY}px)`,
						}}
					>
						<div
							style={{
								fontFamily: display,
								color: "#e8e4e0",
								fontSize: 46,
								fontStyle: "italic",
								letterSpacing: "0.06em",
							}}
						>
							Amplink
						</div>
					</div>
					<div
						style={{
							marginTop: 12,
							opacity: subtitleOpacity,
							fontFamily: mono,
							color: `rgba(${HUD_COLOR}, 0.8)`,
							fontSize: 15,
							letterSpacing: "0.14em",
							textTransform: "uppercase",
						}}
					>
						Setup in 5 Steps
					</div>
				</AbsoluteFill>
			</Sequence>

			{/* === ANIMATED STEPS === */}
			{STEPS.map((step, i) => (
				<Sequence
					key={i}
					from={stepStarts[i]}
					durationInFrames={stepDuration}
					name={`Step ${i + 1}: ${step.label}`}
				>
					<TerminalStep
						command={step.command}
						label={step.label}
						stepNumber={i + 1}
					/>
				</Sequence>
			))}

			{/* === QR CODE SCREEN === */}
			<Sequence
				from={qrStart}
				durationInFrames={qrDuration}
				name="QR Code"
			>
				<QrScreen />
			</Sequence>

			{/* === OUTRO === */}
			<Sequence from={outroStart} durationInFrames={outroDuration} name="Outro">
				<AbsoluteFill
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						opacity: outroOpacity,
					}}
				>
					<div
						style={{
							transform: `scale(${interpolate(outroScale, [0, 1], [0.85, 1])})`,
							textAlign: "center",
						}}
					>
						<Img
							src={staticFile("amplink-logo.svg")}
							style={{ width: 140, height: 140, marginBottom: 20 }}
						/>
						<div
							style={{
								fontFamily: display,
								color: "#e8e4e0",
								fontSize: 38,
								fontStyle: "italic",
								letterSpacing: "0.06em",
							}}
						>
							Ready
						</div>
						<div
							style={{
								fontFamily: mono,
								fontSize: 14,
								color: `rgba(${AMBER}, 0.7)`,
								marginTop: 14,
								letterSpacing: "0.08em",
							}}
						>
							amplink.cloud
						</div>
					</div>
				</AbsoluteFill>
			</Sequence>

			{/* Vignette */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.5) 100%)",
					pointerEvents: "none",
					zIndex: 5,
				}}
			/>
		</AbsoluteFill>
	);
};

// ─── QR Code Screen ───
const QrScreen: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const fadeIn = interpolate(frame, [0, 0.3 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	const captionOpacity = interpolate(frame, [0.4 * fps, 0.7 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const captionY = interpolate(frame, [0.4 * fps, 0.7 * fps], [12, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	return (
		<AbsoluteFill
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{/* Video clip showing QR code */}
			<div
				style={{
					width: 720,
					height: 450,
					borderRadius: 16,
					overflow: "hidden",
					border: `1px solid rgba(${AMBER}, 0.15)`,
					opacity: fadeIn,
					boxShadow: `0 0 40px rgba(${AMBER}, 0.06)`,
				}}
			>
				<OffthreadVideo
					src={staticFile("demos/amplink-setup-b.mp4")}
					startFrom={Math.floor(24 * fps)}
					style={{
						width: "100%",
						height: "100%",
						objectFit: "cover",
					}}
					volume={0}
				/>
			</div>

			{/* Caption */}
			<div
				style={{
					marginTop: 28,
					opacity: captionOpacity,
					transform: `translateY(${captionY}px)`,
					textAlign: "center",
				}}
			>
				<div
					style={{
						fontFamily: mono,
						fontSize: 18,
						color: "#e8e4e0",
						letterSpacing: "0.04em",
					}}
				>
					Scan to Pair
				</div>
				<div
					style={{
						fontFamily: mono,
						fontSize: 13,
						color: `rgba(${HUD_COLOR}, 0.6)`,
						letterSpacing: "0.06em",
						marginTop: 6,
					}}
				>
					Open Amplink on your phone
				</div>
			</div>
		</AbsoluteFill>
	);
};
