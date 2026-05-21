import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BookOpen, Terminal, Copy, Check, ChevronDown, ChevronUp,
  MapPin, Zap, Shield, Music, MessageSquare, AlertTriangle,
  CheckCircle2, Star, Users, Megaphone, Clock, Trophy,
} from "lucide-react";

export const Route = createFileRoute("/_portal/support")({ component: SupportPage });

type Tab = "hosting" | "commands";

function CopyCmd({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      onClick={copy}
      className="group inline-flex items-center gap-1.5 rounded-md bg-secondary/60 border border-border px-2.5 py-1 font-mono text-xs hover:bg-secondary hover:border-primary/40 transition"
      title="Copy command"
    >
      <span className="text-primary">{text}</span>
      {copied
        ? <Check className="h-3 w-3 text-green-400" />
        : <Copy className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />}
    </button>
  );
}

function Section({ icon: Icon, color, title, children, defaultOpen = true }: {
  icon: React.ElementType; color: string; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-accent/30 transition text-left"
      >
        <div className={`grid h-7 w-7 place-items-center rounded-lg bg-background/60 border border-border flex-shrink-0`}>
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
        <span className="font-semibold text-sm flex-1">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

function CmdRow({ cmd, desc, note }: { cmd: string; desc: string; note?: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <CopyCmd text={cmd} />
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
        {note && <p className="text-[10px] text-primary/70 mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

function SupportPage() {
  const [tab, setTab] = useState<Tab>("hosting");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support &amp; Reference</h1>
        <p className="text-sm text-muted-foreground mt-1">Hosting guides, commands, and quick reference for every situation.</p>
      </div>

      <div className="flex gap-1.5">
        {([["hosting", BookOpen, "Hosting Guide"], ["commands", Terminal, "Commands"]] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition border ${
              tab === id
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "hosting" && <HostingGuide />}
      {tab === "commands" && <CommandsRef />}
    </div>
  );
}

const HOSTING_STEPS = [
  {
    num: 1, icon: Star, color: "text-[oklch(0.82_0.18_60)]",
    title: "Pick an Event",
    body: "Keep it simple and easy to understand. If people need 3 paragraphs to understand it, the event is already cooked.",
    bullets: ["Street Race", "Truck Domination", "Pool Party", "Fight Night", "Car Meet", "Purge", "Hide & Seek", "Cayo Drag Race"],
    bulletsLabel: "Examples",
  },
  {
    num: 2, icon: MapPin, color: "text-[oklch(0.72_0.16_210)]",
    title: "Choose a Good Location",
    body: "Pick somewhere easy to access, not cramped, and that actually fits the event.",
    bullets: ["Beach = parties", "Airstrip = races", "Warehouses = fight nights", "Cayo = large events"],
    bulletsLabel: "Examples",
    warning: "Avoid random alleyways that fit 12 people and 40 cars.",
  },
  {
    num: 3, icon: Shield, color: "text-[oklch(0.75_0.16_150)]",
    title: "Make Rules",
    body: "Keep rules short. Don't make 45 rules nobody reads.",
    bullets: ["No RDM", "No explosives", "No flying vehicles", "Stay in event area", "Staff decisions final"],
    bulletsLabel: "Example rules",
  },
  {
    num: 4, icon: Megaphone, color: "text-[oklch(0.7_0.22_350)]",
    title: "Create an Announcement",
    body: "Every announcement needs these five things:",
    bullets: ["Event name", "Time", "Location", "Reward", "Basic rules"],
    bulletsLabel: "Required",
    example: "🚨 STREET RACE TONIGHT\n📍 Airport Track\n🕘 9PM UK\n💰 $500k Prize\nNo flying vehicles or ramming.",
  },
  {
    num: 5, icon: Zap, color: "text-[oklch(0.82_0.18_60)]",
    title: "Promote It Properly",
    body: "Post in main announcements, F3 messages, Discord pings, city adverts, and Twitter posts in RP. Spam it enough so people actually know it exists — but don't post every 30 seconds like a bot having a seizure.",
  },
  {
    num: 6, icon: Clock, color: "text-[oklch(0.72_0.16_210)]",
    title: "Prepare Before Starting",
    body: 'Nothing kills an event faster than "uhhh wait guys give us 20 mins".',
    bullets: ["Spawn prizes", "Get staff ready", "Check vehicles", "Set waypoints/barriers", "Decide who is hosting"],
    bulletsLabel: "Before the event",
  },
  {
    num: 7, icon: Users, color: "text-[oklch(0.7_0.22_350)]",
    title: "During the Event",
    body: "Energy matters. If the host sounds half asleep the event dies instantly.",
    bullets: ["Be loud and clear", "Keep people moving", "Don't argue with trolls", "Explain rules once", "Start on time"],
    bulletsLabel: "As host",
  },
  {
    num: 8, icon: AlertTriangle, color: "text-red-400",
    title: "Handling Problems",
    body: "Remove them quickly and continue. Don't pause the entire event for one attention seeker.",
    bullets: ["RDM", "Trolling", "Ignoring rules", "Causing chaos"],
    bulletsLabel: "If people",
  },
  {
    num: 9, icon: Trophy, color: "text-[oklch(0.82_0.18_60)]",
    title: "Ending the Event",
    body: "Leave people wanting the next one.",
    bullets: ["Announce winners", "Give prizes fast", "Thank people for attending", "Promote the next event"],
    bulletsLabel: "At the end",
    example: "🎉 Thanks everyone for attending!\nCongrats to Jayden for winning the drag race.\nMore events tomorrow 👀",
  },
];

const BIGGEST_MISTAKES = [
  "Starting late",
  "Too many rules",
  "No prizes",
  "Bad communication",
  "Picking terrible locations",
  "Letting trolls ruin everything",
  "Making events overly complicated",
];

function HostingGuide() {
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([1]));

  function toggle(n: number) {
    setOpenSteps(prev => { const s = new Set(prev); if (s.has(n)) s.delete(n); else s.add(n); return s; });
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl bg-card/60 p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" /> KNG Event &amp; Party Hosting Guide
        </h2>

        <div className="space-y-2">
          {HOSTING_STEPS.map((step) => {
            const Icon = step.icon;
            const isOpen = openSteps.has(step.num);
            return (
              <div key={step.num} className="rounded-xl border border-border overflow-hidden bg-background/40">
                <button
                  onClick={() => toggle(step.num)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition text-left"
                >
                  <div className="grid h-6 w-6 place-items-center rounded-md bg-secondary/60 border border-border flex-shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground">{String(step.num).padStart(2, "0")}</span>
                  </div>
                  <Icon className={`h-3.5 w-3.5 ${step.color} flex-shrink-0`} />
                  <span className="text-sm font-medium flex-1">{step.title}</span>
                  {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>

                    {step.bullets && (
                      <div className="space-y-1">
                        {step.bulletsLabel && (
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{step.bulletsLabel}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {step.bullets.map(b => (
                            <Badge key={b} variant="outline" className="text-xs font-normal">{b}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {step.warning && (
                      <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-400">{step.warning}</p>
                      </div>
                    )}

                    {step.example && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Example</p>
                        <div className="flex items-start gap-2">
                          <pre className="text-xs text-foreground bg-secondary/40 rounded-lg px-3 py-2 whitespace-pre-wrap flex-1 border border-border">{step.example}</pre>
                          <button
                            onClick={async () => { await navigator.clipboard.writeText(step.example!); toast.success("Copied"); }}
                            className="mt-0.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent transition flex items-center gap-1 text-muted-foreground hover:text-foreground flex-shrink-0"
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Biggest Mistakes Event Hosts Make
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BIGGEST_MISTAKES.map(m => (
              <Badge key={m} variant="outline" className="text-xs font-normal border-red-500/30 text-red-400/80">{m}</Badge>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function CommandsRef() {
  return (
    <div className="space-y-3">
      <Section icon={Shield} color="text-red-400" title="Punishments / Repunishments">
        <div className="space-y-0">
          <CmdRow cmd="/soltar (id)" desc="Remove a player from prison (Jail Release)" note="JAIL RELEASE" />
          <CmdRow cmd="/warning (id)" desc="Send someone to the island" />
          <CmdRow cmd="/remwarning (id)" desc="Take someone off the island" />
          <CmdRow cmd="/ban (id)" desc="Ban a player" />
          <CmdRow cmd="/unban (id)" desc="Unban a player" />
        </div>
      </Section>

      <Section icon={Zap} color="text-[oklch(0.7_0.22_350)]" title="Events & Parties">
        <div className="space-y-0">
          <CmdRow cmd="/events" desc="Put in an F3 message for events" />
          <CmdRow cmd="/party" desc="Put in an F3 message for parties" />
          <CmdRow cmd="/car [CAR NAME]" desc="Spawn a car by name" />
          <CmdRow cmd="/setpreset [ID FROM] [ID TO]" desc="Put someone in another player's outfit" />
          <CmdRow cmd="/dv" desc="Delete the nearest vehicle" />
          <CmdRow cmd="/dvarea [Radius]" desc="Delete all vehicles within radius that don't have players in them" />
          <CmdRow cmd="/god" desc="God mode yourself" />
          <CmdRow cmd="/god [ID]" desc="God mode a specific player by their ID" note="Add PP on the end to send the player to default world pier" />
          <CmdRow cmd="/godarea [Radius]" desc="God mode all players within a radius" />
          <CmdRow cmd="/world [WorldName]" desc="Send yourself to the specified world" />
          <CmdRow cmd="/worldarea [World] [Radius]" desc="Move all players within radius into a specified world" />
          <CmdRow cmd="/music" desc="Play music for players" />
        </div>
      </Section>

      <Section icon={Music} color="text-[oklch(0.72_0.16_210)]" title="Entertainment Commands" defaultOpen={false}>
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-primary/80">These commands are only for use when you are in Entertainment department.</p>
        </div>
        <div className="space-y-0">
          <CmdRow cmd="/world royale" desc="Put yourself in the royale world" />
          <CmdRow cmd="/worldarea royale 10" desc="Put everyone within radius 10 into the royale world" />
          <CmdRow cmd="/cds" desc="Show current location (for setting coordinates)" />
          <CmdRow cmd="/cdsc" desc="Copy current CDS coordinates to clipboard" />
          <CmdRow
            cmd="/startroyale"
            desc="Start a battle royale. Set Centro = CDS coordinates, Raio = Radius"
            note="Big BR: 5221.19,-5393.39,67.45,54.73 — use radius 6000. Tend to do x2 speed and ~2700 radius, starting in the middle and distributing gangs evenly."
          />
          <CmdRow cmd="/stopzone" desc="Stop the current zone" />
          <CmdRow cmd="/startzone" desc="Start the zone" />
          <CmdRow cmd="/removezone" desc="Force end the event" />
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Teleport All Players At Once</p>
          <p className="text-xs text-muted-foreground mb-2">Use this format to TP everyone at once — semi-colon separated:</p>
          <div className="flex items-start gap-2">
            <pre className="text-xs text-primary bg-secondary/40 rounded-lg px-3 py-2 border border-border flex-1 whitespace-pre-wrap">tptome 4922; tptome 3228; tptome 143; tptome 2365; tptome 24215; tptome 987</pre>
            <button
              onClick={async () => { await navigator.clipboard.writeText("tptome 4922; tptome 3228; tptome 143; tptome 2365; tptome 24215; tptome 987"); toast.success("Copied"); }}
              className="mt-0.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent transition flex items-center gap-1 text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        </div>
      </Section>

      <Section icon={MapPin} color="text-[oklch(0.75_0.16_150)]" title="God Locations" defaultOpen={false}>
        <p className="text-xs text-muted-foreground mb-3">Shortcodes to use with <code className="bg-secondary/60 rounded px-1">/god [ID]</code> or location commands.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            ["p", "Pier"],
            ["pp", "Default world pier"],
            ["mec", "Mechanics"],
            ["pd", "Police Department"],
            ["hp", "Hospital"],
            ["square", "Legion Square"],
            ["pn", "North Pier"],
          ].map(([code, label]) => (
            <button
              key={code}
              onClick={async () => { await navigator.clipboard.writeText(code); toast.success(`Copied "${code}"`); }}
              className="group flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 hover:border-primary/40 hover:bg-primary/5 transition text-left"
            >
              <div>
                <p className="text-xs font-mono text-primary">{code}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
              <Copy className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
            </button>
          ))}
        </div>
      </Section>

      <Section icon={MessageSquare} color="text-[oklch(0.82_0.18_60)]" title="Discord Bot Commands" defaultOpen={false}>
        <p className="text-xs text-muted-foreground mb-3">Run these in the Discord bot channel to look up player information.</p>
        <div className="space-y-0">
          <CmdRow cmd="!infoaccount [ACCOUNT_ID]" desc="Shows all information linked to an Account ID" />
          <CmdRow cmd="!infodiscord [DISCORD_USER_ID]" desc="Shows all information linked to a Discord User ID" />
          <CmdRow cmd="!infoplayer [IN_GAME_ID]" desc="Shows info like groups, owned cars, phone serials, and licences" />
          <CmdRow cmd="!infoid [IN_GAME_ID]" desc="Gives information about a user via their In-Game ID" />
          <CmdRow cmd="!motivoadv [IN_GAME_ID]" desc="Shows the reason, date, and time someone was sent to the island" />
          <CmdRow cmd="!motivoban [IN_GAME_ID]" desc="Shows the reason, date, and time someone was banned" />
        </div>
      </Section>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <p className="text-xs text-muted-foreground">Click any command to copy it to your clipboard.</p>
      </div>
    </div>
  );
}
