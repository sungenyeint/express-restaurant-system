import express from "express";
import { register, login, me } from "../controller/AuthController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// register
router.post("/register", register);

// login
router.post("/login", login);

// current user
router.get("/me", auth, me);

export default router;
