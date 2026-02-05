import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	Easing,
	Audio,
	Sequence,
	AbsoluteFill,
} from "remotion";

// === TACTICAL OVERLAY LAYER ===
// Extracted as its own component so it appears as a separate track in the timeline
const TacticalOverlay: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, height, durationInFrames } = useVideoConfig();

	const iconSize = 260;
	const guideMargin = 70;

	// === TIMING (tight, intentional) ===
	// Step 1: Border/guides snap in fast (300ms) - TAP sound here
	const guidesAppear = 0;
	const guidesSettled = 0.3 * fps; // 300ms
	// Grid fades in with guides
	const gridAppear = 0;
	const gridSettled = 0.3 * fps;
	// Step 2: Typing begins immediately after guides lock
	const statusTypingStart = 0.35 * fps;
	const statusTypingEnd = 1.85 * fps; // ~1.5s of typing
	const typingBuffer = 1.0 * fps; // 1s buffer after typing
	// Step 3: Icon + TALKIE wordmark appear together after typing settles
	const iconAppear = statusTypingEnd + 0.3 * fps;
	const iconSettled = iconAppear + 0.8 * fps;
	const talkieAppear = iconAppear;
	const talkieSettled = iconSettled;
	// Corner HUD text appears with icon
	const textAppear = iconAppear;
	const textSettled = iconSettled;
	// Step 4: Coming Soon appears - cortex sound here
	const comingSoonAppear = iconSettled + 0.3 * fps;
	const comingSoonSettled = comingSoonAppear + 0.5 * fps;
	// Step 5: Q1 2026 after spinner chills
	const dateAppear = comingSoonSettled + 2.0 * fps;
	const dateSettled = dateAppear + 0.5 * fps;

	// Fade out at the end (longer fade for 10s video)
	const fadeOut = interpolate(
		frame,
		[durationInFrames - 1.0 * fps, durationInFrames],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// Grid - fades in first, very subtle
	const gridOpacity = interpolate(
		frame,
		[gridAppear, gridSettled],
		[0, 0.03],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	// Guide lines
	const guideOpacity = interpolate(
		frame,
		[guidesAppear, guidesSettled],
		[0, 0.5],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	// Scanline - appears with grid
	const scanlineOpacity = interpolate(
		frame,
		[gridAppear, gridSettled],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;
	const scanlineY = (frame * 2.5) % height;

	// Icon
	const iconOpacity = interpolate(frame, [iconAppear, iconSettled], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	}) * fadeOut;

	const iconScale = interpolate(frame, [iconAppear, iconSettled], [0.92, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	// Corner HUD text
	const textOpacity = interpolate(
		frame,
		[textAppear, textSettled],
		[0, 0.75],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	// Status typing
	const statusText = "INITIALIZING // VOICE ENGINE v4.0";
	const typedChars = Math.floor(
		interpolate(frame, [statusTypingStart, statusTypingEnd], [0, statusText.length], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		})
	);
	const statusDisplay = statusText.slice(0, typedChars);
	const cursorVisible = Math.floor(frame / (fps * 0.4)) % 2 === 0;
	const statusOpacity = interpolate(
		frame,
		[statusTypingStart, statusTypingStart + 10],
		[0, 0.65],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	// TALKIE text
	const talkieOpacity = interpolate(frame, [talkieAppear, talkieSettled], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	}) * fadeOut;

	// Coming Soon text
	const comingSoonOpacity = interpolate(
		frame,
		[comingSoonAppear, comingSoonSettled],
		[0, 0.55],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	// Braille spinner (cycles through braille patterns) - fades out when date appears
	const brailleFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	const spinnerIndex = Math.floor(frame / 3) % brailleFrames.length;
	const spinnerChar = brailleFrames[spinnerIndex];
	const spinnerOpacity = interpolate(
		frame,
		[comingSoonSettled, comingSoonSettled + 5, dateAppear - 10, dateAppear],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	// Q1 2026 date - replaces spinner in same position
	const dateOpacity = interpolate(
		frame,
		[dateAppear, dateSettled],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	// Recording dot blink
	const recDotVisible = Math.floor(frame / (fps * 0.5)) % 2 === 0;

	const guideColor = "rgba(160, 170, 190, 0.45)";
	const textColor = "rgba(175, 185, 200, 0.8)";

	return (
		<AbsoluteFill
			style={{
				fontFamily: "SF Mono, Monaco, Consolas, monospace",
			}}
		>
			{/* Grid */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: gridOpacity,
					backgroundImage: `
						linear-gradient(rgba(160, 170, 190, 0.35) 1px, transparent 1px),
						linear-gradient(90deg, rgba(160, 170, 190, 0.35) 1px, transparent 1px)
					`,
					backgroundSize: "50px 50px",
				}}
			/>

			{/* Scanline */}
			<div
				style={{
					position: "absolute",
					top: scanlineY,
					left: 0,
					right: 0,
					height: 1,
					backgroundColor: "rgba(160, 170, 190, 0.025)",
					opacity: scanlineOpacity,
					pointerEvents: "none",
				}}
			/>

			{/* Guide lines */}
			<div
				style={{
					position: "absolute",
					top: guideMargin,
					left: guideMargin,
					right: guideMargin,
					height: 1,
					opacity: guideOpacity,
					backgroundColor: guideColor,
				}}
			/>
			<div
				style={{
					position: "absolute",
					bottom: guideMargin,
					left: guideMargin,
					right: guideMargin,
					height: 1,
					opacity: guideOpacity,
					backgroundColor: guideColor,
				}}
			/>
			<div
				style={{
					position: "absolute",
					top: guideMargin,
					bottom: guideMargin,
					left: guideMargin,
					width: 1,
					opacity: guideOpacity,
					backgroundColor: guideColor,
				}}
			/>
			<div
				style={{
					position: "absolute",
					top: guideMargin,
					bottom: guideMargin,
					right: guideMargin,
					width: 1,
					opacity: guideOpacity,
					backgroundColor: guideColor,
				}}
			/>

			{/* Top-left: System name */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 12,
					left: guideMargin + 14,
					opacity: textOpacity,
					fontSize: 12,
					letterSpacing: "0.05em",
					lineHeight: 1.8,
				}}
			>
				<div style={{ fontWeight: 600, color: "#d8d8e0" }}>TALKIE</div>
				<div style={{ color: textColor }}>Voice Engine v4.0</div>
			</div>

			{/* Top-right: Status */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 12,
					right: guideMargin + 14,
					opacity: textOpacity,
					color: textColor,
					fontSize: 12,
					letterSpacing: "0.05em",
					lineHeight: 1.8,
					textAlign: "right",
				}}
			>
				<div>48kHz / 24-bit</div>
				<div>Neural Engine</div>
			</div>

			{/* Bottom-left: Version */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 12,
					left: guideMargin + 14,
					opacity: textOpacity,
					color: textColor,
					fontSize: 12,
					letterSpacing: "0.05em",
				}}
			>
				<div>v4.0.0-beta</div>
			</div>

			{/* Bottom-right: Status indicator */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 12,
					right: guideMargin + 14,
					opacity: textOpacity,
					color: textColor,
					fontSize: 12,
					letterSpacing: "0.05em",
					display: "flex",
					alignItems: "center",
					gap: 6,
				}}
			>
				<span style={{ color: recDotVisible ? "#6a8" : "#555" }}>●</span>
				<span>STANDBY</span>
			</div>

			{/* Bottom center: Status typing */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 12,
					left: 0,
					right: 0,
					textAlign: "center",
					opacity: statusOpacity,
					color: textColor,
					fontSize: 11,
					letterSpacing: "0.04em",
				}}
			>
				<span>{statusDisplay}</span>
				{cursorVisible && typedChars < statusText.length && (
					<span style={{ opacity: 0.5 }}>▋</span>
				)}
			</div>

			{/* Center content: Icon + Text */}
			<AbsoluteFill
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{/* Icon */}
				<div
					style={{
						opacity: iconOpacity,
						transform: `scale(${iconScale})`,
					}}
				>
					<Img
						src={staticFile("talkie-icon-1024.png")}
						style={{
							width: iconSize,
							height: iconSize,
							borderRadius: iconSize * 0.22,
						}}
					/>
				</div>

				{/* TALKIE */}
				<div
					style={{
						marginTop: 28,
						opacity: talkieOpacity,
						textAlign: "center",
					}}
				>
					<div
						style={{
							fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
							color: "#dddde8",
							fontSize: 34,
							fontWeight: 400,
							letterSpacing: "0.25em",
							paddingLeft: "0.25em",
						}}
					>
						TALKIE
					</div>
				</div>

				{/* Coming Soon */}
				<div
					style={{
						marginTop: 16,
						opacity: comingSoonOpacity,
						textAlign: "center",
					}}
				>
					<div
						style={{
							fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
							color: "#c8c8d0",
							fontSize: 15,
							fontWeight: 500,
							letterSpacing: "0.14em",
							textTransform: "uppercase",
						}}
					>
						Coming Soon
					</div>
				</div>

				{/* Spinner / Q1 2026 - same position, spinner fades to date */}
				<div
					style={{
						marginTop: 12,
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: 24,
						position: "relative",
					}}
				>
					{/* Braille spinner */}
					<div
						style={{
							position: "absolute",
							opacity: spinnerOpacity,
							fontFamily: "SF Mono, Monaco, Consolas, monospace",
							color: "#a0a0a8",
							fontSize: 16,
						}}
					>
						{spinnerChar}
					</div>

					{/* Q1 2026 - replaces spinner */}
					<div
						style={{
							position: "absolute",
							opacity: dateOpacity,
							fontFamily: "SF Mono, Monaco, Consolas, monospace",
							color: "#b8b8c0",
							fontSize: 14,
							fontWeight: 500,
							letterSpacing: "0.12em",
							whiteSpace: "nowrap",
						}}
					>
						Q1 2026
					</div>
				</div>
			</AbsoluteFill>

			{/* Vignette */}
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

// === MAIN COMPOSITION ===
// Uses Sequence to organize layers - each appears as a separate track in the timeline
export const TalkieComingSoon: React.FC = () => {
	const { fps, durationInFrames } = useVideoConfig();

	// Music starts immediately, visuals fade in after 2 seconds
	const visualsDelay = Math.floor(2 * fps);
	const visualsDuration = durationInFrames - visualsDelay;

	// Sound effect timing (relative to composition start)
	const sfxVolume = 0.35;
	const tapSfxFrame = visualsDelay; // When guides snap in
	const typingSfxFrame = visualsDelay + Math.floor(0.35 * fps); // When typing starts
	const typingSfxDuration = Math.floor(1.5 * fps); // How long typing lasts
	// Coming Soon timing: after typing (1.85s) + icon appear (0.3s) + icon settle (0.8s) + delay (0.3s)
	const comingSoonSfxFrame = visualsDelay + Math.floor((1.85 + 0.3 + 0.8 + 0.3) * fps);

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			{/* Layer 1: Background Music - starts immediately, builds anticipation */}
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile("tracks/futuristic-synthwave.mp3")}
					volume={(f) => {
						// Slow fade in over first 2s, fade out over last 1s
						const fadeInEnd = 2.0 * fps;
						const fadeOutStart = durationInFrames - 1.0 * fps;
						if (f < fadeInEnd) return interpolate(f, [0, fadeInEnd], [0, 0.5]);
						if (f > fadeOutStart) return interpolate(f, [fadeOutStart, durationInFrames], [0.5, 0]);
						return 0.5;
					}}
				/>
			</Sequence>

			{/* Layer 2: Sound Effects - minimal, tasteful */}
			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{/* Tap - when guides snap in */}
				<Sequence from={tapSfxFrame} durationInFrames={30}>
					<Audio src={staticFile("sfx/tap.wav")} volume={sfxVolume * 0.7} />
				</Sequence>

				{/* Status text typing - keyboard sounds (looped) */}
				<Sequence from={typingSfxFrame} durationInFrames={typingSfxDuration}>
					<Audio src={staticFile("sfx/creamy_typing.wav")} volume={sfxVolume * 0.6} loop />
				</Sequence>

				{/* Cortex wave - when Coming Soon appears */}
				<Sequence from={comingSoonSfxFrame} durationInFrames={45}>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={sfxVolume * 0.5} />
				</Sequence>
			</Sequence>

			{/* Layer 3: Tactical Intro Overlay - delayed start for dramatic build-up */}
			<Sequence name="Tactical Overlay" from={visualsDelay} durationInFrames={visualsDuration}>
				<TacticalOverlay />
			</Sequence>

			{/*
			 * Layer 4+: Add your UI snippets here as additional Sequences
			 * Example:
			 * <Sequence name="UI Demo" from={Math.floor(5 * fps)} durationInFrames={Math.floor(3 * fps)}>
			 *   <YourUISnippetComponent />
			 * </Sequence>
			 */}
		</AbsoluteFill>
	);
};
