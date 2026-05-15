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

export const Route = createFileRoute("/_portal/hall")({ component: HallOfFame });

const BUILTIN_FRAMES = [
  { id: "gold", name: "Gold", color: "oklch(0.78 0.16 75)", thickness: 28, imageUrl: null },
  { id: "purple", name: "Royal", color: "oklch(0.6 0.22 305)", thickness: 28, imageUrl: null },
  { id: "pink", name: "Party", color: "oklch(0.72 0.22 350)", thickness: 28, imageUrl: null },
  { id: "cyan", name: "Stage", color: "oklch(0.75 0.16 210)", thickness: 28, imageUrl: null },
  { id: "neon", name: "Neon", color: "oklch(0.85 0.2 145)", thickness: 22, imageUrl: null },
  { id: "obsidian", name: "Obsidian", color: "oklch(0.3 0.01 260)", thickness: 36, imageUrl: null },
];

const HIDDEN_KEY = "kng_hidden_builtin_frames";

function getHiddenBuiltins(): string[] {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]"); } catch { return []; }
}
function saveHiddenBuiltins(ids: string[]) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids));
}

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
  const [hiddenBuiltins, setHiddenBuiltins] = useState<string[]>(() => getHiddenBuiltins());
  const [frame, setFrame] = useState<FrameOption>(BUILTIN_FRAMES[0]);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState("");
  const [caption, setCaption] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customFrames, setCustomFrames] = useState<FrameOption[]>([]);
  const [frameUploadOpen, setFrameUploadOpen] = useState(false);

  const visibleBuiltins = BUILTIN_FRAMES.filter((f) => !hiddenBuiltins.includes(f.id));

  async function loadFrames() {
    const { data } = await supabase.from("hall_of_fame_frames").select("*").order("created_at", { ascending: false });
    setCustomFrames((data ?? []).map((f: any) => ({
      id: `custom-${f.id}`,
      name: f.name,
      imageUrl: f.image_url,
      customDbId: f.id,
      region: (f.region_w && f.region_h)
        ? { x: Number(f.region_x), y: Number(f.region_y), w: Number(f.region_w), h: Number(f.region_h) }
        : null,
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
        const frameImg = new Image();
        frameImg.crossOrigin = "anonymous";
        frameImg.onload = () => {
          let minX = W, maxX = 0, minY = H, maxY = 0;
          let hasHole = false;

          if (frame.region) {
            minX = Math.round(frame.region.x * W);
            minY = Math.round(frame.region.y * H);
            maxX = Math.round((frame.region.x + frame.region.w) * W) - 1;
            maxY = Math.round((frame.region.y + frame.region.h) * H) - 1;
            hasHole = maxX > minX && maxY > minY;
          } else {
            const tmpCanvas = document.createElement("canvas");
            tmpCanvas.width = W; tmpCanvas.height = H;
            const tmpCtx = tmpCanvas.getContext("2d")!;
            tmpCtx.drawImage(frameImg, 0, 0, W, H);
            const { data } = tmpCtx.getImageData(0, 0, W, H);
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
            hasHole = maxX > minX && maxY > minY;
          }

          ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, W, H);
          if (hasHole) {
            const holeW = maxX - minX + 1;
            const holeH = maxY - minY + 1;
            ctx.drawImage(img, minX, minY, holeW, holeH);
          } else {
            ctx.drawImage(img, 0, 0, W, H);
          }
          ctx.drawImage(frameImg, 0, 0, W, H);
        };
        frameImg.src = frame.imageUrl;
      } else {
        const t = frame.thickness ?? 28;
        const innerW = W - t * 2, innerH = H - t * 2;
        ctx.drawImage(img, t, t, innerW, innerH);
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

  function deleteBuiltinFrame(frameId: string) {
    const next = [...hiddenBuiltins, frameId];
    setHiddenBuiltins(next);
    saveHiddenBuiltins(next);
    if (frame.id === frameId) {
      const remaining = BUILTIN_FRAMES.filter((f) => !next.includes(f.id));
      if (remaining.length) setFrame(remaining[0]);
      else if (customFrames.length) setFrame(customFrames[0]);
    }
    toast.success("Frame removed");
  }

  async function deleteCustomFrame(f: FrameOption) {
    if (!f.customDbId) return;
    const { error } = await supabase.from("hall_of_fame_frames").delete().eq("id", f.customDbId);
    if (error) toast.error(error.message);
    else {
      toast.success("Frame deleted");
      if (frame.id === f.id) {
        if (visibleBuiltins.length) setFrame(visibleBuiltins[0]);
      }
      loadFrames();
    }
  }

  async function deleteWallItem(id: string) {
    const { error } = await supabase.from("hall_of_fame").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Entry removed");
      setItems((prev) => prev.filter((it) => it.id !== id));
    }
  }

  const allFrames: FrameOption[] = [...visibleBuiltins, ...customFrames];

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
            {allFrames.length === 0 && (
              <p className="text-xs text-muted-foreground">All frames removed. Upload a custom one to continue.</p>
            )}
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
              {allFrames.map((f) => {
                const selected = frame.id === f.id;
                return (
                  <div key={f.id} className="relative group flex-shrink-0">
                    <button
                      onClick={() => setFrame(f)}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 px-3 py-2 transition text-left ${
                        selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 bg-background/30"
                      }`}
                    >
                      {f.imageUrl ? (
                        <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden border border-border">
                          <img src={f.imageUrl} alt={f.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div
                          className="h-10 w-10 flex-shrink-0 rounded-lg"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            borderWidth: 5,
                            borderStyle: "solid",
                            borderColor: f.color,
                          }}
                        />
                      )}
                      <span className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>{f.name}</span>
                      {selected && <span className="ml-auto text-[10px] text-primary font-semibold">Selected</span>}
                    </button>
                    {isManager && (
                      <button
                        onClick={() => f.customDbId ? deleteCustomFrame(f) : deleteBuiltinFrame(f.id)}
                        className="absolute top-1/2 -translate-y-1/2 right-2 rounded-full bg-destructive text-destructive-foreground p-1 opacity-0 group-hover:opacity-100 transition z-10"
                        title="Remove frame"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
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
  const boxRef = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  function reset() { setName(""); setFile(null); setPreview(null); setRegion(null); setDrag(null); }

  function selectFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setRegion({ x: 0.2, y: 0.2, w: 0.6, h: 0.6 });
  }

  function onDown(e: React.PointerEvent) {
    if (!boxRef.current) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const r = boxRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setDrag({ x, y });
    setRegion({ x, y, w: 0, h: 0 });
  }
  function onMove(e: React.PointerEvent) {
    if (!drag || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    setRegion({
      x: Math.min(drag.x, x),
      y: Math.min(drag.y, y),
      w: Math.abs(x - drag.x),
      h: Math.abs(y - drag.y),
    });
  }
  function onUp() { setDrag(null); }

  async function upload() {
    if (!file || !name.trim()) { toast.error("Name and image required"); return; }
    if (!region || region.w < 0.02 || region.h < 0.02) { toast.error("Drag a box on the preview to mark where the photo fits"); return; }
    setBusy(true);
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error: se } = await supabase.storage.from("hof-frames").upload(path, file, { contentType: file.type });
    if (se) { setBusy(false); toast.error(se.message); return; }
    const { data: urlData } = supabase.storage.from("hof-frames").getPublicUrl(path);
    const { error: de } = await supabase.from("hall_of_fame_frames").insert({
      name: name.trim(),
      image_url: urlData.publicUrl,
      created_by: userId,
      region_x: region.x,
      region_y: region.y,
      region_w: region.w,
      region_h: region.h,
    } as any);
    setBusy(false);
    if (de) toast.error(de.message);
    else { toast.success("Frame uploaded"); reset(); onUploaded(); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload custom frame</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Upload your frame image, then drag a box on the preview to mark exactly where the winner photo should fit.
          Recommended: square (e.g. 800×800 px).
        </p>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Frame name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diamond" />
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={(e) => e.target.files?.[0] && selectFile(e.target.files[0])} />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> {file ? file.name : "Choose frame image"}
          </Button>
          {preview && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Drag on the preview to mark the photo area</Label>
              <div
                ref={boxRef}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                className="mx-auto w-64 h-64 rounded-lg overflow-hidden border border-border bg-[repeating-conic-gradient(#222_0_25%,#1a1a1a_0_50%)] [background-size:16px_16px] relative cursor-crosshair touch-none select-none"
              >
                <img src={preview} alt="frame preview" className="w-full h-full object-contain pointer-events-none" />
                {region && region.w > 0 && region.h > 0 && (
                  <div
                    className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
                    style={{
                      left: `${region.x * 100}%`,
                      top: `${region.y * 100}%`,
                      width: `${region.w * 100}%`,
                      height: `${region.h * 100}%`,
                    }}
                  />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                {region ? `Region: ${(region.w * 100).toFixed(0)}% × ${(region.h * 100).toFixed(0)}%` : "No region set"}
              </p>
            </div>
          )}
          <Button className="w-full" onClick={upload} disabled={busy || !file || !name.trim() || !region || region.w < 0.02}>
            {busy ? "Uploading…" : "Upload frame"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
