import { Router } from "express";
import { db } from "../db.js";
import { announcements, announcementReads } from "../../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware.js";

export const announcementsRouter = Router();

announcementsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(announcements).orderBy(desc(announcements.created_at));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

announcementsRouter.post("/", requireAuth, async (req, res) => {
  const { title, body } = req.body;
  try {
    const [row] = await db.insert(announcements).values({ author_id: req.session.userId!, title, body }).returning();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

announcementsRouter.get("/reads", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(announcementReads).where(eq(announcementReads.user_id, req.session.userId!));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

announcementsRouter.post("/:id/read", requireAuth, async (req, res) => {
  try {
    await db.insert(announcementReads)
      .values({ announcement_id: req.params.id, user_id: req.session.userId! })
      .onConflictDoNothing();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

announcementsRouter.get("/:id/readers", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(announcementReads).where(eq(announcementReads.announcement_id, req.params.id));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
