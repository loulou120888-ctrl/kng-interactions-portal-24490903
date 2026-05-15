import { Router } from "express";
import { db } from "../db.js";
import { signupCodes } from "../../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware.js";

export const signupCodesRouter = Router();

signupCodesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(signupCodes).orderBy(desc(signupCodes.created_at));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

signupCodesRouter.post("/", requireAuth, async (req, res) => {
  const { code, role, department } = req.body;
  try {
    const [row] = await db.insert(signupCodes).values({
      code,
      role,
      department: department || null,
      created_by: req.session.userId!,
    }).returning();
    res.json(row);
  } catch (err: any) {
    if (err.code === "23505") { res.status(400).json({ error: "Code already exists" }); return; }
    res.status(500).json({ error: "Server error" });
  }
});

signupCodesRouter.patch("/:id/revoke", requireAuth, async (req, res) => {
  try {
    const [row] = await db.update(signupCodes).set({ revoked: true }).where(eq(signupCodes.id, req.params.id)).returning();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
