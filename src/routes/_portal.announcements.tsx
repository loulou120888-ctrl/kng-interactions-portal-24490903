import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Megaphone, Plus, ChevronDown, ChevronUp, Users, Heart, MessageCircle, Send } from "lucide-react";
import { DiscordMarkdown } from "@/components/DiscordMarkdown";

export const Route = createFileRoute("/_portal/announcements")({ component: Announcements });

/* ─── helpers ─────────────────────────────────────────────────── */

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

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-teal-500 to-emerald-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-blue-600",
];

function colorFor(name: string) {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function Avatar({ name, avatarUrl, size = "md" }: { name: string; avatarUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const sz = size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-11 w-11 text-sm" : "h-9 w-9 text-xs";
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0 ring-1 ring-border`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${colorFor(name)} flex items-center justify-center flex-shrink-0 ring-1 ring-border`}>
      <span className="font-bold text-white">{initials}</span>
    </div>
  );
}

/* ─── types ───────────────────────────────────────────────────── */

interface ProfileInfo { name: string; avatar: string | null }
interface Comment { id: string; user_id: string; body: string; created_at: string }

/* ─── comment section ─────────────────────────────────────────── */

function CommentSection({
  announcementId, profiles, currentUserId,
}: {
  announcementId: string; profiles: Record<string, ProfileInfo>; currentUserId: string;
}) {
  const sb = supabase as any;
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [extraProfiles, setExtraProfiles] = useState<Record<string, ProfileInfo>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const allProfiles = { ...profiles, ...extraProfiles };

  useEffect(() => {
    (async () => {
      const { data } = await sb.from("announcement_comments")
        .select("id, user_id, body, created_at")
        .eq("announcement_id", announcementId)
        .order("created_at", { ascending: true });
      const loaded = data ?? [];
      setComments(loaded);
      setLoaded(true);
      // fetch any missing profiles
      const known = new Set(Object.keys(profiles));
      const missing = [...new Set((loaded as Comment[]).map(c => c.user_id))].filter(id => !known.has(id)) as string[];
      if (missing.length) {
        const { data: pf } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", missing);
        const map: Record<string, ProfileInfo> = {};
        for (const p of pf ?? []) map[p.id] = { name: p.display_name, avatar: p.avatar_url };
        setExtraProfiles(map);
      }
    })();
  }, [announcementId]);

  async function postComment() {
    if (!draft.trim() || posting) return;
    setPosting(true);
    const { data, error } = await sb.from("announcement_comments").insert({
      announcement_id: announcementId,
      user_id: currentUserId,
      body: draft.trim(),
    }).select("id, user_id, body, created_at").single();
    setPosting(false);
    if (error) { toast.error(`Failed to post comment: ${error.message}`); return; }
    setDraft("");
    setComments(prev => [...prev, data]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  if (!loaded) {
    return <p className="text-xs text-muted-foreground py-2">Loading comments…</p>;
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 && (
        <p className="text-xs text-muted-foreground">No comments yet — be the first.</p>
      )}
      {comments.map(c => {
        const prof = allProfiles[c.user_id];
        const name = prof?.name ?? "Staff";
        return (
          <div key={c.id} className="flex items-start gap-2.5">
            <Avatar name={name} avatarUrl={prof?.avatar} size="sm" />
            <div className="flex-1 min-w-0 bg-muted/40 rounded-xl px-3 py-2">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-semibold">{name}</span>
                <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
              </div>
              <DiscordMarkdown text={c.body} className="text-xs" />
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />

      {/* Compose */}
      <div className="flex items-end gap-2 pt-1">
        <Textarea
          rows={1}
          placeholder="Write a comment… (supports **bold**, *italic*, etc.)"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
          className="text-xs resize-none flex-1"
        />
        <Button size="sm" onClick={postComment} disabled={posting || !draft.trim()} className="flex-shrink-0 h-9 px-3">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ─── reads panel (AUX+) ──────────────────────────────────────── */

function ReadsPanel({ announcementId }: { announcementId: string }) {
  const [data, setData] = useState<{ name: string; avatar: string | null }[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (open) { setOpen(false); return; }
    if (data) { setOpen(true); return; }
    setLoading(true);
    const { data: reads } = await supabase.from("announcement_reads").select("user_id").eq("announcement_id", announcementId);
    const ids = (reads ?? []).map((r: any) => r.user_id);
    const { data: pf } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids.length ? ids : ["none"]);
    setData((pf ?? []).map((p: any) => ({ name: p.display_name, avatar: p.avatar_url })));
    setLoading(false);
    setOpen(true);
  }

  return (
    <div>
      <button onClick={toggle} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <Users className="h-3.5 w-3.5" />
        {loading ? "Loading…" : data ? `${data.length} read${open ? "" : " — show"}` : "Show reads"}
        {data && (open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
      {open && data && (
        <div className="mt-3">
          {data.length === 0 ? (
            <p className="text-xs text-muted-foreground">No one has read this yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-muted/60 rounded-full pl-1 pr-2.5 py-1">
                  <Avatar name={r.name} avatarUrl={r.avatar} size="sm" />
                  <span className="text-xs font-medium">{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── announcement card ───────────────────────────────────────── */

function AnnouncementCard({
  a, isRead, isAuxPlus, onMarkRead, author,
  liked, likeCount, onToggleLike, commentCount,
}: {
  a: any; isRead: boolean; isAuxPlus: boolean;
  onMarkRead: (id: string) => void; author: ProfileInfo;
  liked: boolean; likeCount: number;
  onToggleLike: (id: string) => void; commentCount: number;
}) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  function handleLike() {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 300);
    onToggleLike(a.id);
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isRead
          ? "bg-card/50 border-border"
          : "bg-card border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
      }`}
      onMouseEnter={() => onMarkRead(a.id)}
    >
      {!isRead && <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary/60 to-transparent" />}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar name={author.name} avatarUrl={author.avatar} size="lg" />
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
              {author.name} · {timeAgo(a.created_at)}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className={`mt-4 ${isRead ? "text-muted-foreground" : "text-foreground/90"}`}>
          <DiscordMarkdown text={a.body} />
        </div>

        {/* Action bar */}
        <div className="mt-4 pt-3 border-t border-border flex items-center gap-1 flex-wrap">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              liked
                ? "bg-red-500/15 text-red-400 border border-red-500/30"
                : "hover:bg-muted text-muted-foreground border border-transparent hover:border-border"
            }`}
          >
            <Heart
              className={`h-3.5 w-3.5 transition-transform duration-150 ${likeAnim ? "scale-125" : "scale-100"} ${liked ? "fill-current" : ""}`}
            />
            <span>{likeCount > 0 ? likeCount : ""}</span>
            <span>{liked ? "Liked" : "Like"}</span>
          </button>

          {/* Comments */}
          <button
            onClick={() => setShowComments(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              showComments
                ? "bg-primary/10 text-primary border border-primary/20"
                : "hover:bg-muted text-muted-foreground border border-transparent hover:border-border"
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {commentCount > 0 && <span>{commentCount}</span>}
            <span>{showComments ? "Hide" : "Comment"}</span>
          </button>

          {/* Reads (AUX+) */}
          {isAuxPlus && (
            <div className="ml-auto">
              <ReadsPanel announcementId={a.id} />
            </div>
          )}
        </div>

        {/* Comments section */}
        {showComments && user && (
          <div className="mt-4 pt-3 border-t border-border">
            <CommentSection
              announcementId={a.id}
              profiles={{}}
              currentUserId={user.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────────── */

function Announcements() {
  const { user, isAuxPlus } = useAuth();
  const sb = supabase as any;

  const [list, setList] = useState<any[]>([]);
  const [reads, setReads] = useState<Set<string>>(new Set());
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, ProfileInfo>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    const anns = data ?? [];
    setList(anns);

    const annIds = anns.map((a: any) => a.id);
    const authorIds = [...new Set(anns.map((a: any) => a.author_id))] as string[];

    const [profilesRes, readsRes, likesRes, commentsRes] = await Promise.all([
      authorIds.length
        ? supabase.from("profiles").select("id, display_name, avatar_url").in("id", authorIds)
        : Promise.resolve({ data: [] }),
      user
        ? supabase.from("announcement_reads").select("announcement_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
      annIds.length
        ? sb.from("announcement_likes").select("announcement_id, user_id").in("announcement_id", annIds)
        : Promise.resolve({ data: [] }),
      annIds.length
        ? sb.from("announcement_comments").select("announcement_id").in("announcement_id", annIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Profiles
    const pMap: Record<string, ProfileInfo> = {};
    for (const p of profilesRes.data ?? []) pMap[p.id] = { name: p.display_name, avatar: p.avatar_url };
    setAuthorProfiles(pMap);

    // Reads
    setReads(new Set((readsRes.data ?? []).map((r: any) => r.announcement_id)));

    // Likes
    const lc: Record<string, number> = {};
    const ul = new Set<string>();
    for (const lk of likesRes.data ?? []) {
      lc[lk.announcement_id] = (lc[lk.announcement_id] ?? 0) + 1;
      if (lk.user_id === user?.id) ul.add(lk.announcement_id);
    }
    setLikeCounts(lc);
    setUserLikes(ul);

    // Comment counts
    const cc: Record<string, number> = {};
    for (const c of commentsRes.data ?? []) cc[c.announcement_id] = (cc[c.announcement_id] ?? 0) + 1;
    setCommentCounts(cc);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  useEffect(() => {
    const ch = supabase.channel("ann-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user]);

  async function markRead(id: string) {
    if (!user || reads.has(id)) return;
    await supabase.from("announcement_reads").insert({ announcement_id: id, user_id: user.id });
    setReads(prev => new Set([...prev, id]));
  }

  async function toggleLike(id: string) {
    if (!user) return;
    const liked = userLikes.has(id);
    // Optimistic update
    setUserLikes(prev => {
      const next = new Set(prev);
      liked ? next.delete(id) : next.add(id);
      return next;
    });
    setLikeCounts(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + (liked ? -1 : 1)) }));
    if (liked) {
      await sb.from("announcement_likes").delete().eq("announcement_id", id).eq("user_id", user.id);
    } else {
      await sb.from("announcement_likes").insert({ announcement_id: id, user_id: user.id });
    }
  }

  async function post() {
    if (!user || !title.trim() || !body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({ author_id: user.id, title: title.trim(), body: body.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Announcement posted");
    setTitle(""); setBody(""); setOpen(false);
    load();
  }

  const unreadCount = list.filter(a => !reads.has(a.id)).length;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
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
              <Button className="gap-1.5 flex-shrink-0"><Plus className="h-4 w-4" /> Post</Button>
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
                  <Input placeholder="Short, clear headline…" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <Textarea
                    placeholder={"Write your announcement here…\n\n# Big heading  ## Smaller  **bold**  *italic*\n__underline__  ~~strike~~  `code`\n- Bullet point\n> Blockquote"}
                    rows={7}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {[["# H1","big text"],["## H2","heading"],["**bold**","bold"],["*italic*","italic"],["__u__","underline"],["~~s~~","strike"],["- item","bullet"],["> q","quote"],["`c`","code"]].map(([s,l]) => (
                      <span key={l} className="text-[10px] font-mono text-muted-foreground">
                        <span className="text-foreground/60">{s}</span>
                        <span className="text-muted-foreground/50 font-sans ml-1">→ {l}</span>
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
          {list.map(a => (
            <AnnouncementCard
              key={a.id}
              a={a}
              isRead={reads.has(a.id)}
              isAuxPlus={isAuxPlus}
              onMarkRead={markRead}
              author={authorProfiles[a.author_id] ?? { name: "Staff", avatar: null }}
              liked={userLikes.has(a.id)}
              likeCount={likeCounts[a.id] ?? 0}
              onToggleLike={toggleLike}
              commentCount={commentCounts[a.id] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
