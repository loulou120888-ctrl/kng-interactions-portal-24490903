import { Router } from "express";
import { db } from "../db.js";
import { profiles } from "../../shared/schema.js";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware.js";

export const profilesRouter = Router();

profilesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(profiles).orderBy(profiles.display_name);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

profilesRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const [row] = await db.select().from(profiles).where(eq(profiles.id, req.session.userId!)).limit(1);
    res.json(row ?? null);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

profilesRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const [row] = await db.select().from(profiles).where(eq(profiles.id, req.params.id)).limit(1);
    res.json(row ?? null);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

profilesRouter.post("/batch", requireAuth, async (req, res) => {
  const { ids } = req.body as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) { res.json([]); return; }
  try {
    const rows = await db.select().from(profiles).where(inArray(profiles.id, ids));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

profilesRouter.patch("/:id", requireAuth, async (req, res) => {
  const { display_name, department, deactivated } = req.body;
  try {
    const patch: Record<string, any> = { updated_at: new Date() };
    if (display_name !== undefined) patch.display_name = display_name;
    if (department !== undefined) patch.department = department || null;
    if (deactivated !== undefined) patch.deactivated = deactivated;

    const [updated] = await db
      .update(profiles)
      .set(patch)
      .where(eq(profiles.id, req.params.id))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
