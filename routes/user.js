import express from "express";
import { list, create, update, destroy } from "../controller/UserController.js";
import { auth } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(auth, adminOnly);

router.get("/", list);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", destroy);

export default router;