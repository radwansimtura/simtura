import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import simturaLogo from "@assets/Screenshot_2025-08-13_at_9.54.52_AM_1776888878004.png";

const JOKES = [
  "Why did the EMT bring a ladder to the call? The patient's blood pressure was through the roof.",
  "What do you call a nurse who can't stop working? Unstoppable — and also probably understaffed.",
  "Why don't paramedics ever get lost? They always follow the right protocol.",
  "What's an EMT's favorite music? Anything with a good pulse.",
  "Why did the nursing student bring a red pen to clinical? In case she needed to draw blood.",
  "Why do nurses make great detectives? They're always taking notes and checking vitals.",
  "What do you call a doctor who fixes everything? A suture-hero.",
  "Why did the skeleton go to the ER? Because his body was killing him.",
  "What did the doctor say to the patient who swallowed a pen? I'll be with you in a minute, sit tight.",
  "Why did the hospital hire an electrician? They needed someone who knew how to conduct a proper assessment.",
  "What's a cardiologist's favorite game? Solitaire — one heart at a time.",
  "Why did the EMT sit on the patient? They told him to keep his blood pressure down.",
  "What do you call an alligator in a hospital gown? An investi-gator.",
  "Why did the paramedic become a chef? He was great at intubating — he could tube anything.",
  "What do you call a nurse with sore feet? A registered tired.",
  "Why don't doctors trust stairs? Because they're always up to something.",
  "What did the patient say to the nurse after surgery? You sewed me up, I owe you one.",
  "Why did the EKG go to therapy? It had too many issues.",
  "What do you call it when a hospital runs out of maternity nurses? A midwife crisis.",
  "Why did the paramedic fail his driving test? He kept running lights.",
  "What do you call a nervous surgeon? Someone who really needs to get a grip.",
  "Why did the blood go to school? To improve its cell culture.",
  "What do EMTs eat for breakfast? Chest compressions — they like things well done.",
  "Why did the nurse keep a ruler by her bed? To see how long she slept.",
  "What's a doctor's least favorite game? Operation — way too much pressure.",
  "Why don't nurses ever win at poker? They always show their hand vein.",
  "What do you call a hospital full of introverts? A private practice.",
  "Why did the ambulance driver get fired? He kept missing his turn-over.",
  "What do you call a paramedic who moonlights as a comedian? Someone who really delivers the punchline.",
  "Why was the orthopedic surgeon always calm? He had a lot of backbone.",
  "What do nurses put on their salads? IV dressing.",
  "Why did the EMT bring a map to the call? He heard the patient had lost circulation.",
  "What's a respiratory therapist's favorite song? Every Breath You Take.",
  "Why don't hospitals ever play cards? Too many doctors on the floor.",
  "What do you call a doctor who keeps falling asleep? A napnesthesiologist.",
  "Why did the phlebotomist break up with his girlfriend? He felt like she was draining him.",
  "What did the lung say to the other lung? Don't breathe a word of this.",
  "Why did the stethoscope apply for a promotion? It wanted to move up in the field.",
  "What do you call a rude ICU nurse? Critical.",
  "Why did the EMT fail art class? He could only draw blood.",
  "What's a paramedic's favorite movie? Pulse Fiction.",
  "Why did the EMS crew eat lunch so fast? They had a code 3 meal.",
  "What do you call an ER doctor who loves puzzles? A diagnosis enthusiast.",
  "Why was the trauma bay always noisy? Because patients were always dropping in.",
  "What did one IV bag say to the other? I'm hanging in there.",
  "Why did the ambulance go to school? To improve its response time.",
  "What do you call a broken defibrillator? Shocking, honestly.",
  "Why don't EMS providers ever get bored? Every call is a new adventure.",
  "What did the nurse say to the patient who kept pressing the call button? You've got my full attention.",
  "Why did the pharmacy run out of antidepressants? Because they weren't feeling great either.",
  "What do you call a paramedic who only works nights? A nocturnal medic.",
  "Why did the EMT carry an umbrella? In case of a brainstorm during triage.",
  "What's an RN's superpower? Multitasking — also, starting IVs blindfolded.",
  "Why did the heart monitor beep three times? It wanted to make a point.",
  "What do you call a doctor who can't decide on a diagnosis? Differential.",
  "Why did the surgical team always win trivia night? They had sharp minds.",
  "What do you call an EMT who tells great stories? A para-medic — emphasis on the narrative.",
  "Why did the hospital band never make it big? Too many cardiac arrests mid-set.",
  "What do nurses call a double shift? Just Tuesday.",
  "Why was the paramedic always broke? He kept giving people a hand.",
  "What do you call a patient who self-diagnoses on Google? A second opinion.",
  "Why did the neurology team get along so well? They had great nerve.",
  "What's a trauma surgeon's favorite sport? Extreme stitching.",
  "Why did the EMT major in philosophy? He wanted to ask the deep questions — like 'Are you on any medications?'",
  "What do you call a cold EKG reading? Flatlined fashion.",
  "Why do nurses make great baseball players? They know how to handle a hit.",
  "What did the defibrillator say after a long shift? I'm shocked at how tired I am.",
  "Why did the paramedic go to the bank? To check his pulse-itive balance.",
  "What do you call a doctor who fixes boo-boos? A boo-boo-ologist.",
  "Why did the respiratory therapist get promoted? She took everyone's breath away.",
  "What do EMS providers and comedians have in common? They both work the scene.",
  "Why did the nurse sit on the clock? She wanted to be on time.",
  "What do you call a paramedic with perfect handwriting? A myth.",
  "Why don't ER doctors play hide and seek? Good luck hiding when someone always finds the vein.",
  "What's a medic's least favorite thing to hear? 'I Googled my symptoms.'",
  "Why did the anesthesiologist always win arguments? He put everyone to sleep.",
  "What do you call a hospital with too many patients and not enough staff? The American healthcare system.",
  "Why did the EMT refuse to play chess? He was already making life-or-death moves all day.",
  "What do you call a very small nurse? A micro-RN.",
  "Why did the paramedic laugh at the ECG? It was a little arrhythmic.",
  "What do you call a doctor's handwriting font? Illegible Serif.",
  "Why did the ER nurse bring a ladder to work? To handle all the high-acuity patients.",
  "What do you call two IV lines and a bag of saline? The EMT starter pack.",
  "Why don't medics ever procrastinate? Every second counts.",
  "What did the patient say after a perfect IV start? You nailed it.",
  "Why did the flight medic love his job? He was always on a higher level.",
  "What's a paramedic's favorite holiday? Labor Day — they work it every year anyway.",
  "Why did the blood pressure cuff go to therapy? It felt too much pressure.",
  "What do you call a nurse who works in a garden? A plant-based care provider.",
  "Why did the EMS crew eat fast food? They didn't have time for a proper handoff.",
  "What do you call a hospital that only treats musicians? The ICU-Band.",
  "Why did the medic become a poet? He had a way with patient narratives.",
  "What's a paramedic's favorite dessert? Resuscit-tarts.",
  "Why did the ER doctor become a gardener? He was good at planting seeds of differential diagnoses.",
  "What do you call a nurse who always runs late? A slow-response unit.",
  "Why did the oxygen tank get a standing ovation? It really supported everyone.",
  "What do you call a paramedic who loves math? Great at calculating GCS.",
  "Why did the EMT always carry a pen? In case the patient needed a scene report — or a will.",
  "What's the difference between a nurse and a vending machine? One gives you what you need at 3 AM, the other is a machine.",
  "Why don't medics ever sleep well? Too many calls on their conscience.",
  "What do you call a firefighter-paramedic crossover? Doubly exhausted.",
  "Why did the hospital install a revolving door? For the frequent flyers.",
  "What do you call a calm paramedic at a multi-car pileup? Experienced.",
  "Why did the AEMT love working in the field? He had a lot of range.",
  "What do nurses call a perfectly placed catheter? Art.",
  "Why did the med student fail? He couldn't handle the pressure — or the attending.",
  "What do you call a physician's assistant who tells jokes? A PA-comedian.",
  "Why did the ambulance driver get a bonus? Outstanding deliveries.",
  "What do you call a hospital that only treats cats? A purrr-fect care facility.",
  "Why did the trauma surgeon become a sculptor? She was already cutting-edge.",
  "What do you call a nurse who moonlights as a DJ? Someone with great vitals and great vinyls.",
  "Why did the EMT bring sunglasses to the call? The patient's future was looking bright.",
  "What do you call a very experienced paramedic? Unshakeable.",
  "Why did the medical examiner become a stand-up comedian? He had a killer delivery.",
  "What's a nurse's favorite type of music? Anything in A-fib minor.",
  "Why did the cardiac monitor beep? Just checking in.",
  "What do you call a paramedic who never breaks a sweat? One who hasn't had a pediatric code yet.",
  "Why did the ER doc love Mondays? Said no one. Ever.",
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
