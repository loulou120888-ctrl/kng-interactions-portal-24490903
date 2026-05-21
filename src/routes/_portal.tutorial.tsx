import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GraduationCap, ChevronRight, ChevronLeft, CheckCircle2,
  Calendar, ClipboardList, Trophy, Shield, AlertTriangle,
  MapPin, TrendingDown, Heart, Star, Plus, BookOpen,
  ArrowRight, RotateCcw,
} from "lucide-react";
import { DEPT_BG, DEPT_BORDER, DEPT_LABEL, fmtSlot } from "@/lib/portal";
import { toast } from "sonner";

export const Route = createFileRoute("/_portal/tutorial")({ component: TutorialPage });

const STORAGE_KEY = "kng_tutorial_done_steps";
const STEPS = ["welcome", "schedule", "interactions", "points", "discipline"] as const;
type StepId = typeof STEPS[number];

const STEP_META: Record<StepId, { icon: React.ElementType; label: string; color: string }> = {
  welcome:       { icon: GraduationCap, label: "Welcome",             color: "text-primary" },
  schedule:      { icon: Calendar,      label: "The Schedule",         color: "text-[oklch(0.7_0.22_350)]" },
  interactions:  { icon: ClipboardList, label: "Interactions",         color: "text-[oklch(0.72_0.16_210)]" },
  points:        { icon: Trophy,        label: "Points & Leaderboard", color: "text-[oklch(0.82_0.18_60)]" },
  discipline:    { icon: Shield,        label: "Discipline Protocol",  color: "text-[oklch(0.75_0.16_150)]" },
};

function TutorialPage() {
  const [step, setStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return new Set(saved ? JSON.parse(saved) : []);
    } catch { return new Set(); }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(doneSteps)));
  }, [doneSteps]);

  function markDone(idx: number) {
    setDoneSteps(prev => { const s = new Set(prev); s.add(idx); return s; });
  }

  function resetProgress() {
    if (!confirm("Reset all tutorial progress?")) return;
    setDoneSteps(new Set());
    setStep(0);
    localStorage.removeItem(STORAGE_KEY);
  }

  const progress = Math.round((doneSteps.size / STEPS.length) * 100);
  const allDone = doneSteps.size === STEPS.length;
  const StepIcon = STEP_META[STEPS[step]].icon;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6" /> Portal Tutorial
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Walk through how the portal works, try the features, and learn the discipline protocol.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {allDone && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
            </Badge>
          )}
          <button onClick={resetProgress} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{doneSteps.size} of {STEPS.length} sections completed</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {STEPS.map((id, i) => {
          const meta = STEP_META[id];
          const Icon = meta.icon;
          return (
            <button
              key={id}
              onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition border ${
                step === i
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : doneSteps.has(i)
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {doneSteps.has(i) && <CheckCircle2 className="h-3 w-3" />}
              <Icon className="h-3 w-3" />
              {meta.label}
            </button>
          );
        })}
      </div>

      <Card className="rounded-2xl bg-card/60 p-6 space-y-5 min-h-[400px] flex flex-col">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-background/60">
            <StepIcon className={`h-5 w-5 ${STEP_META[STEPS[step]].color}`} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
            <h2 className="font-semibold">{STEP_META[STEPS[step]].label}</h2>
          </div>
          {doneSteps.has(step) && (
            <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Done
            </Badge>
          )}
        </div>

        <div className="flex-1">
          {step === 0 && <StepWelcome onDone={() => markDone(0)} done={doneSteps.has(0)} />}
          {step === 1 && <StepSchedule onDone={() => markDone(1)} done={doneSteps.has(1)} />}
          {step === 2 && <StepInteractions onDone={() => markDone(2)} done={doneSteps.has(2)} />}
          {step === 3 && <StepPoints onDone={() => markDone(3)} done={doneSteps.has(3)} />}
          {step === 4 && <StepDiscipline onDone={() => markDone(4)} done={doneSteps.has(4)} />}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { markDone(4); toast.success("Tutorial complete!"); }}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Finish tutorial
            </Button>
          )}
        </div>
      </Card>

      {allDone && (
        <Card className="rounded-2xl bg-green-500/5 border-green-500/20 p-5 flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-green-500/20 flex-shrink-0">
            <GraduationCap className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-green-400">Tutorial complete!</p>
            <p className="text-sm text-muted-foreground">You're ready to use the KNG portal. Head to your schedule to claim your first slot.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="ml-auto flex-shrink-0 border-green-500/30 text-green-400 hover:bg-green-500/10">
            <a href="/schedule/events">Go to Schedule <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></a>
          </Button>
        </Card>
      )}
    </div>
  );
}

