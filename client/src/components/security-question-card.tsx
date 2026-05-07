import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { SECURITY_QUESTIONS, type PublicUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, KeyRound } from "lucide-react";

export function SecurityQuestionCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [answer, setAnswer] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/security-question", {
        securityQuestion: question,
        securityAnswer: answer,
      });
      return (await res.json()) as PublicUser;
    },
    onSuccess: (u) => {
      queryClient.setQueryData(["/api/auth/me"], u);
      toast({ title: "Security question saved." });
      setAnswer("");
      setEditing(false);
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't save",
        description: err?.message?.replace(/^\d+:\s*/, "") || "Try again.",
        variant: "destructive",
      });
    },
  });

  const hasOne = !!user?.hasSecurityQuestion;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
          {hasOne ? (
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          ) : (
            <KeyRound className="h-5 w-5 text-amber-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold">Security question</h3>
          <p className="mt-1 text-sm text-white/60" data-testid="text-security-status">
            {hasOne
              ? "You have a security question on file. Use it to reset your password if you ever forget it."
              : "Set a security question so you can reset your password if you ever forget it."}
          </p>

          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="mt-4 rounded-full border-white/20 bg-transparent text-white hover:bg-white/[0.06]"
              data-testid="button-edit-security-question"
            >
              {hasOne ? "Change question" : "Set question"}
            </Button>
          ) : (
            <div className="mt-5 space-y-4">
              <div>
                <Label className="text-white/70 text-xs uppercase tracking-wider">
                  Question
                </Label>
                <Select value={question} onValueChange={setQuestion}>
                  <SelectTrigger
                    className="mt-2 h-11 rounded-xl bg-white/[0.04] border-white/10 text-white"
                    data-testid="select-security-question"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {SECURITY_QUESTIONS.map((q) => (
                      <SelectItem key={q} value={q}>
                        {q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="answer" className="text-white/70 text-xs uppercase tracking-wider">
                  Answer
                </Label>
                <Input
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="mt-2 h-11 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/40"
                  placeholder="Case- and space-insensitive"
                  data-testid="input-security-answer"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={mutation.isPending || answer.trim().length < 2}
                  onClick={() => mutation.mutate()}
                  className="rounded-full bg-white text-black hover:bg-white/90"
                  data-testid="button-save-security-question"
                >
                  {mutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setAnswer("");
                  }}
                  className="rounded-full text-white/70 hover:text-white hover:bg-white/[0.06]"
                  data-testid="button-cancel-security-question"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
