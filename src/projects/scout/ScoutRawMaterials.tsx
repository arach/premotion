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

const BG = "#000000";
const LOGO_DOT = "#ff8c00";
const BG_DOT = "#626255";
const CENTER_DOT = "#000000";
const WHITE = "255, 255, 255";

// ── Scout logo dot map ──────────────────────────────────────────────
// Extracted from favicon-bundle SVG: 35x35 grid, 512x512 canvas
// 660 orange logo dots (sphere+ring), 21 black center dots, 544 gray bg dots
const GRID_SIZE = 35;
const GRID_START = 26.7;
const GRID_STEP = 13.49;
const DOT_R = 4.0;

// [col, row, targetOpacity] — 660 dots forming the sphere + ring
// prettier-ignore
const LOGO_DOTS: [number, number, number][] = [[12,1,0.627],[13,1,0.707],[14,1,0.79],[15,1,0.854],[16,1,0.874],[17,1,0.913],[18,1,0.883],[19,1,0.854],[20,1,0.824],[21,1,0.747],[22,1,0.646],[10,2,0.683],[11,2,0.803],[12,2,0.834],[13,2,0.755],[14,2,0.683],[15,2,0.626],[16,2,0.599],[17,2,0.602],[18,2,0.605],[19,2,0.63],[20,2,0.69],[21,2,0.781],[22,2,0.882],[23,2,0.857],[24,2,0.726],[8,3,0.643],[9,3,0.808],[10,3,0.769],[11,3,0.643],[23,3,0.678],[24,3,0.848],[25,3,0.893],[26,3,0.688],[7,4,0.7],[8,4,0.809],[9,4,0.639],[25,4,0.706],[26,4,0.912],[27,4,0.792],[5,5,0.519],[6,5,0.738],[7,5,0.733],[8,5,0.549],[14,5,0.936],[15,5,0.973],[16,5,0.959],[17,5,0.979],[18,5,0.984],[19,5,0.973],[20,5,0.998],[26,5,0.606],[27,5,0.841],[28,5,0.837],[29,5,0.573],[5,6,0.724],[6,6,0.707],[12,6,0.951],[13,6,0.956],[14,6,0.972],[15,6,0.966],[16,6,0.952],[17,6,0.968],[18,6,0.983],[19,6,0.988],[20,6,0.993],[21,6,0.995],[22,6,0.976],[28,6,0.823],[29,6,0.829],[4,7,0.681],[5,7,0.713],[10,7,0.92],[11,7,0.916],[12,7,0.931],[13,7,0.96],[14,7,0.972],[15,7,0.97],[16,7,0.97],[17,7,0.98],[18,7,0.994],[19,7,0.979],[20,7,0.982],[21,7,0.993],[22,7,0.974],[23,7,0.99],[24,7,1],[29,7,0.832],[30,7,0.789],[3,8,0.573],[4,8,0.777],[5,8,0.516],[9,8,0.923],[10,8,0.912],[11,8,0.92],[12,8,0.932],[13,8,0.918],[14,8,0.951],[15,8,0.969],[16,8,0.951],[17,8,0.963],[18,8,0.998],[19,8,0.966],[20,8,0.986],[21,8,0.975],[22,8,0.983],[23,8,0.977],[24,8,0.983],[25,8,0.994],[29,8,0.621],[30,8,0.91],[31,8,0.688],[3,9,0.733],[4,9,0.581],[8,9,0.873],[9,9,0.904],[10,9,0.91],[11,9,0.918],[12,9,0.91],[13,9,0.953],[14,9,0.951],[15,9,0.975],[16,9,0.949],[17,9,0.962],[18,9,0.971],[19,9,1],[20,9,0.978],[21,9,0.991],[22,9,1],[23,9,1],[24,9,0.997],[25,9,1],[26,9,0.988],[30,9,0.694],[31,9,0.891],[2,10,0.609],[3,10,0.689],[7,10,0.854],[8,10,0.861],[9,10,0.883],[10,10,0.901],[11,10,0.884],[12,10,0.9],[13,10,0.923],[14,10,0.952],[15,10,0.969],[16,10,0.981],[17,10,0.957],[18,10,0.997],[19,10,1],[20,10,0.972],[21,10,0.984],[22,10,1],[23,10,0.993],[24,10,0.991],[25,10,1],[26,10,0.979],[27,10,1],[31,10,0.843],[32,10,0.724],[2,11,0.696],[3,11,0.549],[7,11,0.866],[8,11,0.862],[9,11,0.867],[10,11,0.906],[11,11,0.908],[12,11,0.898],[13,11,0.912],[14,11,0.951],[15,11,0.956],[16,11,0.983],[17,11,0.954],[18,11,0.995],[19,11,0.971],[20,11,0.992],[21,11,0.993],[22,11,1],[23,11,0.987],[24,11,1],[25,11,1],[26,11,1],[27,11,0.976],[31,11,0.677],[32,11,0.861],[1,12,0.53],[2,12,0.722],[6,12,0.856],[7,12,0.877],[8,12,0.861],[9,12,0.884],[10,12,0.856],[11,12,0.901],[12,12,0.883],[13,12,0.925],[14,12,0.937],[15,12,0.945],[16,12,0.94],[17,12,0.996],[18,12,0.993],[19,12,1],[20,12,1],[21,12,0.982],[22,12,1],[23,12,1],[24,12,0.978],[25,12,0.986],[26,12,0.991],[27,12,1],[28,12,0.989],[32,12,0.879],[33,12,0.653],[1,13,0.595],[2,13,0.62],[6,13,0.844],[7,13,0.824],[8,13,0.86],[9,13,0.868],[10,13,0.88],[11,13,0.89],[12,13,0.896],[13,13,0.897],[14,13,0.895],[15,13,0.919],[16,13,0.969],[17,13,0.993],[18,13,0.999],[19,13,0.991],[20,13,1],[21,13,0.998],[22,13,0.998],[23,13,0.979],[24,13,1],[25,13,1],[26,13,0.994],[27,13,1],[28,13,0.977],[32,13,0.781],[33,13,0.731],[1,14,0.644],[2,14,0.565],[5,14,0.831],[6,14,0.835],[7,14,0.809],[8,14,0.828],[9,14,0.847],[10,14,0.862],[11,14,0.848],[12,14,0.879],[13,14,0.873],[14,14,0.877],[15,14,0.906],[16,14,0.944],[17,14,0.967],[18,14,1],[19,14,0.994],[20,14,0.997],[21,14,0.998],[22,14,1],[23,14,0.984],[24,14,0.985],[25,14,1],[26,14,1],[27,14,0.984],[28,14,0.988],[29,14,0.969],[32,14,0.692],[33,14,0.809],[1,15,0.688],[2,15,0.506],[5,15,0.817],[6,15,0.823],[7,15,0.81],[8,15,0.839],[9,15,0.823],[10,15,0.816],[11,15,0.842],[12,15,0.837],[13,15,0.877],[14,15,0.857],[15,15,0.885],[19,15,1],[20,15,1],[21,15,0.985],[22,15,1],[23,15,0.969],[24,15,1],[25,15,1],[26,15,0.982],[27,15,0.964],[28,15,0.988],[29,15,0.991],[32,15,0.647],[33,15,0.866],[1,16,0.691],[2,16,0.474],[5,16,0.806],[6,16,0.818],[7,16,0.787],[8,16,0.819],[9,16,0.8],[10,16,0.818],[11,16,0.831],[12,16,0.812],[13,16,0.829],[14,16,0.83],[20,16,0.974],[21,16,0.989],[22,16,0.97],[23,16,1],[24,16,0.996],[25,16,0.971],[26,16,0.998],[27,16,0.957],[28,16,0.966],[29,16,0.989],[32,16,0.608],[33,16,0.89],[1,17,0.681],[2,17,0.45],[5,17,0.782],[6,17,0.789],[7,17,0.79],[8,17,0.763],[9,17,0.763],[10,17,0.787],[11,17,0.775],[12,17,0.784],[13,17,0.784],[14,17,0.768],[20,17,0.981],[21,17,0.991],[22,17,0.965],[23,17,0.967],[24,17,0.965],[25,17,0.953],[26,17,0.96],[27,17,0.973],[28,17,0.959],[29,17,0.979],[32,17,0.576],[33,17,0.887],[1,18,0.672],[2,18,0.444],[5,18,0.761],[6,18,0.756],[7,18,0.759],[8,18,0.779],[9,18,0.753],[10,18,0.742],[11,18,0.745],[12,18,0.73],[13,18,0.744],[14,18,0.722],[20,18,0.95],[21,18,0.958],[22,18,0.976],[23,18,0.971],[24,18,0.981],[25,18,0.951],[26,18,0.956],[27,18,0.949],[28,18,0.947],[29,18,0.989],[32,18,0.606],[33,18,0.893],[1,19,0.641],[2,19,0.462],[5,19,0.764],[6,19,0.748],[7,19,0.753],[8,19,0.753],[9,19,0.749],[10,19,0.733],[11,19,0.713],[12,19,0.742],[13,19,0.716],[14,19,0.692],[15,19,0.645],[19,19,0.895],[20,19,0.913],[21,19,0.954],[22,19,0.924],[23,19,0.969],[24,19,0.952],[25,19,0.942],[26,19,0.945],[27,19,0.976],[28,19,0.958],[29,19,0.972],[32,19,0.635],[33,19,0.856],[1,20,0.592],[2,20,0.498],[5,20,0.76],[6,20,0.762],[7,20,0.72],[8,20,0.729],[9,20,0.734],[10,20,0.714],[11,20,0.686],[12,20,0.671],[13,20,0.685],[14,20,0.667],[15,20,0.689],[16,20,0.748],[17,20,0.763],[18,20,0.829],[19,20,0.855],[20,20,0.893],[21,20,0.914],[22,20,0.943],[23,20,0.916],[24,20,0.933],[25,20,0.954],[26,20,0.955],[27,20,0.971],[28,20,0.931],[29,20,0.933],[32,20,0.676],[33,20,0.79],[1,21,0.524],[2,21,0.549],[6,21,0.733],[7,21,0.712],[8,21,0.725],[9,21,0.713],[10,21,0.689],[11,21,0.689],[12,21,0.67],[13,21,0.662],[14,21,0.693],[15,21,0.711],[16,21,0.741],[17,21,0.778],[18,21,0.828],[19,21,0.871],[20,21,0.884],[21,21,0.889],[22,21,0.911],[23,21,0.901],[24,21,0.948],[25,21,0.915],[26,21,0.955],[27,21,0.935],[28,21,0.937],[32,21,0.759],[33,21,0.711],[1,22,0.442],[2,22,0.618],[6,22,0.713],[7,22,0.701],[8,22,0.709],[9,22,0.684],[10,22,0.67],[11,22,0.675],[12,22,0.656],[13,22,0.658],[14,22,0.702],[15,22,0.702],[16,22,0.774],[17,22,0.803],[18,22,0.824],[19,22,0.828],[20,22,0.887],[21,22,0.867],[22,22,0.875],[23,22,0.929],[24,22,0.938],[25,22,0.931],[26,22,0.934],[27,22,0.936],[28,22,0.919],[32,22,0.857],[33,22,0.615],[2,23,0.565],[3,23,0.451],[7,23,0.687],[8,23,0.703],[9,23,0.653],[10,23,0.647],[11,23,0.667],[12,23,0.674],[13,23,0.665],[14,23,0.722],[15,23,0.712],[16,23,0.754],[17,23,0.774],[18,23,0.794],[19,23,0.817],[20,23,0.842],[21,23,0.881],[22,23,0.892],[23,23,0.889],[24,23,0.913],[25,23,0.903],[26,23,0.906],[27,23,0.934],[31,23,0.63],[32,23,0.809],[2,24,0.49],[3,24,0.544],[7,24,0.691],[8,24,0.652],[9,24,0.663],[10,24,0.631],[11,24,0.662],[12,24,0.657],[13,24,0.687],[14,24,0.722],[15,24,0.758],[16,24,0.741],[17,24,0.783],[18,24,0.8],[19,24,0.844],[20,24,0.861],[21,24,0.858],[22,24,0.873],[23,24,0.891],[24,24,0.913],[25,24,0.919],[26,24,0.899],[27,24,0.941],[31,24,0.768],[32,24,0.661],[3,25,0.563],[4,25,0.448],[8,25,0.657],[9,25,0.647],[10,25,0.649],[11,25,0.684],[12,25,0.672],[13,25,0.723],[14,25,0.732],[15,25,0.739],[16,25,0.772],[17,25,0.777],[18,25,0.784],[19,25,0.836],[20,25,0.848],[21,25,0.857],[22,25,0.89],[23,25,0.869],[24,25,0.888],[25,25,0.875],[26,25,0.889],[30,25,0.654],[31,25,0.795],[3,26,0.439],[4,26,0.553],[5,26,0.364],[9,26,0.668],[10,26,0.667],[11,26,0.691],[12,26,0.72],[13,26,0.698],[14,26,0.721],[15,26,0.762],[16,26,0.775],[17,26,0.803],[18,26,0.79],[19,26,0.804],[20,26,0.85],[21,26,0.86],[22,26,0.85],[23,26,0.885],[24,26,0.9],[25,26,0.886],[29,26,0.543],[30,26,0.808],[31,26,0.625],[4,27,0.483],[5,27,0.498],[10,27,0.664],[11,27,0.679],[12,27,0.707],[13,27,0.737],[14,27,0.728],[15,27,0.774],[16,27,0.779],[17,27,0.778],[18,27,0.804],[19,27,0.81],[20,27,0.831],[21,27,0.862],[22,27,0.844],[23,27,0.876],[24,27,0.856],[29,27,0.728],[30,27,0.69],[5,28,0.494],[6,28,0.483],[12,28,0.732],[13,28,0.732],[14,28,0.741],[15,28,0.738],[16,28,0.777],[17,28,0.776],[18,28,0.801],[19,28,0.832],[20,28,0.832],[21,28,0.848],[22,28,0.829],[28,28,0.706],[29,28,0.718],[5,29,0.322],[6,29,0.485],[7,29,0.491],[8,29,0.369],[14,29,0.733],[15,29,0.766],[16,29,0.78],[17,29,0.777],[18,29,0.809],[19,29,0.827],[20,29,0.811],[26,29,0.506],[27,29,0.731],[28,29,0.71],[29,29,0.522],[7,30,0.481],[8,30,0.563],[9,30,0.45],[25,30,0.587],[26,30,0.78],[27,30,0.668],[8,31,0.431],[9,31,0.555],[10,31,0.544],[11,31,0.44],[23,31,0.572],[24,31,0.705],[25,31,0.752],[26,31,0.58],[10,32,0.482],[11,32,0.584],[12,32,0.607],[13,32,0.557],[14,32,0.501],[15,32,0.458],[16,32,0.451],[17,32,0.462],[18,32,0.474],[19,32,0.505],[20,32,0.547],[21,32,0.617],[22,32,0.734],[23,32,0.709],[24,32,0.59],[12,33,0.451],[13,33,0.509],[14,33,0.586],[15,33,0.645],[16,33,0.682],[17,33,0.685],[18,33,0.694],[19,33,0.682],[20,33,0.647],[21,33,0.606],[22,33,0.521]];

