import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Image as ImageIcon, Copy, Save, Upload, Plus, Trash2, FrameIcon } from "lucide-react";

export const Route = createFileRoute("/_portal/hall")({
  head: () => ({ meta: [{ title: "Hall of Fame — KNG" }] }),
  component: HallOfFame,
});

const BUILTIN_FRAMES = [
  { id: "gold", name: "Gold", color: "oklch(0.78 0.16 75)", thickness: 28, imageUrl: null },
  { id: "purple", name: "Royal", color: "oklch(0.6 0.22 305)", thickness: 28, imageUrl: null },
  { id: "pink", name: "Party", color: "oklch(0.72 0.22 350)", thickness: 28, imageUrl: null },
  { id: "cyan", name: "Stage", color: "oklch(0.75 0.16 210)", thickness: 28, imageUrl: null },
  { id: "neon", name: "Neon", color: "oklch(0.85 0.2 145)", thickness: 22, imageUrl: null },
  { id: "obsidian", name: "Obsidian", color: "oklch(0.3 0.01 260)", thickness: 36, imageUrl: null },
];

type Region = { x: number; y: number; w: number; h: number } | null;

type FrameOption = {
  id: string;
  name: string;
  color?: string;
  thickness?: number;
  imageUrl: string | null;
  customDbId?: string;
  region?: Region;
};

