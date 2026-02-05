import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	Audio,
	Easing,
	random,
} from "remotion";
import { MidjourneyComputerFrame } from "./MidjourneyComputerFrame";

interface MidjourneyComputerContentProps {
	musicTrack?: string;
	musicVolume?: number;
}

// Clean animated content with scan and beat-synced glitch
export const MidjourneyComputerContent: React.FC<MidjourneyComputerContentProps> = ({
	musicTrack = "tracks/futuristic-synthwave.mp3",
	musicVolume = 0.35,
}) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	// === TIMING ===
	const logoAppear = 0.5 * fps;
	const logoSettled = 1.2 * fps;

	// Logo fade in
	const logoOpacity = interpolate(
		frame,
		[logoAppear, logoSettled],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
	);

	// Scan line - sweeps top to bottom over ~2 seconds
	const scanCycle = 2 * fps;
	const scanProgress = (frame % scanCycle) / scanCycle;
	const scanY = scanProgress * 105 - 2.5;
	const scanIntensity = Math.sin(scanProgress * Math.PI); // brightest in middle

	// === GLITCH ON BEAT DROPS ===
	// Glitch every ~2.5 seconds, lasting ~6 frames
	const beatInterval = Math.floor(2.5 * fps);
	const glitchDuration = 6;
	const timeSinceBeat = frame % beatInterval;
	const isGlitching = timeSinceBeat < glitchDuration && frame > logoSettled;

	// Glitch effects
	const glitchSeed = Math.floor(frame / 2);
	const rgbSplit = isGlitching ? (random(`rgb-${glitchSeed}`) * 6 + 2) : 0;
	const hShift = isGlitching ? (random(`h-${glitchSeed}`) - 0.5) * 8 : 0;
	const glitchFlicker = isGlitching ? (random(`flick-${glitchSeed}`) > 0.3 ? 1 : 0.7) : 1;

	// Subtle noise
	const noiseOpacity = 0.03;

	return (
		<MidjourneyComputerFrame powerOnEffect={false} showScanlines={false}>
			{/* Audio */}
			<Audio
				src={staticFile(musicTrack)}
				volume={(f) => {
					const fadeIn = interpolate(f, [0, fps], [0, musicVolume], { extrapolateRight: "clamp" });
					const fadeOut = interpolate(f, [durationInFrames - fps, durationInFrames], [musicVolume, 0], { extrapolateLeft: "clamp" });
					return Math.min(fadeIn, fadeOut);
				}}
			/>

			<div
				style={{
					width: "100%",
					height: "100%",
					backgroundColor: "#08080a",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					position: "relative",
					overflow: "hidden",
					opacity: glitchFlicker,
				}}
			>
				{/* Subtle noise texture */}
				<div
					style={{
						position: "absolute",
						inset: 0,
						opacity: noiseOpacity,
						backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
						pointerEvents: "none",
					}}
				/>

				{/* Scan line with glow */}
				<div
					style={{
						position: "absolute",
						top: `${scanY}%`,
						left: 0,
						right: 0,
						height: 2,
						backgroundColor: `rgba(220, 220, 230, ${0.12 * scanIntensity})`,
						boxShadow: `0 0 20px 4px rgba(200, 200, 220, ${0.08 * scanIntensity})`,
						pointerEvents: "none",
					}}
				/>

				{/* Logo with glitch */}
				<div
					style={{
						opacity: logoOpacity,
						transform: `translateX(${hShift}px)`,
						position: "relative",
					}}
				>
					{/* RGB split - red/warm channel */}
					{rgbSplit > 0 && (
						<Img
							src={staticFile("talkie-icon-1024.png")}
							style={{
								width: 120,
								height: 120,
								borderRadius: 24,
								position: "absolute",
								top: 0,
								left: -rgbSplit,
								opacity: 0.4,
								filter: "hue-rotate(-20deg) saturate(1.5)",
								mixBlendMode: "screen",
							}}
						/>
					)}

					{/* Main logo */}
					<Img
						src={staticFile("talkie-icon-1024.png")}
						style={{
							width: 120,
							height: 120,
							borderRadius: 24,
						}}
					/>

					{/* RGB split - cyan/cool channel */}
					{rgbSplit > 0 && (
						<Img
							src={staticFile("talkie-icon-1024.png")}
							style={{
								width: 120,
								height: 120,
								borderRadius: 24,
								position: "absolute",
								top: 0,
								left: rgbSplit,
								opacity: 0.4,
								filter: "hue-rotate(160deg) saturate(1.5)",
								mixBlendMode: "screen",
							}}
						/>
					)}
				</div>

				{/* Glitch horizontal bars */}
				{isGlitching && (
					<>
						{[0, 1, 2].map((i) => {
							const barY = random(`bar-y-${glitchSeed}-${i}`) * 100;
							const barH = random(`bar-h-${glitchSeed}-${i}`) * 3 + 1;
							const barShift = (random(`bar-s-${glitchSeed}-${i}`) - 0.5) * 20;
							return (
								<div
									key={i}
									style={{
										position: "absolute",
										top: `${barY}%`,
										left: 0,
										right: 0,
										height: barH,
										backgroundColor: "rgba(180, 180, 190, 0.15)",
										transform: `translateX(${barShift}px)`,
										pointerEvents: "none",
									}}
								/>
							);
						})}
					</>
				)}
			</div>
		</MidjourneyComputerFrame>
	);
};
