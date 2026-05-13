import { Router } from "express";
import { db } from "../db.js";
import { userRoles } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware.js";

export const rolesRouter = Router();

rolesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(userRoles);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

rolesRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(userRoles).where(eq(userRoles.user_id, req.session.userId!));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

rolesRouter.get("/:userId", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(userRoles).where(eq(userRoles.user_id, req.params.userId));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

rolesRouter.put("/:userId", requireAuth, async (req, res) => {
  const { role } = req.body;
  if (!role) { res.status(400).json({ error: "role required" }); return; }
  try {
    await db.delete(userRoles).where(eq(userRoles.user_id, req.params.userId));
    const [inserted] = await db.insert(userRoles).values({ user_id: req.params.userId, role }).returning();
    res.json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
