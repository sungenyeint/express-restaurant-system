import express from "express";
import { getAll, store, update, destroy } from "../controller/MenuItemController.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.get("/", getAll);
router.post("/", upload.single("image"), store);
router.put("/:id", upload.single("image"), update);
router.delete("/:id", destroy);

export default router;
