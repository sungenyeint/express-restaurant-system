import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getAll, store, update, destroy } from "../controller/MenuItemController.js";

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads", "menus");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "-")
      .toLowerCase();
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

router.get("/", getAll);
router.post("/", upload.single("image"), store);
router.put("/:id", upload.single("image"), update);
router.delete("/:id", destroy);

export default router;