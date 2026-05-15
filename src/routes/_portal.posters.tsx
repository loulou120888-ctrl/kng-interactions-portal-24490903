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
import { Copy, Check, ImageIcon, FileText, Radio, Plus, Upload, X, Trash2, ChevronDown, ChevronRight, Search, Pencil } from "lucide-react";
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
      onClick={(e) => { e.stopPropagation(); copy(text, copyKey); }}
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

function PosterCard({ r, authorName, canDelete, onDelete, onEdit }: {
  r: any; authorName: string; canDelete: boolean; onDelete: () => void; onEdit: () => void;
}) {
  const { copiedKey, copy } = useCopy();
  const imgCopied = copiedKey === `img-${r.id}`;
  const [expanded, setExpanded] = useState(false);

  const hasPoster = !!(r.poster_message || r.poster_image_url || r.f3_message);
  if (!hasPoster) return null;

  return (
    <Card className="rounded-2xl bg-card/60 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-border/60 hover:bg-white/[0.02] transition text-left"
      >
        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        }
        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${DEPT_BG[r.department as Department]}`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{r.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {DEPT_LABEL[r.department as Department]} · {authorName}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge variant="outline" className="text-[10px]">
            {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </Badge>
          {canDelete && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="rounded-full p-1 hover:bg-primary/20 text-muted-foreground hover:text-primary transition"
                title="Edit pack"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="rounded-full p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition"
                title="Delete pack"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </button>

      {expanded && (
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
      )}
    </Card>
  );
}

function EditPosterDialog({ row, open, onOpenChange, onSaved, userId }: {
  row: any; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void; userId: string;
}) {
  const [dept, setDept] = useState<Department>(row.department ?? "entertainment");
  const [title, setTitle] = useState(row.title ?? "");
  const [posterMessage, setPosterMessage] = useState(row.poster_message ?? "");
  const [f3Message, setF3Message] = useState(row.f3_message ?? "");
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(row.poster_image_url ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File) {
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  function clearNewImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function save() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);

    let posterImageUrl = existingImageUrl;

    if (imageFile) {
      const path = `${userId}/${Date.now()}-${imageFile.name}`;
      const { error: ue } = await supabase.storage.from("posters").upload(path, imageFile, { contentType: imageFile.type });
      if (ue) {
        setBusy(false);
        submittingRef.current = false;
        toast.error("Image upload failed: " + ue.message);
        return;
      }
      const { data } = supabase.storage.from("posters").getPublicUrl(path);
      posterImageUrl = data.publicUrl;
    }

    const { error } = await supabase.from("interactions").update({
      department: dept,
      title: title.trim() || "Poster Pack",
      poster_message: posterMessage.trim() || null,
      poster_image_url: posterImageUrl,
      f3_message: f3Message.trim() || null,
    }).eq("id", row.id);

    setBusy(false);
    submittingRef.current = false;

    if (error) { toast.error(error.message); return; }
    toast.success("Pack updated");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit poster pack</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Label</Label>
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
            <Textarea value={posterMessage} onChange={(e) => setPosterMessage(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Poster image <span className="text-muted-foreground font-normal">(optional)</span></Label>
            {existingImageUrl && !imagePreview && (
              <div className="relative w-fit">
                <img src={existingImageUrl} alt="current poster" className="h-28 rounded-lg border border-border object-cover" />
                <button
                  onClick={() => setExistingImageUrl(null)}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5"
                  title="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
            {imagePreview ? (
              <div className="relative w-full rounded-lg overflow-hidden border border-border">
                <img src={imagePreview} alt="new preview" className="w-full max-h-48 object-contain" />
                <button
                  onClick={clearNewImage}
                  className="absolute top-2 right-2 rounded-full bg-background/80 p-0.5 hover:bg-destructive hover:text-destructive-foreground transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {existingImageUrl ? "Replace image" : "Upload image"}
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Label>F3 message <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={f3Message} onChange={(e) => setF3Message(e.target.value)} rows={2} />
          </div>
          <Button className="w-full" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
  const submittingRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle(""); setPosterMessage(""); setF3Message(""); setImageFile(null); setImagePreview(null);
    submittingRef.current = false;
  }

  function pickFile(f: File) {
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (submittingRef.current || !user) return;
    if (!posterMessage.trim() && !imageFile && !f3Message.trim()) {
      toast.error("Add at least one piece of content"); return;
    }
    submittingRef.current = true;
    setBusy(true);

    let posterImageUrl: string | null = null;
    if (imageFile) {
      const path = `${user.id}/${Date.now()}-${imageFile.name}`;
      const { error: ue } = await supabase.storage.from("posters").upload(path, imageFile, { contentType: imageFile.type });
      if (ue) {
        setBusy(false);
        submittingRef.current = false;
        toast.error("Upload failed: " + ue.message);
        return;
      }
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
    submittingRef.current = false;

    if (error) { toast.error(error.message); return; }
    toast.success("Poster pack uploaded");
    reset();
    onUploaded();
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
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 rounded-full bg-background/80 p-0.5 hover:bg-destructive hover:text-destructive-foreground transition"
                >
                  <X className="h-3 w-3" />
                </button>
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

          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy ? "Uploading…" : "Upload pack"}
          </Button>
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
  const [editRow, setEditRow] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("interactions")
      .select("*")
      .or("poster_message.not.is.null,poster_image_url.not.is.null,f3_message.not.is.null")
      .order("created_at", { ascending: false })
      .limit(200);

    const items = data ?? [];
    setRows(items);
    setLoading(false);

    const ids = Array.from(new Set(items.map((r: any) => r.author_id)));
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      setProfiles(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.display_name])));
    }
  }

  useEffect(() => { load(); }, []);

  async function deleteRow(id: string) {
    const { error } = await supabase.from("interactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); setRows(prev => prev.filter(r => r.id !== id)); }
  }

  const q = search.trim().toLowerCase();
  const withPoster = rows.filter(r => r.poster_message || r.poster_image_url || r.f3_message);
  const filtered = q
    ? withPoster.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        DEPT_LABEL[r.department as Department]?.toLowerCase().includes(q) ||
        r.poster_message?.toLowerCase().includes(q)
      )
    : withPoster;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Posters & Promos</h1>
          <p className="text-sm text-muted-foreground">
            Advertising content ready to copy. Click any entry to expand it.
          </p>
        </div>
        {isAuxPlus && (
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Upload pack
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Search by event name, department or message…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Card key={i} className="rounded-2xl bg-card/60 h-14 animate-pulse" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="rounded-2xl bg-card/60 p-10 text-center">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">
            {q ? "No results match your search." : "No poster content yet."}
          </p>
          {!q && isAuxPlus && <p className="text-xs text-muted-foreground mt-1">Click "Upload pack" to add the first one.</p>}
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((r) => (
          <PosterCard
            key={r.id}
            r={r}
            authorName={profiles[r.author_id] ?? "—"}
            canDelete={isAuxPlus}
            onDelete={() => deleteRow(r.id)}
            onEdit={() => setEditRow(r)}
          />
        ))}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {filtered.length} pack{filtered.length !== 1 ? "s" : ""}{q ? " found" : " total"}
        </p>
      )}

      <UploadPosterDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={() => { setUploadOpen(false); load(); }}
      />

      {editRow && (
        <EditPosterDialog
          row={editRow}
          open={!!editRow}
          onOpenChange={(o) => { if (!o) setEditRow(null); }}
          onSaved={load}
          userId={user?.id ?? ""}
        />
      )}
    </div>
  );
}
