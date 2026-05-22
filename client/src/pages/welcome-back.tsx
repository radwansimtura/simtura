import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import simturaLogo from "@/assets/simtura-logo.png";

const JOKES = [
  "'How long have you had this chest pain?' 'About three days.' 'Three days?!' 'I didn't want to be a bother.' Sir. You called us at 3 AM.",
  "New medic: 'It's pretty quiet tonight.' Veteran medic: 'Get out of the truck. Get out right now.'",
  "EMS diet: whatever you can inhale in the 90 seconds between your food arriving and the next tone dropping.",
  "Patient: 'Am I going to die?' Medic: 'Eventually, yes. But probably not today.'",
  "The patient rating their pain 10/10 while scrolling TikTok is a cornerstone of prehospital medicine.",
  "'He was fine an hour ago.' — the most famous last words in EMS.",
  "Four stages of EMS: orientation, excitement, disillusionment, and gallows humor.",
  "Patient: 'I have a high pain tolerance.' Also patient, 30 seconds into the IV start: 'ABSOLUTELY NOT.'",
  "You know you've been in EMS too long when your idea of a great call is one where nothing interesting happens.",
  "'What medications are you on?' 'The little ones.' 'Which little ones?' 'All of them.'",
  "What does every medic say before every single shift? 'I just need one quiet night.' What does the universe say back? 'LOL.'",
  "The patient who insists they don't need an ambulance — from the floor, diaphoretic, with a BP of 60 — is a tale as old as time.",
  "Medic's first year: 'I will treat every patient with the same compassion.' Medic's fifth year: 'Ma'am, this is the fourth time this week.'",
  "'Does this look infected to you?' — a question that has never once been answered with 'No, you're fine.'",
  "What's a paramedic's definition of a good night? Getting to eat a meal. Just once. While it's still warm.",
  "GCS of 15 means the patient is about to do something that drops it to 3.",
  "EMS translation guide: 'Altered mental status' = could be literally anything. 'Frequent flyer' = we know their Wi-Fi password. 'Stable' = hasn't crashed yet.",
  "The fastest human alive is a medic who hears 'the family has a few questions.'",
  "You know you're deep in EMS when you fall asleep in under 60 seconds, eat anything without tasting it, and use 'FUBAR' as a clinical term.",
  "'It hurts everywhere.' Okay, point to the one place it doesn't hurt. That's fine too.",
  "What's the difference between God and a paramedic? God doesn't think he's a doctor. The doctor thinks he's God. The paramedic just wants to go home.",
  "First rule of EMS: never say it's quiet. Second rule of EMS: I cannot stress this enough — never say it's quiet.",
  "Patient: 'I Googled my symptoms.' Medic: 'And?' Patient: 'I'm either dehydrated or dying.' Medic: 'Those aren't mutually exclusive.'",
  "EMS is the only job where you can eat a gas station sandwich at 4 AM, deal with something horrific, and still care deeply about the outcome.",
  "What do you call a paramedic who's always calm? New. Definitely new.",
  "At some point every medic has said 'That's not how any of this works' and then done it anyway because the protocol said to.",
  "Patient: 'I think I'm allergic to everything.' Medic: 'Including helpful medical care?' Patient: 'Especially that.' Medic: 'Fair enough.'",
  "'It only hurts when I breathe.' Well, congratulations, because you've come to exactly the right place.",
  "What does a medic call 8 hours of uninterrupted sleep? Retirement planning.",
  "The family who meets you at the door and says 'Thank God you're here, this has been going on for weeks' is never, ever describing a minor problem.",
  "Stage 1 of EMS: 'I'm going to save everyone.' Stage 2: 'I'm going to save some people.' Stage 3: 'I'm going to document correctly and go home.'",
  "Rookie sees a critical patient and thinks: what do I do? Veteran sees the same patient and thinks: I'm not eating today.",
  "What's the difference between an EMS provider and a pizza delivery driver? The pizza driver knows where they're going and gets a tip.",
  "Medic to trainee after a rough call: 'You good?' Trainee: 'Yeah.' Medic: 'Good. Get back in the truck.'",
  "There are only two kinds of medics: those who've had an IV bag explode on them, and those who will.",
  "'Can you rate your pain on a scale of 1 to 10?' 'Eleven.' 'That's not— okay. Eleven.'",
  "Nobody has ever once said 'I'm so glad I became a paramedic for the money.'",
  "EMS humor isn't dark because we're bad people. It's dark because it's the only thing keeping us from losing it on a Tuesday.",
  "What's a paramedic's favorite sound? The 'back in service' beep after a brutal call.",
  "Dispatch: 'Unit 4, respond to a possible cardiac arrest.' Unit 4: 'Copy, en route.' Unit 4, to partner: 'I just took a bite of my burger.' Partner: 'I'll drive.'",
  "Every medic has a call they can't tell anyone about because it's either too sad, too weird, or legally complicated.",
  "The patient who says 'I walked to the ambulance on my own, so how bad can it be?' has never met the aneurysm that also felt fine until it didn't.",
  "'Do you know what day it is?' is a question paramedics ask patients. It is also a question paramedics ask themselves after a 24-hour shift.",
  "You know you've been in EMS too long when your family stops asking how your day was.",
  "Pediatric code: the only thing that makes every single person in the bay go completely silent and completely focused, all at once.",
  "Medic's internal monologue after every call: 'Okay. That happened. Moving on.'",
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