function HallOfFame() {
  const { user, isManager } = useAuth();
  const [frame, setFrame] = useState<FrameOption>(BUILTIN_FRAMES[0]);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState("");
  const [caption, setCaption] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customFrames, setCustomFrames] = useState<FrameOption[]>([]);
  const [frameUploadOpen, setFrameUploadOpen] = useState(false);

  async function loadFrames() {
    const { data } = await supabase.from("hall_of_fame_frames").select("*").order("created_at", { ascending: false });
    setCustomFrames((data ?? []).map((f: any) => ({
      id: `custom-${f.id}`,
      name: f.name,
      imageUrl: f.image_url,
      customDbId: f.id,
    })));
  }

  useEffect(() => {
    supabase.from("hall_of_fame").select("*").order("created_at", { ascending: false }).limit(40)
      .then(({ data }) => setItems(data ?? []));
    loadFrames();
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith("image/"));
      if (item) { const f = item.getAsFile(); if (f) loadFile(f); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function loadFile(file: File) {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
  }

  useEffect(() => {
    if (!imgSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const W = 800, H = 800;
    canvas.width = W; canvas.height = H;
    ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, W, H);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (frame.imageUrl) {
        // Custom frame: detect transparent hole, fit photo into it exactly
        const frameImg = new Image();
        frameImg.crossOrigin = "anonymous";
        frameImg.onload = () => {
          // Analyse frame pixels to find the bounding box of the transparent hole
          const tmpCanvas = document.createElement("canvas");
          tmpCanvas.width = W; tmpCanvas.height = H;
          const tmpCtx = tmpCanvas.getContext("2d")!;
          tmpCtx.drawImage(frameImg, 0, 0, W, H);
          const { data } = tmpCtx.getImageData(0, 0, W, H);
          let minX = W, maxX = 0, minY = H, maxY = 0;
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const alpha = data[(y * W + x) * 4 + 3];
              if (alpha < 128) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          // Fallback: if no transparent area found, cover-fit the whole canvas
          const hasHole = maxX > minX && maxY > minY;
          ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, W, H);

          if (hasHole) {
            const holeW = maxX - minX + 1;
            const holeH = maxY - minY + 1;
            const scale = Math.max(holeW / img.width, holeH / img.height);
            const dw = img.width * scale, dh = img.height * scale;
            const dx = minX + (holeW - dw) / 2;
            const dy = minY + (holeH - dh) / 2;
            ctx.save();
            ctx.beginPath(); ctx.rect(minX, minY, holeW, holeH); ctx.clip();
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.restore();
          } else {
            const scale = Math.max(W / img.width, H / img.height);
            const dw = img.width * scale, dh = img.height * scale;
            ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
          }

          ctx.drawImage(frameImg, 0, 0, W, H);
        };
        frameImg.src = frame.imageUrl;
      } else {
        // Built-in frame: draw photo with border inset
        const t = frame.thickness ?? 28;
        const innerW = W - t * 2, innerH = H - t * 2;
        const scale = Math.max(innerW / img.width, innerH / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        const dx = t + (innerW - dw) / 2, dy = t + (innerH - dh) / 2;
        ctx.save();
        ctx.beginPath(); ctx.rect(t, t, innerW, innerH); ctx.clip();
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
        ctx.strokeStyle = frame.color ?? "#fff";
        ctx.lineWidth = t;
        ctx.strokeRect(t / 2, t / 2, W - t, H - t);
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 2;
        ctx.strokeRect(t, t, innerW, innerH);
      }
    };
    img.src = imgSrc;
  }, [imgSrc, frame]);

  async function copyImage() {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Copied framed image");
      } catch {
        toast.error("Clipboard not supported — use Save instead");
      }
    });
  }

  async function save() {
    if (!user || !canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      const path = `${user.id}/${Date.now()}.png`;
      const { error: ue } = await supabase.storage.from("hall-of-fame").upload(path, blob, { contentType: "image/png" });
      if (ue) { toast.error(ue.message); return; }
      const { data } = supabase.storage.from("hall-of-fame").getPublicUrl(path);
      const { error: ie } = await supabase.from("hall_of_fame").insert({
        author_id: user.id, image_url: data.publicUrl, frame_id: frame.id,
        winner_id: winnerId.trim() || null, caption: caption.trim() || null,
      });
      if (ie) toast.error(ie.message);
      else {
        toast.success("Added to Hall of Fame");
        supabase.from("hall_of_fame").select("*").order("created_at", { ascending: false }).limit(40)
          .then(({ data }) => setItems(data ?? []));
      }
    });
  }

  async function deleteCustomFrame(frame: FrameOption) {
    if (!frame.customDbId) return;
    const { error } = await supabase.from("hall_of_fame_frames").delete().eq("id", frame.customDbId);
    if (error) toast.error(error.message);
    else { toast.success("Frame deleted"); loadFrames(); }
  }

  async function deleteWallItem(id: string) {
    const { error } = await supabase.from("hall_of_fame").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Entry removed");
      setItems((prev) => prev.filter((it) => it.id !== id));
    }
  }

  const allFrames: FrameOption[] = [...BUILTIN_FRAMES, ...customFrames];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><ImageIcon className="h-6 w-6" /> Hall of Fame</h1>
          <p className="text-sm text-muted-foreground">Pick a frame, paste or upload a winner photo, then copy or save it.</p>
        </div>
        {isManager && (
          <Button variant="outline" size="sm" onClick={() => setFrameUploadOpen(true)}>
            <FrameIcon className="h-4 w-4 mr-1.5" /> Upload frame
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
        <Card className="rounded-2xl bg-card/60 p-5">
          <div className="aspect-square w-full max-w-xl mx-auto bg-background/40 rounded-lg overflow-hidden grid place-items-center">
            {imgSrc ? (
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-sm text-muted-foreground p-8">
                <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                Paste an image (Ctrl/Cmd+V) or upload below.
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl bg-card/60 p-5 space-y-4">
          <div>
            <Label className="mb-2 block">Frame</Label>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {allFrames.map((f) => (
                <div key={f.id} className="relative group">
                  <button onClick={() => setFrame(f)}
                    className={`w-full rounded-lg border-2 p-1 transition ${frame.id === f.id ? "border-primary" : "border-border"}`}>
                    {f.imageUrl ? (
                      <div className="aspect-square rounded overflow-hidden relative">
                        <img src={f.imageUrl} alt={f.name} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-background/70 py-0.5 truncate px-1">{f.name}</span>
                      </div>
                    ) : (
                      <div className="aspect-square rounded grid place-items-center text-[10px]"
                        style={{ background: "rgba(255,255,255,0.04)", borderColor: f.color, borderWidth: 4, borderStyle: "solid" }}>
                        {f.name}
                      </div>
                    )}
                  </button>
                  {isManager && f.customDbId && (
                    <button onClick={() => deleteCustomFrame(f)}
                      className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition">
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> Upload photo</Button>
          <div className="space-y-2"><Label>Winner ID</Label><Input value={winnerId} onChange={(e) => setWinnerId(e.target.value)} /></div>
          <div className="space-y-2"><Label>Caption</Label><Input value={caption} onChange={(e) => setCaption(e.target.value)} /></div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={copyImage} disabled={!imgSrc}><Copy className="h-4 w-4 mr-2" /> Copy</Button>
            <Button variant="outline" onClick={save} disabled={!imgSrc}><Save className="h-4 w-4 mr-2" /> Save</Button>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold tracking-wide mb-3">Wall</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((it) => (
            <Card key={it.id} className="rounded-xl bg-card/60 overflow-hidden relative group">
              <img src={it.image_url} alt={it.caption ?? "Winner"} className="w-full aspect-square object-cover" />
              {isManager && (
                <button
                  onClick={() => deleteWallItem(it.id)}
                  className="absolute top-1.5 right-1.5 rounded-full bg-destructive text-destructive-foreground p-1 opacity-0 group-hover:opacity-100 transition shadow"
                  title="Remove entry"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
              {(it.winner_id || it.caption) && (
                <div className="p-2 text-xs">
                  {it.winner_id && <p className="font-mono">{it.winner_id}</p>}
                  {it.caption && <p className="text-muted-foreground truncate">{it.caption}</p>}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {isManager && (
        <FrameUploadDialog
          open={frameUploadOpen}
          onOpenChange={setFrameUploadOpen}
          userId={user?.id ?? ""}
          onUploaded={() => { setFrameUploadOpen(false); loadFrames(); }}
        />
      )}
    </div>
  );
}

function FrameUploadDialog({ open, onOpenChange, userId, onUploaded }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  onUploaded: () => void;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() { setName(""); setFile(null); setPreview(null); }

  function selectFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function upload() {
    if (!file || !name.trim()) { toast.error("Name and image required"); return; }
    setBusy(true);
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error: se } = await supabase.storage.from("hof-frames").upload(path, file, { contentType: file.type });
    if (se) { setBusy(false); toast.error(se.message); return; }
    const { data: urlData } = supabase.storage.from("hof-frames").getPublicUrl(path);
    const { error: de } = await supabase.from("hall_of_fame_frames").insert({
      name: name.trim(),
      image_url: urlData.publicUrl,
      created_by: userId,
    });
    setBusy(false);
    if (de) toast.error(de.message);
    else { toast.success("Frame uploaded"); reset(); onUploaded(); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload custom frame</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Upload a PNG with a transparent centre — the winner photo will show through the hole.
          Recommended: 800×800 px.
        </p>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Frame name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diamond" />
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && selectFile(e.target.files[0])} />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> {file ? file.name : "Choose PNG frame image"}
          </Button>
          {preview && (
            <div className="mx-auto w-40 h-40 rounded-lg overflow-hidden border border-border bg-card/40 relative">
              <img src={preview} alt="frame preview" className="w-full h-full object-contain" />
            </div>
          )}
          <Button className="w-full" onClick={upload} disabled={busy || !file || !name.trim()}>
            {busy ? "Uploading…" : "Upload frame"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
