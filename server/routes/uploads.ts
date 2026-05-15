import { Router } from "express";
import multer from "multer";
import { db } from "../db.js";
import { uploadedFiles } from "../../shared/schema.js";
import { requireAuth } from "../middleware.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const BUCKETS = ["hall-of-fame", "posters", "hof-frames"];

for (const bucket of BUCKETS) {
  const bucketDir = path.join(UPLOADS_DIR, bucket);
  if (!fs.existsSync(bucketDir)) fs.mkdirSync(bucketDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const bucket = (req.params.bucket ?? "posters").replace(/[^a-z0-9-]/g, "");
    const dir = path.join(UPLOADS_DIR, bucket);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

export const uploadsRouter = Router();

uploadsRouter.use("/:bucket", (req, res, next) => {
  const bucket = req.params.bucket ?? "";
  const dir = path.join(UPLOADS_DIR, bucket);
  if (req.method === "GET") {
    const file = path.join(dir, req.path.replace(/^\//, ""));
    if (fs.existsSync(file)) {
      res.sendFile(file);
    } else {
      res.status(404).json({ error: "Not found" });
    }
    return;
  }
  next();
});

uploadsRouter.post("/:bucket", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: "No file" }); return; }
  const bucket = req.params.bucket;
  const relativePath = `${bucket}/${req.file.filename}`;
  const publicUrl = `/api/uploads/${relativePath}`;
  try {
    await db.insert(uploadedFiles).values({
      bucket,
      path: relativePath,
      public_url: publicUrl,
      uploaded_by: req.session.userId!,
    });
    res.json({ public_url: publicUrl, path: relativePath });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
