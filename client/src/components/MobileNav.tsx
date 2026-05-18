import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

interface NavLinkSpec {
  href: string;
  label: string;
  external?: boolean;
}

const MOBILE_NAV_LINKS: NavLinkSpec[] = [
  { href: "/ems", label: "EMS" },
  { href: "/nursing", label: "Nursing" },
  { href: "/learn", label: "Learn" },
  { href: "/organizations", label: "For Organizations" },
  { href: "/#pricing", label: "Pricing", external: true },
  { href: "/why-it-works", label: "Why Simtura.ai Works" },
];

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        data-testid="mobile-nav-button"
        className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
      >
        <Menu className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="mobile-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMenu}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
              data-testid="mobile-nav-backdrop"
            />
            <motion.div
              key="mobile-nav-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 right-0 bottom-0 z-[60] w-72 sm:w-80 bg-black border-l border-white/10 flex flex-col md:hidden"
              data-testid="mobile-nav-drawer"
            >
              <div className="flex justify-end p-4">
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="Close menu"
                  data-testid="mobile-nav-close"
                  className="p-2 text-white/70 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto">
                {MOBILE_NAV_LINKS.map((link) => {
                  const active = !link.external && location === link.href;
                  const classes = `block py-4 px-6 text-base border-b border-white/5 transition-colors hover:text-white hover:bg-white/5 ${
                    active
                      ? "text-white border-l-2 border-l-blue-500"
                      : "text-white/80"
                  }`;
                  const testId = `mobile-nav-link-${link.href.replace(/[^a-z0-9]/gi, "") || "home"}`;
                  if (link.external) {
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={closeMenu}
                        className={classes}
                        data-testid={testId}
                      >
                        {link.label}
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className={classes}
                      data-testid={testId}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
