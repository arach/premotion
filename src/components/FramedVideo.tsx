import {
	AbsoluteFill,
	OffthreadVideo,
	Sequence,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	Audio,
} from "remotion";

// Take 1: Inter — clean, modern, Swiss-style
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
// Take 2: Lora (statement) + DM Sans (credits) — warm editorial
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
// Take 3: EB Garamond — classical, literary
import { loadFont as loadGaramond } from "@remotion/google-fonts/EBGaramond";
// Take 4: Sora (title/credits) + Crimson Text (statement) — contrast pairing
import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadCrimson } from "@remotion/google-fonts/CrimsonText";

const inter = loadInter("normal", { weights: ["300", "400", "500"], subsets: ["latin"] });
const lora = loadLora("normal", { weights: ["400", "500"], subsets: ["latin"] });
const loraItalic = loadLora("italic", { weights: ["400"], subsets: ["latin"] });
const dmSans = loadDMSans("normal", { weights: ["300", "400"], subsets: ["latin"] });
const garamond = loadGaramond("normal", { weights: ["400", "500"], subsets: ["latin"] });
const garamondItalic = loadGaramond("italic", { weights: ["400"], subsets: ["latin"] });
const sora = loadSora("normal", { weights: ["300", "400"], subsets: ["latin"] });
const crimson = loadCrimson("normal", { weights: ["400"], subsets: ["latin"] });

type FontTake = {
	titleFont: string;
	titleWeight: number;
	titleSpacing: string;
	titleSize: number;
	titleTransform: string;
	dedicationFont: string;
	dedicationWeight: number;
	dedicationSize: number;
	dedicationStyle: string;
	statementFont: string;
	statementWeight: number;
	statementSize: number;
	statementStyle: string;
	creditTitleFont: string;
	creditTitleWeight: number;
	creditTitleSize: number;
	creditTitleSpacing: string;
	creditTitleTransform: string;
	creditBodyFont: string;
	creditBodyWeight: number;
	labelFont: string;
};

const TAKES: Record<string, FontTake> = {
	// Take 1: Inter — all one family, clean geometric minimalism
	inter: {
		titleFont: inter.fontFamily,
		titleWeight: 300,
		titleSpacing: "0.3em",
		titleSize: 15,
		titleTransform: "uppercase",
		dedicationFont: inter.fontFamily,
		dedicationWeight: 300,
		dedicationSize: 12,
		dedicationStyle: "normal",
		statementFont: inter.fontFamily,
		statementWeight: 400,
		statementSize: 19,
		statementStyle: "normal",
		creditTitleFont: inter.fontFamily,
		creditTitleWeight: 500,
		creditTitleSize: 22,
		creditTitleSpacing: "0.25em",
		creditTitleTransform: "uppercase",
		creditBodyFont: inter.fontFamily,
		creditBodyWeight: 300,
		labelFont: inter.fontFamily,
	},
	// Take 2: Lora + DM Sans — warm serif statement, clean sans credits
	lora: {
		titleFont: dmSans.fontFamily,
		titleWeight: 300,
		titleSpacing: "0.25em",
		titleSize: 14,
		titleTransform: "uppercase",
		dedicationFont: loraItalic.fontFamily,
		dedicationWeight: 400,
		dedicationSize: 13,
		dedicationStyle: "italic",
		statementFont: lora.fontFamily,
		statementWeight: 400,
		statementSize: 21,
		statementStyle: "normal",
		creditTitleFont: lora.fontFamily,
		creditTitleWeight: 500,
		creditTitleSize: 26,
		creditTitleSpacing: "0.18em",
		creditTitleTransform: "none",
		creditBodyFont: dmSans.fontFamily,
		creditBodyWeight: 300,
		labelFont: dmSans.fontFamily,
	},
	// Take 3: EB Garamond — full literary, old-world elegance
	garamond: {
		titleFont: garamond.fontFamily,
		titleWeight: 400,
		titleSpacing: "0.2em",
		titleSize: 18,
		titleTransform: "uppercase",
		dedicationFont: garamondItalic.fontFamily,
		dedicationWeight: 400,
		dedicationSize: 14,
		dedicationStyle: "italic",
		statementFont: garamondItalic.fontFamily,
		statementWeight: 400,
		statementSize: 24,
		statementStyle: "italic",
		creditTitleFont: garamond.fontFamily,
		creditTitleWeight: 500,
		creditTitleSize: 28,
		creditTitleSpacing: "0.15em",
		creditTitleTransform: "none",
		creditBodyFont: garamond.fontFamily,
		creditBodyWeight: 400,
		labelFont: garamond.fontFamily,
	},
	// Take 4: Sora + Crimson — geometric sans meets classic serif
	sora: {
		titleFont: sora.fontFamily,
		titleWeight: 300,
		titleSpacing: "0.3em",
		titleSize: 13,
		titleTransform: "uppercase",
		dedicationFont: crimson.fontFamily,
		dedicationWeight: 400,
		dedicationSize: 14,
		dedicationStyle: "normal",
		statementFont: crimson.fontFamily,
		statementWeight: 400,
		statementSize: 22,
		statementStyle: "normal",
		creditTitleFont: sora.fontFamily,
		creditTitleWeight: 400,
		creditTitleSize: 20,
		creditTitleSpacing: "0.35em",
		creditTitleTransform: "uppercase",
		creditBodyFont: crimson.fontFamily,
		creditBodyWeight: 400,
		labelFont: sora.fontFamily,
	},
};

