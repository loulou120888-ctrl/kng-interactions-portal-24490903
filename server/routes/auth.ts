import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { profiles, userCredentials, userRoles, signupCodes } from "../../shared/schema.js";
import { eq, count, and, isNull } from "drizzle-orm";
import { requireAuth } from "../middleware.js";

export const authRouter = Router();

authRouter.get("/me", (req, res) => {
  if (!req.session?.userId) {
    res.json({ user: null });
    return;
  }
  res.json({
    user: {
      id: req.session.userId,
      displayName: req.session.displayName,
      username: req.session.username,
    },
  });
});

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const un = username.toLowerCase().trim();

  try {
    const profile = await db
      .select({ id: profiles.id, display_name: profiles.display_name, username: profiles.username, deactivated: profiles.deactivated })
      .from(profiles)
      .where(eq(profiles.username, un))
      .limit(1);

    if (!profile.length) {
      res.status(401).json({ error: "Incorrect username or password." });
      return;
    }

    const p = profile[0];

    if (p.deactivated) {
      res.status(403).json({ error: "Your account has been deactivated. Contact a manager." });
      return;
    }

    const cred = await db
      .select({ password_hash: userCredentials.password_hash })
      .from(userCredentials)
      .where(eq(userCredentials.profile_id, p.id))
      .limit(1);

    if (!cred.length) {
      res.status(401).json({ error: "Incorrect username or password." });
      return;
    }

    const valid = await bcrypt.compare(password, cred[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: "Incorrect username or password." });
      return;
    }

    req.session.userId = p.id;
    req.session.displayName = p.display_name;
    req.session.username = p.username ?? un;

    res.json({ user: { id: p.id, displayName: p.display_name, username: p.username ?? un } });
  } catch (err: any) {
    console.error("[auth/login]", err);
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.post("/signup", async (req, res) => {
  const { username, password, display_name, signup_code } = req.body;
  if (!username || !password || !display_name) {
    res.status(400).json({ error: "Username, password and display name required" });
    return;
  }

  const un = username.toLowerCase().trim();

  const usernameRegex = /^[a-z0-9_]+$/;
  if (!usernameRegex.test(un) || un.length < 3 || un.length > 32) {
    res.status(400).json({ error: "Username must be 3–32 chars: lowercase letters, numbers and underscores only" });
    return;
  }

  if (password.length < 6 || password.length > 72) {
    res.status(400).json({ error: "Password must be 6–72 characters" });
    return;
  }

  try {
    const [roleCount] = await db.select({ count: count() }).from(userRoles);
    const isFirst = (roleCount?.count ?? 0) === 0;

    let role: "manager" | "member" | "sld" | "ld" | "aux" | "adm" = "member";
    let department: "events" | "parties" | "entertainment" | null = null;

    if (!isFirst) {
      if (!signup_code?.trim()) {
        res.status(400).json({ error: "Signup code required" });
        return;
      }
      const code = signup_code.trim().toUpperCase();
      const [codeRow] = await db
        .select()
        .from(signupCodes)
        .where(eq(signupCodes.code, code))
        .limit(1);

      if (!codeRow) {
        res.status(400).json({ error: "Invalid signup code. Double-check it and try again." });
        return;
      }
      if (codeRow.revoked) {
        res.status(400).json({ error: "That signup code has been revoked. Ask a manager for a new one." });
        return;
      }
      if (codeRow.used_by) {
        res.status(400).json({ error: "That signup code has already been used. Each code is one-time only." });
        return;
      }

      role = codeRow.role as any;
      department = codeRow.department as any;
    } else {
      role = "manager";
    }

    const existing = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.username, un))
      .limit(1);

    if (existing.length) {
      res.status(400).json({ error: "That username is already taken. Try a different one." });
      return;
    }

    const hash = await bcrypt.hash(password, 12);

    const [newProfile] = await db
      .insert(profiles)
      .values({ display_name: display_name.trim(), username: un, department: department as any })
      .returning();

    await db.insert(userCredentials).values({ profile_id: newProfile.id, password_hash: hash });
    await db.insert(userRoles).values({ user_id: newProfile.id, role });

    if (!isFirst && signup_code) {
      const code = signup_code.trim().toUpperCase();
      await db
        .update(signupCodes)
        .set({ used_by: newProfile.id, used_at: new Date() })
        .where(eq(signupCodes.code, code));
    }

    req.session.userId = newProfile.id;
    req.session.displayName = newProfile.display_name;
    req.session.username = un;

    res.json({ user: { id: newProfile.id, displayName: newProfile.display_name, username: un } });
  } catch (err: any) {
    console.error("[auth/signup]", err);
    if (err.code === "23505") {
      res.status(400).json({ error: "That username is already taken. Try a different one." });
      return;
    }
    res.status(500).json({ error: "Signup failed. Please try again." });
  }
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

authRouter.get("/validate-code/:code", async (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  try {
    const [row] = await db.select().from(signupCodes).where(eq(signupCodes.code, code)).limit(1);
    if (!row) { res.json({ valid: false, reason: "not_found" }); return; }
    if (row.revoked) { res.json({ valid: false, reason: "revoked" }); return; }
    if (row.used_by) { res.json({ valid: false, reason: "used" }); return; }
    res.json({ valid: true, role: row.role, department: row.department });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
