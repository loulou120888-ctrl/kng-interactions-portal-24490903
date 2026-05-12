import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Shield, ArrowRight, Activity, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MDT Portal — Interactions Tracker" },
      { name: "description", content: "Modern interactions tracker portal for roleplay staff teams." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">MDT Portal</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/signup"><Button size="sm">Create account</Button></Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-16 pb-24 md:pt-28 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Roleplay command system
        </div>
        <h1 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight">
          Track every interaction.
          <br />
          <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
            Command your team.
          </span>
        </h1>
        <p className="mt-5 mx-auto max-w-xl text-base text-muted-foreground">
          A modern MDT-style portal for logging interactions, monitoring staff activity, and issuing
          warnings — built for serious roleplay communities.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/signup">
            <Button size="lg" className="gap-2">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">Sign in</Button>
          </Link>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3 text-left">
          {[
            { icon: Activity, title: "Live activity", desc: "See who's on duty and what they're doing in real time." },
            { icon: Search, title: "Searchable logs", desc: "Filter every interaction by officer, citizen, or severity." },
            { icon: Users, title: "Staff profiles", desc: "Ranks, badges, warnings, and notes — all in one place." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur shadow-[var(--shadow-elegant)]">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="mt-4 font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// satisfy redirect import (unused but keeps tree-shaking safe if used later)
void redirect;
