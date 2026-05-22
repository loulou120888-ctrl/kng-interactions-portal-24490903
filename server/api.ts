import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("[API] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const ROLE_RANK: Record<string, number> = {
  helper: 1, member: 1, sld: 2, ld: 3, aux: 4, adm: 5, manager: 6,
};

async function getCallerInfo(authHeader: string | undefined): Promise<{ userId: string; topRole: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  // Verify JWT and get user id via Supabase auth REST API
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SERVICE_ROLE_KEY,
    },
  });
  if (!userRes.ok) return null;
  const user = await userRes.json() as { id?: string };
  if (!user.id) return null;

  // Fetch caller's roles from the DB
  const rolesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${user.id}&select=role`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
    }
  );
  if (!rolesRes.ok) return null;
  const roles = await rolesRes.json() as { role: string }[];

  const topRole = roles.reduce<string>((best, r) => {
    return (ROLE_RANK[r.role] ?? 0) > (ROLE_RANK[best] ?? 0) ? r.role : best;
  }, "member");

  return { userId: user.id, topRole };
}

function generateLoginCode(): string {
  // 12 uppercase chars + digits (no ambiguous 0/O, 1/I/L), displayed as XXXX-XXXX-XXXX
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let raw = "";
  for (let i = 0; i < 12; i++) raw += chars[Math.floor(Math.random() * chars.length)];
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

app.post("/api/admin/reset-password", async (req, res) => {
  console.log("[API] reset-password: request received");
  try {
    const caller = await getCallerInfo(req.headers.authorization);
    console.log("[API] reset-password: caller =", caller ? `${caller.userId} role=${caller.topRole}` : "null");
    if (!caller || caller.topRole !== "manager") {
      res.status(403).json({ error: "Manager access required" });
      return;
    }

    const { targetUserId } = req.body as { targetUserId?: string };
    console.log("[API] reset-password: targetUserId =", targetUserId);
    if (!targetUserId) {
      res.status(400).json({ error: "targetUserId is required" });
      return;
    }

    // Prevent resetting your own password via this flow (use Supabase directly)
    if (targetUserId === caller.userId) {
      res.status(400).json({ error: "Cannot reset your own password via this endpoint" });
      return;
    }

    const loginCode = generateLoginCode();
    console.log("[API] reset-password: generated code, calling Supabase admin update...");

    // Set password + flag user as needing a forced password reset after first login
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${targetUserId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: loginCode,
        user_metadata: { force_password_reset: true },
      }),
    });

    console.log("[API] reset-password: Supabase update status =", updateRes.status);

    if (!updateRes.ok) {
      const errText = await updateRes.text().catch(() => "");
      let errMsg = "Failed to generate login code";
      try { errMsg = (JSON.parse(errText) as { message?: string }).message ?? errMsg; } catch { errMsg = errText || errMsg; }
      console.error("[API] reset-password: Supabase error:", errText);
      res.status(500).json({ error: errMsg });
      return;
    }

    console.log(`[API] One-time login code generated for user ${targetUserId} by manager ${caller.userId}`);
    res.json({ password: loginCode });
  } catch (err: any) {
    console.error("[API] reset-password error:", err);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});



const PORT = 8000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[API] Admin API server running on port ${PORT}`);
});
