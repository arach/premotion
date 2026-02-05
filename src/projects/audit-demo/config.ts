// Audit Demo - Configuration
// Edit these values to customize the video

export const config = {
  // Video file (in /public folder)
  videoFile: "audit-demo.mp4",

  // Timing (in seconds)
  introDuration: 3,
  transitionDuration: 0.67, // crossfade overlap
  videoDuration: 25.7, // source video length

  // Video appearance
  videoScale: 1.09, // how much to scale up the embedded video

  // Intro text customization
  intro: {
    tagline: "Website Audit Tool",
    loadingText: "LOADING DEMO",
  },

  // Colors
  colors: {
    primary: "#ffffff",
    background: "#0a0a0b",
    accent: "rgba(100, 100, 150, 0.15)",
  },
};

// Calculated values (don't edit these)
export const FPS = 30;
export const INTRO_FRAMES = config.introDuration * FPS;
export const TRANSITION_FRAMES = Math.round(config.transitionDuration * FPS);
export const VIDEO_FRAMES = Math.round(config.videoDuration * FPS);
export const TOTAL_FRAMES = INTRO_FRAMES + VIDEO_FRAMES - TRANSITION_FRAMES;
