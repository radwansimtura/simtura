import { createAudioEngine, type AudioEngine } from "./audio-engine";
import { classifyWithHaiku } from "./haiku-router";
import {
  KEYWORD_CONFIDENCE_THRESHOLD,
  routeUtteranceMulti,
} from "./keyword-router";
import { loadManifest, type AssetManifest } from "./manifest";
import {
  applyRouterResult,
  contraindicationChecksComplete,
  createSessionState,
  shouldAutoFireAlsArrival,
  tickElapsed,
} from "./session-state";
import { createSTTClient, type STTClient } from "./stt-client";
import { createLogger, type Logger } from "./transcript-logger";
import {
  DRILL_DURATION_SECONDS,
  SCENARIO_1A_ID,
  SCENARIO_1A_KEY,
  type DrillSessionResult,
  type EndReason,
  type RouterResult,
  type SessionState,
} from "./types";
import { createVisualEngine, type VisualEngine, type VisualEngineHandles, type VisualScene } from "./visual-engine";

const HANDOFF_SILENCE_MS = 5000;
const ALS_DELAY_MS = 7000;

export interface OrchestratorCallbacks {
  onElapsed?: (elapsedSeconds: number) => void;
  onSttListening?: (listening: boolean) => void;
  onSttError?: (message: string) => void;
  onSceneChange?: (scene: VisualScene) => void;
  onTranscriptUpdate?: () => void;
  onSessionEnded?: (reason: EndReason) => void;
}

export interface OrchestratorStartOptions {
  visualHandles: VisualEngineHandles;
  scenarioId?: string;
  scenarioKey?: string;
  callbacks?: OrchestratorCallbacks;
}

export interface DrillOrchestrator {
  start(): Promise<void>;
  stop(reason: EndReason): Promise<DrillSessionResult>;
  getState(): SessionState;
  getLogger(): Logger;
  getSessionId(): string | null;
}

