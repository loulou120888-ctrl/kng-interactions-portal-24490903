import { Router } from "express";
import { db } from "../db.js";
import { scheduleSlots } from "../../shared/schema.js";
import { eq, and, gte, lt, asc } from "drizzle-orm";
import { requireAuth } from "../middleware.js";

export const scheduleRouter = Router();

scheduleRouter.get("/", requireAuth, async (req, res) => {
  const { schedule_type, day_start, day_end } = req.query as any;
  try {
    const rows = await db
      .select()
      .from(scheduleSlots)
      .where(
        and(
          eq(scheduleSlots.schedule_type, schedule_type),
          gte(scheduleSlots.slot_start, new Date(day_start)),
          lt(scheduleSlots.slot_start, new Date(day_end))
        )
      )
      .orderBy(asc(scheduleSlots.slot_start));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

scheduleRouter.get("/stats", requireAuth, async (req, res) => {
  const { day_start } = req.query as any;
  try {
    const sinceToday = new Date(day_start ?? new Date().setHours(0, 0, 0, 0));
    const rows = await db
      .select({ id: scheduleSlots.id })
      .from(scheduleSlots)
      .where(and(gte(scheduleSlots.slot_start, sinceToday), eq(scheduleSlots.status, "booked")));
    res.json({ count: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

scheduleRouter.get("/performance", requireAuth, async (req, res) => {
  const { since } = req.query as any;
  try {
    const rows = await db
      .select({ status: scheduleSlots.status, slot_start: scheduleSlots.slot_start })
      .from(scheduleSlots)
      .where(gte(scheduleSlots.slot_start, new Date(since)));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

scheduleRouter.post("/", requireAuth, async (req, res) => {
  const { schedule_type, slot_start, department, title, notes, booked_by } = req.body;
  const actual_booked_by = booked_by ?? req.session.userId!;
  try {
    const [row] = await db.insert(scheduleSlots).values({
      schedule_type,
      slot_start: new Date(slot_start),
      department,
      title,
      notes: notes || null,
      booked_by: actual_booked_by,
    }).returning();
    res.json(row);
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Slot already booked for that time" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

scheduleRouter.post("/bulk", requireAuth, async (req, res) => {
  const { slots } = req.body as { slots: any[] };
  try {
    const rows = await db.insert(scheduleSlots).values(
      slots.map((s: any) => ({
        schedule_type: s.schedule_type,
        slot_start: new Date(s.slot_start),
        department: s.department,
        title: s.title,
        notes: s.notes || null,
        booked_by: req.session.userId!,
      }))
    ).returning();
    res.json(rows);
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "One or more slots already booked — select only free slots." });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

scheduleRouter.patch("/:id", requireAuth, async (req, res) => {
  const { status, claimed_by, interaction_id } = req.body;
  try {
    const patch: Record<string, any> = { updated_at: new Date() };
    if (status !== undefined) patch.status = status;
    if (claimed_by !== undefined) patch.claimed_by = claimed_by;
    if (interaction_id !== undefined) patch.interaction_id = interaction_id;
    const [row] = await db.update(scheduleSlots).set(patch).where(eq(scheduleSlots.id, req.params.id)).returning();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

scheduleRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(scheduleSlots).where(eq(scheduleSlots.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
