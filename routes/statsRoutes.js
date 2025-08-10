import express from "express";
// PATH IS CORRECT: It correctly points to the 'admin' subfolder
import { getDashboardStats } from "../controllers/admin/statsController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// This route will be mounted on a path like /api/admin/stats in your server.js
router.route("/").get(protect, admin, getDashboardStats);

export default router;
