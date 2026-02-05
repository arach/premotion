import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	random,
	spring,
	Easing,
} from "remotion";

// Talkie app glitch intro - silver/white aesthetic with digital distortion
export const TalkieGlitchIntro: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// === PHASE TIMING ===
	// Phase 1: 0-0.4s - Icon materializes from noise
	// Phase 2: 0.4-1.2s - Chromatic aberration + position jitter builds
	// Phase 3: 1.2-2.0s - Peak glitch intensity
	// Phase 4: 2.0-2.5s - Resolves to clean
	// Phase 5: 2.5-3.0s - Text appears

	const phase1End = 0.4 * fps; // 12
	const phase2End = 1.2 * fps; // 36
	const phase3End = 2.0 * fps; // 60
	const phase4End = 2.5 * fps; // 75
	// phase5 runs to end (90)

	const iconSize = 320;
	const glitchFrame = Math.floor(frame / 2);
	const fastGlitchFrame = Math.floor(frame / 1);

	// === GLOBAL ANIMATIONS ===

	// Icon appearance - materializes from 0 opacity
	const iconOpacity = interpolate(frame, [0, phase1End], [0, 1], {
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});


	// === GLITCH EFFECTS ===

	const glitchActive = frame > phase1End && frame < phase4End;

	// Chromatic aberration (RGB split)
	const rgbSplit = interpolate(
		frame,
		[phase1End, phase2End, phase3End, phase4End],
		[0, 4, 8, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// Random big glitch jumps
	const bigGlitchChance = random(`big-${fastGlitchFrame}`);
	const bigGlitchActive =
		frame > phase2End &&
		frame < phase3End + 5 &&
		bigGlitchChance > 0.75;
	const bigOffsetX = bigGlitchActive
		? (random(`big-ox-${fastGlitchFrame}`) - 0.5) * 60
		: 0;
	const bigOffsetY = bigGlitchActive
		? (random(`big-oy-${fastGlitchFrame}`) - 0.5) * 30
		: 0;

	// Flicker
	const flickerSeed = random(`flk-${Math.floor(frame / 2)}`);
	const flicker =
		frame > phase1End && frame < phase4End && flickerSeed > 0.85
			? 0.6
			: 1;

	// Scanline opacity
	const scanlineOpacity = interpolate(
		frame,
		[0, phase1End, phase3End, phase4End + 10],
		[0.15, 0.08, 0.12, 0.02],
		{ extrapolateRight: "clamp" }
	);

	// === TEXT ===

	// VOICE + AI - the reveal moment, comes in after glitch resolves
	const voiceAiOpacity = interpolate(frame, [phase4End, phase4End + 10], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const voiceAiY = interpolate(frame, [phase4End, phase4End + 15], [12, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	// TALKIE - appears late, stable, anchored at bottom
	const talkieOpacity = interpolate(frame, [phase4End + 5, phase4End + 15], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// Text glitch on VOICE + AI appearance
	const textGlitch =
		frame > phase4End && frame < phase4End + 8
			? (random(`txt-${fastGlitchFrame}`) - 0.5) * 6
			: 0;

	// === BACKGROUND ===
	// Subtle gradient pulse
	const bgPulse = Math.sin(frame / 15) * 0.02 + 0.05;

	// Digital noise intensity
	const noiseOpacity = interpolate(
		frame,
		[0, phase1End, phase3End, phase4End + 15],
		[0.2, 0.08, 0.12, 0.03],
		{ extrapolateRight: "clamp" }
	);

	return (
		<div
			style={{
				flex: 1,
				backgroundColor: "#08080c",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				position: "relative",
				overflow: "hidden",
			}}
		>
			{/* Radial gradient background */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: `radial-gradient(ellipse at 50% 45%, rgba(180, 180, 200, ${bgPulse}) 0%, transparent 60%)`,
				}}
			/>

			{/* Subtle grid overlay */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: 0.03,
					backgroundImage: `
						linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
						linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
					`,
					backgroundSize: "80px 80px",
				}}
			/>

			{/* Digital noise overlay */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: noiseOpacity,
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
					mixBlendMode: "overlay",
				}}
			/>

			{/* Horizontal scanlines */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: scanlineOpacity,
					background: `repeating-linear-gradient(
						0deg,
						transparent,
						transparent 3px,
						rgba(0, 0, 0, 0.4) 3px,
						rgba(0, 0, 0, 0.4) 4px
					)`,
					pointerEvents: "none",
				}}
			/>

			{/* Glitch horizontal lines */}
			{glitchActive &&
				[0, 1, 2].map((i) => {
					const lineY = random(`gline-y-${i}-${glitchFrame}`) * 100;
					const lineWidth = 30 + random(`gline-w-${i}-${glitchFrame}`) * 70;
					const lineLeft = random(`gline-l-${i}-${glitchFrame}`) * (100 - lineWidth);
					const lineOpacity = interpolate(
						frame,
						[phase1End, phase2End, phase3End, phase4End],
						[0, 0.6, 1, 0],
						{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
					);
					return (
						<div
							key={i}
							style={{
								position: "absolute",
								top: `${lineY}%`,
								left: `${lineLeft}%`,
								width: `${lineWidth}%`,
								height: random(`gline-h-${i}-${glitchFrame}`) > 0.5 ? 2 : 1,
								backgroundColor:
									random(`gline-c-${i}-${glitchFrame}`) > 0.5
										? "rgba(200, 200, 220, 0.5)"
										: "rgba(120, 120, 140, 0.4)",
								opacity: lineOpacity,
							}}
						/>
					);
				})}

			{/* Center: Icon + VOICE + AI */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
				}}
			>
				{/* Icon - gets the glitch treatment */}
				<div
					style={{
						opacity: iconOpacity * flicker,
						transform: `translate(${bigOffsetX}px, ${bigOffsetY}px)`,
					}}
				>
					<div
						style={{
							position: "relative",
							width: iconSize,
							height: iconSize,
						}}
					>
						{/* Red/warm channel - offset left */}
						<Img
							src={staticFile("talkie-icon-1024.png")}
							style={{
								width: iconSize,
								height: iconSize,
								position: "absolute",
								top: 0,
								left: -rgbSplit,
								opacity: rgbSplit > 0 ? 0.4 : 0,
								filter: "brightness(1.5) sepia(0.3) hue-rotate(-15deg)",
								mixBlendMode: "screen",
								borderRadius: iconSize * 0.22,
							}}
						/>

						{/* Main icon */}
						<Img
							src={staticFile("talkie-icon-1024.png")}
							style={{
								width: iconSize,
								height: iconSize,
								borderRadius: iconSize * 0.22,
								position: "relative",
							}}
						/>

						{/* Cyan/cool channel - offset right */}
						<Img
							src={staticFile("talkie-icon-1024.png")}
							style={{
								width: iconSize,
								height: iconSize,
								position: "absolute",
								top: 0,
								left: rgbSplit,
								opacity: rgbSplit > 0 ? 0.35 : 0,
								filter: "brightness(1.5) sepia(0.3) hue-rotate(170deg)",
								mixBlendMode: "screen",
								borderRadius: iconSize * 0.22,
							}}
						/>

						{/* Glowing edge highlight */}
						<div
							style={{
								position: "absolute",
								inset: -2,
								borderRadius: iconSize * 0.22 + 2,
								border: "1px solid rgba(200, 200, 220, 0.15)",
								boxShadow: `
									0 0 ${20 + Math.sin(frame / 10) * 10}px rgba(180, 180, 200, 0.1),
									inset 0 0 30px rgba(0, 0, 0, 0.3)
								`,
								pointerEvents: "none",
							}}
						/>
					</div>
				</div>

				{/* TALKIE - stable, appears after glitch resolves */}
				<div
					style={{
						marginTop: 36,
						opacity: talkieOpacity,
						textAlign: "center",
					}}
				>
					<div
						style={{
							fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
							color: "#dddde8",
							fontSize: 38,
							fontWeight: 400,
							letterSpacing: "0.25em",
							paddingLeft: "0.25em",
						}}
					>
						TALKIE
					</div>
				</div>
			</div>

			{/* Corner frame lines (subtle) */}
			{[
				{ top: 40, left: 40 },
				{ top: 40, right: 40 },
				{ bottom: 40, left: 40 },
				{ bottom: 40, right: 40 },
			].map((pos, i) => {
				const cornerOpacity = interpolate(
					frame,
					[phase2End, phase3End],
					[0, 0.15],
					{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
				);
				return (
					<div
						key={i}
						style={{
							position: "absolute",
							...pos,
							width: 30,
							height: 30,
							opacity: cornerOpacity,
							borderColor: "rgba(160, 160, 180, 0.4)",
							borderStyle: "solid",
							borderWidth: 0,
							...(i === 0
								? { borderTopWidth: 1, borderLeftWidth: 1 }
								: i === 1
									? { borderTopWidth: 1, borderRightWidth: 1 }
									: i === 2
										? { borderBottomWidth: 1, borderLeftWidth: 1 }
										: { borderBottomWidth: 1, borderRightWidth: 1 }),
						}}
					/>
				);
			})}

			{/* Vignette */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)",
					pointerEvents: "none",
				}}
			/>
		</div>
	);
};
