import type { RoutingLogEntry, TranscriptEntry } from "./types";

export interface Logger {
  logCandidate(text: string): void;
  logSystem(
    event: Extract<TranscriptEntry, { speaker: "system" }>["event"],
    detail?: { lineId?: string; text?: string },
  ): void;
  logRouting(entry: RoutingLogEntry): void;
  snapshotTranscript(): TranscriptEntry[];
  snapshotRouting(): RoutingLogEntry[];
  elapsedSeconds(): number;
}

export function createLogger(startedAtMs: number): Logger {
  const transcript: TranscriptEntry[] = [];
  const routing: RoutingLogEntry[] = [];
  const elapsed = () => (Date.now() - startedAtMs) / 1000;

  return {
    logCandidate(text) {
      transcript.push({ timestampSeconds: elapsed(), speaker: "candidate", text });
    },
    logSystem(event, detail) {
      transcript.push({
        timestampSeconds: elapsed(),
        speaker: "system",
        event,
        ...detail,
      });
    },
    logRouting(entry) {
      routing.push(entry);
    },
    snapshotTranscript: () => transcript.slice(),
    snapshotRouting: () => routing.slice(),
    elapsedSeconds: () => elapsed(),
  };
}