export function createOrchestrator(opts: OrchestratorStartOptions): DrillOrchestrator {
  const scenarioId = opts.scenarioId ?? SCENARIO_1A_ID;
  const scenarioKey = opts.scenarioKey ?? SCENARIO_1A_KEY;
  const cb = opts.callbacks ?? {};

  let state = createSessionState(scenarioKey);
  let manifest: AssetManifest | null = null;
  let audio: AudioEngine | null = null;
  let visual: VisualEngine | null = null;
  let stt: STTClient | null = null;
  let logger: Logger = createLogger(state.startedAtMs);

  let sessionId: string | null = null;
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;
  let alsTimer: ReturnType<typeof setTimeout> | null = null;
  let handoffSilenceTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let processingChain: Promise<void> = Promise.resolve();

  async function createSession() {
    try {
      const res = await fetch("/api/drill/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scenarioId, scenarioKey }),
      });
      if (!res.ok) throw new Error(`create-session ${res.status}`);
      const body = await res.json();
      sessionId = body.id ?? null;
    } catch (err) {
      console.warn("[drill-mode] failed to create drill session", err);
    }
  }

  async function fireResponse(result: RouterResult, source: "candidate" | "auto"): Promise<void> {
    if (stopped) return;
    state = applyRouterResult(state, result);

    if (result.fireClipboardWrite) {
      visual?.showClipboard();
      const label = result.declarationTags.length > 0 ? result.declarationTags.join(", ") : undefined;
      logger.logSystem("clipboard_write", {
        lineId: result.lineId ?? undefined,
        text: label,
      });
    }

    if (!result.lineId) {
      cb.onTranscriptUpdate?.();
      return;
    }

    const isPatient = result.lineId.startsWith("P");
    const eventName = isPatient ? "patient_audio" : "evaluator_audio";
    logger.logSystem(eventName, { lineId: result.lineId });

    // Pause STT for the duration of playback so the mic doesn't pick up the
    // speaker output and transcribe it as a candidate utterance (echo loop).
    stt?.pause();
    try {
      await audio?.playLine(result.lineId);
    } finally {
      stt?.resume();
    }
    cb.onTranscriptUpdate?.();

    if (result.lineId === "E15") scheduleAlsArrival();
    if (result.lineId === "E17") {
      await endSession("handoff_completed");
    }

    if (source === "candidate" && shouldAutoFireAlsArrival(state) && !alsTimer) {
      scheduleAlsArrival();
    }
  }

  function scheduleAlsArrival() {
    if (alsTimer || state.alsArrived || stopped) return;
    alsTimer = setTimeout(() => {
      alsTimer = null;
      if (stopped || state.alsArrived) return;
      void fireResponse(
        {
          category: "STATUS_CHECK",
          lineId: "E16",
          declarationTags: [],
          fireClipboardWrite: false,
          confidence: 1,
          reasoning: "auto-als-arrival",
          source: "keyword",
        },
        "auto",
      );
    }, ALS_DELAY_MS);
  }

  function scheduleHandoffEnd() {
    if (handoffSilenceTimer) clearTimeout(handoffSilenceTimer);
    handoffSilenceTimer = setTimeout(() => {
      handoffSilenceTimer = null;
      if (stopped || !state.handoffInProgress) return;
      void fireResponse(
        {
          category: "STATUS_CHECK",
          lineId: "E17",
          declarationTags: [],
          fireClipboardWrite: true,
          confidence: 1,
          reasoning: "auto-handoff-acknowledge",
          source: "keyword",
        },
        "auto",
      );
    }, HANDOFF_SILENCE_MS);
  }

  function processUtterance(text: string): Promise<void> {
    if (stopped) return Promise.resolve();
    logger.logCandidate(text);
    cb.onTranscriptUpdate?.();

    if (state.handoffInProgress) {
      console.debug("[drill-mode] utterance during handoff window", { text });
      scheduleHandoffEnd();
      return Promise.resolve();
    }

    const start = performance.now();
    const allMatches = routeUtteranceMulti(text, state);
    const confidentMatches = allMatches.filter((r) => r.confidence >= KEYWORD_CONFIDENCE_THRESHOLD);
    console.debug("[drill-mode] router", {
      text,
      totalMatches: allMatches.length,
      confident: confidentMatches.map((m) => ({
        category: m.category,
        lineId: m.lineId,
        tags: m.declarationTags,
        confidence: m.confidence,
        reasoning: m.reasoning,
      })),
    });

    const handle = async () => {
      // Handoff intent (STATUS_CHECK with no lineId) — only when it's the
      // sole confident match. Otherwise it gets buried in the multi list.
      const handoffOnly =
        confidentMatches.length === 1 &&
        confidentMatches[0].category === "STATUS_CHECK" &&
        confidentMatches[0].lineId === null;

      if (handoffOnly) {
        logger.logRouting({
          timestampSeconds: logger.elapsedSeconds(),
          utterance: text,
          result: confidentMatches[0],
          fireDelayMs: performance.now() - start,
        });
        state = { ...state, handoffInProgress: true };
        scheduleHandoffEnd();
        return;
      }

      if (confidentMatches.length === 0) {
        const haikuResult = await classifyWithHaiku(text, state);
        logger.logRouting({
          timestampSeconds: logger.elapsedSeconds(),
          utterance: text,
          result: haikuResult,
          fireDelayMs: performance.now() - start,
        });
        const fallbackResult: RouterResult =
          haikuResult.lineId === null
            ? {
                category: "UNINTELLIGIBLE",
                lineId: "E-fallback",
                declarationTags: [],
                fireClipboardWrite: false,
                confidence: haikuResult.confidence,
                reasoning: haikuResult.reasoning,
                source: haikuResult.source,
              }
            : haikuResult;
        await fireResponse(fallbackResult, "candidate");
        return;
      }

      // Multi-intent path: fire each confident match in priority order.
      // Per routing-logic.md §5.1 — fire all relevant responses in sequence
      // with brief pauses, ordered by category priority (declarations first).
      // Outer pause spans the whole sequence (incl. 250ms gaps) so STT doesn't
      // briefly resume between lines and capture lingering speaker reverb.
      const multi = confidentMatches.length > 1;
      if (multi) stt?.pause();
      try {
        for (let i = 0; i < confidentMatches.length; i++) {
          const result = confidentMatches[i];
          logger.logRouting({
            timestampSeconds: logger.elapsedSeconds(),
            utterance: text,
            result,
            fireDelayMs: performance.now() - start,
          });

          if (result.lineId === "E14" && !contraindicationChecksComplete(state)) {
            logger.logSystem("evaluator_audio", {
              lineId: "PROCEDURAL_NOTE",
              text: "Nitro administered without all contraindication checks complete (logged for grading)",
            });
          }

          await fireResponse(result, "candidate");

          if (i < confidentMatches.length - 1 && !stopped) {
            await new Promise((r) => setTimeout(r, 250));
          }
        }
      } finally {
        if (multi) stt?.resume();
      }
    };

    return handle();
  }

  function enqueue(text: string) {
    processingChain = processingChain.then(() => processUtterance(text)).catch((err) => {
      console.warn("[drill-mode] orchestrator error", err);
    });
  }

  async function endSession(reason: EndReason): Promise<DrillSessionResult> {
    if (stopped) {
      return buildResult(state.endReason ?? reason);
    }
    stopped = true;
    state = { ...state, scenarioEnded: true, endReason: reason };
    logger.logSystem("scenario_end", { text: reason });
    if (elapsedTimer) clearInterval(elapsedTimer);
    if (alsTimer) clearTimeout(alsTimer);
    if (handoffSilenceTimer) clearTimeout(handoffSilenceTimer);
    stt?.stop();
    audio?.stop();
    visual?.stop();

    const result = buildResult(reason);

    if (sessionId) {
      try {
        await fetch(`/api/drill/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            endReason: reason,
            totalElapsedSeconds: result.totalElapsedSeconds,
            transcriptJson: result.transcript,
          }),
        });
      } catch (err) {
        console.warn("[drill-mode] failed to persist session end", err);
      }
    }

    cb.onSessionEnded?.(reason);
    return result;
  }

  function buildResult(reason: EndReason): DrillSessionResult {
    return {
      sessionId: sessionId ?? "",
      transcript: logger.snapshotTranscript(),
      routingLog: logger.snapshotRouting(),
      endReason: reason,
      totalElapsedSeconds: Math.floor((Date.now() - state.startedAtMs) / 1000),
    };
  }

  async function start() {
    manifest = await loadManifest();
    audio = createAudioEngine(manifest);
    await audio.preload();
    visual = createVisualEngine(manifest, opts.visualHandles, (scene) => cb.onSceneChange?.(scene));
    visual.start();

    await createSession();

    state = createSessionState(scenarioKey);
    logger = createLogger(state.startedAtMs);
    logger.logSystem("scenario_start");

    elapsedTimer = setInterval(() => {
      state = tickElapsed(state);
      cb.onElapsed?.(state.elapsedSeconds);
      if (state.elapsedSeconds >= DRILL_DURATION_SECONDS && !stopped) {
        void endSession("timer_expired");
      }
    }, 1000);

    stt = createSTTClient({
      onFinalTranscript: enqueue,
      onError: (msg) => cb.onSttError?.(msg),
      onStateChange: (listening) => cb.onSttListening?.(listening),
    });
    await stt.start();

    await fireResponse(
      {
        category: "CLINICAL_DATA_REQUEST",
        lineId: "D1",
        declarationTags: [],
        fireClipboardWrite: false,
        confidence: 1,
        reasoning: "auto-dispatch",
        source: "keyword",
      },
      "auto",
    );
  }

  return {
    start,
    stop: endSession,
    getState: () => state,
    getLogger: () => logger,
    getSessionId: () => sessionId,
  };
}
