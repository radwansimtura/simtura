import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

const FEATURES = [
  "Unlimited scenarios — every day",
  "Full EMS and Nursing libraries",
  "Detailed performance analytics",
  "AI-graded open-response mode",
  "Priority access to new scenarios",
];

export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const { upgrade, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await upgrade();
      toast({
        title: "Welcome to Pro.",
        description: "Unlimited scenarios are now unlocked.",
      });
      onClose();
    } catch (e: any) {
      toast({
        title: "Upgrade failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
          data-testid="upgrade-modal"
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-900 to-black p-8 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
              onClick={onClose}
              aria-label="Close"
              data-testid="button-close-upgrade"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-300 text-xs uppercase tracking-[0.25em] mb-4">
              <Crown className="h-4 w-4" />
              Simtura Pro
            </div>

            <h2 className="text-3xl font-bold tracking-tight mb-2">
              Unlimited training.
            </h2>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">
              {reason ??
                "Free accounts get one scenario per day. Upgrade to keep practicing without limits."}
            </p>

            <ul className="space-y-3 mb-8">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/85">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="h-3 w-3 text-emerald-300" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">$19</span>
                <span className="text-white/50 text-sm">/month</span>
              </div>
              <p className="text-xs text-white/50 mt-1">Cancel anytime.</p>
            </div>

            <Button
              size="lg"
              disabled={loading || !user}
              onClick={handleUpgrade}
              className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium"
              data-testid="button-confirm-upgrade"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {loading ? "Activating..." : "Upgrade to Pro"}
            </Button>
            {!user && (
              <p className="text-center text-xs text-white/50 mt-3">
                Sign in first to upgrade.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