// 21 black dots forming center pupil
// prettier-ignore
const BLACK_DOTS: [number, number][] = [[16,15],[17,15],[18,15],[15,16],[16,16],[17,16],[18,16],[19,16],[15,17],[16,17],[17,17],[18,17],[19,17],[15,18],[16,18],[17,18],[18,18],[19,18],[16,19],[17,19],[18,19]];

const LOGO_SET = new Set(LOGO_DOTS.map(([c, r]) => `${c},${r}`));
const BLACK_SET = new Set(BLACK_DOTS.map(([c, r]) => `${c},${r}`));
const LOGO_CX = LOGO_DOTS.reduce((s, d) => s + d[0], 0) / LOGO_DOTS.length;
const LOGO_CY = LOGO_DOTS.reduce((s, d) => s + d[1], 0) / LOGO_DOTS.length;
const LOGO_MAX_DIST = Math.max(
	...LOGO_DOTS.map(([c, r]) => Math.sqrt((c - LOGO_CX) ** 2 + (r - LOGO_CY) ** 2)),
);

function dotCx(col: number) { return GRID_START + col * GRID_STEP; }
function dotCy(row: number) { return GRID_START + row * GRID_STEP; }

// ─── 1. Dot Build ───────────────────────────────────────────────────
// Ring dots appear first (outer), then sphere fills inward, pupil last. 1.5s.