export interface FramedVideoProps {
	videoSrc?: string;
	title?: string;
	musicTrack?: string;
	musicVolume?: number;
	introDuration?: number;
	outroDuration?: number;
	take?: string;
}

export const FramedVideo: React.FC<FramedVideoProps> = ({
	videoSrc = "demos/latest-clip.mp4",
	title = "International Women's Day 2026",
	musicTrack,
	musicVolume = 0.15,
	introDuration = 10,
	outroDuration = 8,
	take = "inter",
}) => {
	const { fps, durationInFrames } = useVideoConfig();
	const t = TAKES[take] || TAKES.inter;

	const introFrames = Math.round(introDuration * fps);
	const outroFrames = Math.round(outroDuration * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0c" }}>
			{musicTrack && (
				<Audio
					src={staticFile(musicTrack)}
					volume={(f) => {
						const fadeIn = interpolate(f, [0, fps], [0, musicVolume], {
							extrapolateRight: "clamp",
						});
						const fadeOut = interpolate(
							f,
							[durationInFrames - 1.5 * fps, durationInFrames],
							[musicVolume, 0],
							{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
						);
						return Math.min(fadeIn, fadeOut);
					}}
				/>
			)}

			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<Intro title={title} take={t} />
			</Sequence>

			<Sequence name="Content" from={introFrames} durationInFrames={contentFrames}>
				<VideoContent videoSrc={videoSrc} title={title} take={t} />
			</Sequence>

			<Sequence name="Credits" from={introFrames + contentFrames} durationInFrames={outroFrames}>
				<Credits take={t} />
			</Sequence>
		</AbsoluteFill>
	);
};

// --- Intro ---
const Intro: React.FC<{ title: string; take: FontTake }> = ({ title, take }) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const titleOpacity = interpolate(
		frame,
		[0, 1 * fps, 4 * fps, 5 * fps],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	const dedicationOpacity = interpolate(
		frame,
		[3 * fps, 4.5 * fps, durationInFrames - 1 * fps, durationInFrames],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	return (
		<AbsoluteFill
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: 20,
			}}
		>
			<span
				style={{
					color: "rgba(255,255,255,0.85)",
					fontSize: take.titleSize,
					fontFamily: take.titleFont,
					fontWeight: take.titleWeight,
					letterSpacing: take.titleSpacing,
					textTransform: take.titleTransform as any,
					opacity: titleOpacity,
				}}
			>
				{title}
			</span>
			<span
				style={{
					color: "rgba(255,255,255,0.45)",
					fontSize: take.dedicationSize,
					fontFamily: take.dedicationFont,
					fontWeight: take.dedicationWeight,
					fontStyle: take.dedicationStyle,
					letterSpacing: "0.06em",
					opacity: dedicationOpacity,
					textAlign: "center",
					lineHeight: 1.8,
					maxWidth: 500,
				}}
			>
				A special dedication to the brave Iranian women{"\n"}fighting for their freedom throughout the world
			</span>
		</AbsoluteFill>
	);
};

