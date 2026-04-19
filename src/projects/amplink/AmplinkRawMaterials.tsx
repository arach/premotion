import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	AbsoluteFill,
	Easing,
} from "remotion";
import { ScanEffect } from "../../components/ScanEffect";

const AMBER = "200, 95, 50";
const BG = "#08080b";
const BG_DOT = "#64646d";
const LOGO_DOT = "#ff9f29";

// ── Logo dot map ────────────────────────────────────────────────────
// Extracted from amplink-logo.svg (v2): 24x24 grid, 512x512 canvas
// Grid starts at 93.1px, spacing 14.17px, dot radius 4.3px
// 153 amber logo dots, 423 gray background dots
const GRID_SIZE = 24;
const GRID_START = 93.1;
const GRID_STEP = 14.17;
const DOT_R = 4.3;

// [col, row, targetOpacity] — the 153 dots that form the logo shape
// prettier-ignore
const LOGO_DOTS: [number, number, number][] = [[14,4,0.59],[15,4,0.765],[16,4,0.909],[17,4,0.75],[18,4,0.688],[22,4,0.68],[23,4,0.706],[13,5,0.665],[14,5,0.813],[15,5,0.896],[16,5,0.791],[17,5,0.681],[21,5,0.666],[22,5,0.814],[23,5,0.884],[12,6,0.664],[13,6,0.745],[14,6,0.846],[15,6,0.805],[16,6,0.669],[20,6,0.727],[21,6,0.789],[22,6,0.842],[23,6,0.783],[11,7,0.682],[12,7,0.809],[13,7,0.797],[14,7,0.762],[15,7,0.71],[19,7,0.716],[20,7,0.828],[21,7,0.958],[22,7,0.811],[23,7,0.679],[10,8,0.686],[11,8,0.686],[12,8,0.823],[13,8,0.778],[14,8,0.638],[18,8,0.657],[19,8,0.735],[20,8,0.968],[21,8,0.716],[22,8,0.673],[9,9,0.629],[10,9,0.719],[11,9,0.951],[12,9,0.775],[13,9,0.726],[17,9,0.703],[18,9,0.817],[19,9,0.834],[20,9,0.693],[21,9,0.629],[8,10,0.622],[9,10,0.802],[10,10,0.912],[11,10,0.738],[12,10,0.657],[16,10,0.637],[17,10,0.861],[18,10,0.842],[19,10,0.804],[20,10,0.66],[7,11,0.637],[8,11,0.748],[9,11,0.803],[10,11,0.78],[11,11,0.71],[15,11,0.588],[16,11,0.709],[17,11,0.788],[18,11,0.674],[19,11,0.565],[6,12,0.594],[7,12,0.75],[8,12,0.887],[9,12,0.861],[10,12,0.589],[14,12,0.722],[15,12,0.727],[16,12,0.921],[17,12,0.703],[18,12,0.611],[5,13,0.648],[6,13,0.839],[7,13,0.794],[8,13,0.778],[9,13,0.634],[13,13,0.638],[14,13,0.794],[15,13,0.965],[16,13,0.826],[17,13,0.685],[4,14,0.68],[5,14,0.813],[6,14,0.869],[7,14,0.738],[8,14,0.651],[12,14,0.68],[13,14,0.719],[14,14,0.821],[15,14,0.835],[16,14,0.666],[3,15,0.662],[4,15,0.714],[5,15,0.909],[6,15,0.798],[7,15,0.703],[11,15,0.647],[12,15,0.734],[13,15,0.855],[14,15,0.793],[15,15,0.598],[2,16,0.615],[3,16,0.759],[4,16,0.896],[5,16,0.862],[6,16,0.677],[10,16,0.587],[11,16,0.792],[12,16,0.878],[13,16,0.795],[14,16,0.599],[1,17,0.562],[2,17,0.727],[3,17,0.865],[4,17,0.713],[5,17,0.593],[9,17,0.64],[10,17,0.869],[11,17,0.805],[12,17,0.713],[13,17,0.636],[0,18,0.65],[1,18,0.706],[2,18,0.827],[3,18,0.714],[4,18,0.702],[8,18,0.732],[9,18,0.807],[10,18,0.966],[11,18,0.834],[12,18,0.618],[0,19,0.776],[1,19,0.821],[2,19,0.836],[3,19,0.69],[7,19,0.718],[8,19,0.742],[9,19,0.926],[10,19,0.749],[11,19,0.611]];