export const ScoutRawBuild: React.FC = () => {
	const frame = useCurrentFrame();

	const circles: React.ReactNode[] = [];

	// BG dots (always dim)
	for (let row = 0; row < GRID_SIZE; row++) {
		for (let col = 0; col < GRID_SIZE; col++) {
			const key = `${col},${row}`;
			if (LOGO_SET.has(key) || BLACK_SET.has(key)) continue;
			circles.push(
				<circle key={`bg-${key}`} cx={dotCx(col)} cy={dotCy(row)} r={DOT_R} fill={BG_DOT} opacity={0.08} />,
			);
		}
	}

	// Logo dots — outer ring first, sphere fills inward
	for (const [col, row, targetOpacity] of LOGO_DOTS) {
		const dist = Math.sqrt((col - LOGO_CX) ** 2 + (row - LOGO_CY) ** 2);
		const normDist = dist / LOGO_MAX_DIST;
		// Reverse: outer dots (normDist=1) appear first
		const dotDelay = (1 - normDist) * 28;
		const opacity = interpolate(frame, [dotDelay, dotDelay + 10], [0, targetOpacity], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		});
		circles.push(
			<circle key={`logo-${col}-${row}`} cx={dotCx(col)} cy={dotCy(row)} r={DOT_R} fill={LOGO_DOT} opacity={opacity} />,
		);
	}

	// Black center dots appear last
	for (const [col, row] of BLACK_DOTS) {
		const opacity = interpolate(frame, [32, 40], [0, 1], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		});
		circles.push(
			<circle key={`pupil-${col}-${row}`} cx={dotCx(col)} cy={dotCy(row)} r={DOT_R} fill={CENTER_DOT} opacity={opacity} />,
		);
	}

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<svg viewBox="0 0 512 512" width="100%" height="100%">
				<rect width="512" height="512" rx="10" fill={BG} />
				{circles}
			</svg>
		</AbsoluteFill>
	);
};

