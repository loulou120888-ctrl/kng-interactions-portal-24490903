import { Router } from "express";
import { db } from "../db.js";
import { prizes } from "../../shared/schema.js";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middleware.js";

export const prizesRouter = Router();

prizesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(prizes).orderBy(asc(prizes.name));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

prizesRouter.post("/", requireAuth, async (req, res) => {
  const { code, name, default_quantity } = req.body;
  try {
    const [row] = await db.insert(prizes).values({ code, name, default_quantity: default_quantity ?? 1 }).returning();
    res.json(row);
  } catch (err: any) {
    if (err.code === "23505") { res.status(400).json({ error: "Prize code already exists" }); return; }
    res.status(500).json({ error: "Server error" });
  }
});

prizesRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(prizes).where(eq(prizes.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
