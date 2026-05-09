export type ParamType = 'range' | 'color' | 'toggle' | 'select';

export interface ParamDef {
  name: string;
  label: string;
  type: ParamType;
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export const FX_PARAMS: Record<string, ParamDef[]> = {
  'aurora': [
    { name: 'speed',       label: 'Speed',       type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
    { name: 'intensity',   label: 'Intensity',   type: 'range', default: 1.0,  min: 0.0, max: 2.0,  step: 0.05 },
    { name: 'hue_shift',   label: 'Hue Shift',   type: 'range', default: 0.0,  min: -180, max: 180, step: 1    },
    { name: 'band_width',  label: 'Band Width',  type: 'range', default: 1.0,  min: 0.2, max: 3.0,  step: 0.05 },
  ],
  'bioluminescence': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'bleach-bypass': [
    { name: 'intensity',  label: 'Intensity',  type: 'range', default: 1.0,  min: 0.0, max: 1.0,  step: 0.01 },
    { name: 'contrast',   label: 'Contrast',   type: 'range', default: 1.3,  min: 0.8, max: 2.0,  step: 0.01 },
    { name: 'saturation', label: 'Saturation', type: 'range', default: 0.3,  min: 0.0, max: 1.0,  step: 0.01 },
  ],
  'bloom-halation': [
    { name: 'strength',  label: 'Strength',  type: 'range', default: 0.7,  min: 0.0, max: 2.0,  step: 0.01 },
  ],
  'boids': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
    { name: 'opacity',   label: 'Glow',      type: 'range', default: 0.85, min: 0.1, max: 1.0,  step: 0.01 },
  ],
  'bokeh-hex': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'caustics': [
    { name: 'speed',      label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
    { name: 'intensity',  label: 'Intensity', type: 'range', default: 1.0,  min: 0.0, max: 2.0,  step: 0.05 },
    { name: 'scale',      label: 'Scale',     type: 'range', default: 1.0,  min: 0.3, max: 3.0,  step: 0.05 },
    { name: 'color_mix',  label: 'Color Mix', type: 'range', default: 0.7,  min: 0.0, max: 1.0,  step: 0.01 },
  ],
  'chromatic-flow': [
    { name: 'shift',     label: 'Shift',     type: 'range', default: 8.0,  min: 0.0, max: 30.0, step: 0.5  },
  ],
  'crosshatch-etch': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'cyanotype': [
    { name: 'strength',  label: 'Strength',  type: 'range', default: 1.0,  min: 0.0, max: 2.0,  step: 0.01 },
  ],
  'daguerreotype': [
    { name: 'strength',  label: 'Strength',  type: 'range', default: 1.0,  min: 0.0, max: 2.0,  step: 0.01 },
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'dark-neon': [
    { name: 'neon_opacity', label: 'Neon',   type: 'range', default: 1.0,  min: 0.0, max: 1.0,  step: 0.01 },
    { name: 'hue_shift',    label: 'Hue',    type: 'range', default: 0,    min: -180, max: 180, step: 1    },
  ],
  'duotone': [
    { name: 'mix',        label: 'Mix',       type: 'range', default: 1.0,  min: 0.0, max: 1.0,  step: 0.01 },
    { name: 'color_a',    label: 'Shadow',    type: 'color', default: '#0d1b2a' },
    { name: 'color_b',    label: 'Highlight', type: 'color', default: '#ff6b35' },
  ],
  'echo-ghost': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'film-grade': [
    { name: 'exposure',   label: 'Exposure',   type: 'range', default: 1.0,  min: 0.5, max: 2.0,  step: 0.01 },
    { name: 'contrast',   label: 'Contrast',   type: 'range', default: 1.0,  min: 0.5, max: 2.0,  step: 0.01 },
    { name: 'grain',      label: 'Grain',      type: 'range', default: 0.04, min: 0.0, max: 0.20, step: 0.005 },
    { name: 'vignette',   label: 'Vignette',   type: 'range', default: 0.5,  min: 0.0, max: 1.0,  step: 0.01 },
    { name: 'teal_orange',label: 'Teal/Orange',type: 'range', default: 0.5,  min: 0.0, max: 1.0,  step: 0.01 },
  ],
  'film-lut': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'fluid-tint': [
    { name: 'speed',          label: 'Speed',        type: 'range', default: 1.0,  min: 0.1,  max: 3.0,  step: 0.05  },
    { name: 'warp_strength',  label: 'Warp',         type: 'range', default: 0.04, min: 0.0,  max: 0.15, step: 0.005 },
    { name: 'tint_mix',       label: 'Tint Mix',     type: 'range', default: 0.5,  min: 0.0,  max: 1.0,  step: 0.01  },
  ],
  'fog-depth': [
    { name: 'density',   label: 'Density',   type: 'range', default: 1.0,  min: 0.0, max: 2.5,  step: 0.05 },
  ],
  'god-rays': [
    { name: 'speed',      label: 'Speed',     type: 'range', default: 1.0,  min: 0.1,  max: 3.0,  step: 0.05  },
    { name: 'intensity',  label: 'Intensity', type: 'range', default: 1.0,  min: 0.0,  max: 2.5,  step: 0.05  },
    { name: 'decay',      label: 'Decay',     type: 'range', default: 0.97, min: 0.85, max: 0.99, step: 0.005 },
    { name: 'threshold',  label: 'Threshold', type: 'range', default: 0.55, min: 0.1,  max: 0.9,  step: 0.01  },
  ],
  'golden-hour': [
    { name: 'speed',      label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
    { name: 'warmth',     label: 'Warmth',    type: 'range', default: 1.0,  min: 0.0, max: 2.0,  step: 0.05 },
    { name: 'saturation', label: 'Saturation',type: 'range', default: 1.0,  min: 0.0, max: 2.0,  step: 0.05 },
    { name: 'exposure',   label: 'Exposure',  type: 'range', default: 1.05, min: 0.5, max: 2.0,  step: 0.01 },
  ],
  'halo-glow': [],
  'holographic': [
    { name: 'speed',       label: 'Speed',       type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
    { name: 'intensity',   label: 'Intensity',   type: 'range', default: 0.85, min: 0.0, max: 1.5,  step: 0.05 },
    { name: 'angle_speed', label: 'Angle Speed', type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
    { name: 'saturation',  label: 'Saturation',  type: 'range', default: 1.0,  min: 0.5, max: 2.0,  step: 0.05 },
  ],
  'infrared': [
    { name: 'strength',  label: 'Strength',  type: 'range', default: 1.0,  min: 0.0, max: 2.0,  step: 0.01 },
  ],
  'kaleidoscope': [
    { name: 'segments',  label: 'Segments',  type: 'select', default: '8',
      options: [
        { value: '4',  label: '4' },
        { value: '6',  label: '6' },
        { value: '8',  label: '8' },
        { value: '12', label: '12' },
        { value: '16', label: '16' },
      ]
    },
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'kuwahara-aniso': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'l-system': [
    { name: 'opacity',   label: 'Opacity',   type: 'range', default: 0.22, min: 0.0, max: 1.0,  step: 0.01 },
    { name: 'line_width',label: 'Line Width',type: 'range', default: 1.2,  min: 0.5, max: 4.0,  step: 0.1  },
  ],
  'lens-starburst': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'lenticular': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'long-exposure': [
    { name: 'blend',     label: 'Trail Mix', type: 'range', default: 0.055,min: 0.01,max: 0.15, step: 0.005 },
  ],
  'motion-smear': [
    { name: 'decay',     label: 'Decay',     type: 'range', default: 0.94, min: 0.5, max: 0.99, step: 0.005 },
  ],
  'orton-effect': [
    { name: 'strength',  label: 'Strength',  type: 'range', default: 1.0,  min: 0.0, max: 2.0,  step: 0.01 },
  ],
  'parallax-depth': [],
  'particle-field': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
    { name: 'opacity',   label: 'Glow',      type: 'range', default: 0.7,  min: 0.1, max: 1.0,  step: 0.01 },
  ],
  'pixel-sort': [
    { name: 'band_size', label: 'Band Size', type: 'range', default: 0.25, min: 0.05,max: 0.8,  step: 0.01 },
  ],
  'pointillist': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'polar-wrap': [
    { name: 'blend',     label: 'Blend',     type: 'range', default: 1.0,  min: 0.0, max: 1.0,  step: 0.01 },
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'prism-dispersion': [
    { name: 'speed',            label: 'Speed',          type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
    { name: 'shift_amount',     label: 'Shift Amount',   type: 'range', default: 0.012,min: 0.0, max: 0.04, step: 0.001 },
    { name: 'rainbow_strength', label: 'Rainbow',        type: 'range', default: 0.7,  min: 0.0, max: 1.5,  step: 0.05  },
    { name: 'radial_bias',      label: 'Radial Bias',    type: 'range', default: 0.5,  min: 0.0, max: 1.0,  step: 0.01  },
  ],
  'rain-glass': [
    { name: 'speed',        label: 'Speed',        type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
    { name: 'drop_density', label: 'Drop Density', type: 'range', default: 1.0,  min: 0.2, max: 3.0,  step: 0.05 },
    { name: 'blur_radius',  label: 'Blur Radius',  type: 'range', default: 0.01, min: 0.0, max: 0.03, step: 0.001 },
    { name: 'streak_length',label: 'Streaks',      type: 'range', default: 0.15, min: 0.0, max: 0.4,  step: 0.01  },
  ],
  'reaction-diffusion': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'silver-gelatin': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'slit-scan': [
    { name: 'speed',        label: 'Speed',       type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
    { name: 'phase_amount', label: 'Phase',       type: 'range', default: 0.3,  min: 0.0, max: 1.0,  step: 0.01  },
    { name: 'chroma_split', label: 'Chroma',      type: 'range', default: 0.008,min: 0.0, max: 0.03, step: 0.001 },
    { name: 'scan_tilt',    label: 'Scan Tilt',   type: 'range', default: 0.0,  min: -0.5,max: 0.5,  step: 0.01  },
  ],
  'subsurface-glow': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'thin-film': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'tilt-shift': [
    { name: 'blur',      label: 'Blur',      type: 'range', default: 10,   min: 2,   max: 30,   step: 1    },
    { name: 'focal_pos', label: 'Focal Pos', type: 'range', default: 50,   min: 10,  max: 90,   step: 1    },
  ],
  'truchet': [
    { name: 'opacity',   label: 'Opacity',   type: 'range', default: 0.18, min: 0.0, max: 1.0,  step: 0.01 },
    { name: 'line_width',label: 'Line Width',type: 'range', default: 1.5,  min: 0.5, max: 6.0,  step: 0.1  },
  ],
  'vj-feedback': [
    { name: 'decay',     label: 'Decay',     type: 'range', default: 0.94, min: 0.7, max: 0.99, step: 0.005 },
    { name: 'zoom',      label: 'Zoom',      type: 'range', default: 1.014,min: 1.0, max: 1.04, step: 0.001 },
    { name: 'rotation',  label: 'Rotation',  type: 'range', default: 0.01, min: -0.05, max: 0.05, step: 0.002 },
  ],
  'volumetric-mie': [
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'voronoi': [
    { name: 'opacity',   label: 'Opacity',   type: 'range', default: 0.85, min: 0.0, max: 1.0,  step: 0.01 },
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
  'watercolor-bleed': [
    { name: 'speed',      label: 'Speed',      type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
    { name: 'blur_radius',label: 'Blur',       type: 'range', default: 0.008,min: 0.0, max: 0.025,step: 0.001 },
    { name: 'saturation', label: 'Saturation', type: 'range', default: 1.3,  min: 0.5, max: 2.5,  step: 0.05  },
    { name: 'grain',      label: 'Grain',      type: 'range', default: 0.04, min: 0.0, max: 0.15, step: 0.005 },
  ],
  'wet-plate': [
    { name: 'strength',  label: 'Strength',  type: 'range', default: 1.0,  min: 0.0, max: 2.0,  step: 0.01 },
    { name: 'speed',     label: 'Speed',     type: 'range', default: 1.0,  min: 0.1, max: 3.0,  step: 0.05 },
  ],
};