// ─── 2. Dot Idle ────────────────────────────────────────────────────

export const ScoutRawIdle: React.FC = () => {
	const frame = useCurrentFrame();

	const circles: React.ReactNode[] = [];

	for (let row = 0; row < GRID_SIZE; row++) {
		for (let col = 0; col < GRID_SIZE; col++) {
			const key = `${col},${row}`;
			if (LOGO_SET.has(key) || BLACK_SET.has(key)) continue;
			circles.push(
				<circle key={`bg-${key}`} cx={dotCx(col)} cy={dotCy(row)} r={DOT_R} fill={BG_DOT} opacity={0.08} />,
			);
		}
	}

	for (const [col, row, targetOpacity] of LOGO_DOTS) {
		const dist = Math.sqrt((col - LOGO_CX) ** 2 + (row - LOGO_CY) ** 2);
		const normDist = dist / LOGO_MAX_DIST;
		const phase = Math.sin((frame / 60) * Math.PI * 2 - normDist * 2.5);
		const opacity = targetOpacity * (0.8 + phase * 0.2);
		circles.push(
			<circle key={`logo-${col}-${row}`} cx={dotCx(col)} cy={dotCy(row)} r={DOT_R} fill={LOGO_DOT} opacity={opacity} />,
		);
	}

	for (const [col, row] of BLACK_DOTS) {
		circles.push(
			<circle key={`pupil-${col}-${row}`} cx={dotCx(col)} cy={dotCy(row)} r={DOT_R} fill={CENTER_DOT} opacity={1} />,
		);
	}

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<svg viewBox="0 0 512 512" width="100%" height="100%">
				<rect width="512" height="512" rx="10" fill={BG} />
				{circles}
			</svg>
		</AbsoluteFill>
	);
};

