import type { RouterResult, SessionState } from "./types";

export async function classifyWithHaiku(
  utterance: string,
  state: SessionState,
): Promise<RouterResult> {
  try {
    const res = await fetch("/api/drill/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ utterance, state }),
    });
    if (!res.ok) throw new Error(`route api ${res.status}`);
    const body: RouterResult = await res.json();
    return body;
  } catch (err) {
    return {
      category: "UNINTELLIGIBLE",
      lineId: "E-fallback",
      declarationTags: [],
      fireClipboardWrite: false,
      confidence: 0,
      reasoning: `haiku-fallback-error: ${err instanceof Error ? err.message : "unknown"}`,
      source: "fallback",
    };
  }
}
