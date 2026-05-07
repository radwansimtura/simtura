import { useEffect, useState } from "react";
import { Sparkles, RotateCcw } from "lucide-react";

const KEY = "simtura_landing_version";

export function getLandingVersion(): "v1" | "v2" {
  if (typeof window === "undefined") return "v2";
  const v = window.localStorage.getItem(KEY);
  return v === "v1" ? "v1" : "v2";
}

export function DesignToggle() {
  const [version, setVersion] = useState<"v1" | "v2">("v2");

  useEffect(() => {
    setVersion(getLandingVersion());
  }, []);

  const swap = () => {
    const next = version === "v2" ? "v1" : "v2";
    window.localStorage.setItem(KEY, next);
    window.location.reload();
  };

  const isNew = version === "v2";

  return (
    <button
      onClick={swap}
      className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-full border border-white/20 bg-black/80 px-4 py-2.5 text-xs font-medium text-white/90 backdrop-blur-md shadow-lg hover:bg-white hover:text-black hover:border-white transition-colors"
      data-testid="button-design-toggle"
      aria-label={isNew ? "Switch to original design" : "Switch to new design"}
      title={isNew ? "Switch to original design" : "Switch to new design"}
    >
      {isNew ? (
        <>
          <RotateCcw className="h-3.5 w-3.5" />
          Original design
        </>
      ) : (
        <>
          <Sparkles className="h-3.5 w-3.5" />
          Try new design
        </>
      )}
    </button>
  );
}
