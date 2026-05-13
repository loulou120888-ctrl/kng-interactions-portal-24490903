import { Router } from "express";
import { db } from "../db.js";
import { interactionWinners } from "../../shared/schema.js";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middleware.js";

export const winnersRouter = Router();

winnersRouter.get("/pending", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(interactionWinners)
      .where(eq(interactionWinners.comped, false))
      .orderBy(asc(interactionWinners.created_at));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

winnersRouter.patch("/:id/comp", requireAuth, async (req, res) => {
  try {
    const [row] = await db
      .update(interactionWinners)
      .set({ comped: true, comped_by: req.session.userId!, comped_at: new Date() })
      .where(eq(interactionWinners.id, req.params.id))
      .returning();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
