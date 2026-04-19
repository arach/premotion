import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	Sequence,
	AbsoluteFill,
	OffthreadVideo,
	spring,
	Easing,
} from "remotion";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";

const { fontFamily: mono } = loadMono("normal", { weights: ["400"] });

const AMBER = "200, 95, 50";
const HUD_COLOR = "200, 160, 120";
const BG = "#08080b";

// ─── Clip definitions (seconds into source video) ───
const CLIPS = [
	{
		src: "demos/amplink-setup-a.mp4",
		startFrom: 8,     // bun install completing
		label: "Install",
		command: "bun install",
	},
	{
		src: "demos/amplink-setup-full.mp4",
		startFrom: 85,    // provisioning + D1 migration + deploy
		label: "Deploy",
		command: "bun run setup:cloudflare",
	},
	{
		src: "demos/amplink-setup-b.mp4",
		startFrom: 22,    // desktop:up + QR code
		label: "Connect",
		command: "bun run desktop:up",
	},
];

// ─── Step Label Overlay ───
const StepOverlay: React.FC<{
	label: string;
	command: string;
	stepNumber: number;
	frame: number;
	fps: number;
	clipDuration: number;
}> = ({ label, command, stepNumber, frame, fps, clipDuration }) => {
	// Fade in at start, fade out at end
	const fadeIn = interpolate(frame, [0, 0.4 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const fadeOut = interpolate(
		frame,
		[clipDuration - 0.4 * fps, clipDuration],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const opacity = Math.min(fadeIn, fadeOut);

	const slideIn = interpolate(frame, [0, 0.4 * fps], [20, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	return (
		<div
			style={{
				position: "absolute",
				bottom: 60,
				left: 60,
				right: 60,
				opacity,
				transform: `translateY(${slideIn}px)`,
				display: "flex",
				alignItems: "center",
				gap: 20,
				zIndex: 10,
			}}
		>
			{/* Step badge */}
			<div
				style={{
					width: 40,
					height: 40,
					borderRadius: 10,
					backgroundColor: `rgba(${AMBER}, 0.85)`,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: mono,
					fontSize: 18,
					fontWeight: 400,
					color: "#fff",
					flexShrink: 0,
				}}
			>
				{stepNumber}
			</div>

			{/* Label + command */}
			<div
				style={{
					backgroundColor: "rgba(0, 0, 0, 0.7)",
					backdropFilter: "blur(12px)",
					WebkitBackdropFilter: "blur(12px)",
					borderRadius: 12,
					padding: "12px 24px",
					border: `1px solid rgba(${AMBER}, 0.2)`,
				}}
			>
				<div
					style={{
						fontFamily: mono,
						fontSize: 13,
						color: `rgba(${HUD_COLOR}, 0.7)`,
						letterSpacing: "0.1em",
						textTransform: "uppercase",
						marginBottom: 4,
					}}
				>
					{label}
				</div>
				<div
					style={{
						fontFamily: mono,
						fontSize: 20,
						color: "#e8e4e0",
						letterSpacing: "0.02em",
					}}
				>
					<span style={{ color: `rgba(${AMBER}, 0.7)`, marginRight: 8 }}>$</span>
					{command}
				</div>
			</div>
		</div>
	);
};

// ─── Main Composition ───
export const AmplinkSetup: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	// === TIMING ===
	const introDuration = 2.5 * fps;  // 2.5s intro
	const outroDuration = 2 * fps;    // 2s outro
	const contentFrames = durationInFrames - introDuration - outroDuration;
	const clipDuration = Math.floor(contentFrames / CLIPS.length);

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

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			{/* === INTRO === */}
			<Sequence from={0} durationInFrames={Math.floor(introDuration)}>
				<AbsoluteFill
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{/* Ambient glow */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							background: `radial-gradient(ellipse 50% 40% at 50% 45%, rgba(${AMBER}, 0.06) 0%, transparent 70%)`,
						}}
					/>
					<div
						style={{
							opacity: introLogoOpacity,
							transform: `scale(${interpolate(introScale, [0, 1], [0.9, 1])})`,
						}}
					>
						<Img
							src={staticFile("amplink-logo.svg")}
							style={{ width: 260, height: 260 }}
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
								fontFamily: mono,
								color: "#e8e4e0",
								fontSize: 20,
								letterSpacing: "0.14em",
								textTransform: "uppercase",
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
						Setup in 3 Steps
					</div>
				</AbsoluteFill>
			</Sequence>

			{/* === VIDEO CLIPS === */}
			{CLIPS.map((clip, i) => {
				const clipStart = Math.floor(introDuration) + i * clipDuration;
				const startFromFrames = Math.floor(clip.startFrom * fps);

				return (
					<Sequence
						key={i}
						from={clipStart}
						durationInFrames={clipDuration}
						name={`Step ${i + 1}: ${clip.label}`}
					>
						{/* Video */}
						<OffthreadVideo
							src={staticFile(clip.src)}
							startFrom={startFromFrames}
							style={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
							}}
							volume={0}
						/>

						{/* Crossfade in */}
						<AbsoluteFill
							style={{
								backgroundColor: BG,
								opacity: interpolate(
									useCurrentFrame(),
									[0, 0.3 * fps],
									[1, 0],
									{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
								),
							}}
						/>

						{/* Step label overlay */}
						<StepLabel
							label={clip.label}
							command={clip.command}
							stepNumber={i + 1}
							clipDuration={clipDuration}
						/>
					</Sequence>
				);
			})}

			{/* === OUTRO === */}
			<Sequence
				from={outroStart}
				durationInFrames={Math.floor(outroDuration)}
				name="Outro"
			>
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
								fontFamily: mono,
								color: "#e8e4e0",
								fontSize: 20,
								letterSpacing: "0.14em",
								textTransform: "uppercase",
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

			{/* Vignette over everything */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.45) 100%)",
					pointerEvents: "none",
					zIndex: 5,
				}}
			/>
		</AbsoluteFill>
	);
};

// Wrapper so useCurrentFrame works inside Sequence
const StepLabel: React.FC<{
	label: string;
	command: string;
	stepNumber: number;
	clipDuration: number;
}> = (props) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	return (
		<StepOverlay
			{...props}
			frame={frame}
			fps={fps}
		/>
	);
};
