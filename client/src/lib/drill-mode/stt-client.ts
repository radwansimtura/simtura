// v1: Web Speech API. Future: swap in Deepgram via server-proxied tokens
// without changing this interface.

export interface STTClient {
  start(): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  isListening(): boolean;
}

export interface STTHandlers {
  onFinalTranscript: (text: string) => void;
  onError?: (message: string) => void;
  onStateChange?: (listening: boolean) => void;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export function isSTTSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createSTTClient(handlers: STTHandlers): STTClient {
  const RawCtor =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  if (!RawCtor) {
    return {
      async start() {
        handlers.onError?.("Speech recognition not supported in this browser");
      },
      stop() {},
      pause() {},
      resume() {},
      isListening: () => false,
    };
  }

  const Ctor: SpeechRecognitionCtor = RawCtor;
  let recognition: SpeechRecognitionInstance | null = null;
  let listening = false;
  let shouldKeepListening = false;
  // Reference-counted pause: pause() while audio plays, resume() when it ends.
  // Multiple pause()s stack so back-to-back lines don't briefly resume STT
  // between them and pick up the room reverb of the previous line.
  let pauseDepth = 0;

  function setListening(next: boolean) {
    listening = next;
    handlers.onStateChange?.(next);
  }

  function buildRecognition(): SpeechRecognitionInstance {
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = false;
    r.lang = "en-US";

    r.onresult = (event) => {
      // Drop any results that arrive while paused — Web Speech may flush a
      // buffered final result right at the moment we abort. Those are exactly
      // the speaker-echo transcripts we're trying to discard.
      if (pauseDepth > 0) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) handlers.onFinalTranscript(text);
        }
      }
    };

    r.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      handlers.onError?.(event.error);
    };

    r.onstart = () => setListening(true);

    r.onend = () => {
      setListening(false);
      if (shouldKeepListening && pauseDepth === 0) {
        try {
          r.start();
        } catch {
          // ignore — will be restarted by next user action if needed
        }
      }
    };

    return r;
  }

  return {
    async start() {
      shouldKeepListening = true;
      recognition = buildRecognition();
      try {
        recognition.start();
      } catch (err) {
        handlers.onError?.(err instanceof Error ? err.message : "stt-start-failed");
      }
    },
    stop() {
      shouldKeepListening = false;
      pauseDepth = 0;
      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // ignore
        }
        recognition = null;
      }
      setListening(false);
    },
    pause() {
      pauseDepth++;
      if (pauseDepth !== 1) return;
      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // ignore
        }
      }
    },
    resume() {
      if (pauseDepth === 0) return;
      pauseDepth--;
      if (pauseDepth > 0) return;
      if (!shouldKeepListening || !recognition) return;
      try {
        recognition.start();
      } catch {
        // Already running, or in a state where start() fails — rebuild and try once.
        try {
          recognition = buildRecognition();
          recognition.start();
        } catch {
          // ignore
        }
      }
    },
    isListening: () => listening,
  };
}
