import { Link } from "wouter";
import simturaLogo from "@assets/Screenshot_2025-08-13_at_9.54.52_AM_1776888878004.png";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 px-6 sm:px-10 py-10 mt-12">
      <div className="mx-auto max-w-7xl flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img src={simturaLogo} alt="Simtura" className="h-7 opacity-80" />
          <span className="text-xs text-white/40 hidden sm:inline">
            Bridging classroom to clinical practice.
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/60">
          <Link href="/ems" className="hover:text-white transition-colors" data-testid="link-footer-ems">
            EMS
          </Link>
          <Link href="/nursing" className="hover:text-white transition-colors" data-testid="link-footer-nursing">
            Nursing
          </Link>
          <Link href="/#pricing" className="hover:text-white transition-colors" data-testid="link-footer-pricing">
            Pricing
          </Link>
          <Link href="/#faq" className="hover:text-white transition-colors" data-testid="link-footer-faq">
            FAQ
          </Link>
          <Link href="/organizations" className="hover:text-white transition-colors" data-testid="link-footer-organizations">
            For Organizations
          </Link>
          <Link href="/contact" className="hover:text-white transition-colors" data-testid="link-footer-contact">
            Contact
          </Link>
          <Link href="/legal" className="hover:text-white transition-colors" data-testid="link-footer-legal">
            Legal
          </Link>
          <Link href="/signin" className="hover:text-white transition-colors" data-testid="link-footer-signin">
            Sign in
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-7xl mt-8 pt-6 border-t border-white/5">
        <p className="text-xs text-white/40 text-center sm:text-left" data-testid="text-copyright">
          © 2026 Simtura.ai · All rights reserved.
        </p>
      </div>
    </footer>
  );
}