// ─── 3. Dot Dissolve ────────────────────────────────────────────────

export const ScoutRawDissolve: React.FC = () => {
	const frame = useCurrentFrame();

	const circles: React.ReactNode[] = [];

	for (let row = 0; row < GRID_SIZE; row++) {
		for (let col = 0; col < GRID_SIZE; col++) {
			const key = `${col},${row}`;
			if (LOGO_SET.has(key) || BLACK_SET.has(key)) continue;
			circles.push(
				<circle key={`bg-${key}`} cx={dotCx(col)} cy={dotCy(row)} r={DOT_R} fill={BG_DOT} opacity={0.08} />,
			);
		}
	}

	// Pupil fades first
	for (const [col, row] of BLACK_DOTS) {
		const opacity = interpolate(frame, [0, 6], [1, 0], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		});
		circles.push(
			<circle key={`pupil-${col}-${row}`} cx={dotCx(col)} cy={dotCy(row)} r={DOT_R} fill={CENTER_DOT} opacity={opacity} />,
		);
	}

	// Logo dots: center fades first, ring last
	for (const [col, row, targetOpacity] of LOGO_DOTS) {
		const dist = Math.sqrt((col - LOGO_CX) ** 2 + (row - LOGO_CY) ** 2);
		const normDist = dist / LOGO_MAX_DIST;
		const dotDelay = normDist * 18;
		const opacity = interpolate(frame, [dotDelay, dotDelay + 10], [targetOpacity, 0], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		});
		circles.push(
			<circle key={`logo-${col}-${row}`} cx={dotCx(col)} cy={dotCy(row)} r={DOT_R} fill={LOGO_DOT} opacity={opacity} />,
		);
	}

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<svg viewBox="0 0 512 512" width="100%" height="100%">
				<rect width="512" height="512" rx="10" fill={BG} />
				{circles}
			</svg>
		</AbsoluteFill>
	);
};

