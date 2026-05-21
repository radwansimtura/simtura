import type { AssetManifest } from "./manifest";

export interface AudioEngine {
  preload(): Promise<void>;
  playLine(lineId: string): Promise<void>;
  stop(): void;
  isReady(): boolean;
}

export function createAudioEngine(manifest: AssetManifest): AudioEngine {
  const cache = new Map<string, HTMLAudioElement>();
  let current: HTMLAudioElement | null = null;
  let ready = false;

  async function preload() {
    const entries = Object.entries(manifest.audio);
    await Promise.all(
      entries.map(async ([lineId, url]) => {
        const audio = new Audio(url);
        audio.preload = "auto";
        cache.set(lineId, audio);
        await new Promise<void>((resolve) => {
          const done = () => {
            audio.removeEventListener("canplaythrough", done);
            audio.removeEventListener("error", done);
            resolve();
          };
          audio.addEventListener("canplaythrough", done, { once: true });
          audio.addEventListener("error", done, { once: true });
          audio.load();
        });
      }),
    );
    ready = true;
  }

  async function playLine(lineId: string) {
    const audio = cache.get(lineId);
    if (!audio) {
      console.warn(`[drill-mode] no audio for lineId=${lineId}`);
      return;
    }
    if (current && !current.paused) {
      current.pause();
      current.currentTime = 0;
    }
    current = audio;
    audio.currentTime = 0;
    await audio.play().catch((err) => console.warn(`[drill-mode] play failed: ${err}`));
    await new Promise<void>((resolve) => {
      const done = () => {
        audio.removeEventListener("ended", done);
        audio.removeEventListener("pause", done);
        resolve();
      };
      audio.addEventListener("ended", done, { once: true });
      audio.addEventListener("pause", done, { once: true });
    });
    if (current === audio) current = null;
  }

  function stop() {
    if (current) {
      current.pause();
      current.currentTime = 0;
      current = null;
    }
  }

  return { preload, playLine, stop, isReady: () => ready };
}
