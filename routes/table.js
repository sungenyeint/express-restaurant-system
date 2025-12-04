import express from "express";
import { getAll, store, update, destroy, updateStatus} from "../controller/TableController.js";

const router = express.Router();

router.get("/", getAll);
router.post("/", store);
router.put("/:id", update);
router.delete("/:id", destroy);
router.patch("/:id/status", updateStatus);

export default router;
