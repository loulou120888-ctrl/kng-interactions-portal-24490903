import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEPT_LABEL, DEPT_BG, type Department } from "@/lib/portal";
import { Copy, Check, ImageIcon, FileText, Radio } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_portal/posters")({  component: PostersPage,
});

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = useCallback(async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied");
    setTimeout(() => setCopiedKey(k => k === key ? null : k), 2000);
  }, []);
  return { copiedKey, copy };
}

function CopyChip({ label, icon: Icon, text, copyKey }: {
  label: string;
  icon: React.ElementType;
  text: string;
  copyKey: string;
}) {
  const { copiedKey, copy } = useCopy();
  const copied = copiedKey === copyKey;
  return (
    <button
      onClick={() => copy(text, copyKey)}
      className={`group w-full text-left rounded-xl border transition-all duration-150 p-4 ${
        copied
          ? "border-green-500/40 bg-green-500/10"
          : "border-border bg-background/40 hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-3.5 w-3.5 ${copied ? "text-green-400" : "text-muted-foreground"}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`ml-auto flex items-center gap-1 text-xs transition ${copied ? "text-green-400" : "text-muted-foreground group-hover:text-foreground"}`}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Click to copy"}
        </span>
      </div>
      <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{text}</p>
    </button>
  );
}

function PosterCard({ r, authorName }: { r: any; authorName: string }) {
  const { copiedKey, copy } = useCopy();
  const imgCopied = copiedKey === `img-${r.id}`;
  const hasPoster = !!(r.poster_message || r.poster_image_url || r.f3_message);
  if (!hasPoster) return null;

  return (
    <Card className="rounded-2xl bg-card/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/60">
        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${DEPT_BG[r.department as Department]}`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{r.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {DEPT_LABEL[r.department as Department]} · {authorName}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] flex-shrink-0">
          {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </Badge>
      </div>

      {/* Poster content */}
      <div className="p-4 space-y-3">
        {r.poster_message && (
          <CopyChip
            label="Poster message"
            icon={FileText}
            text={r.poster_message}
            copyKey={`msg-${r.id}`}
          />
        )}

        {r.poster_image_url && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Poster image</span>
            </div>
            <div className="flex items-start gap-3">
              <a href={r.poster_image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                <img
                  src={r.poster_image_url}
                  alt="poster"
                  className="h-32 w-32 rounded-lg object-cover border border-border hover:opacity-80 transition"
                />
              </a>
              <button
                onClick={() => copy(r.poster_image_url, `img-${r.id}`)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition ${
                  imgCopied ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-border hover:border-primary/40"
                }`}
              >
                {imgCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {imgCopied ? "Copied URL" : "Copy URL"}
              </button>
            </div>
          </div>
        )}

        {r.f3_message && (
          <CopyChip
            label="F3 message"
            icon={Radio}
            text={r.f3_message}
            copyKey={`f3-${r.id}`}
          />
        )}
      </div>
    </Card>
  );
}

function PostersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("interactions")
        .select("*")
        .or("poster_message.not.is.null,poster_image_url.not.is.null,f3_message.not.is.null")
        .order("created_at", { ascending: false })
        .limit(100);

      const items = data ?? [];
      setRows(items);

      const ids = Array.from(new Set(items.map((r: any) => r.author_id)));
      if (ids.length) {
        const { data: p } = await supabase.from("profiles").select("id, display_name").in("id", ids);
        setProfiles(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.display_name])));
      }
      setLoading(false);
    })();

    const ch = supabase
      .channel("posters-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "interactions" }, async (payload) => {
        const r = payload.new as any;
        if (!r.poster_message && !r.poster_image_url && !r.f3_message) return;
        // Fetch author name if needed
        setProfiles((prev) => {
          if (prev[r.author_id]) return prev;
          supabase.from("profiles").select("id, display_name").eq("id", r.author_id).single()
            .then(({ data }) => {
              if (data) setProfiles((p) => ({ ...p, [data.id]: data.display_name }));
            });
          return prev;
        });
        setRows((prev) => [r, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  const withPoster = rows.filter(r => r.poster_message || r.poster_image_url || r.f3_message);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Posters & Promos</h1>
        <p className="text-sm text-muted-foreground">
          Promotional content from logged events. Click any section to copy it instantly.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl bg-card/60 h-48 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && withPoster.length === 0 && (
        <Card className="rounded-2xl bg-card/60 p-10 text-center">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">No poster content yet.</p>
          <p className="text-xs text-muted-foreground mt-1">When interactions are logged with poster/promo details they'll appear here.</p>
        </Card>
      )}

      <div className="space-y-4">
        {withPoster.map((r) => (
          <PosterCard key={r.id} r={r} authorName={profiles[r.author_id] ?? "—"} />
        ))}
      </div>
    </div>
  );
}
