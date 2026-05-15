import { Router } from "express";
import { db } from "../db.js";
import { interactions, interactionAttendees, interactionWinners, pointsLog, scheduleSlots } from "../../shared/schema.js";
import { eq, desc, or, ilike, and, isNotNull, isNull, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware.js";

export const interactionsRouter = Router();

interactionsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const { q, poster_only, limit: lim = "200", author_id } = req.query as any;
    let query = db.select().from(interactions).$dynamic();
    const conditions: any[] = [];

    if (q) {
      conditions.push(or(
        ilike(interactions.title, `%${q}%`),
        ilike(interactions.summary, `%${q}%`),
        ilike(interactions.poster_message, `%${q}%`),
        ilike(interactions.f3_message, `%${q}%`),
      ));
    }

    if (author_id) conditions.push(eq(interactions.author_id, author_id));

    if (poster_only === "true") {
      conditions.push(isNull(interactions.slot_id));
      conditions.push(or(
        isNotNull(interactions.poster_message),
        isNotNull(interactions.poster_image_url),
        isNotNull(interactions.f3_message),
      ));
    }

    if (conditions.length === 1) query = query.where(conditions[0]);
    else if (conditions.length > 1) query = query.where(and(...conditions));

    const rows = await query.orderBy(desc(interactions.created_at)).limit(parseInt(lim));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

interactionsRouter.post("/", requireAuth, async (req, res) => {
  const { department, title, summary, slot_id, poster_message, poster_image_url, f3_message, attendees, winners } = req.body;
  const author_id = req.body.author_id ?? req.session.userId!;

  try {
    const [ix] = await db.insert(interactions).values({
      department,
      title,
      summary: summary || null,
      author_id,
      slot_id: slot_id || null,
      poster_message: poster_message || null,
      poster_image_url: poster_image_url || null,
      f3_message: f3_message || null,
    }).returning();

    await db.insert(pointsLog).values({ user_id: author_id, interaction_id: ix.id, amount: 1 });

    if (Array.isArray(attendees) && attendees.length > 0) {
      await db.insert(interactionAttendees).values(
        attendees.map((uid: string) => ({ interaction_id: ix.id, user_id: uid }))
      );
      await db.insert(pointsLog).values(
        attendees.map((uid: string) => ({ user_id: uid, interaction_id: ix.id, amount: 1 }))
      );
    }

    if (Array.isArray(winners) && winners.length > 0) {
      const validWinners = winners.filter((w: any) => w.winner_id?.trim() && w.prize_code?.trim());
      if (validWinners.length) {
        await db.insert(interactionWinners).values(
          validWinners.map((w: any) => ({
            interaction_id: ix.id,
            winner_id: w.winner_id.trim(),
            prize_code: w.prize_code.trim(),
            prize_name: w.prize_name ?? null,
            quantity: w.quantity ?? 1,
          }))
        );
      }
    }

    if (slot_id) {
      await db.update(scheduleSlots)
        .set({ status: "completed", interaction_id: ix.id, claimed_by: null, updated_at: new Date() })
        .where(eq(scheduleSlots.id, slot_id));
    }

    res.json(ix);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

interactionsRouter.patch("/:id", requireAuth, async (req, res) => {
  const { title, poster_message, f3_message, poster_image_url } = req.body;
  try {
    const patch: Record<string, any> = { updated_at: new Date() };
    if (title !== undefined) patch.title = title;
    if (poster_message !== undefined) patch.poster_message = poster_message || null;
    if (f3_message !== undefined) patch.f3_message = f3_message || null;
    if (poster_image_url !== undefined) patch.poster_image_url = poster_image_url || null;
    const [row] = await db.update(interactions).set(patch).where(eq(interactions.id, req.params.id)).returning();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

interactionsRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(interactions).where(eq(interactions.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