// ─── 4-5. Scan passes ───────────────────────────────────────────────

export const ScoutRawScanPass: React.FC = () => {
	const frame = useCurrentFrame();
	const progress = frame / 30;
	const intensity = interpolate(progress, [0, 0.05, 0.9, 1], [0, 1, 1, 0], {
		extrapolateLeft: "clamp", extrapolateRight: "clamp",
	});
	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<Img src={staticFile("scout-logo.svg")} style={{ width: "100%", height: "100%" }} />
			<ScanEffect direction="vertical" progress={progress} intensity={intensity * 0.7} color="255, 140, 0" showTrail showScanlines scanlineOpacity={0.04} borderRadius={10} />
		</AbsoluteFill>
	);
};

export const ScoutRawScanHorizontal: React.FC = () => {
	const frame = useCurrentFrame();
	const progress = frame / 30;
	const intensity = interpolate(progress, [0, 0.05, 0.9, 1], [0, 1, 1, 0], {
		extrapolateLeft: "clamp", extrapolateRight: "clamp",
	});
	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<Img src={staticFile("scout-logo.svg")} style={{ width: "100%", height: "100%" }} />
			<ScanEffect direction="horizontal" progress={progress} intensity={intensity * 0.7} color="255, 140, 0" showTrail showScanlines scanlineOpacity={0.04} borderRadius={10} />
		</AbsoluteFill>
	);
};

// ─── 6-7. Logo fade in/out ──────────────────────────────────────────

export const ScoutRawLogoIn: React.FC = () => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [0, 40], [0, 1], {
		extrapolateLeft: "clamp", extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<Img src={staticFile("scout-logo.svg")} style={{ width: "100%", height: "100%", opacity }} />
		</AbsoluteFill>
	);
};

export const ScoutRawLogoOut: React.FC = () => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [5, 28], [1, 0], {
		extrapolateLeft: "clamp", extrapolateRight: "clamp",
		easing: Easing.in(Easing.cubic),
	});
	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<Img src={staticFile("scout-logo.svg")} style={{ width: "100%", height: "100%", opacity }} />
		</AbsoluteFill>
	);
};

// ─── 8. Glow Pulse ──────────────────────────────────────────────────

export const ScoutRawGlowPulse: React.FC = () => {
	const frame = useCurrentFrame();
	const t = Math.sin((frame / 60) * Math.PI * 2);
	const glow = 0.06 + t * 0.04;
	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			<div style={{
				position: "absolute", inset: 0, borderRadius: 10,
				background: `radial-gradient(circle at 40% 38%, rgba(255, 140, 0, ${glow}) 0%, rgba(255, 140, 0, ${glow * 0.2}) 40%, transparent 65%)`,
			}} />
		</AbsoluteFill>
	);
};
