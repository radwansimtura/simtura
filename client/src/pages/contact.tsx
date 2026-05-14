import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Mail, MapPin, MessagesSquare } from "lucide-react";
import simturaLogo from "@/assets/simtura-logo.png";
import { SiteFooter } from "@/components/site-footer";

export default function ContactPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/contact", { name, email, message });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Message sent.", description: "We'll be in touch shortly." });
      setName("");
      setEmail("");
      setMessage("");
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't send",
        description: err?.message?.replace(/^\d+:\s*/, "") || "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-black text-white relative">
      <div className="fixed inset-0 z-0 opacity-[0.08] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.5),_transparent_60%)]" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 h-20 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-home">
              <ArrowLeft className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
              <img src={simturaLogo} alt="Simtura" className="h-9" />
            </div>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-20 px-6 sm:px-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-4">Contact</p>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">Let's talk.</h1>
          <p className="mt-4 text-white/60 text-lg max-w-xl">
            Schools, programs, and individual learners — we'd love to hear from you.
          </p>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-[1fr,1.5fr] mt-14">
          {/* Info column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            <ContactItem
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value="radwan@simtura.ai"
            />
            <ContactItem
              icon={<MessagesSquare className="h-4 w-4" />}
              label="Partnerships"
              value="radwan@simtura.ai"
            />
            <ContactItem
              icon={<MapPin className="h-4 w-4" />}
              label="Office"
              value="Remote · United States"
            />
          </motion.div>

          {/* Form column */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 space-y-5"
          >
            <div>
              <Label htmlFor="name" className="text-white/70 text-xs uppercase tracking-wider">
                Name
              </Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-12 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/30"
                data-testid="input-name"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-white/70 text-xs uppercase tracking-wider">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-12 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/30"
                data-testid="input-email"
              />
            </div>
            <div>
              <Label htmlFor="message" className="text-white/70 text-xs uppercase tracking-wider">
                How can we help?
              </Label>
              <Textarea
                id="message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/30 resize-none"
                data-testid="input-message"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={submit.isPending}
              className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium"
              data-testid="button-send"
            >
              {submit.isPending ? "Sending..." : "Send message"}
              {!submit.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </motion.form>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function ContactItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 text-white/50 text-[11px] uppercase tracking-[0.2em] mb-2">
        {icon}
        {label}
      </div>
      <div className="text-base text-white">{value}</div>
    </div>
  );
}