// Build set for fast lookup
const LOGO_SET = new Set(LOGO_DOTS.map(([c, r]) => `${c},${r}`));
const LOGO_OPACITY_MAP = new Map(LOGO_DOTS.map(([c, r, o]) => [`${c},${r}`, o]));

// Logo center (weighted by dot positions)
const LOGO_CX = LOGO_DOTS.reduce((s, d) => s + d[0], 0) / LOGO_DOTS.length;
const LOGO_CY = LOGO_DOTS.reduce((s, d) => s + d[1], 0) / LOGO_DOTS.length;
const LOGO_MAX_DIST = Math.max(
	...LOGO_DOTS.map(([c, r]) => Math.sqrt((c - LOGO_CX) ** 2 + (r - LOGO_CY) ** 2)),
);

function dotCx(col: number) { return GRID_START + col * GRID_STEP; }
function dotCy(row: number) { return GRID_START + row * GRID_STEP; }

// ─── 1. Dot Build ───────────────────────────────────────────────────
// Logo dots appear from center of the logo shape outward. 1.5s.
// Background dots stay as dim noise. Ends with full logo visible.

export const AmpRawDotBuild: React.FC = () => {
	const frame = useCurrentFrame();

	const circles: React.ReactNode[] = [];

	// Background dots (always dim)
	for (let row = 0; row < GRID_SIZE; row++) {
		for (let col = 0; col < GRID_SIZE; col++) {
			const key = `${col},${row}`;
			if (LOGO_SET.has(key)) continue; // skip logo positions
			circles.push(
				<circle
					key={`bg-${key}`}
					cx={dotCx(col)}
					cy={dotCy(row)}
					r={DOT_R}
					fill={BG_DOT}
					opacity={0.08}
				/>,
			);
		}
	}

	// Logo dots — staggered from logo center outward
	for (const [col, row, targetOpacity] of LOGO_DOTS) {
		const dist = Math.sqrt((col - LOGO_CX) ** 2 + (row - LOGO_CY) ** 2);
		const normDist = dist / LOGO_MAX_DIST;
		const dotDelay = normDist * 30;
		const opacity = interpolate(frame, [dotDelay, dotDelay + 10], [0, targetOpacity], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		});
		circles.push(
			<circle
				key={`logo-${col}-${row}`}
				cx={dotCx(col)}
				cy={dotCy(row)}
				r={DOT_R}
				fill={LOGO_DOT}
				opacity={opacity}
			/>,
		);
	}

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<svg viewBox="0 0 512 512" width="100%" height="100%">
				<rect width="512" height="512" rx="22" fill="#000000" />
				{circles}
			</svg>
		</AbsoluteFill>
	);
};

// ─── 2. Dot Idle (ripple pulse) ─────────────────────────────────────
// Full logo visible, ripple breathing. 2s seamless loop.

export const AmpRawDotIdle: React.FC = () => {
	const frame = useCurrentFrame();

	const circles: React.ReactNode[] = [];

	// Background dots
	for (let row = 0; row < GRID_SIZE; row++) {
		for (let col = 0; col < GRID_SIZE; col++) {
			if (LOGO_SET.has(`${col},${row}`)) continue;
			circles.push(
				<circle
					key={`bg-${col}-${row}`}
					cx={dotCx(col)}
					cy={dotCy(row)}
					r={DOT_R}
					fill={BG_DOT}
					opacity={0.08}
				/>,
			);
		}
	}

	// Logo dots with ripple
	for (const [col, row, targetOpacity] of LOGO_DOTS) {
		const dist = Math.sqrt((col - LOGO_CX) ** 2 + (row - LOGO_CY) ** 2);
		const normDist = dist / LOGO_MAX_DIST;
		const phase = Math.sin((frame / 60) * Math.PI * 2 - normDist * 2.5);
		const opacity = targetOpacity * (0.75 + phase * 0.25);
		circles.push(
			<circle
				key={`logo-${col}-${row}`}
				cx={dotCx(col)}
				cy={dotCy(row)}
				r={DOT_R}
				fill={LOGO_DOT}
				opacity={opacity}
			/>,
		);
	}

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<svg viewBox="0 0 512 512" width="100%" height="100%">
				<rect width="512" height="512" rx="22" fill="#000000" />
				{circles}
			</svg>
		</AbsoluteFill>
	);
};

