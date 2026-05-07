declare module 'html2canvas-pro' {
  export default function html2canvas(
    element: HTMLElement,
    options?: Record<string, unknown>,
  ): Promise<HTMLCanvasElement>;
}

declare module '@voxd/client' {
  type AudioFormat = 'wav' | 'aac' | 'opus';

  interface TranscribeInput {
    audio: Blob;
    format: AudioFormat;
    language?: string;
    metadata?: Record<string, unknown>;
  }

  interface VoxdClient {
    capabilities(): Promise<unknown>;
    probe(): Promise<boolean>;
    transcribe(input: TranscribeInput): Promise<{ text: string }>;
  }

  export function createVoxdClient(): VoxdClient;
}

declare module '@xterm/xterm' {
  export class Terminal {
    cols: number;
    rows: number;
    options: {
      fontSize?: number;
      fontFamily?: string;
      [key: string]: unknown;
    };

    constructor(options?: Record<string, unknown>);
    dispose(): void;
    focus(): void;
    loadAddon(addon: unknown): void;
    onData(callback: (data: string) => void): { dispose(): void } | void;
    open(element: HTMLElement): void;
    write(data: string): void;
  }
}

declare module '@xterm/addon-fit' {
  export class FitAddon {
    dispose(): void;
    fit(): void;
  }
}

declare module '@xterm/addon-webgl' {
  export class WebglAddon {
    dispose(): void;
    onContextLoss(callback: () => void): void;
  }
}
