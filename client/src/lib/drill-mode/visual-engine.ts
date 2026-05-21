import { type AssetManifest, pickClipboardVariant } from "./manifest";

export type VisualScene = "wide" | "clipboard";

export interface VisualEngineHandles {
  backgroundRef: { current: HTMLVideoElement | null };
  clipboardRef: { current: HTMLVideoElement | null };
}

export interface VisualEngine {
  start(): void;
  showClipboard(): void;
  showWide(): void;
  getScene(): VisualScene;
  stop(): void;
}

export function createVisualEngine(
  manifest: AssetManifest,
  handles: VisualEngineHandles,
  onSceneChange?: (scene: VisualScene) => void,
): VisualEngine {
  let scene: VisualScene = "wide";
  let cutTimer: ReturnType<typeof setTimeout> | null = null;

  function setScene(next: VisualScene) {
    scene = next;
    onSceneChange?.(next);
  }

  function clearTimer() {
    if (cutTimer) {
      clearTimeout(cutTimer);
      cutTimer = null;
    }
  }

  function start() {
    const bg = handles.backgroundRef.current;
    if (!bg) return;
    bg.loop = true;
    bg.muted = true;
    bg.playsInline = true;
    bg.src = manifest.video.backgroundLoop;
    bg.play().catch(() => {});
  }

  function showWide() {
    clearTimer();
    setScene("wide");
  }

  function showClipboard() {
    // Visible clipboard-write feedback is disabled until real Runway clipboard
    // clips replace the placeholder mp4s in /drill-assets/scenario-1a/
    // clipboard-*.mp4 (currently 2–5 KB solid-color stubs). When the scene
    // swaps to one of those, it covers the room background and reads as a
    // gray flash, which broke the experience whenever the candidate's
    // utterance matched a graded rule. The clipboard_write transcript event
    // is still logged by the orchestrator for grading.
    //
    // To re-enable: restore the variant pick + src/play + setScene("clipboard")
    // + cutTimer block. Untouched: pickClipboardVariant, manifest entries,
    // and the clipboardRef element — all stay wired so the swap is a one-line
    // restore once assets land.
    clearTimer();
    // Keep the import live so re-enabling is a one-line edit, not an import dance.
    void pickClipboardVariant;
  }

  function stop() {
    clearTimer();
    const bg = handles.backgroundRef.current;
    if (bg) bg.pause();
    const clipboard = handles.clipboardRef.current;
    if (clipboard) clipboard.pause();
  }

  return { start, showClipboard, showWide, getScene: () => scene, stop };
}
