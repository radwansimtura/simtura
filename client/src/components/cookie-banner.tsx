import { Link } from "wouter";
import { useCookieConsent } from "@/hooks/useCookieConsent";

export default function CookieBanner() {
  const { bannerVisible, acceptCookies, declineCookies } = useCookieConsent();

  if (!bannerVisible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999 }}
      className="bg-neutral-900 border-t border-neutral-700 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <p className="text-sm text-neutral-300 max-w-2xl">
        We use a single session cookie to keep you signed in. We don't use advertising or tracking
        cookies.{" "}
        <Link href="/privacy" className="underline text-white hover:text-neutral-200">
          Privacy Policy
        </Link>
      </p>

      <div className="flex gap-3 shrink-0">
        <button
          onClick={declineCookies}
          className="text-sm px-4 py-2 rounded border border-neutral-600 text-neutral-300 hover:border-neutral-400 hover:text-white transition-colors"
        >
          Dismiss
        </button>
        <button
          autoFocus
          onClick={acceptCookies}
          className="text-sm px-4 py-2 rounded bg-white text-black font-medium hover:bg-neutral-200 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
