import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import simturaLogo from "@/assets/simtura-logo.png";

const JOKES = [
  "Pain scale of 1–10. Patient: '11.' You: '…okay. Eleven.'",
  "'He was fine an hour ago.' Name a more iconic last sentence. I'll wait.",
  "Rookie: 'It's pretty quiet tonight.' Veteran, already putting on their jacket: 'Get out.'",
  "Patient called 911 because they 'didn't want to drive.' Arrived by Uber. The Uber is still running outside.",
  "Medic's food pyramid: gas station coffee, granola bar inhaled while driving, and whatever was left in the cab from the last shift.",
  "'What medications are you on?' 'The little white ones.' 'Which ones?' 'All of them.'",
  "GCS of 15. The most dangerous number in EMS.",
  "Year 1: I'll save everyone. Year 3: I'll save most people. Year 7: I will document this correctly and go home.",
  "Patient: 'I have a high pain tolerance.' IV needle enters vein. Patient: 'ACTUALLY—'",
  "The family who says 'this has been going on for three weeks' is describing something that should have been a 911 call three weeks ago.",
  "'Am I going to be okay?' Technically yes. Statistically, eventually no. Tonight though, probably yes.",
  "Nothing clears a room faster than a medic saying 'huh, that's interesting' while reading a 12-lead.",
  "Dispatch: 'chest pain, 3-minute ETA.' Patient, upon arrival, actively eating a footlong: 'Oh good, you're here.'",
  "The Q-word kills more shifts than any actual emergency. Say it and accept what you've done.",
  "Two types of medics: those who've had an IV bag explode on them, and those who haven't yet.",
  "'It only hurts when I breathe.' Sir, that is the one thing I needed you to keep doing.",
  "'I Googled it.' Cool. What did Google say? 'Either dehydrated or dying.' Those are not mutually exclusive.",
  "Altered mental status: the catch-all diagnosis for when you walk in and immediately understand everything.",
  "Fastest creature on Earth: a paramedic hearing 'the family has some questions.'",
  "Patient rating pain 10/10. Currently on their phone. Laughing at a reel. 10/10.",
  "Nobody became a paramedic for the money. We have confirmed this. Every year. For decades.",
  "The only job where 'nothing happened' is the best possible performance review.",
  "'Does this look infected to you?' has never once been asked about something that was fine.",
  "Medic's internal monologue on every call: okay. okay. OKAY. okay. we're fine. okay.",
  "There's a call every medic has that they will take to the grave. Not sad. Just legally complicated.",
  "What's a medic's ideal shift? One meal. Warm. Eaten sitting down. That's the dream.",
  "Patient: 'I don't need an ambulance.' Also patient: on the floor, gray, BP of 58. 'I'll walk.'",
  "'Frequent flyer' is EMS for 'we know your coffee order and your mom's name.'",
  "Dispatch sends you a 'difficulty breathing.' You arrive. Patient is mid-argument with their roommate. Bilateral lung sounds clear.",
  "The paramedic who's always calm has either been doing this for two weeks or thirty years. No in-between.",
  "Every medic knows exactly what shift they stopped saying 'it can't get worse than this.'",
  "Twelve-lead looks fine. Patient looks fine. Something is extremely wrong. This is EMS intuition and it is always correct.",
  "'He just needs fluids.' — said by every family member who has ever called 911 about a stroke.",
  "What do you call an EMT who's always on time? Someone whose partner drives.",
  "ALS intercept pulls up. BLS medic: 'oh thank God.' ALS medic, seeing the patient: 'oh no.'",
  "Scene safe? Sure. Relatively. Compared to what? We'll find out in about 90 seconds.",
  "Trauma bay nurse, seeing the same frequent flyer for the fourth time this week: '…hey.'",
  "Patient: 'I've been having chest pain for five days.' You, writing: five. days. Patient: 'Didn't want to bother anyone.' You, still writing: did. not. want. to. bother.",
  "The stethoscope around the neck means absolutely nothing about whether this person knows what they're doing.",
  "EMS: the only profession where 'uneventful' is the highest praise.",
];

export default function WelcomeBackPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";
  const joke = JOKES[Math.floor(Math.random() * JOKES.length)];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.05),_transparent_60%)]" />
      </div>

      <nav className="relative z-10 mx-auto max-w-7xl w-full px-6 sm:px-10 h-20 flex items-center">
        <img src={simturaLogo} alt="Simtura" className="h-9" />
      </nav>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-lg"
        >
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/40 mb-4">
            You're in
          </p>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            Welcome back,<br />{firstName}.
          </h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 mb-10"
          >
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/30 mb-3">Today's joke</p>
            <p className="text-white/70 text-sm leading-relaxed italic">"{joke}"</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href="/ems">
              <Button
                size="lg"
                className="h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium px-7"
              >
                Start Training
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/">
              <Button
                size="lg"
                variant="ghost"
                className="h-12 rounded-full text-white/60 hover:text-white hover:bg-white/10 font-medium px-7"
              >
                <Home className="mr-2 h-4 w-4" />
                Main Page
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
