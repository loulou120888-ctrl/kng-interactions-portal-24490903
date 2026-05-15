import { Router } from "express";
import { db } from "../db.js";
import { hallOfFame, hallOfFameFrames } from "../../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware.js";

export const hallRouter = Router();

hallRouter.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(hallOfFame).orderBy(desc(hallOfFame.created_at)).limit(40);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

hallRouter.post("/", requireAuth, async (req, res) => {
  const { image_url, frame_id, winner_id, caption } = req.body;
  try {
    const [row] = await db.insert(hallOfFame).values({
      author_id: req.session.userId!,
      image_url,
      frame_id,
      winner_id: winner_id || null,
      caption: caption || null,
    }).returning();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

hallRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(hallOfFame).where(eq(hallOfFame.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

hallRouter.get("/frames", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(hallOfFameFrames).orderBy(desc(hallOfFameFrames.created_at));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

hallRouter.post("/frames", requireAuth, async (req, res) => {
  const { name, image_url, region_x, region_y, region_w, region_h } = req.body;
  try {
    const [row] = await db.insert(hallOfFameFrames).values({
      name,
      image_url,
      created_by: req.session.userId!,
      region_x: region_x?.toString() ?? null,
      region_y: region_y?.toString() ?? null,
      region_w: region_w?.toString() ?? null,
      region_h: region_h?.toString() ?? null,
    }).returning();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

hallRouter.delete("/frames/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(hallOfFameFrames).where(eq(hallOfFameFrames.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
