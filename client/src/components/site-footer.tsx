import { Link } from "wouter";
import simturaLogo from "@/assets/simtura-logo.png";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 px-6 sm:px-10 py-10 mt-12">
      <div className="mx-auto max-w-7xl flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <img src={simturaLogo} alt="Simtura" className="h-7 opacity-80" />
          </div>
          <span className="text-xs text-white/40 max-w-xs leading-relaxed">
            The training platform built for clinicians who can't afford to guess.
          </span>
          {/* Trust signals */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
              SOC 2 compliant
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              NREMT & NCLEX aligned
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd"/></svg>
              Reviewed by clinicians
            </span>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/60">
          <Link href="/ems" className="hover:text-white transition-colors" data-testid="link-footer-ems">
            EMS
          </Link>
          <Link href="/nursing" className="hover:text-white transition-colors" data-testid="link-footer-nursing">
            Nursing
          </Link>
          <Link href="/fire" className="hover:text-white transition-colors" data-testid="link-footer-fire">
            Fire
          </Link>
          <Link href="/police" className="hover:text-white transition-colors" data-testid="link-footer-police">
            Police
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
          <Link href="/privacy" className="hover:text-white transition-colors" data-testid="link-footer-privacy">
            Privacy Policy
          </Link>
          <Link href="/signin" className="hover:text-white transition-colors" data-testid="link-footer-signin">
            Sign in
          </Link>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-xs text-white/40" data-testid="text-copyright">
          © 2026 Simtura.ai · All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <a href="https://twitter.com/simtura" className="text-white/40 hover:text-white transition-colors text-xs">Twitter / X</a>
          <a href="https://linkedin.com/company/simtura" className="text-white/40 hover:text-white transition-colors text-xs">LinkedIn</a>
          <a href="https://instagram.com/simtura" className="text-white/40 hover:text-white transition-colors text-xs">Instagram</a>
        </div>
      </div>
    </footer>
  );
}