// --- Video Content ---
const VideoContent: React.FC<{ videoSrc: string; title: string; take: FontTake }> = ({
	videoSrc,
	title,
	take,
}) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const opacity = interpolate(
		frame,
		[0, 0.3 * fps, durationInFrames - 0.3 * fps, durationInFrames],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	const labelOpacity = interpolate(frame, [0.3 * fps, 0.8 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<AbsoluteFill
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				opacity,
			}}
		>
			<div
				style={{
					position: "relative",
					padding: 6,
					backgroundColor: "#151517",
					borderRadius: 8,
					boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 12px 40px rgba(0,0,0,0.5)",
				}}
			>
				<OffthreadVideo
					src={staticFile(videoSrc)}
					style={{
						borderRadius: 6,
						display: "block",
						maxWidth: "calc(100vw - 60px)",
						maxHeight: "calc(100vh - 80px)",
					}}
				/>
			</div>

			<div
				style={{
					marginTop: 12,
					opacity: labelOpacity,
					display: "flex",
					justifyContent: "center",
				}}
			>
				<span
					style={{
						color: "rgba(255,255,255,0.3)",
						fontSize: 10,
						fontFamily: take.creditBodyFont,
						fontWeight: 300,
						letterSpacing: "0.05em",
					}}
				>
					Clip from Persepolis by Marjane Satrapi
				</span>
			</div>
		</AbsoluteFill>
	);
};

// --- Credits ---
const Credits: React.FC<{ take: FontTake }> = ({ take }) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const opacity = interpolate(
		frame,
		[0, 0.5 * fps, durationInFrames - 0.6 * fps, durationInFrames],
		[0, 1, 1, 0],
		{ extrapolateRight: "clamp" }
	);

	const statementOpacity = interpolate(
		frame,
		[0, 0.5 * fps],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	const creditsOpacity = interpolate(frame, [2.5 * fps, 3.5 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	const creditsY = interpolate(frame, [2.5 * fps, 3.5 * fps], [10, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<AbsoluteFill
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: 0,
				opacity,
			}}
		>
			{/* Statement */}
			<span
				style={{
					color: "rgba(255,255,255,0.75)",
					fontSize: take.statementSize,
					fontFamily: take.statementFont,
					fontWeight: take.statementWeight,
					fontStyle: take.statementStyle,
					letterSpacing: "0.04em",
					textAlign: "center",
					lineHeight: 1.6,
					maxWidth: 640,
					opacity: statementOpacity,
				}}
			>
				May nobody of any gender tell you how to feel,{"\n"}how to speak, how to dress or how to act
			</span>

			{/* Credits */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					marginTop: 48,
					opacity: creditsOpacity,
					transform: `translateY(${creditsY}px)`,
				}}
			>
				<span
					style={{
						color: "rgba(255,255,255,0.9)",
						fontSize: take.creditTitleSize,
						fontFamily: take.creditTitleFont,
						fontWeight: take.creditTitleWeight,
						letterSpacing: take.creditTitleSpacing,
						textTransform: take.creditTitleTransform as any,
					}}
				>
					Persepolis
				</span>

				<span
					style={{
						color: "rgba(255,255,255,0.5)",
						fontSize: 14,
						fontFamily: take.creditBodyFont,
						fontWeight: take.creditBodyWeight,
						letterSpacing: "0.1em",
						marginTop: 10,
					}}
				>
					Marjane Satrapi
				</span>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 5,
						marginTop: 20,
					}}
				>
					<span
						style={{
							color: "rgba(255,255,255,0.3)",
							fontSize: 11,
							fontFamily: take.creditBodyFont,
							fontWeight: 300,
							letterSpacing: "0.08em",
							textAlign: "center",
						}}
					>
						Autobiographical graphic novel — L'Association, 2000–2003
					</span>
					<span
						style={{
							color: "rgba(255,255,255,0.3)",
							fontSize: 11,
							fontFamily: take.creditBodyFont,
							fontWeight: 300,
							letterSpacing: "0.08em",
							textAlign: "center",
						}}
					>
						Animated film — Cannes Jury Prize, 2007 · Academy Award nominee
					</span>
					<span
						style={{
							color: "rgba(255,255,255,0.25)",
							fontSize: 9,
							fontFamily: take.creditBodyFont,
							fontWeight: 300,
							letterSpacing: "0.08em",
							textAlign: "center",
							marginTop: 6,
						}}
					>
						Co-directed with Vincent Paronnaud · First woman nominated for Best Animated Feature
					</span>
				</div>
			</div>
		</AbsoluteFill>
	);
};
