import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, Eye, Plus } from "lucide-react";

export const Route = createFileRoute("/_portal/announcements")({ component: Announcements });

function Announcements() {
  const { user, isAuxPlus } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [reads, setReads] = useState<Set<string>>(new Set());
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [readers, setReaders] = useState<Record<string, any[]>>({});
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function load() {
    const [data, r] = await Promise.all([
      api.announcements.list().catch(() => [] as any[]),
      api.announcements.reads().catch(() => [] as any[]),
    ]);
    setList(data);
    setReads(new Set(r.map((x: any) => x.announcement_id)));
    const ids = Array.from(new Set(data.map((a: any) => a.author_id)));
    if (ids.length) {
      const pfs = await api.profiles.batch(ids as string[]).catch(() => []);
      setAuthors(Object.fromEntries(pfs.map((p: any) => [p.id, p.display_name])));
    }
  }

  useEffect(() => { load(); }, [user]);

  async function markRead(id: string) {
    if (!user || reads.has(id)) return;
    await api.announcements.markRead(id).catch(() => {});
    setReads(new Set([...reads, id]));
  }

  async function loadReaders(id: string) {
    const data = await api.announcements.readers(id).catch(() => [] as any[]);
    const ids = data.map((r: any) => r.user_id);
    const pfs = ids.length ? await api.profiles.batch(ids).catch(() => []) : [];
    const nameMap = Object.fromEntries(pfs.map((p: any) => [p.id, p.display_name]));
    setReaders(r => ({ ...r, [id]: data.map((x: any) => ({ name: nameMap[x.user_id], at: x.read_at })) }));
  }

  async function post() {
    if (!user || !title.trim() || !body.trim()) { toast.error("Title and body required"); return; }
    await api.announcements.create({ title: title.trim(), body: body.trim() }).catch((e: any) => { toast.error(e.message); return null; });
    toast.success("Posted");
    setTitle(""); setBody(""); setOpen(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Megaphone className="h-6 w-6" /> Announcements</h1>
          <p className="text-sm text-muted-foreground">{isAuxPlus ? "Post bulletins; track who has read them." : "Latest team announcements."}</p>
        </div>
        {isAuxPlus && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div className="space-y-2"><Label>Body</Label><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></div>
                <Button className="w-full" onClick={post}>Post</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="space-y-3">
        {list.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
        {list.map((a) => (
          <Card key={a.id} className="rounded-2xl bg-card/60 p-5" onMouseEnter={() => markRead(a.id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  {!reads.has(a.id) && <Badge>NEW</Badge>}
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{a.body}</p>
                <p className="mt-3 text-xs text-muted-foreground">{authors[a.author_id] ?? "—"} · {new Date(a.created_at).toLocaleString()}</p>
              </div>
              {isAuxPlus && (
                <Button variant="ghost" size="sm" onClick={() => loadReaders(a.id)}>
                  <Eye className="h-3 w-3 mr-1" /> Reads
                </Button>
              )}
            </div>
            {isAuxPlus && readers[a.id] && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-2">Read by {readers[a.id].length}:</p>
                <div className="flex flex-wrap gap-1.5">
                  {readers[a.id].map((r: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{r.name}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
