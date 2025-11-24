import express from "express";
import { getAll, store, getActive, updateStatus, updateOrder, getAnalytics, getBestSellers } from "../controller/OrderController.js";
import { auth, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", store);
router.get("/active", getActive);
router.get("/", getAll);
router.patch("/:id/status", updateStatus);
router.put("/:id", updateOrder);

// Admin analytics
router.get('/analytics', adminOnly, getAnalytics);
router.get('/best-sellers', adminOnly, getBestSellers);

export default router;
