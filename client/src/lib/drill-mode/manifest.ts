export interface ClipboardVariant {
  url: string;
  weight: number;
  durationSeconds: number;
}

export interface AssetManifest {
  scenarioId: string;
  version: string;
  baseUrl: string;
  video: {
    backgroundLoop: string;
    patientCloseup: string;
    clipboardWrites: ClipboardVariant[];
  };
  audio: Record<string, string>;
}

const MANIFEST_PATH = "/drill-assets/scenario-1a/manifest.json";

export async function loadManifest(): Promise<AssetManifest> {
  const res = await fetch(MANIFEST_PATH, { credentials: "include" });
  if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`);
  return res.json();
}

export function pickClipboardVariant(variants: ClipboardVariant[]): ClipboardVariant {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const v of variants) {
    roll -= v.weight;
    if (roll <= 0) return v;
  }
  return variants[variants.length - 1];
}
