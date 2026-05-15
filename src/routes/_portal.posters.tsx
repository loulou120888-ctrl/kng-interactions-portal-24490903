import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEPT_LABEL, DEPT_BG, DEPARTMENTS, type Department } from "@/lib/portal";
import { Copy, Check, ImageIcon, FileText, Radio, Plus, Upload, X, Trash2, ChevronDown, ChevronUp, Search, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_portal/posters")({ component: PostersPage });

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
  label: string; icon: React.ElementType; text: string; copyKey: string;
}) {
  const { copiedKey, copy } = useCopy();
  const copied = copiedKey === copyKey;
  return (
    <button
      onClick={() => copy(text, copyKey)}
      className={`group w-full text-left rounded-xl border transition-all duration-150 p-4 ${
        copied ? "border-green-500/40 bg-green-500/10" : "border-border bg-background/40 hover:border-primary/40 hover:bg-primary/5"
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

function EditPosterDialog({ r, open, onOpenChange, onSaved }: { r: any; open: boolean; onOpenChange: (o: boolean) => void; onSaved: (updated: any) => void; }) {
  const [title, setTitle] = useState(r.title ?? "");
  const [posterMessage, setPosterMessage] = useState(r.poster_message ?? "");
  const [f3Message, setF3Message] = useState(r.f3_message ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(r.poster_image_url ?? null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(r.title ?? "");
    setPosterMessage(r.poster_message ?? "");
    setF3Message(r.f3_message ?? "");
    setImageFile(null);
    setImagePreview(r.poster_image_url ?? null);
  }, [r.id, open]);

  function pickFile(f: File) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }

  async function submit() {
    setBusy(true);
    try {
      let posterImageUrl = r.poster_image_url;
      if (imageFile) {
        const { public_url } = await api.uploads.upload("posters", imageFile);
        posterImageUrl = public_url;
      } else if (imagePreview === null) {
        posterImageUrl = null;
      }
      const updated = await api.interactions.update(r.id, {
        title: title.trim() || "Poster Pack",
        poster_message: posterMessage.trim() || null,
        f3_message: f3Message.trim() || null,
        poster_image_url: posterImageUrl,
      });
      toast.success("Poster pack updated");
      onSaved(updated);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit poster / promo pack</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-1">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Friday Night Quiz" />
          </div>
          <div className="space-y-2">
            <Label>Poster message <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={posterMessage} onChange={e => setPosterMessage(e.target.value)} rows={3} placeholder="e.g. 🎉 Friday Night Quiz is LIVE!" />
          </div>
          <div className="space-y-2">
            <Label>Poster image <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])} />
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> {imageFile ? imageFile.name : "Replace image"}
            </Button>
            {imagePreview && (
              <div className="relative w-full rounded-lg overflow-hidden border border-border">
                <img src={imagePreview} alt="preview" className="w-full max-h-48 object-contain" />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 rounded-full bg-background/80 p-0.5 hover:bg-destructive hover:text-destructive-foreground transition"><X className="h-3 w-3" /></button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>F3 message <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={f3Message} onChange={e => setF3Message(e.target.value)} rows={2} placeholder="e.g. /f3 message…" />
          </div>
          <div className="flex gap-2">
            <Button type="button" className="flex-1" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PosterCard({ r: initialR, authorName, canDelete, canEdit, onDelete, onUpdated }: {
  r: any; authorName: string; canDelete: boolean; canEdit: boolean; onDelete: () => void; onUpdated: (updated: any) => void;
}) {
  const { copiedKey, copy } = useCopy();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [r, setR] = useState(initialR);
  const imgCopied = copiedKey === `img-${r.id}`;
<<<<<<< HEAD

  function handleSaved(updated: any) { setR(updated); onUpdated(updated); }
=======
  const hasPoster = !!(r.poster_message || r.poster_image_url || r.f3_message);
  if (!hasPoster) return null;
>>>>>>> parent of 6f239c7 (Replace Supabase integration with custom API for improved performance and maintainability)

  return (
    <Card className="rounded-2xl bg-card/60 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-border/60 text-left hover:bg-muted/30 transition"
      >
        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${DEPT_BG[r.department as Department]}`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{r.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {DEPT_LABEL[r.department as Department]} · {authorName}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] flex-shrink-0 hidden sm:inline-flex">
          {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </Badge>
<<<<<<< HEAD
        {canEdit && (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); setEditOpen(true); }}
            className="ml-1 rounded-full p-1 hover:bg-primary/20 text-muted-foreground hover:text-primary transition"
          >
            <Pencil className="h-3.5 w-3.5" />
          </span>
        )}
        {canDelete && (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="rounded-full p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </span>
        )}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="p-4 space-y-3">
          {r.poster_message && <CopyChip label="Poster message" icon={FileText} text={r.poster_message} copyKey={`msg-${r.id}`} />}
          {r.poster_image_url && (
            <div className="space-y-2">
              <div className="flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Poster image</span></div>
              <div className="flex items-start gap-3">
                <a href={r.poster_image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                  <img src={r.poster_image_url} alt="poster" className="h-32 w-32 rounded-lg object-cover border border-border hover:opacity-80 transition" />
                </a>
                <button onClick={() => copy(r.poster_image_url, `img-${r.id}`)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition ${imgCopied ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-border hover:border-primary/40"}`}>
                  {imgCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{imgCopied ? "Copied URL" : "Copy URL"}
                </button>
              </div>
            </div>
          )}
          {r.f3_message && <CopyChip label="F3 message" icon={Radio} text={r.f3_message} copyKey={`f3-${r.id}`} />}
        </div>
      )}
      {canEdit && <EditPosterDialog r={r} open={editOpen} onOpenChange={setEditOpen} onSaved={handleSaved} />}
=======
        {canDelete && (
          <button onClick={onDelete} className="ml-1 rounded-full p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {r.poster_message && (
          <CopyChip label="Poster message" icon={FileText} text={r.poster_message} copyKey={`msg-${r.id}`} />
        )}
        {r.poster_image_url && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Poster image</span>
            </div>
            <div className="flex items-start gap-3">
              <a href={r.poster_image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                <img src={r.poster_image_url} alt="poster" className="h-32 w-32 rounded-lg object-cover border border-border hover:opacity-80 transition" />
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
          <CopyChip label="F3 message" icon={Radio} text={r.f3_message} copyKey={`f3-${r.id}`} />
        )}
      </div>
>>>>>>> parent of 6f239c7 (Replace Supabase integration with custom API for improved performance and maintainability)
    </Card>
  );
}

function UploadPosterDialog({ open, onOpenChange, onUploaded }: {
  open: boolean; onOpenChange: (o: boolean) => void; onUploaded: () => void;
}) {
  const { user } = useAuth();
  const [dept, setDept] = useState<Department>("entertainment");
  const [title, setTitle] = useState("");
  const [posterMessage, setPosterMessage] = useState("");
  const [f3Message, setF3Message] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  function reset() {
    setTitle(""); setPosterMessage(""); setF3Message(""); setImageFile(null); setImagePreview(null);
  }

  function pickFile(f: File) {
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  async function submit() {
<<<<<<< HEAD
    if (submitting.current || busy) return;
    if (!user || (!posterMessage.trim() && !imageFile && !f3Message.trim())) { toast.error("Add at least one piece of content"); return; }
    submitting.current = true;
    setBusy(true);
    try {
      let posterImageUrl: string | null = null;
      if (imageFile) {
        const { public_url } = await api.uploads.upload("posters", imageFile);
        posterImageUrl = public_url;
      }
      await api.interactions.create({
        department: dept, title: title.trim() || "Poster Pack", author_id: user.id,
        poster_message: posterMessage.trim() || null, poster_image_url: posterImageUrl, f3_message: f3Message.trim() || null,
      });
      toast.success("Poster pack uploaded"); reset(); onUploaded();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); submitting.current = false; }
=======
    if (!user) return;
    if (!posterMessage.trim() && !imageFile && !f3Message.trim()) {
      toast.error("Add at least one piece of content"); return;
    }
    setBusy(true);

    let posterImageUrl: string | null = null;
    if (imageFile) {
      const path = `${user.id}/${Date.now()}-${imageFile.name}`;
      const { error: ue } = await supabase.storage.from("posters").upload(path, imageFile, { contentType: imageFile.type });
      if (ue) { setBusy(false); toast.error("Upload failed: " + ue.message); return; }
      const { data } = supabase.storage.from("posters").getPublicUrl(path);
      posterImageUrl = data.publicUrl;
    }

    const { error } = await supabase.from("interactions").insert({
      department: dept,
      title: title.trim() || "Poster Pack",
      author_id: user.id,
      poster_message: posterMessage.trim() || null,
      poster_image_url: posterImageUrl,
      f3_message: f3Message.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Poster pack uploaded");
    reset();
    onUploaded();
>>>>>>> parent of 6f239c7 (Replace Supabase integration with custom API for improved performance and maintainability)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Upload poster / promo pack</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Label <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. Friday Night Quiz"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={dept}
                onChange={(e) => setDept(e.target.value as Department)}
              >
                {DEPARTMENTS.map(d => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Poster message <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              value={posterMessage}
              onChange={(e) => setPosterMessage(e.target.value)}
              rows={3}
              placeholder="e.g. 🎉 Friday Night Quiz is LIVE! Come join us…"
            />
          </div>

          <div className="space-y-2">
            <Label>Poster image <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> {imageFile ? imageFile.name : "Upload image"}
            </Button>
            {imagePreview && (
              <div className="relative w-full rounded-lg overflow-hidden border border-border">
                <img src={imagePreview} alt="preview" className="w-full max-h-48 object-contain" />
<<<<<<< HEAD
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 rounded-full bg-background/80 p-0.5 hover:bg-destructive hover:text-destructive-foreground transition"><X className="h-3 w-3" /></button>
=======
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 rounded-full bg-background/80 p-0.5 hover:bg-destructive hover:text-destructive-foreground transition"
                >
                  <X className="h-3 w-3" />
                </button>
>>>>>>> parent of 6f239c7 (Replace Supabase integration with custom API for improved performance and maintainability)
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>F3 message <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              value={f3Message}
              onChange={(e) => setF3Message(e.target.value)}
              rows={2}
              placeholder="e.g. /f3 message here for in-game broadcast…"
            />
          </div>
<<<<<<< HEAD
          <Button type="button" className="w-full" onClick={submit} disabled={busy}>{busy ? "Uploading…" : "Upload pack"}</Button>
=======

          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy ? "Uploading…" : "Upload pack"}
          </Button>
>>>>>>> parent of 6f239c7 (Replace Supabase integration with custom API for improved performance and maintainability)
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PostersPage() {
  const { user, isAuxPlus } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
<<<<<<< HEAD
    const data = await api.interactions.list({ poster_only: true, limit: 200 }).catch(() => [] as any[]);
    setRows(data); setLoading(false);
    const ids = Array.from(new Set(data.map((r: any) => r.author_id)));
=======
    const { data } = await supabase
      .from("interactions")
      .select("*")
      .or("poster_message.not.is.null,poster_image_url.not.is.null,f3_message.not.is.null")
      .order("created_at", { ascending: false })
      .limit(100);

    const items = data ?? [];
    setRows(items);
    setLoading(false);

    const ids = Array.from(new Set(items.map((r: any) => r.author_id)));
>>>>>>> parent of 6f239c7 (Replace Supabase integration with custom API for improved performance and maintainability)
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      setProfiles(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.display_name])));
    }
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("posters-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "interactions" }, async (payload) => {
        const r = payload.new as any;
        if (!r.poster_message && !r.poster_image_url && !r.f3_message) return;
        setProfiles((prev) => {
          if (prev[r.author_id]) return prev;
          supabase.from("profiles").select("id, display_name").eq("id", r.author_id).single()
            .then(({ data }) => { if (data) setProfiles((p) => ({ ...p, [data.id]: data.display_name })); });
          return prev;
        });
        setRows((prev) => [r, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function deleteRow(id: string) {
    const { error } = await supabase.from("interactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); setRows(prev => prev.filter(r => r.id !== id)); }
  }

  function handleUpdated(updated: any) {
    setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
  }

  const q = search.trim().toLowerCase();
  const filtered = rows.filter(r => {
    if (!q) return true;
    return (
      r.title?.toLowerCase().includes(q) ||
      r.poster_message?.toLowerCase().includes(q) ||
      r.f3_message?.toLowerCase().includes(q) ||
      DEPT_LABEL[r.department as Department]?.toLowerCase().includes(q) ||
      profileMap[r.author_id]?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Posters & Promos</h1>
<<<<<<< HEAD
          <p className="text-sm text-muted-foreground">Advertising content ready to copy. Click any row to expand.</p>
=======
          <p className="text-sm text-muted-foreground">
            Advertising content ready to copy. Click any section to copy instantly.
          </p>
>>>>>>> parent of 6f239c7 (Replace Supabase integration with custom API for improved performance and maintainability)
        </div>
        {isAuxPlus && (
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Upload pack
          </Button>
        )}
      </div>
<<<<<<< HEAD
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, department, content…"
          className="pl-9"
        />
      </div>
      {loading && <div className="space-y-3">{[1, 2, 3].map(i => <Card key={i} className="rounded-2xl bg-card/60 h-14 animate-pulse" />)}</div>}
      {!loading && filtered.length === 0 && (
=======

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="rounded-2xl bg-card/60 h-48 animate-pulse" />)}
        </div>
      )}

      {!loading && withPoster.length === 0 && (
>>>>>>> parent of 6f239c7 (Replace Supabase integration with custom API for improved performance and maintainability)
        <Card className="rounded-2xl bg-card/60 p-10 text-center">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">{q ? "No results match your search." : "No poster content yet."}</p>
          {!q && isAuxPlus && <p className="text-xs text-muted-foreground mt-1">Click "Upload pack" to add the first one.</p>}
        </Card>
      )}
<<<<<<< HEAD
      <div className="space-y-2">
        {filtered.map(r => (
          <PosterCard
            key={r.id}
            r={r}
            authorName={profileMap[r.author_id] ?? "—"}
            canDelete={isAuxPlus}
            canEdit={isAuxPlus}
            onDelete={() => deleteRow(r.id)}
            onUpdated={handleUpdated}
=======

      <div className="space-y-4">
        {withPoster.map((r) => (
          <PosterCard
            key={r.id}
            r={r}
            authorName={profiles[r.author_id] ?? "—"}
            canDelete={isAuxPlus && (r.author_id === user?.id || isAuxPlus)}
            onDelete={() => deleteRow(r.id)}
>>>>>>> parent of 6f239c7 (Replace Supabase integration with custom API for improved performance and maintainability)
          />
        ))}
      </div>

      <UploadPosterDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={() => { setUploadOpen(false); load(); }}
      />
    </div>
  );
}
