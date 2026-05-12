import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, X, Upload, Image as ImageIcon } from "lucide-react";
import type { Department } from "@/lib/portal";

interface Slot {
  id: string;
  department: Department;
  title: string;
  notes: string | null;
}

interface Winner { winner_id: string; prize_code: string; quantity: number; }

export function LogInteractionDialog({
  open, onOpenChange, slot, onLogged,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  slot: Slot;
  onLogged: () => void;
}) {
  const { user } = useAuth();
  const [summary, setSummary] = useState("");
  const [posterMessage, setPosterMessage] = useState("");
  const [f3Message, setF3Message] = useState("");
  const [posterImageFile, setPosterImageFile] = useState<File | null>(null);
  const [posterImagePreview, setPosterImagePreview] = useState<string | null>(null);
  const [staff, setStaff] = useState<{ id: string; display_name: string }[]>([]);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [prizes, setPrizes] = useState<{ code: string; name: string; default_quantity: number }[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [busy, setBusy] = useState(false);
  const posterFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setSummary("");
    setPosterMessage("");
    setF3Message("");
    setPosterImageFile(null);
    setPosterImagePreview(null);
    setAttendees([]);
    setWinners([]);
    supabase.from("profiles").select("id, display_name").order("display_name")
      .then(({ data }) => setStaff((data ?? []) as any));
    supabase.from("prizes").select("code, name, default_quantity").order("name")
      .then(({ data }) => setPrizes((data ?? []) as any));
  }, [open]);

  function selectPosterImage(file: File) {
    setPosterImageFile(file);
    const url = URL.createObjectURL(file);
    setPosterImagePreview(url);
  }

  function toggleAttendee(id: string) {
    setAttendees((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id]);
  }

  function addWinner() {
    setWinners((w) => [...w, { winner_id: "", prize_code: prizes[0]?.code ?? "", quantity: prizes[0]?.default_quantity ?? 1 }]);
  }
  function updateWinner(i: number, patch: Partial<Winner>) {
    setWinners((w) => w.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  }
  function removeWinner(i: number) { setWinners((w) => w.filter((_, idx) => idx !== i)); }

  async function submit() {
    if (!user) return;
    setBusy(true);

    let posterImageUrl: string | null = null;
    if (posterImageFile) {
      const path = `${user.id}/${Date.now()}-${posterImageFile.name}`;
      const { error: ue } = await supabase.storage.from("posters").upload(path, posterImageFile, { contentType: posterImageFile.type });
      if (ue) { setBusy(false); toast.error("Failed to upload poster image: " + ue.message); return; }
      const { data } = supabase.storage.from("posters").getPublicUrl(path);
      posterImageUrl = data.publicUrl;
    }

    const { data: ix, error: ie } = await supabase.from("interactions").insert({
      department: slot.department,
      title: slot.title,
      summary: summary.trim() || null,
      poster_message: posterMessage.trim() || null,
      poster_image_url: posterImageUrl,
      f3_message: f3Message.trim() || null,
      author_id: user.id,
      slot_id: slot.id,
    }).select("id").single();
    if (ie || !ix) { setBusy(false); toast.error(ie?.message ?? "Failed"); return; }

    if (attendees.length) {
      await supabase.from("interaction_attendees").insert(attendees.map(uid => ({ interaction_id: ix.id, user_id: uid })));
    }
    const validWinners = winners.filter(w => w.winner_id.trim() && w.prize_code.trim());
    if (validWinners.length) {
      await supabase.from("interaction_winners").insert(validWinners.map(w => ({
        interaction_id: ix.id,
        winner_id: w.winner_id.trim(),
        prize_code: w.prize_code.trim(),
        prize_name: prizes.find(p => p.code === w.prize_code)?.name ?? null,
        quantity: w.quantity,
      })));
    }
    await supabase.from("schedule_slots").update({ status: "completed", interaction_id: ix.id, claimed_by: null }).eq("id", slot.id);

    setBusy(false);
    toast.success("Interaction logged · +1 point");
    onLogged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Log: {slot.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Summary</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Brief description of what happened…" />
          </div>

          <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Poster / Promo</p>
            <div className="space-y-2">
              <Label>Poster message</Label>
              <Textarea value={posterMessage} onChange={(e) => setPosterMessage(e.target.value)} rows={2} placeholder="e.g. 🎉 Friday Night Quiz is LIVE! Come join us…" />
            </div>
            <div className="space-y-2">
              <Label>Poster image</Label>
              <input ref={posterFileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && selectPosterImage(e.target.files[0])} />
              <Button type="button" variant="outline" size="sm" onClick={() => posterFileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 mr-1.5" /> {posterImageFile ? posterImageFile.name : "Upload image"}
              </Button>
              {posterImagePreview && (
                <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-border">
                  <img src={posterImagePreview} alt="poster" className="w-full h-full object-cover" />
                  <button onClick={() => { setPosterImageFile(null); setPosterImagePreview(null); }}
                    className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 hover:bg-destructive hover:text-destructive-foreground transition">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>F3 message</Label>
              <Textarea value={f3Message} onChange={(e) => setF3Message(e.target.value)} rows={2} placeholder="e.g. /f3 message here for in-game broadcast…" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Staff who attended / helped (each gets a point)</Label>
            <div className="flex flex-wrap gap-1.5">
              {staff.filter(s => s.id !== user?.id).map((s) => (
                <button key={s.id} type="button" onClick={() => toggleAttendee(s.id)}
                  className={`px-2.5 py-1 rounded-md text-xs border transition ${
                    attendees.includes(s.id) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"
                  }`}>{s.display_name}</button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Winners & prizes</Label>
              <Button type="button" size="sm" variant="outline" onClick={addWinner}><Plus className="h-3 w-3 mr-1" /> Add winner</Button>
            </div>
            {winners.length === 0 && <p className="text-xs text-muted-foreground">No winners for this one.</p>}
            <div className="space-y-2">
              {winners.map((w, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-4" placeholder="Winner ID" value={w.winner_id} onChange={(e) => updateWinner(i, { winner_id: e.target.value })} />
                  <select className="col-span-5 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={w.prize_code} onChange={(e) => {
                      const p = prizes.find(x => x.code === e.target.value);
                      updateWinner(i, { prize_code: e.target.value, quantity: p?.default_quantity ?? w.quantity });
                    }}>
                    {prizes.length === 0 && <option value="">No prizes — type below</option>}
                    {prizes.map(p => <option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
                  </select>
                  <Input className="col-span-2" type="number" min={1} value={w.quantity} onChange={(e) => updateWinner(i, { quantity: parseInt(e.target.value) || 1 })} />
                  <Button className="col-span-1" variant="ghost" size="icon" onClick={() => removeWinner(i)}><X className="h-4 w-4" /></Button>
                  {prizes.length === 0 && (
                    <Input className="col-span-12" placeholder="Prize code (e.g. PRIZE_001)" value={w.prize_code} onChange={(e) => updateWinner(i, { prize_code: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">+1 point to you</Badge>
            {attendees.length > 0 && <Badge variant="outline">+{attendees.length} points to attendees</Badge>}
          </div>

          <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Log interaction"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
