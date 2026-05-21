import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Megaphone, Plus, ChevronDown, ChevronUp, Users } from "lucide-react";
import { DiscordMarkdown } from "@/components/DiscordMarkdown";

export const Route = createFileRoute("/_portal/announcements")({ component: Announcements });

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-teal-500 to-emerald-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-indigo-500 to-blue-600",
  ];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return (
    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center flex-shrink-0`}>
      <span className="text-[11px] font-bold text-white">{initials}</span>
    </div>
  );
}

function AnnouncementCard({
  a, isRead, isAuxPlus, onMarkRead, authorName,
}: {
  a: any; isRead: boolean; isAuxPlus: boolean; onMarkRead: (id: string) => void; authorName: string;
}) {
  const [readerData, setReaderData] = useState<{ name: string; at: string }[] | null>(null);
  const [showReaders, setShowReaders] = useState(false);
  const [loadingReaders, setLoadingReaders] = useState(false);

  async function toggleReaders() {
    if (showReaders) { setShowReaders(false); return; }
    if (readerData) { setShowReaders(true); return; }
    setLoadingReaders(true);
    const { data } = await supabase.from("announcement_reads").select("user_id, read_at").eq("announcement_id", a.id);
    const ids = (data ?? []).map((r: any) => r.user_id);
    const { data: pf } = await supabase.from("profiles").select("id, display_name").in("id", ids.length ? ids : ["none"]);
    const nameMap = Object.fromEntries((pf ?? []).map((p: any) => [p.id, p.display_name]));
    setReaderData((data ?? []).map((x: any) => ({ name: nameMap[x.user_id] ?? "Unknown", at: x.read_at })));
    setLoadingReaders(false);
    setShowReaders(true);
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isRead
          ? "bg-card/50 border-border"
          : "bg-card border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)] shadow-primary/10"
      }`}
      onMouseEnter={() => onMarkRead(a.id)}
    >
      {/* Unread accent bar */}
      {!isRead && <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary/60 to-transparent" />}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <Avatar name={authorName} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-semibold leading-snug ${isRead ? "text-foreground/80" : "text-foreground"}`}>
                {a.title}
              </h3>
              {!isRead && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  New
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {authorName} · {timeAgo(a.created_at)}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className={`mt-3 ${isRead ? "text-muted-foreground" : "text-foreground/90"}`}>
          <DiscordMarkdown text={a.body} />
        </div>

        {/* Reads section for AUX+ */}
        {isAuxPlus && (
          <div className="mt-4">
            <button
              onClick={toggleReaders}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              {loadingReaders
                ? "Loading…"
                : readerData
                ? `${readerData.length} read${showReaders ? "" : " — show"}`
                : "Show reads"}
              {readerData && (showReaders ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
            </button>

            {showReaders && readerData && (
              <div className="mt-3 pt-3 border-t border-border">
                {readerData.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No one has read this yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {readerData.map((r, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-muted/60 rounded-full pl-1 pr-2.5 py-1">
                        <Avatar name={r.name} />
                        <span className="text-xs font-medium">{r.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Announcements() {
  const { user, isAuxPlus } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [reads, setReads] = useState<Set<string>>(new Set());
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
    const ids = Array.from(new Set((data ?? []).map((a: any) => a.author_id)));
    if (ids.length) {
      const { data: pf } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      setAuthors(Object.fromEntries((pf ?? []).map((p: any) => [p.id, p.display_name])));
    }
    if (user) {
      const { data: r } = await supabase.from("announcement_reads").select("announcement_id").eq("user_id", user.id);
      setReads(new Set((r ?? []).map((x: any) => x.announcement_id)));
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  useEffect(() => {
    const ch = supabase.channel("ann")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user]);

  async function markRead(id: string) {
    if (!user || reads.has(id)) return;
    await supabase.from("announcement_reads").insert({ announcement_id: id, user_id: user.id });
    setReads(new Set([...reads, id]));
  }

  async function post() {
    if (!user) return;
    if (!title.trim() || !body.trim()) { toast.error("Title and body required"); return; }
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({ author_id: user.id, title: title.trim(), body: body.trim() });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Announcement posted"); setTitle(""); setBody(""); setOpen(false); load(); }
  }

  const unreadCount = list.filter(a => !reads.has(a.id)).length;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
            {unreadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-0.5">
            {isAuxPlus ? "Post bulletins and track read receipts." : "Stay up to date with the latest from your team."}
          </p>
        </div>

        {isAuxPlus && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 flex-shrink-0">
                <Plus className="h-4 w-4" /> Post
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4" /> New Announcement
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Short, clear headline…"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <Textarea
                    placeholder={"Write your announcement here…\n\n# Big heading\n## Smaller heading\n**bold** *italic* __underline__ ~~strikethrough~~\n- Bullet point\n> Blockquote\n`inline code`"}
                    rows={7}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                    {[
                      ["# Heading", "big text"],
                      ["**bold**", "bold"],
                      ["*italic*", "italic"],
                      ["__underline__", "underline"],
                      ["~~strike~~", "strikethrough"],
                      ["- item", "bullet"],
                      ["> text", "quote"],
                      ["`code`", "inline code"],
                    ].map(([syntax, label]) => (
                      <span key={label} className="text-[10px] text-muted-foreground font-mono">
                        <span className="text-foreground/60">{syntax}</span>
                        <span className="text-muted-foreground/50 ml-1 not-italic font-sans">→ {label}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={post} disabled={busy || !title.trim() || !body.trim()}>
                  {busy ? "Posting…" : "Post Announcement"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 py-16 flex flex-col items-center gap-3 text-center">
          <div className="p-4 rounded-full bg-muted/60">
            <Megaphone className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-muted-foreground">No announcements yet</p>
            {isAuxPlus && <p className="text-sm text-muted-foreground/70 mt-0.5">Post the first one to get started.</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <AnnouncementCard
              key={a.id}
              a={a}
              isRead={reads.has(a.id)}
              isAuxPlus={isAuxPlus}
              onMarkRead={markRead}
              authorName={authors[a.author_id] ?? "—"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