// ─── 3. Dot Dissolve ────────────────────────────────────────────────
// Logo dots fade out from edges inward. 1s.

export const AmpRawDotDissolve: React.FC = () => {
	const frame = useCurrentFrame();

	const circles: React.ReactNode[] = [];

	for (let row = 0; row < GRID_SIZE; row++) {
		for (let col = 0; col < GRID_SIZE; col++) {
			if (LOGO_SET.has(`${col},${row}`)) continue;
			circles.push(
				<circle
					key={`bg-${col}-${row}`}
					cx={dotCx(col)}
					cy={dotCy(row)}
					r={DOT_R}
					fill={BG_DOT}
					opacity={0.08}
				/>,
			);
		}
	}

	for (const [col, row, targetOpacity] of LOGO_DOTS) {
		const dist = Math.sqrt((col - LOGO_CX) ** 2 + (row - LOGO_CY) ** 2);
		const normDist = dist / LOGO_MAX_DIST;
		// Edges fade first, center last
		const dotDelay = (1 - normDist) * 18;
		const opacity = interpolate(frame, [dotDelay, dotDelay + 10], [targetOpacity, 0], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		});
		circles.push(
			<circle
				key={`logo-${col}-${row}`}
				cx={dotCx(col)}
				cy={dotCy(row)}
				r={DOT_R}
				fill={LOGO_DOT}
				opacity={opacity}
			/>,
		);
	}

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<svg viewBox="0 0 512 512" width="100%" height="100%">
				<rect width="512" height="512" rx="22" fill="#000000" />
				{circles}
			</svg>
		</AbsoluteFill>
	);
};

// ─── 4. Scan Pass (vertical) ────────────────────────────────────────

export const AmpRawScanPass: React.FC = () => {
	const frame = useCurrentFrame();

	const progress = frame / 30;
	const intensity = interpolate(progress, [0, 0.05, 0.9, 1], [0, 1, 1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<Img src={staticFile("amplink-logo.svg")} style={{ width: "100%", height: "100%" }} />
			<ScanEffect
				direction="vertical"
				progress={progress}
				intensity={intensity}
				color={AMBER}
				showTrail
				showScanlines
				scanlineOpacity={0.06}
				borderRadius={22}
			/>
		</AbsoluteFill>
	);
};

// ─── 5. Scan Pass (horizontal) ──────────────────────────────────────

export const AmpRawScanHorizontal: React.FC = () => {
	const frame = useCurrentFrame();

	const progress = frame / 30;
	const intensity = interpolate(progress, [0, 0.05, 0.9, 1], [0, 1, 1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<Img src={staticFile("amplink-logo.svg")} style={{ width: "100%", height: "100%" }} />
			<ScanEffect
				direction="horizontal"
				progress={progress}
				intensity={intensity}
				color={AMBER}
				showTrail
				showScanlines
				scanlineOpacity={0.06}
				borderRadius={22}
			/>
		</AbsoluteFill>
	);
};

// ─── 6. Logo Fade In ────────────────────────────────────────────────

export const AmpRawLogoIn: React.FC = () => {
	const frame = useCurrentFrame();

	const opacity = interpolate(frame, [0, 25], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<Img
				src={staticFile("amplink-logo.svg")}
				style={{ width: "100%", height: "100%", opacity }}
			/>
		</AbsoluteFill>
	);
};

// ─── 7. Logo Fade Out ───────────────────────────────────────────────

export const AmpRawLogoOut: React.FC = () => {
	const frame = useCurrentFrame();

	const opacity = interpolate(frame, [5, 28], [1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.in(Easing.cubic),
	});

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<Img
				src={staticFile("amplink-logo.svg")}
				style={{ width: "100%", height: "100%", opacity }}
			/>
		</AbsoluteFill>
	);
};

// ─── 8. Glow Pulse ──────────────────────────────────────────────────

export const AmpRawGlowPulse: React.FC = () => {
	const frame = useCurrentFrame();

	const t = Math.sin((frame / 60) * Math.PI * 2);
	const glow = 0.08 + t * 0.06;

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<div
				style={{
					position: "absolute",
					inset: 0,
					borderRadius: 22,
					background: `radial-gradient(circle at 50% 50%, rgba(${AMBER}, ${glow}) 0%, rgba(${AMBER}, ${glow * 0.3}) 40%, transparent 70%)`,
				}}
			/>
		</AbsoluteFill>
	);
};
