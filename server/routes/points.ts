import { Router } from "express";
import { db } from "../db.js";
import { pointsLog } from "../../shared/schema.js";
import { eq, gte, desc } from "drizzle-orm";
import { requireAuth } from "../middleware.js";

export const pointsRouter = Router();

pointsRouter.get("/", requireAuth, async (req, res) => {
  const { since, user_id } = req.query as any;
  try {
    let query = db.select().from(pointsLog).$dynamic();
    if (since) query = query.where(gte(pointsLog.awarded_at, new Date(since)));
    if (user_id) query = query.where(eq(pointsLog.user_id, user_id));
    const rows = await query.orderBy(desc(pointsLog.awarded_at));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

pointsRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(pointsLog).where(eq(pointsLog.user_id, req.session.userId!));
    const total = rows.reduce((a, b) => a + (b.amount ?? 0), 0);
    res.json({ total, entries: rows });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
