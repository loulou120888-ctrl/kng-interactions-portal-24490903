import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { profilesRouter } from "./routes/profiles.js";
import { rolesRouter } from "./routes/roles.js";
import { signupCodesRouter } from "./routes/signup-codes.js";
import { interactionsRouter } from "./routes/interactions.js";
import { scheduleRouter } from "./routes/schedule.js";
import { announcementsRouter } from "./routes/announcements.js";
import { prizesRouter } from "./routes/prizes.js";
import { winnersRouter } from "./routes/winners.js";
import { pointsRouter } from "./routes/points.js";
import { hallRouter } from "./routes/hall.js";
import { uploadsRouter } from "./routes/uploads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PgStore = connectPg(session);
const isDev = process.env.NODE_ENV !== "production";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "kng-portal-secret-change-in-production";

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

app.use(cors({ origin: true, credentials: true }));

// Serve uploaded files
const uploadsPath = path.resolve(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsPath));

// API routes
app.use("/api/auth", authRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/signup-codes", signupCodesRouter);
app.use("/api/interactions", interactionsRouter);
app.use("/api/schedule", scheduleRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/prizes", prizesRouter);
app.use("/api/winners", winnersRouter);
app.use("/api/points", pointsRouter);
app.use("/api/hall", hallRouter);
app.use("/api/uploads", uploadsRouter);

if (isDev) {
  // In dev: proxy all non-API requests to Vite dev server
  const { createProxyMiddleware } = await import("http-proxy-middleware");
  const VITE_PORT = 5173;

  app.use(
    createProxyMiddleware({
      target: `http://localhost:${VITE_PORT}`,
      changeOrigin: true,
      ws: true,
      on: {
        error: (_err, _req, res: any) => {
          if (res && typeof res.status === "function") {
            res.status(502).send("Vite dev server not ready yet, please refresh.");
          }
        },
      },
    })
  );
} else {
  // In production: serve built static files
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("/{*wildcard}", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = parseInt(process.env.PORT ?? "5000");
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] KNG Portal running on port ${PORT} (${isDev ? "dev" : "production"})`);
});
