import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, User, Palette, Check } from "lucide-react";
import { toast } from "sonner";
import { ACCENT_THEMES, applyAccentTheme, getSavedThemeId } from "@/lib/theme";

export const Route = createFileRoute("/_portal/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, displayName: ctxName, avatarUrl: ctxAvatar, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(ctxName);
  const [cityId, setCityId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(ctxAvatar);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTheme, setActiveTheme] = useState(getSavedThemeId);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickTheme(id: string) {
    applyAccentTheme(id);
    setActiveTheme(id);
    toast.success("Theme updated");
  }

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, city_id, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setDisplayName((data as any).display_name ?? "");
        setCityId((data as any).city_id ?? "");
        setAvatarUrl((data as any).avatar_url ?? null);
      });
  }, [user]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) { toast.error(upErr.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    // Bust cache with timestamp
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: urlWithBust } as any)
      .eq("id", user.id);

    if (dbErr) { toast.error(dbErr.message); setUploading(false); return; }

    setAvatarUrl(urlWithBust);
    refreshProfile();
    toast.success("Profile picture updated");
    setUploading(false);
  }

  async function save() {
    if (!user) return;
    if (!displayName.trim()) { toast.error("Display name cannot be empty"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), city_id: cityId.trim() || null } as any)
      .eq("id", user.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    refreshProfile();
    toast.success("Profile saved");
    setSaving(false);
  }

  const initial = displayName?.[0]?.toUpperCase() ?? "?";
  const username = user?.email?.replace(/@kngportal\.com$/, "") ?? "";

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <User className="h-6 w-6" /> My Profile
        </h1>
        <p className="text-sm text-muted-foreground">Update your display name, city ID, profile picture, and appearance.</p>
      </div>

      <Card className="rounded-2xl bg-card/60 p-6 space-y-5">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="text-2xl bg-secondary">{initial}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-background hover:bg-accent transition shadow-sm"
              title="Upload photo"
            >
              {uploading
                ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="font-medium">{displayName}</p>
            <p className="text-sm text-muted-foreground font-mono">@{username}</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-1.5 text-xs text-primary hover:underline"
            >
              Change photo
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Display name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>City ID</Label>
          <Input
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            placeholder="Your in-city identifier"
          />
          <p className="text-xs text-muted-foreground">Your in-city or resort ID used by the team.</p>
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </Card>

      <Card className="rounded-2xl bg-card/60 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Accent Colour</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Changes the highlight colour throughout the entire portal. Saved to this device.
        </p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {ACCENT_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => pickTheme(theme.id)}
              title={theme.label}
              className={`group flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition ${
                activeTheme === theme.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-accent/30"
              }`}
            >
              <div
                className="relative h-8 w-8 rounded-full shadow-sm"
                style={{ background: theme.preview }}
              >
                {activeTheme === theme.id && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/25">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-medium ${activeTheme === theme.id ? "text-primary" : "text-muted-foreground"}`}>
                {theme.label}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