function StepWelcome({ onDone, done }: { onDone: () => void; done: boolean }) {
  const features = [
    { icon: Calendar, label: "Schedule", desc: "Book and claim 30-min event slots across Events, Parties and Entertainment." },
    { icon: ClipboardList, label: "Interactions", desc: "Log completed events with attendees, summaries, and promo content." },
    { icon: Trophy, label: "Leaderboard", desc: "See who's most active — points are awarded for attending interactions." },
    { icon: Shield, label: "Discipline Protocol", desc: "Handle difficult situations the right way — educate first, always." },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground leading-relaxed">
        The <span className="text-foreground font-medium">KNG Interactions Portal</span> is your hub for coordinating events, tracking who's doing what, and keeping the team accountable. Everything you do — from claiming a slot to logging an interaction — contributes to the team's score.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map((f) => (
          <div key={f.label} className="rounded-xl border border-border bg-background/40 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <f.icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{f.label}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
      {!done && (
        <Button onClick={onDone} variant="outline" className="w-full">
          <CheckCircle2 className="h-4 w-4 mr-2" /> Got it — mark section done
        </Button>
      )}
    </div>
  );
}

function StepSchedule({ onDone, done }: { onDone: () => void; done: boolean }) {
  const [claimed, setClaimed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const mockSlots = [
    { time: "8:00 pm", title: "Quiz Night", dept: "events" as const, interactive: true },
    { time: "8:30 pm", empty: true },
    { time: "9:00 pm", title: "DJ Set", dept: "entertainment" as const },
    { time: "9:30 pm", empty: true },
  ];

  function handleClaim() { setClaimed(true); setPanelOpen(false); toast.success("Slot claimed — you're on!"); }
  function handleComplete() { setCompleted(true); setPanelOpen(false); toast.success("Marked as complete!"); if (!claimed) onDone(); onDone(); }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The schedule is split into <span className="text-foreground">Events &amp; Parties</span> and <span className="text-foreground">Entertainment</span>. Each tile is a 30-minute slot. When you see a slot you'll be hosting, <span className="text-foreground font-medium">claim it</span> so the team knows you're responsible for it.
        </p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>A slot must be <span className="text-foreground">booked</span> before it shows on the grid</li>
          <li>Anyone can <span className="text-foreground">claim</span> an open slot (unless it's Entertainment — AUX+ only for booking those)</li>
          <li>After the event, <span className="text-foreground">mark it complete</span> and log the interaction</li>
        </ul>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try it — click "Quiz Night"</p>
        <div className="grid grid-cols-2 gap-2 max-w-xs">
          {mockSlots.map((slot, i) => (
            <button
              key={i}
              onClick={() => slot.interactive && setPanelOpen(o => !o)}
              className={`text-left rounded-xl border p-2.5 transition ${
                slot.empty
                  ? "border-border bg-background/40 cursor-default"
                  : slot.interactive
                    ? `${completed ? "border-green-500/40" : claimed ? "border-primary/60 bg-primary/5" : DEPT_BORDER.events} bg-card hover:border-primary/50 cursor-pointer`
                    : `${DEPT_BORDER.entertainment} bg-card cursor-default`
              }`}
            >
              <span className="text-[10px] font-mono text-muted-foreground">{slot.time}</span>
              {slot.title ? (
                <div className="mt-1">
                  <p className="text-xs font-medium truncate">{slot.title}</p>
                  {slot.interactive && claimed && !completed && (
                    <p className="text-[10px] text-primary mt-0.5">✓ Claimed by you</p>
                  )}
                  {slot.interactive && completed && (
                    <Badge variant="outline" className="mt-1 text-[10px]">completed</Badge>
                  )}
                  {!slot.interactive && <p className="text-[10px] text-muted-foreground">{DEPT_LABEL[slot.dept!]}</p>}
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Plus className="h-2.5 w-2.5" /> book
                </div>
              )}
            </button>
          ))}
        </div>

        {panelOpen && !completed && (
          <div className="rounded-xl border border-border bg-card/80 p-3.5 space-y-3 max-w-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Quiz Night</p>
              <button onClick={() => setPanelOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <p className="text-xs text-muted-foreground">Events · 8:00 pm · Booked by KNG Staff</p>
            {!claimed ? (
              <Button size="sm" className="w-full" onClick={handleClaim}>Claim it</Button>
            ) : (
              <Button size="sm" className="w-full" onClick={handleComplete}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark complete &amp; log
              </Button>
            )}
          </div>
        )}

        {completed && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-2.5 flex items-center gap-2 max-w-xs">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            <p className="text-xs text-green-400">You completed the slot — great work!</p>
          </div>
        )}
      </div>

      {!done && (
        <Button onClick={onDone} variant="outline" size="sm">
          <CheckCircle2 className="h-4 w-4 mr-2" /> Mark section done
        </Button>
      )}
    </div>
  );
}

function StepInteractions({ onDone, done }: { onDone: () => void; done: boolean }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    if (!title.trim() || !summary.trim()) { toast.error("Fill in both fields to try submitting"); return; }
    setSubmitted(true);
    onDone();
    toast.success("Interaction logged! (demo only — nothing saved)");
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        After completing an event, you <span className="text-foreground font-medium">log an interaction</span>. This records what happened, who attended, and any highlights. Attendees earn <span className="text-foreground">points</span> which feed into the leaderboard.
      </p>
      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
        <li>Give the interaction a <span className="text-foreground">title</span> describing the event</li>
        <li>Add a <span className="text-foreground">summary</span> of what happened</li>
        <li>Select <span className="text-foreground">attendees</span> — they'll earn points for being there</li>
        <li>Optionally attach a <span className="text-foreground">poster message or image</span> for promo use</li>
      </ul>

      <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4 max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try filling in a log (demo)</p>
        {!submitted ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Event title</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Friday Quiz Night"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Summary</Label>
              <Input
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="Great turnout — 12 players, very engaged…"
                className="h-8 text-sm"
              />
            </div>
            <div className="rounded-lg border border-dashed border-border bg-background/40 p-2.5 text-center text-xs text-muted-foreground">
              Attendees &amp; prizes would appear here
            </div>
            <Button size="sm" className="w-full" onClick={submit}>Submit interaction (demo)</Button>
          </>
        ) : (
          <div className="flex items-center gap-2 py-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Interaction logged!</p>
              <p className="text-xs text-muted-foreground">In real use, attendees would receive points now.</p>
            </div>
          </div>
        )}
      </div>

      {!done && !submitted && (
        <Button onClick={onDone} variant="outline" size="sm">
          <CheckCircle2 className="h-4 w-4 mr-2" /> Mark section done
        </Button>
      )}
    </div>
  );
}

function StepPoints({ onDone, done }: { onDone: () => void; done: boolean }) {
  const mockBoard = [
    { name: "Sophie K.", points: 1420, authored: 12, attended: 38 },
    { name: "Marcus T.", points: 1105, authored: 8, attended: 30 },
    { name: "Priya L.", points: 890, authored: 6, attended: 24 },
    { name: "You",        points: 245, authored: 2, attended: 7, isYou: true },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Every time you attend or host an interaction, you earn <span className="text-foreground font-medium">points</span>. These roll up into the <span className="text-foreground">Leaderboard</span>, which resets on different periods (today, this week, this month, all time). The team goal is to keep everyone active and consistent.
      </p>
      <div className="grid grid-cols-3 gap-2 max-w-sm">
        {[["Hosting", "Points for logging an interaction as the author"], ["Attending", "Points for being selected as an attendee"], ["Streaks", "Consistent activity across multiple days boosts your score"]].map(([label, desc]) => (
          <div key={label} className="rounded-xl border border-border bg-background/40 p-3 text-center space-y-1">
            <p className="text-xs font-semibold">{label}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sample leaderboard (this week)</p>
        {mockBoard.map((p, i) => (
          <div key={p.name} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${p.isYou ? "bg-primary/10 border border-primary/20" : "bg-background/40 border border-border"}`}>
            <span className="text-xs text-muted-foreground w-4 text-center">{i + 1}</span>
            <span className={`text-sm font-medium flex-1 ${p.isYou ? "text-primary" : ""}`}>{p.name}</span>
            <span className="text-xs text-muted-foreground">{p.authored}A / {p.attended}P</span>
            <span className="text-sm font-semibold tabular-nums">{p.points}</span>
          </div>
        ))}
      </div>
      {!done && (
        <Button onClick={onDone} variant="outline" size="sm">
          <CheckCircle2 className="h-4 w-4 mr-2" /> Mark section done
        </Button>
      )}
    </div>
  );
}

function StepDiscipline({ onDone, done }: { onDone: () => void; done: boolean }) {
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizDone, setQuizDone] = useState(false);

  const questions = [
    {
      q: "A guest is misbehaving at your event. What should you do FIRST?",
      options: [
        "Alert a manager immediately",
        "Educate them — explain the rule and why it matters",
        "Send them to the island right away",
        "Ignore it and carry on",
      ],
      correct: 1,
    },
    {
      q: "What is 'the island' meant to be?",
      options: [
        "A punishment zone",
        "A timeout area to calm down",
        "A classroom for education",
        "A place reserved for managers",
      ],
      correct: 2,
    },
    {
      q: "When is a player cleared to return from the island?",
      options: [
        "After a set time (e.g. 30 minutes)",
        "Whenever they ask",
        "Only managers can decide",
        "When staff confirm they genuinely understand",
      ],
      correct: 3,
    },
  ];

  function answer(qIdx: number, aIdx: number) {
    if (quizAnswers[qIdx] !== undefined) return;
    setQuizAnswers(prev => {
      const next = { ...prev, [qIdx]: aIdx };
      if (Object.keys(next).length === questions.length) {
        setQuizDone(true);
        onDone();
      }
      return next;
    });
  }

  const correctCount = Object.entries(quizAnswers).filter(([qi, ai]) => questions[+qi].correct === ai).length;

  const steps = [
    {
      num: "01",
      icon: BookOpen,
      color: "text-[oklch(0.82_0.18_60)]",
      bg: "bg-[oklch(0.82_0.18_60_/_0.12)]",
      title: "Educate First",
      desc: "Staff MUST educate the player before any punishment is considered. Explain the rule broken, why it matters, and what good behaviour looks like.",
    },
    {
      num: "02",
      icon: AlertTriangle,
      color: "text-[oklch(0.78_0.18_50)]",
      bg: "bg-[oklch(0.78_0.18_50_/_0.12)]",
      title: "Island = Education, Not Exile",
      desc: "If a player is sent to the island, a staff member MUST go to the island and personally educate and teach the player. The island is a classroom, not a prison.",
    },
    {
      num: "03",
      icon: MapPin,
      color: "text-[oklch(0.72_0.16_210)]",
      bg: "bg-[oklch(0.72_0.16_210_/_0.12)]",
      title: "Visit & Teach on the Island",
      desc: "Staff visits the player on the island, runs through the culture lesson, answers questions, and ensures the player genuinely understands before returning to the city.",
    },
    {
      num: "04",
      icon: CheckCircle2,
      color: "text-[oklch(0.75_0.16_150)]",
      bg: "bg-[oklch(0.75_0.16_150_/_0.12)]",
      title: "Clear to Return",
      desc: "Only when the player has completed their education and staff are satisfied they understand, the player is cleared to return to the city.",
    },
  ];

  const accountability = [
    {
      icon: TrendingDown,
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
      label: "Damages NPS",
      desc: "Players who feel unsupported will score us 0–6 on NPS surveys, dragging the entire server score down.",
    },
    {
      icon: Heart,
      color: "text-[oklch(0.78_0.18_50)]",
      bg: "bg-[oklch(0.78_0.18_50_/_0.1)] border-[oklch(0.78_0.18_50_/_0.2)]",
      label: "Kills Culture",
      desc: "Unsupported players become toxic or leave. Staff who don't actively help destroy the community culture we are building.",
    },
    {
      icon: Star,
      color: "text-[oklch(0.75_0.16_150)]",
      bg: "bg-[oklch(0.75_0.16_150_/_0.1)] border-[oklch(0.75_0.16_150_/_0.2)]",
      label: "What Good Looks Like",
      desc: "Player leaves the call feeling heard, educated, and excited to contribute positively. That's the standard every staff member must meet.",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[oklch(0.75_0.16_150_/_0.3)] bg-[oklch(0.75_0.16_150_/_0.05)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-[oklch(0.75_0.16_150)]" />
          <p className="text-sm font-semibold">Staff Discipline Protocol — Mandatory Steps</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {steps.map((s) => (
            <div key={s.num} className="rounded-lg bg-background/60 border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-mono">{s.num}</span>
                <div className={`grid h-6 w-6 place-items-center rounded-md ${s.bg}`}>
                  <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                </div>
                <p className={`text-xs font-semibold ${s.color}`}>{s.title}</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff Accountability — Direct Impact on Culture &amp; NPS</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Every staff member on this call is responsible for <span className="text-foreground font-medium">genuinely helping and supporting</span> the player they are working with. A player who feels dismissed, ignored, or unsupported will leave the interaction feeling worse than when they arrived.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {accountability.map((a) => (
            <div key={a.label} className={`rounded-lg border p-3 space-y-1.5 ${a.bg}`}>
              <div className="flex items-center gap-1.5">
                <a.icon className={`h-3.5 w-3.5 ${a.color}`} />
                <p className={`text-xs font-semibold ${a.color}`}>{a.label}</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick check — {quizDone ? `${correctCount}/${questions.length} correct` : "answer to complete this section"}
        </p>
        {questions.map((q, qi) => {
          const answered = quizAnswers[qi] !== undefined;
          const isCorrect = quizAnswers[qi] === q.correct;
          return (
            <div key={qi} className="rounded-xl border border-border bg-background/40 p-3.5 space-y-2.5">
              <p className="text-xs font-medium">{qi + 1}. {q.q}</p>
              <div className="grid grid-cols-1 gap-1.5">
                {q.options.map((opt, ai) => {
                  const isSelected = quizAnswers[qi] === ai;
                  const isRight = ai === q.correct;
                  let cls = "text-left rounded-lg border px-3 py-2 text-xs transition ";
                  if (!answered) cls += "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer";
                  else if (isRight) cls += "border-green-500/40 bg-green-500/10 text-green-400";
                  else if (isSelected) cls += "border-red-500/40 bg-red-500/10 text-red-400";
                  else cls += "border-border opacity-50";
                  return (
                    <button key={ai} className={cls} onClick={() => answer(qi, ai)} disabled={answered}>
                      <span className="mr-2 text-muted-foreground">{String.fromCharCode(65 + ai)}.</span>
                      {opt}
                      {answered && isRight && <span className="ml-2 text-green-400">✓</span>}
                      {answered && isSelected && !isRight && <span className="ml-2 text-red-400">✗</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {quizDone && (
          <div className={`rounded-xl border p-3.5 flex items-center gap-3 ${correctCount === questions.length ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
            {correctCount === questions.length
              ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              : <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />}
            <div>
              <p className="text-sm font-medium">{correctCount === questions.length ? "Perfect score!" : `${correctCount}/${questions.length} correct`}</p>
              <p className="text-xs text-muted-foreground">
                {correctCount === questions.length
                  ? "You understand the protocol. Review it anytime from here."
                  : "Review the protocol above and re-read the explanations for any questions you missed."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
