import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface RedeemResponse {
  ok: boolean;
  organizationName: string | null;
}

export function RedeemCodeCard() {
  const [code, setCode] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/redeem-code", { code: code.trim().toUpperCase() });
      return (await res.json()) as RedeemResponse;
    },
    onSuccess: (data) => {
      toast({
        title: "Welcome to Pro.",
        description: data.organizationName
          ? `Activated by ${data.organizationName}. Unlimited training unlocked.`
          : "Unlimited training unlocked.",
      });
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/stats"] });
    },
    onError: (e: any) => {
      toast({
        title: "Could not redeem code",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-2 text-white/50 text-[11px] uppercase tracking-[0.25em] mb-3">
        <KeyRound className="h-3.5 w-3.5" />
        Redeem an organization code
      </div>
      <h3 className="text-lg font-semibold mb-1">Got a code from your school or agency?</h3>
      <p className="text-sm text-white/60 mb-4 leading-relaxed">
        Enter it below to unlock Pro instantly.
      </p>
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!code.trim()) return;
          mutation.mutate();
        }}
      >
        <Input
          required
          placeholder="XXXX-XXXX-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="flex-1 h-11 font-mono tracking-wider bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
          data-testid="input-redeem-code"
        />
        <Button
          type="submit"
          disabled={mutation.isPending || !code.trim()}
          className="h-11 rounded-full bg-white text-black hover:bg-white/90 font-medium px-6"
          data-testid="button-redeem-code"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {mutation.isPending ? "Redeeming..." : "Redeem"}
        </Button>
      </form>
    </div>
  );
}
