import { Link, useLocation } from "wouter";

interface NavLinkSpec {
  href: string;
  label: string;
  external?: boolean;
  testId: string;
}

const NAV_LINKS: NavLinkSpec[] = [
  { href: "/ems", label: "EMS", testId: "link-nav-ems" },
  { href: "/nursing", label: "Nursing", testId: "link-nav-nursing" },
  { href: "/learn", label: "Learn", testId: "link-nav-learn" },
  { href: "/organizations", label: "For Organizations", testId: "link-nav-organizations" },
  { href: "/#pricing", label: "Pricing", external: true, testId: "link-nav-pricing" },
  { href: "/why-it-works", label: "Why Simtura.ai Works", testId: "link-nav-why-it-works" },
];

export default function DesktopNav() {
  const [location] = useLocation();

  return (
    <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
      {NAV_LINKS.map((link) => {
        const active = !link.external && location === link.href;
        const className = active
          ? "text-white transition-colors"
          : "hover:text-white transition-colors";

        if (link.external) {
          return (
            <a key={link.href} href={link.href} className={className} data-testid={link.testId}>
              {link.label}
            </a>
          );
        }
        return (
          <Link key={link.href} href={link.href} className={className} data-testid={link.testId}>
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
