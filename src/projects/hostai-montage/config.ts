// HostAI Montage - Configuration (3 Acts)

export const config = {
  // 3 Acts structure
  acts: [
    // Act 1: Video 1 - generating the report
    {
      file: "hostai-demo-1.mp4",
      startTime: 0,
      endTime: 48.7, // full video
      targetDuration: 9, // sped up to 9s
    },
    // Act 2: Video 2, first portion - navigating data
    {
      file: "hostai-demo-2.mp4",
      startTime: 0,
      endTime: 40, // first 40 seconds
      targetDuration: 20, // sped up to 20s
    },
    // Act 3: Video 2, seconds 40-51 - the actual report
    {
      file: "hostai-demo-2.mp4",
      startTime: 40,
      endTime: 51, // 11 seconds of content
      targetDuration: 11, // real speed
    },
  ],

  // Timing (in seconds)
  introDuration: 3,
  transitionDuration: 0.5,

  // Video appearance
  videoScale: 0.65,

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

  // Signature
  signature: {
    preparedBy: "@arach",
  },
};

// Calculated values
export const FPS = 30;
export const SOURCE_VIDEO_FPS = 50; // actual frame rate of source videos
export const INTRO_FRAMES = config.introDuration * FPS;
export const TRANSITION_FRAMES = Math.round(config.transitionDuration * FPS);

// Calculate playback rates and frame counts for each act
export const ACT1_ORIGINAL_DURATION = config.acts[0].endTime - config.acts[0].startTime;
export const ACT2_ORIGINAL_DURATION = config.acts[1].endTime - config.acts[1].startTime;
export const ACT3_ORIGINAL_DURATION = config.acts[2].endTime - config.acts[2].startTime;

export const ACT1_PLAYBACK_RATE = ACT1_ORIGINAL_DURATION / config.acts[0].targetDuration;
export const ACT2_PLAYBACK_RATE = ACT2_ORIGINAL_DURATION / config.acts[1].targetDuration;
export const ACT3_PLAYBACK_RATE = ACT3_ORIGINAL_DURATION / config.acts[2].targetDuration;

export const ACT1_FRAMES = Math.round(config.acts[0].targetDuration * FPS);
export const ACT2_FRAMES = Math.round(config.acts[1].targetDuration * FPS);
export const ACT3_FRAMES = Math.round(config.acts[2].targetDuration * FPS);

// 3 transitions: intro->act1, act1->act2, act2->act3
export const TOTAL_FRAMES = INTRO_FRAMES + ACT1_FRAMES + ACT2_FRAMES + ACT3_FRAMES - TRANSITION_FRAMES * 3;
